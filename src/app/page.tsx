"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadOrSeedStore } from "@/lib/storage";
import { Disclaimer } from "@/components/Disclaimer";
import { CatAvatar } from "@/components/CatAvatar";
import type { Cat, CatRecord } from "@/types/cat";

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

function RecentRow({ record }: { record: CatRecord }) {
  const dot =
    record.kind === "triage" && record.tier
      ? TIER_DOT[record.tier]
      : "var(--ink-ghost)";
  return (
    <div className="flex items-center gap-3.5 border-b border-[var(--line-soft)] py-3.5 last:border-b-0">
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
    </div>
  );
}

export default function HomePage() {
  const [cat, setCat] = useState<Cat | null>(null);
  const [records, setRecords] = useState<CatRecord[]>([]);

  useEffect(() => {
    const store = loadOrSeedStore();
    const active =
      store.cats.find((c) => c.id === store.activeCatId) ?? store.cats[0];
    setCat(active);
    setRecords(store.records.filter((r) => r.catId === active.id));
  }, []);

  // localStorage 仅客户端可读:首帧 cat 为空,渲染空壳避免水合不一致。
  if (!cat) return <main className="min-h-dvh" aria-hidden="true" />;

  const meta = [`${cat.ageMonths} 个月`, cat.sex, cat.coat, `${cat.weight} kg`]
    .filter(Boolean)
    .join(" · ");

  return (
    <main
      className="mx-auto flex min-h-dvh max-w-[430px] flex-col px-7 pb-7 pt-5"
      style={{
        background:
          "linear-gradient(180deg, var(--surface) 0%, var(--paper) 58%)",
      }}
    >
      {/* 顶栏 */}
      <header className="flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-[0.16em] text-ink-faint">
          {greeting()}
        </span>
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
              吐了 · 不吃饭 · 精神差 · 误食
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
              喂养 · 训练 · 行为习惯
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

      <Disclaimer />
    </main>
  );
}
