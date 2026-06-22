// 体重迷你折线 —— 无依赖手画 SVG,取最近 12 条。≥2 条才有曲线可言。
// 从 onboarding 抽出,供 /pets 与 /onboarding 共用。

export function WeightSparkline({
  log,
}: {
  log: { date: string; kg: number }[];
}) {
  const pts = log.slice(-12);
  if (pts.length < 2) return null;
  const w = 280;
  const h = 56;
  const pad = 8;
  const kgs = pts.map((p) => p.kg);
  const min = Math.min(...kgs);
  const max = Math.max(...kgs);
  const span = max - min || 1;
  const x = (i: number) => pad + (i * (w - 2 * pad)) / (pts.length - 1);
  const y = (kg: number) => h - pad - ((kg - min) * (h - 2 * pad)) / span;
  const d = pts
    .map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.kg).toFixed(1)}`)
    .join(" ");
  const lastPt = pts[pts.length - 1];
  const delta = Number((lastPt.kg - pts[0].kg).toFixed(1));
  return (
    <div className="relative mt-3 rounded-xl bg-[var(--surface-2)] px-4 py-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] text-ink-faint">
          体重记录 · {pts.length} 次
        </span>
        <span className="text-[12px] tabular-nums text-ink-soft">
          {pts[0].kg} → {lastPt.kg} kg
          {delta !== 0 && ` (${delta > 0 ? "+" : ""}${delta})`}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="mt-1 h-14 w-full"
        aria-hidden="true"
      >
        <path
          d={d}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={x(pts.length - 1)}
          cy={y(lastPt.kg)}
          r="3.4"
          fill="var(--accent)"
        />
      </svg>
    </div>
  );
}
