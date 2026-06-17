"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import {
  loadStore,
  saveStore,
  saveStoreLocal,
  seedTemplateStore,
  setActiveCat as storeSetActiveCat,
} from "@/lib/storage";
import { pullHistory } from "@/lib/history-sync";
import { Disclaimer } from "@/components/Disclaimer";
import { Welcome } from "@/components/Welcome";
import { CatFace } from "@/components/CatFace";
import { WeightSparkline } from "@/components/profile/WeightSparkline";
import { HealthFootprint } from "@/components/profile/HealthFootprint";
import {
  ageLabel,
  companionDays,
  careStatus,
  recordHref,
  recordWhen,
  type CareStatus,
} from "@/lib/profile";
import type { Cat, CatRecord, Store } from "@/types/cat";

const MAX_PROFILE_PHOTOS = 6;

// 性别 chip 装饰色 —— 内联常量,绝不进 :root 风险 token(不碰红黄绿)。
const SEX_VIS: Record<Cat["sex"], { label: string; color: string; bg: string }> =
  {
    雌: { label: "♀ 母", color: "#c77fa0", bg: "#fbeaf1" },
    雄: { label: "♂ 公", color: "#5a90c2", bg: "#e6f0f8" },
    不确定: { label: "性别未定", color: "#8a6f54", bg: "rgba(255,255,255,0.65)" },
  };

// 护理徽章配色 —— 中性 / 陶土红,绝不取风险三色(红线)。
const CARE_BADGE: Record<CareStatus, { color: string; bg: string }> = {
  done: { color: "var(--accent)", bg: "var(--accent-tint)" },
  due: { color: "#8a6f54", bg: "#f0ebe2" },
  no: { color: "var(--ink-soft)", bg: "#efece6" },
};

// 健康记录时间轴 —— 真分诊记录的 tier 点/标签用红黄绿(合规:风险信号本体);
// 问答 / 其它用中性米色点。
const TIER_TL: Record<
  "red" | "yellow" | "green",
  { dot: string; tag: string }
> = {
  green: { dot: "var(--green)", tag: "绿档" },
  yellow: { dot: "var(--amber)", tag: "黄档" },
  red: { dot: "var(--red)", tag: "红档" },
};

// 护理项图标(疫苗 / 驱虫 / 绝育)—— 描边 SVG。
function CareIcon({ type }: { type: "vaccine" | "deworm" | "neuter" }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (type === "vaccine")
    return (
      <svg {...common}>
        <path d="M16 3l5 5M18.5 5.5 9 15l-3 .8.8-3 9.7-9.3z" />
        <path d="M11 9l4 4" />
      </svg>
    );
  if (type === "deworm")
    return (
      <svg {...common}>
        <path d="M12 3c2 2.5 2 5 0 7s-2 4.5 0 7" />
        <path d="M8.5 6.5c1.4 1.4 1.4 3 0 4.5M15.5 6.5c-1.4 1.4-1.4 3 0 4.5" />
        <circle cx="12" cy="19.5" r="1" />
      </svg>
    );
  return (
    <svg {...common}>
      <circle cx="12" cy="10" r="6" />
      <path d="M12 16v5M9 19h6" />
    </svg>
  );
}

// 头像:优先 AI 生成图 cat.avatar,无则 CatFace 通用猫脸(许可范围:身份/陪伴)。
function Avatar({ cat, size }: { cat: Cat; size: number }) {
  if (cat.avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={cat.avatar}
        alt=""
        draggable={false}
        className="h-full w-full object-cover"
      />
    );
  }
  return (
    <span className="flex h-full w-full items-center justify-center">
      <CatFace mood="relieved" size={size} />
    </span>
  );
}

