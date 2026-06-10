"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import Link from "next/link";
import {
  loadStore,
  saveStore,
  saveStoreLocal,
  seedTemplateStore,
  updateRecordOutcome,
} from "@/lib/storage";
import { pullHistory } from "@/lib/history-sync";
import { readPersisted, writePersisted } from "@/lib/persist";
import { Disclaimer } from "@/components/Disclaimer";
import { CatAvatar } from "@/components/CatAvatar";
import { Welcome } from "@/components/Welcome";
import { Guide } from "@/components/Guide";
import type { Cat, CatRecord, Store } from "@/types/cat";

// 新手教程「看过了」标记 —— 与猫档案分开,首次进入弹一次,首页可重开。
const GUIDE_SEEN_KEY = "catTriage:guideSeen:v1";
const MAX_HOME_PHOTOS = 6;

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "凌晨好";
  if (h < 11) return "早上好";
  if (h < 13) return "中午好";
  if (h < 18) return "下午好";
  return "晚上好";
}

// 把 ISO 时间显示成口语化的相对日期。
function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dayIndex = (x: Date) =>
    Math.floor(
      new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime() / 86400000,
    );
  const diff = dayIndex(new Date()) - dayIndex(d);
  if (diff <= 0) return "今天";
  if (diff === 1) return "昨天";
  if (diff < 7) return `${diff} 天前`;
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CameraIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 8.2A2.2 2.2 0 0 1 6.2 6h2.1l1.4-1.8h4.6L15.7 6h2.1A2.2 2.2 0 0 1 20 8.2v8.1a2.2 2.2 0 0 1-2.2 2.2H6.2A2.2 2.2 0 0 1 4 16.3V8.2Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12.7" r="3.1" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("图片读取失败。"));
    reader.onerror = () => reject(new Error("图片读取失败。"));
    reader.readAsDataURL(file);
  });
}

function ageLabel(months: number): string {
  if (months < 12) return `${months} 个月`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m ? `${y} 岁 ${m} 个月` : `${y} 岁`;
}

const TIER_DOT: Record<string, string> = {
  red: "var(--red)",
  yellow: "var(--amber)",
  green: "var(--green)",
};

// 日常护理提醒 —— 只基于用户自己填的日期做保守提示,不替用户定周期。
// 驱虫超 45 天 / 最后一针疫苗超 350 天才出现;没填就不打扰。
function careReminders(cat: Cat): string[] {
  const out: string[] = [];
  const daysSince = (iso: string) => {
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return -1;
    return Math.floor((Date.now() - t) / 86400000);
  };
  if (cat.deworm) {
    const d = daysSince(cat.deworm);
    if (d > 45 && d < 3650) {
      out.push(
        `上次驱虫已 ${d} 天 —— 体内外驱虫一般 1-3 个月一次,可以安排啦`,
      );
    }
  }
  const lastVac = (cat.vaccines ?? [])
    .map((v) => v.date)
    .filter(Boolean)
    .sort()
    .at(-1);
  if (lastVac) {
    const d = daysSince(lastVac);
    if (d > 350 && d < 3650) {
      out.push(
        `上次疫苗已满 ${Math.floor(d / 30)} 个月 —— 年度加强可以下次问问医生`,
      );
    }
  }
  return out;
}

// 分诊跟进 —— 找「最近一条 12 小时 ~ 7 天内、还没写跟进结果」的分诊记录。
// 太快问没意义(刚分诊完),太久了不再追问。records 本身最近在前。
const FOLLOWUP_MIN_AGE = 12 * 60 * 60 * 1000;
const FOLLOWUP_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function findFollowupTarget(records: CatRecord[]): CatRecord | null {
  const now = Date.now();
  for (const r of records) {
    if (r.kind !== "triage" || r.outcome || !r.tier) continue;
    const t = new Date(r.date).getTime();
    if (Number.isNaN(t)) continue;
    const age = now - t;
    if (age >= FOLLOWUP_MIN_AGE && age <= FOLLOWUP_MAX_AGE) return r;
  }
  return null;
}

