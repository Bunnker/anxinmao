// 健康足迹 —— 最近 30 天分诊/问答计数 + 红黄绿分布条。只统计,不列逐条记录。
// 零记录时不消失,改为引导态 —— 把人引向分诊的关键位。
// 红线:这里的红黄绿是「风险分档统计」信号本体,合规(非装饰色)。
// 从 onboarding 抽出,供 /pets 与 /onboarding 共用。

import Link from "next/link";
import type { CatRecord } from "@/types/cat";

const TIER_VIS = {
  red: { color: "var(--red)", label: "红" },
  yellow: { color: "var(--amber)", label: "黄" },
  green: { color: "var(--green)", label: "绿" },
} as const;

export function HealthFootprint({ records }: { records: CatRecord[] }) {
  if (records.length === 0) {
    return (
      <section className="mt-4 rounded-[28px] bg-surface px-5 py-4 shadow-[var(--shadow-card)]">
        <p className="text-[12px] font-semibold tracking-[0.14em] text-accent">
          健康足迹
        </p>
        <p className="mt-2 text-footnote leading-relaxed text-ink-soft">
          还没有分诊记录 —— 它不对劲时来分诊,这里会自动长出它的病历。
        </p>
        <Link
          href="/symptoms"
          className="mt-2 inline-block text-footnote font-medium text-accent"
        >
          试试分诊 →
        </Link>
      </section>
    );
  }
  // 一次性算「30 天前」截点:render 里读 Date.now 只用于过滤、无副作用,毫秒级误差无关。
  // eslint-disable-next-line react-hooks/purity
  const cutoff = Date.now() - 30 * 86400000;
  const recent30 = records.filter((r) => {
    const t = new Date(r.date).getTime();
    return !Number.isNaN(t) && t >= cutoff;
  });
  const triage30 = recent30.filter((r) => r.kind === "triage");
  const chat30 = recent30.filter((r) => r.kind === "behavior");
  const tierN: Record<"red" | "yellow" | "green", number> = {
    red: 0,
    yellow: 0,
    green: 0,
  };
  for (const t of triage30) if (t.tier) tierN[t.tier] += 1;
  const totalTier = tierN.red + tierN.yellow + tierN.green;

  return (
    <section className="mt-4 rounded-[28px] bg-surface px-5 py-4 shadow-[var(--shadow-card)]">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[12px] font-semibold tracking-[0.14em] text-accent">
          健康足迹
        </p>
        <span className="text-[11px] text-ink-faint">最近 30 天</span>
      </div>
      <p className="text-[13px] text-ink-soft">
        分诊 {triage30.length} 次 · 问答 {chat30.length} 次
      </p>

      {totalTier > 0 && (
        <>
          <div className="mt-2.5 flex h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
            {(["red", "yellow", "green"] as const).map(
              (k) =>
                tierN[k] > 0 && (
                  <span
                    key={k}
                    style={{
                      width: `${(tierN[k] / totalTier) * 100}%`,
                      background: TIER_VIS[k].color,
                    }}
                  />
                ),
            )}
          </div>
          <div className="mt-2 flex gap-4">
            {(["red", "yellow", "green"] as const).map(
              (k) =>
                tierN[k] > 0 && (
                  <span
                    key={k}
                    className="flex items-center gap-1.5 text-[12px] text-ink-soft"
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ background: TIER_VIS[k].color }}
                    />
                    {TIER_VIS[k].label} {tierN[k]}
                  </span>
                ),
            )}
          </div>
        </>
      )}
    </section>
  );
}
