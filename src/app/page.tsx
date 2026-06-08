"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadStore, saveStoreLocal, seedTemplateStore } from "@/lib/storage";
import { pullHistory } from "@/lib/history-sync";
import { readPersisted, writePersisted } from "@/lib/persist";
import { Disclaimer } from "@/components/Disclaimer";
import { CatAvatar } from "@/components/CatAvatar";
import { Welcome } from "@/components/Welcome";
import { Guide } from "@/components/Guide";
import type { Cat, CatRecord, Store } from "@/types/cat";

// 新手教程「看过了」标记 —— 与猫档案分开,首次进入弹一次,首页可重开。
const GUIDE_SEEN_KEY = "catTriage:guideSeen:v1";

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

const TIER_DOT: Record<string, string> = {
  red: "var(--red)",
  yellow: "var(--amber)",
  green: "var(--green)",
};

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
    "flex items-center gap-3.5 border-b border-[var(--line-soft)] py-3.5 last:border-b-0";

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
  const [cat, setCat] = useState<Cat | null>(null);
  const [records, setRecords] = useState<CatRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const applyStore = (store: Store) => {
      const active =
        store.cats.find((c) => c.id === store.activeCatId) ?? store.cats[0];
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
    setCat(store.cats[0]);
    setRecords([]);
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

  const meta = [`${cat.ageMonths} 个月`, cat.sex, cat.coat, `${cat.weight} kg`]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      {guide}
      <main
        className="mx-auto flex min-h-dvh max-w-[430px] flex-col px-7 pb-7 pt-5"
        style={{
          background:
            "linear-gradient(180deg, var(--surface) 0%, var(--paper) 58%)",
        }}
      >
      {/* 顶栏 */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-semibold tracking-[0.16em] text-ink-faint">
            {greeting()}
          </span>
          <button
            type="button"
            onClick={() => setShowGuide(true)}
            className="text-[11px] tracking-wide text-accent"
          >
            使用说明
          </button>
        </div>
        <Link href="/onboarding" aria-label={`${cat.name}的档案`}>
          <CatAvatar avatar={cat.avatar} name={cat.name} size={36} />
        </Link>
      </header>

      {/* hero */}
      <section className="pt-10">
        <p className="mb-3 text-[13px] leading-relaxed text-ink-soft">
          ——别担心,先告诉我,
        </p>
        <h1 className="font-serif text-[2.7rem] font-medium leading-[1.1] tracking-tight text-ink">
          {cat.name}
          <span className="ml-2 text-[0.62em] font-normal text-ink-soft">
            怎么了?
          </span>
        </h1>
        <p className="mt-3 text-[13px] tracking-wide text-ink-soft">{meta}</p>
      </section>

      {/* 主次入口 */}
      <section className="mt-8 flex flex-col gap-3">
        <Link
          href="/symptoms"
          className="flex items-center gap-4 rounded-2xl bg-accent px-6 py-5 text-accent-fg shadow-[0_5px_18px_-9px_rgba(60,40,20,0.45)] transition-transform active:translate-y-px"
        >
          <span className="flex-1">
            <span className="block text-[1.35rem] font-medium leading-tight tracking-tight">
              我家猫不太对劲
            </span>
            <span className="mt-1.5 block text-[12.5px] tracking-wide opacity-80">
              选症状 → 答几个问题 → 红黄绿就医建议
            </span>
          </span>
          <Arrow />
        </Link>

        <Link
          href="/behavior"
          className="flex items-center gap-4 rounded-2xl border border-[var(--line)] bg-surface px-6 py-5 text-ink transition-transform active:translate-y-px"
        >
          <span className="flex-1">
            <span className="block text-[1.15rem] font-medium leading-tight tracking-tight">
              我想问点什么
            </span>
            <span className="mt-1.5 block text-[12.5px] tracking-wide text-ink-soft">
              直接打字问,生病 / 喂养 / 行为都能聊
            </span>
          </span>
          <Arrow className="text-ink-soft" />
        </Link>
      </section>

      {/* 安心知识入口 —— 「看着吓人但不必慌」 */}
      <Link
        href="/knowledge"
        className="mt-5 self-center text-[13px] tracking-wide text-ink-soft"
      >
        看着吓人但不必慌的几种情况 →
      </Link>

      {/* 最近 */}
      <section className="mt-9 flex-1">
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
        className="mt-7 inline-flex items-center justify-center gap-2 self-center rounded-full border border-[var(--line)] bg-surface px-5 py-2.5 text-[13px] font-medium tracking-wide text-ink-soft shadow-[0_4px_14px_-9px_rgba(60,40,20,0.5)] transition-transform active:translate-y-px"
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