// 记录 → 可点回的目标:
// - 分诊 → 重开当时那张报告卡(确定性,只靠 tier/symptom/claims 重建)。
//   老记录没存 symptomKey 则不可点(优雅降级)。
// - 问答 → 回到那次聊天 /behavior?c=<id> 还原对话。
function recordHref(record: CatRecord): string | null {
  if (record.kind === "triage") {
    if (!record.symptomKey || !record.tier) return null;
    const params = new URLSearchParams({
      tier: record.tier,
      symptom: record.symptomKey,
    });
    if (record.claimIds && record.claimIds.length > 0) {
      params.set("claims", record.claimIds.join(","));
    }
    return `/report?${params.toString()}`;
  }
  if (record.kind === "behavior") {
    return `/behavior?c=${encodeURIComponent(record.id)}`;
  }
  return null;
}

function RecentRow({ record }: { record: CatRecord }) {
  const dot =
    record.kind === "triage" && record.tier
      ? TIER_DOT[record.tier]
      : "var(--ink-ghost)";
  const href = recordHref(record);
  const rowCls =
    "flex items-center gap-3.5 border-b border-[var(--line-soft)] py-4 last:border-b-0";

  const body = (
    <>
      <span
        className="size-[7px] shrink-0 rounded-full"
        style={{ background: dot }}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium text-ink">
          {record.summary}
        </span>
        <span className="mt-0.5 block text-[12px] tracking-wide text-ink-faint">
          {formatDate(record.date)}
        </span>
      </span>
      {href && (
        <svg
          className="shrink-0 text-ink-faint"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M9 6l6 6-6 6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </>
  );

  if (!href) return <div className={rowCls}>{body}</div>;

  return (
    <Link
      href={href}
      aria-label={`查看「${record.summary}」`}
      className={`${rowCls} transition-colors active:bg-[var(--surface-2)]`}
    >
      {body}
    </Link>
  );
}

export default function HomePage() {
  const [store, setStore] = useState<Store | null>(null);
  const [cat, setCat] = useState<Cat | null>(null);
  const [records, setRecords] = useState<CatRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const applyStore = (store: Store) => {
      const active =
        store.cats.find((c) => c.id === store.activeCatId) ?? store.cats[0];
      setStore(store);
      setCat(active);
      setRecords(store.records.filter((r) => r.catId === active.id));
    };

    queueMicrotask(() => {
      if (cancelled) return;

      // 首次进入(没看过教程)自动弹一次。读 persist(Cookie 兜底)——
      // 微信 webview 不保 localStorage,否则教程会每次都弹。
      if (!readPersisted(GUIDE_SEEN_KEY)) setShowGuide(true);

      const local = loadStore();
      if (local && local.cats.length > 0) {
        applyStore(local);
        setLoaded(true);
        return;
      }

      // 本地空 —— 可能微信清了存储。按匿名 deviceId 从云端拉回历史(带超时);
      // 拉到就回填本地(不再推回云端,避免回声)。失败就当新用户走欢迎页。
      pullHistory().then((cloud) => {
        if (cancelled) return;
        if (cloud && cloud.cats.length > 0) {
          saveStoreLocal(cloud);
          applyStore(cloud);
        }
        setLoaded(true);
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  function closeGuide() {
    setShowGuide(false);
    // 写 persist(localStorage + Cookie),保证微信里也记得「看过了」。
    writePersisted(GUIDE_SEEN_KEY, "1");
  }

  // 用户在欢迎页选「先用默认模版逛逛」—— seed 中性「我的猫」,首页就地重渲染。
  function useTemplate() {
    const store = seedTemplateStore();
    setStore(store);
    setCat(store.cats[0]);
    setRecords([]);
  }

  function persistCat(nextCat: Cat) {
    if (!store) return;
    const nextStore: Store = {
      ...store,
      cats: store.cats.map((c) => (c.id === nextCat.id ? nextCat : c)),
    };
    saveStore(nextStore);
    setStore(nextStore);
    setCat(nextCat);
  }

  async function onAlbumPick(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0 || !cat) return;
    const usable = files
      .filter((file) => file.size <= 5 * 1024 * 1024)
      .slice(0, MAX_HOME_PHOTOS);
    const dataUrls = await Promise.all(usable.map(fileToDataUrl));
    persistCat({
      ...cat,
      photos: [...(cat.photos ?? []), ...dataUrls].slice(0, MAX_HOME_PHOTOS),
    });
  }

  // 分诊跟进卡 —— 选中目标记录 + 点选后的回执文案(「还没好」带再分诊链接)。
  const followupTarget = useMemo(() => findFollowupTarget(records), [records]);
  const [followupNote, setFollowupNote] = useState<{
    text: string;
    href?: string;
    label?: string;
  } | null>(null);

  function pickOutcome(
    rec: CatRecord,
    outcome: NonNullable<CatRecord["outcome"]>,
  ) {
    const next = updateRecordOutcome(rec.id, outcome);
    if (next && cat) {
      setStore(next);
      setRecords(next.records.filter((r) => r.catId === cat.id));
    }
    if (outcome === "在家好转") {
      setFollowupNote({ text: "太好了,记下啦 —— 有反复随时再来分诊。" });
      setTimeout(() => setFollowupNote(null), 3200);
    } else if (outcome === "已就医") {
      setFollowupNote({ text: "记下啦。之后以医生的判断为准,祝早日康复。" });
      setTimeout(() => setFollowupNote(null), 3200);
    } else {
      const urgent = rec.tier === "red" || rec.tier === "yellow";
      setFollowupNote({
        text: urgent
          ? "还没好就别再等了 —— 建议尽快带它去医院,面诊为准。"
          : "还没好的话,再走一次分诊,看看要不要升级处理。",
        href: rec.symptomKey
          ? `/triage?symptom=${rec.symptomKey}`
          : "/symptoms",
        label: "再分诊一次 →",
      });
    }
  }

  // localStorage 仅客户端可读:首帧渲染空壳避免水合不一致。
  if (!loaded) return <main className="min-h-dvh" aria-hidden="true" />;

  const guide = showGuide ? <Guide onClose={closeGuide} /> : null;

  // 无档案(新用户首次进入):欢迎页,不再直接甩进表单、不再 seed 豆豆。
  if (!cat)
    return (
      <>
        {guide}
        <Welcome onUseTemplate={useTemplate} />
      </>
    );

  const meta = [ageLabel(cat.ageMonths), cat.sex, cat.coat, `${cat.weight} kg`]
    .filter(Boolean)
    .join(" · ");
  const vaccines = cat.vaccines?.length ?? 0;
  const photos = cat.photos ?? [];

  return (
    <>
      {guide}
      <main
        className="relative mx-auto flex min-h-dvh max-w-[430px] flex-col px-6 pb-24"
        style={{
          background: "var(--gradient-page)",
          paddingTop: "calc(1.25rem + env(safe-area-inset-top, 0px))",
        }}
      >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-56"
        style={{
          background:
            "radial-gradient(ellipse 85% 60% at 50% 0%, rgba(176,90,80,0.11) 0%, transparent 100%)",
        }}
        aria-hidden="true"
      />
      {/* 顶栏 */}
      <header className="flex items-center gap-2.5 py-2">
        <span className="text-[11px] font-semibold tracking-[0.16em] text-ink-faint">
          {greeting()}
        </span>
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium tracking-[0.06em]"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
        >
          使用说明
        </button>
      </header>

      {/* 宠物画像 */}
      <section className="pt-7">
        <div className="relative overflow-hidden rounded-[34px] bg-surface p-5 shadow-[var(--shadow-card)]">
          <div className="absolute -right-10 -top-12 size-36 rounded-full bg-[var(--accent-soft)]" />
          <div className="relative flex items-start gap-4">
            <div className="shrink-0">
              <CatAvatar
                avatar={cat.avatar}
                name={cat.name}
                size={92}
                className="shadow-[var(--shadow-control)]"
              />
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <p className="text-[12px] font-semibold tracking-[0.16em] text-accent">
                {greeting()}
              </p>
              <h1 className="mt-2 text-[2.25rem] font-semibold leading-none tracking-tight text-ink">
                {cat.name}
              </h1>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{meta}</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <span className="rounded-[22px] bg-[var(--surface-2)] px-3 py-2.5">
                  <span className="block text-[11px] text-ink-faint">疫苗</span>
                  <span className="mt-0.5 block text-[14px] font-semibold tabular-nums text-ink">
                    {vaccines ? `${vaccines} 针` : "未记"}
                  </span>
                </span>
                <span className="rounded-[22px] bg-[var(--surface-2)] px-3 py-2.5">
                  <span className="block text-[11px] text-ink-faint">绝育</span>
                  <span className="mt-0.5 block text-[14px] font-semibold text-ink">
                    {cat.neutered}
                  </span>
                </span>
                <span className="rounded-[22px] bg-[var(--surface-2)] px-3 py-2.5">
                  <span className="block text-[11px] text-ink-faint">相册</span>
                  <span className="mt-0.5 block text-[14px] font-semibold tabular-nums text-ink">
                    {photos.length}/6
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="relative mt-5 flex items-center justify-between rounded-[24px] bg-white/65 px-4 py-3 shadow-[var(--shadow-control)]">
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-ink">
                {photos.length ? `已保存 ${photos.length} 张生活照` : "还没有生活照"}
              </span>
              <span className="mt-0.5 block text-[12px] text-ink-faint">
                详细相册在「我的」档案里管理
              </span>
            </span>
            <label className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full bg-[var(--surface-2)] text-accent shadow-[var(--shadow-control)]">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={onAlbumPick}
                className="hidden"
              />
              <CameraIcon />
            </label>
          </div>

          {/* 日常护理提醒 —— 基于用户自己填的驱虫/疫苗日期,保守提示 */}
          {careReminders(cat).map((t) => (
            <div
              key={t}
              className="relative mt-2.5 flex items-start gap-2 rounded-[18px] px-4 py-2.5"
              style={{ background: "var(--accent-soft)" }}
            >
              <span
                className="mt-[7px] size-1.5 shrink-0 rounded-full bg-accent"
                aria-hidden="true"
              />
              <span className="text-[12.5px] leading-relaxed text-ink">{t}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 分诊跟进 —— 上次分诊 12h~7天内未跟进,问一句「后来怎么样了」 */}
      {(followupNote || followupTarget) && (
        <section className="mt-5 rounded-[24px] bg-surface px-5 py-4 shadow-[var(--shadow-card)]">
          {followupNote ? (
            <>
              <p className="text-[14px] leading-relaxed text-ink">
                {followupNote.text}
              </p>
              {followupNote.href && (
                <Link
                  href={followupNote.href}
                  className="mt-2 inline-block text-[13.5px] font-medium text-accent"
                >
                  {followupNote.label}
                </Link>
              )}
            </>
          ) : followupTarget ? (
            <>
              <p className="text-[12px] font-semibold tracking-[0.14em] text-accent">
                跟进一下
              </p>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink">
                上次的「{followupTarget.summary}」,{cat.name}现在怎么样了?
              </p>
              <div className="mt-3 flex gap-2">
                {(
                  [
                    ["好多了", "在家好转"],
                    ["已就医", "已就医"],
                    ["还没好", "未跟进"],
                  ] as const
                ).map(([label, oc]) => (
                  <button
                    key={oc}
                    type="button"
                    onClick={() => pickOutcome(followupTarget, oc)}
                    className="flex-1 rounded-full bg-[var(--surface-2)] px-3 py-2.5 text-[13.5px] font-medium text-ink shadow-[var(--shadow-control)] transition-transform active:scale-[0.97]"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </section>
      )}

      {/* 第一步引导 —— 有档案但还没用过(0 条记录):落地后别让人不知道干嘛 */}
      {records.length === 0 && (
        <Link
          href="/symptoms"
          className="mt-5 block rounded-[24px] px-5 py-4 transition-transform active:scale-[0.985]"
          style={{ background: "var(--accent-soft)" }}
        >
          <p className="text-[12px] font-semibold tracking-[0.14em] text-accent">
            下一步 · 半分钟
          </p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-ink">
            拿{cat.name}试一次分诊:选个最像的情况、答几个小问题,看看红黄绿报告长什么样。现在没事,拿「打喷嚏」练手也行 →
          </p>
        </Link>
      )}

      {/* 主次入口 */}
      <section className="mt-5 flex flex-col gap-3">
        <Link
          href="/symptoms"
          className="group flex items-center gap-4 rounded-[28px] bg-accent px-6 py-5 text-accent-fg shadow-[var(--shadow-accent)] transition-transform duration-500 active:scale-[0.985]"
        >
          <span className="flex-1">
            <span className="block text-[1.35rem] font-medium leading-tight tracking-tight">
              我家猫不太对劲
            </span>
            <span className="mt-1.5 block text-[12.5px] tracking-wide opacity-80">
              选症状 → 答几个问题 → 红黄绿就医建议
            </span>
          </span>
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/20 transition-transform duration-500 group-hover:translate-x-0.5">
            <Arrow />
          </span>
        </Link>

        <Link
          href="/behavior"
          className="group flex items-center gap-4 rounded-[28px] bg-surface px-6 py-5 text-ink shadow-[var(--shadow-card)] transition-transform duration-500 active:scale-[0.985]"
        >
          <span className="flex-1">
            <span className="block text-[1.15rem] font-medium leading-tight tracking-tight">
              我想问点什么
            </span>
            <span className="mt-1.5 block text-[12.5px] tracking-wide text-ink-soft">
              直接打字问,生病 / 喂养 / 行为都能聊
            </span>
          </span>
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--surface-2)] text-ink-soft transition-transform duration-500 group-hover:translate-x-0.5">
            <Arrow />
          </span>
        </Link>
      </section>

      {/* 安心知识卡片 */}
      <Link
        href="/knowledge"
        className="mt-3 flex items-center gap-3 rounded-[20px] bg-surface px-4 py-3.5 shadow-[var(--shadow-control)] transition-transform duration-500 active:scale-[0.985]"
      >
        <span
          className="grid size-8 shrink-0 place-items-center rounded-full"
          style={{ background: "var(--accent-soft)" }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="var(--accent)" strokeWidth="1.7" />
            <path d="M12 8v5M12 16.5h.01" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-medium text-ink">看着吓人但不必慌</span>
          <span className="mt-0.5 block text-[12px] text-ink-soft">6 种情况 · 权威兽医来源</span>
        </span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="shrink-0 text-ink-ghost" aria-hidden="true">
          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>

      {/* 最近 */}
      <section className="mt-6 flex-1">
        <p className="text-[11px] font-semibold tracking-[0.22em] text-ink-faint">
          最近
        </p>
        {records.length === 0 ? (
          <p className="mt-3 text-[13px] leading-relaxed text-ink-faint">
            还没有记录 —— {cat.name}有情况,点上面就行。
          </p>
        ) : (
          <div className="mt-1">
            {records.slice(0, 6).map((r) => (
              <RecentRow key={r.id} record={r} />
            ))}
          </div>
        )}
      </section>

      <Link
        href="/feedback"
        className="mt-7 inline-flex items-center justify-center gap-2 self-center rounded-full bg-surface px-5 py-2.5 text-[13px] font-medium tracking-wide text-ink-soft shadow-[var(--shadow-control)] transition-transform duration-500 active:scale-[0.985]"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="text-accent"
        >
          <path
            d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 9 9 0 0 1-3.8-.8L3 21l1.9-5.7A8.38 8.38 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        有话想说?给我提个意见
      </Link>

      <Disclaimer />
      </main>
    </>
  );
}