export default function PetsPage() {
  const [store, setStore] = useState<Store | null>(null);
  const [cat, setCat] = useState<Cat | null>(null);
  const [records, setRecords] = useState<CatRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const applyStore = (s: Store) => {
      const active = s.cats.find((c) => c.id === s.activeCatId) ?? s.cats[0];
      setStore(s);
      setCat(active);
      setRecords(s.records.filter((r) => r.catId === active.id));
    };
    queueMicrotask(() => {
      if (cancelled) return;
      const local = loadStore();
      if (local && local.cats.length > 0) {
        applyStore(local);
        setLoaded(true);
        return;
      }
      // 本地空(可能微信清存储)→ 按匿名 deviceId 拉云端历史回填。
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

  // 切换活动猫 —— 写库 + 就地重渲染。
  function switchCat(id: string) {
    const next = storeSetActiveCat(id);
    if (next) {
      const active = next.cats.find((c) => c.id === id) ?? next.cats[0];
      setStore(next);
      setCat(active);
      setRecords(next.records.filter((r) => r.catId === active.id));
    }
  }

  // 写某只猫的字段(相册/头像编辑用)——写 store.cats + 落库 + 就地刷新。
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

  function useTemplate() {
    const s = seedTemplateStore();
    setStore(s);
    setCat(s.cats[0]);
    setRecords([]);
  }


  // ── 生活相册:本地照片墙(≤6 张、单张 ≤5MB)。仅本地橱窗展示,不参与分诊判断(红线)──
  const [albumEdit, setAlbumEdit] = useState(false);
  const [sheetIdx, setSheetIdx] = useState<number | null>(null);
  const [addSheet, setAddSheet] = useState(false); // 添加照片:拍照 / 从相册选
  const replaceIdxRef = useRef<number | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }
  async function onAlbumUpload(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!cat || !files.length) return;
    const usable = files
      .filter((f) => f.size <= 5 * 1024 * 1024)
      .slice(0, MAX_PROFILE_PHOTOS);
    const urls = await Promise.all(usable.map(fileToDataUrl));
    persistCat({
      ...cat,
      photos: [...(cat.photos ?? []), ...urls].slice(0, MAX_PROFILE_PHOTOS),
    });
  }
  function removeAlbumPhoto(i: number) {
    if (!cat) return;
    const photos = cat.photos ?? [];
    const removed = photos[i];
    // 删的是当前主图则一并清掉 avatar(回落 CatFace)
    const avatar = cat.avatar === removed ? undefined : cat.avatar;
    persistCat({ ...cat, avatar, photos: photos.filter((_, idx) => idx !== i) });
    setSheetIdx(null);
  }
  function setCover(photo: string) {
    if (cat) persistCat({ ...cat, avatar: photo });
    setSheetIdx(null);
  }
  async function onReplace(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    const idx = replaceIdxRef.current;
    replaceIdxRef.current = null;
    if (!cat || !file || idx === null || file.size > 5 * 1024 * 1024) return;
    const url = await fileToDataUrl(file);
    const old = (cat.photos ?? [])[idx];
    persistCat({
      ...cat,
      avatar: cat.avatar === old ? url : cat.avatar,
      photos: (cat.photos ?? []).map((p, i) => (i === idx ? url : p)),
    });
    setSheetIdx(null);
  }

  if (!loaded) return <main className="min-h-dvh" aria-hidden="true" />;
  if (!cat) return <Welcome onUseTemplate={useTemplate} />;

  const cats = store?.cats ?? [cat];
  const photos = cat.photos ?? [];
  const sex = SEX_VIS[cat.sex];
  const care = careStatus(cat);
  const breedLine = [cat.breed, cat.coat, ageLabel(cat.ageMonths)]
    .filter(Boolean)
    .join(" · ");
  const editHref = `/onboarding?pet=${cat.id}`;

  return (
    <main className="mx-auto min-h-dvh max-w-[460px] bg-paper pb-24">
      {/* Hero 暖橘渐变头部(装饰色内联,不进 token) */}
      <section
        className="px-5 pt-3 pb-6"
        style={{
          paddingTop: "calc(0.75rem + env(safe-area-inset-top, 0px))",
          background: "linear-gradient(180deg,#f6e7d6,#f3ddc6)",
        }}
      >
        <div className="flex h-9 items-center">
          <span className="font-serif text-[16px] font-semibold tracking-wide text-ink">
            毛孩子
          </span>
        </div>

        {/* 多猫切换条 */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {cats.map((c) => {
            const on = c.id === cat.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => switchCat(c.id)}
                className={
                  "flex flex-none items-center gap-2 rounded-full border-[1.5px] py-[5px] pr-[13px] pl-[5px] transition " +
                  (on
                    ? "border-accent bg-white shadow-[0_4px_12px_rgba(176,90,80,0.16)]"
                    : "border-transparent bg-white/45")
                }
              >
                <span className="grid size-[30px] place-items-center overflow-hidden rounded-full shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.7)]">
                  <Avatar cat={c} size={26} />
                </span>
                <span
                  className={
                    "text-[13px] font-semibold tracking-wide whitespace-nowrap " +
                    (on ? "text-accent" : "text-ink-soft")
                  }
                >
                  {c.name || "未命名"}
                </span>
              </button>
            );
          })}
          <Link
            href="/onboarding?add=1"
            aria-label="添加一只毛孩子"
            className="grid size-[38px] flex-none place-items-center rounded-full border-[1.5px] border-dashed border-[#cdbfae] bg-white/35 text-[#9a7e62] transition active:scale-90"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </Link>
        </div>

        {/* 头像 + 资料 */}
        <div className="mt-2 flex items-start gap-4">
          <div className="flex flex-none flex-col items-center gap-2.5">
            <div
              className="relative size-[88px] overflow-hidden rounded-[28px] shadow-[0_10px_24px_-8px_rgba(190,130,70,0.55),inset_0_0_0_3px_#fff]"
              style={{
                background:
                  "radial-gradient(circle at 50% 38%,#f3c590,#e2954f 76%)",
              }}
            >
              <Avatar cat={cat} size={74} />
              <Link
                href={editHref}
                aria-label="换照片 / 编辑头像"
                className="absolute right-[5px] bottom-[5px] z-[3] grid size-6 place-items-center rounded-full bg-white text-accent shadow-[0_2px_6px_rgba(120,80,40,0.3)]"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 8.5h3l1.5-2h7L17 8.5h3v10H4z" />
                  <circle cx="12" cy="13" r="3.2" />
                </svg>
              </Link>
            </div>
            <Link
              href={editHref}
              className="flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-[12px] font-semibold tracking-wide text-accent shadow-[var(--shadow-control)] transition active:scale-95"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M14 4l6 6M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z" />
              </svg>
              编辑档案
            </Link>
          </div>

          <div className="min-w-0 pt-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-serif text-[25px] font-bold tracking-wide text-ink">
                {cat.name || "未命名"}
              </span>
              <span
                className="flex-none rounded-lg px-2 py-[3px] text-[12px] font-semibold whitespace-nowrap"
                style={{ color: sex.color, background: sex.bg }}
              >
                {sex.label}
              </span>
            </div>
            <p className="mt-1.5 text-[13px] tracking-wide text-ink-soft">
              {breedLine || "资料待完善"}
            </p>
          </div>
        </div>

        {/* 四宫格 */}
        <div className="mt-[18px] flex gap-px overflow-hidden rounded-2xl bg-white/50 shadow-[var(--shadow-control)]">
          {(
            [
              [ageLabel(cat.ageMonths).split(" ")[0], ageLabel(cat.ageMonths).split(" ").slice(1).join(""), "年龄"],
              [String(cat.weight), "kg", "体重"],
              [String(records.length), "", "健康记录"],
              [String(companionDays(cat.homeDate)), "天", "陪伴"],
            ] as const
          ).map(([v, unit, k]) => (
            <div key={k} className="flex-1 bg-white/55 px-1 py-3 text-center">
              <div className="font-serif text-[18px] font-semibold tracking-wide text-ink">
                {v}
                {unit && (
                  <small className="ml-px text-[11px] font-normal text-ink-soft">
                    {unit}
                  </small>
                )}
              </div>
              <div className="mt-[3px] text-[11px] tracking-wide text-ink-faint">
                {k}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="px-5">
        {/* 生活相册(照片墙 · 可单独编辑) */}
        <div className="mt-[22px] mb-3 flex items-baseline justify-between px-0.5">
          <span className="font-serif text-[16px] font-semibold tracking-wide text-ink">
            生活相册
          </span>
          {(photos.length > 0 || albumEdit) && (
            <button
              type="button"
              onClick={() => setAlbumEdit((v) => !v)}
              className="text-[12.5px] font-semibold text-accent"
            >
              {albumEdit ? "完成" : "编辑 ›"}
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => albumEdit && setSheetIdx(i)}
              aria-label={albumEdit ? "编辑这张照片" : "生活照"}
              className="relative aspect-square overflow-hidden rounded-2xl shadow-[var(--shadow-control)]"
              style={{
                background: "var(--accent-tint)",
                cursor: albumEdit ? "pointer" : "default",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p}
                alt=""
                draggable={false}
                className="h-full w-full object-cover"
              />
              {cat.avatar === p && (
                <span className="absolute top-1.5 left-1.5 rounded-lg bg-accent/90 px-1.5 py-0.5 text-[9.5px] font-semibold tracking-wide text-white">
                  主图
                </span>
              )}
              {albumEdit && (
                <span className="absolute inset-0 grid place-items-center bg-black/30 text-white">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M14 4l6 6M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z" />
                  </svg>
                </span>
              )}
            </button>
          ))}
          {photos.length < MAX_PROFILE_PHOTOS && (
            <button
              type="button"
              onClick={() => setAddSheet(true)}
              className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-[1.5px] border-dashed border-[#d9d2c6] bg-white/45 text-[11.5px] text-ink-faint"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              添加
            </button>
          )}
        </div>
        {photos.length === 0 && !albumEdit ? (
          <p className="mt-2 px-0.5 text-[12px] leading-relaxed text-ink-faint">
            还没有生活照 —— 点上面添加。仅本地展示,不参与分诊判断。
          </p>
        ) : (
          <p className="mt-2.5 px-0.5 text-[11px] tracking-wide text-ink-faint">
            最多 6 张 · 仅本地展示,不参与分诊判断
          </p>
        )}

        {/* 健康档案(疫苗/驱虫/绝育)—— 徽章中性/陶土红,不碰风险三色 */}
        <div className="mt-[22px] mb-3 flex items-baseline justify-between px-0.5">
          <span className="font-serif text-[16px] font-semibold tracking-wide text-ink">
            健康档案
          </span>
          <Link
            href={editHref + "#edit-health"}
            className="text-[12.5px] text-ink-faint"
          >
            管理 ›
          </Link>
        </div>
        <div className="flex flex-col gap-2.5">
          {(
            [
              ["vaccine", "疫苗", care.vaccine],
              ["deworm", "驱虫", care.deworm],
              ["neuter", "绝育", care.neuter],
            ] as const
          ).map(([type, title, item]) => {
            const badge = CARE_BADGE[item.status];
            return (
              <Link
                key={type}
                href={editHref + (type === "neuter" ? "#edit-basic" : "#edit-health")}
                className="flex items-center gap-3 rounded-2xl bg-surface px-[15px] py-3.5 shadow-[var(--shadow-control)] transition active:scale-[0.99]"
              >
                <span className="grid size-[42px] flex-none place-items-center rounded-[13px] bg-[var(--accent-tint)] text-accent">
                  <CareIcon type={type} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-semibold tracking-wide text-ink">
                    {title}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-ink-faint">
                    {item.sub}
                  </span>
                </span>
                <span
                  className="flex-none rounded-full px-2.5 py-[5px] text-[11.5px] font-semibold whitespace-nowrap"
                  style={{ color: badge.color, background: badge.bg }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* 体重曲线 */}
        <div className="mt-[22px] mb-3 flex items-baseline justify-between px-0.5">
          <span className="font-serif text-[16px] font-semibold tracking-wide text-ink">
            体重
          </span>
          <Link
            href={editHref + "#edit-basic"}
            className="text-[12.5px] text-ink-faint"
          >
            记一笔 ›
          </Link>
        </div>
        {cat.weightLog && cat.weightLog.length >= 2 ? (
          <WeightSparkline log={cat.weightLog} />
        ) : (
          <div className="rounded-2xl bg-surface px-4 py-4 text-[13px] leading-relaxed text-ink-soft shadow-[var(--shadow-control)]">
            当前 {cat.weight} kg —— 记满 2 次称重就会长出体重曲线。
          </div>
        )}

        {/* 健康背景 */}
        <div className="mt-[22px] mb-3 flex items-baseline justify-between px-0.5">
          <span className="font-serif text-[16px] font-semibold tracking-wide text-ink">
            健康背景
          </span>
          <Link
            href={editHref + "#edit-background"}
            className="text-[12.5px] text-ink-faint"
          >
            编辑 ›
          </Link>
        </div>
        <div className="overflow-hidden rounded-2xl bg-surface shadow-[var(--shadow-control)]">
          {(
            [
              ["慢性病史", cat.chronicConditions, "未填 —— 填了分诊和问答会替它考虑"],
              ["过敏史", cat.allergies, "未填"],
              ["其它备注", cat.notes, "未填"],
            ] as const
          ).map(([k, v, empty], i) => (
            <div
              key={k}
              className={
                "flex gap-3 px-[15px] py-3 " +
                (i < 2 ? "border-b border-[var(--line)]" : "")
              }
            >
              <span className="w-[62px] flex-none text-[13px] text-ink-soft">
                {k}
              </span>
              <span
                className={
                  "flex-1 text-[13.5px] leading-relaxed " +
                  (v ? "text-ink" : "text-ink-faint")
                }
              >
                {v || empty}
              </span>
            </div>
          ))}
        </div>

        {/* 健康记录:健康足迹(合规三色统计)+ 最近 5 条 timeline + 跳全部记录/报表页 */}
        <div className="mt-[22px] mb-1 flex items-baseline justify-between px-0.5">
          <span className="font-serif text-[16px] font-semibold tracking-wide text-ink">
            健康记录
          </span>
          {records.length > 0 && (
            <Link
              href="/pets/records"
              className="text-[12.5px] font-semibold text-accent"
            >
              全部 {records.length} 条 · 报表 ›
            </Link>
          )}
        </div>
        <HealthFootprint records={records} />
        {records.length > 0 && (
          <div className="relative mt-3.5 pl-1.5">
            {records.slice(0, 5).map(
              (r, i, arr) => {
                const tv =
                  r.kind === "triage" && r.tier ? TIER_TL[r.tier] : null;
                const href = recordHref(r);
                const last = i === arr.length - 1;
                const card = (
                  <div className="flex-1 rounded-[15px] bg-surface px-3.5 py-3 shadow-[var(--shadow-control)]">
                    <p className="text-[14px] leading-snug font-medium text-ink">
                      {r.summary}
                    </p>
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] text-ink-faint">
                      {tv && (
                        <>
                          <span
                            className="font-semibold"
                            style={{ color: tv.dot }}
                          >
                            {tv.tag}
                          </span>
                          <span>·</span>
                        </>
                      )}
                      <span>{r.kind === "triage" ? "分诊" : "问答"}</span>
                      <span>·</span>
                      <span>{recordWhen(r.date)}</span>
                    </p>
                  </div>
                );
                return (
                  <div
                    key={r.id}
                    className={
                      "relative flex gap-3.5 " + (last ? "" : "pb-[18px]")
                    }
                  >
                    <div className="relative flex w-3.5 flex-none justify-center">
                      {!last && (
                        <span className="absolute top-4 -bottom-1 w-0.5 bg-[var(--line)]" />
                      )}
                      <span
                        className="relative z-[1] mt-[3px] size-3.5 rounded-full shadow-[0_0_0_3px_var(--paper)]"
                        style={{ background: tv?.dot ?? "#cdbfae" }}
                      />
                    </div>
                    {href ? (
                      <Link
                        href={href}
                        aria-label={`查看「${r.summary}」`}
                        className="flex-1 transition active:scale-[0.99]"
                      >
                        {card}
                      </Link>
                    ) : (
                      card
                    )}
                  </div>
                );
              },
            )}
          </div>
        )}

        <Disclaimer />
      </div>

      {/* 隐藏文件选择:替换 / 拍照(capture)/ 从相册选(multiple) */}
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onReplace}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onAlbumUpload}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onAlbumUpload}
      />

      {/* 添加照片:拍照 / 从相册选 */}
      {addSheet && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-[2px]"
          onClick={() => setAddSheet(false)}
        >
          <div
            className="w-full max-w-[460px] rounded-t-[26px] bg-paper px-3.5 pt-2.5 pb-[calc(16px+env(safe-area-inset-bottom,0px))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-[#e0dcd2]" />
            <button
              type="button"
              onClick={() => {
                setAddSheet(false);
                cameraInputRef.current?.click();
              }}
              className="flex w-full items-center gap-3 rounded-[13px] px-3.5 py-3.5 text-[15px] text-ink active:bg-black/5"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 8.5h3l1.5-2h7L17 8.5h3v10H4z" />
                <circle cx="12" cy="13" r="3.2" />
              </svg>
              拍照
            </button>
            <button
              type="button"
              onClick={() => {
                setAddSheet(false);
                galleryInputRef.current?.click();
              }}
              className="flex w-full items-center gap-3 rounded-[13px] px-3.5 py-3.5 text-[15px] text-ink active:bg-black/5"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <circle cx="8.5" cy="10" r="1.5" />
                <path d="M21 16l-5-5L5 19" />
              </svg>
              从相册选
            </button>
          </div>
        </div>
      )}

      {/* 单格编辑 bottom-sheet */}
      {sheetIdx !== null && photos[sheetIdx] && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-[2px]"
          onClick={() => setSheetIdx(null)}
        >
          <div
            className="w-full max-w-[460px] rounded-t-[26px] bg-paper px-3.5 pt-2.5 pb-[calc(16px+env(safe-area-inset-bottom,0px))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-[#e0dcd2]" />
            <button
              type="button"
              onClick={() => setCover(photos[sheetIdx])}
              className="flex w-full items-center justify-between rounded-[13px] px-3.5 py-3.5 text-[15px] text-ink active:bg-black/5"
            >
              设为主图(作头像)
              {cat.avatar === photos[sheetIdx] && (
                <span className="text-[13px] text-accent">当前主图</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                replaceIdxRef.current = sheetIdx;
                replaceInputRef.current?.click();
              }}
              className="flex w-full items-center rounded-[13px] px-3.5 py-3.5 text-[15px] text-ink active:bg-black/5"
            >
              替换这张
            </button>
            <button
              type="button"
              onClick={() => removeAlbumPhoto(sheetIdx)}
              className="flex w-full items-center rounded-[13px] px-3.5 py-3.5 text-[15px] text-[#b54b3f] active:bg-black/5"
            >
              删除
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
