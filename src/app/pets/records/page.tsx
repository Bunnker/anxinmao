"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadStore } from "@/lib/storage";
import { Disclaimer } from "@/components/Disclaimer";
import { recordHref, recordWhen, timeHM } from "@/lib/profile";
import type { Cat, CatRecord } from "@/types/cat";

const TIER = {
  green: { c: "var(--green)", tag: "绿档" },
  yellow: { c: "var(--amber)", tag: "黄档" },
  red: { c: "var(--red)", tag: "红档" },
} as const;

// 体重趋势折线 —— 无依赖手画 SVG,带面积填充 + 月份轴。
function WeightTrend({ log }: { log: { date: string; kg: number }[] }) {
  const pts = log.slice(-12);
  if (pts.length < 2)
    return (
      <p className="text-footnote leading-relaxed text-ink-soft">
        当前还不足两次称重 —— 多记几次,这里会长出体重趋势曲线。
      </p>
    );
  const w = 320;
  const h = 110;
  const pl = 8;
  const pr = 8;
  const pt = 12;
  const pb = 22;
  const n = pts.length;
  const kgs = pts.map((p) => p.kg);
  const min = Math.min(...kgs);
  const max = Math.max(...kgs);
  const rng = max - min || 1;
  const X = (i: number) => pl + (i * (w - pl - pr)) / (n - 1);
  const Y = (v: number) => pt + (1 - (v - min) / rng) * (h - pt - pb);
  const line = pts
    .map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(p.kg).toFixed(1)}`)
    .join(" ");
  const area = `${line} L${X(n - 1).toFixed(1)} ${h - pb} L${X(0).toFixed(1)} ${h - pb} Z`;
  const first = pts[0];
  const last = pts[n - 1];
  const delta = Number((last.kg - first.kg).toFixed(1));
  return (
    <>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-footnote font-semibold text-ink">
          近 {n} 次称重
        </span>
        <span className="text-caption text-ink-soft">
          {first.kg} → <span className="font-semibold text-accent">{last.kg} kg</span>
          {delta !== 0 && ` · ${delta > 0 ? "+" : ""}${delta}`}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="block h-[110px] w-full"
        aria-hidden="true"
      >
        <path d={area} fill="var(--accent-tint)" opacity="0.6" />
        <path
          d={line}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {pts.map((p, i) => (
          <circle
            key={i}
            cx={X(i).toFixed(1)}
            cy={Y(p.kg).toFixed(1)}
            r="3"
            fill="var(--accent)"
          />
        ))}
        {pts.map((p, i) => {
          const d = new Date(p.date);
          return (
            <text
              key={`t${i}`}
              x={X(i).toFixed(1)}
              y={h - 6}
              fontSize="9"
              fill="var(--ink-faint)"
              textAnchor="middle"
            >
              {Number.isNaN(d.getTime()) ? "" : `${d.getMonth() + 1}月`}
            </text>
          );
        })}
      </svg>
    </>
  );
}

export default function RecordsPage() {
  const router = useRouter();
  const [cat, setCat] = useState<Cat | null>(null);
  const [records, setRecords] = useState<CatRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<"report" | "list">("report");

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const s = loadStore();
      if (s && s.cats.length > 0) {
        const a = s.cats.find((c) => c.id === s.activeCatId) ?? s.cats[0];
        setCat(a);
        setRecords(s.records.filter((r) => r.catId === a.id));
      }
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const triage = records.filter((r) => r.kind === "triage");
    const behavior = records.filter((r) => r.kind === "behavior");
    // 一次性算「30 天前」截点:只用于过滤统计、无副作用,毫秒级误差无关。
    // eslint-disable-next-line react-hooks/purity
    const cutoff = Date.now() - 30 * 86400000;
    const recent30 = records.filter((r) => {
      const t = new Date(r.date).getTime();
      return !Number.isNaN(t) && t >= cutoff;
    }).length;
    const tierN: Record<"green" | "yellow" | "red", number> = {
      green: 0,
      yellow: 0,
      red: 0,
    };
    for (const r of triage) if (r.tier) tierN[r.tier] += 1;
    const totalTier = tierN.green + tierN.yellow + tierN.red;

    // 月度风险趋势:最近出现过分诊的 6 个月。
    const monthMap = new Map<string, { g: number; y: number; r: number }>();
    for (const r of triage) {
      if (!r.tier) continue;
      const d = new Date(r.date);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const m = monthMap.get(key) ?? { g: 0, y: 0, r: 0 };
      if (r.tier === "green") m.g += 1;
      else if (r.tier === "yellow") m.y += 1;
      else m.r += 1;
      monthMap.set(key, m);
    }
    const months = [...monthMap.entries()]
      .sort((a, b) => {
        const [ay, am] = a[0].split("-").map(Number);
        const [by, bm] = b[0].split("-").map(Number);
        return ay - by || am - bm;
      })
      .slice(-6)
      .map(([key, m]) => ({ label: `${key.split("-")[1]}月`, ...m }));
    const monthMax = months.reduce((mx, m) => Math.max(mx, m.g + m.y + m.r), 1);

    // 常见主诉 Top:按 symptom 中文标签计数。
    const symMap = new Map<string, number>();
    for (const r of triage) {
      const k = r.symptom || r.symptomKey;
      if (k) symMap.set(k, (symMap.get(k) ?? 0) + 1);
    }
    const topSym = [...symMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const symMax = topSym.reduce((mx, s) => Math.max(mx, s[1]), 1);

    // 跟进闭环:已就医 / 在家好转 / 未跟进(含未填)。
    const fu = { 已就医: 0, 在家好转: 0, 未跟进: 0 };
    for (const r of triage) {
      if (r.outcome === "已就医") fu.已就医 += 1;
      else if (r.outcome === "在家好转") fu.在家好转 += 1;
      else fu.未跟进 += 1;
    }

    return {
      total: records.length,
      triage: triage.length,
      behavior: behavior.length,
      recent30,
      tierN,
      totalTier,
      months,
      monthMax,
      topSym,
      symMax,
      fu,
    };
  }, [records]);

  // 全部记录按月分组(records 已是新→旧序)。
  const groups = useMemo(() => {
    const out: { label: string; items: CatRecord[] }[] = [];
    for (const r of records) {
      const d = new Date(r.date);
      const label = Number.isNaN(d.getTime())
        ? "更早"
        : `${d.getFullYear()} 年 ${d.getMonth() + 1} 月`;
      const g = out[out.length - 1];
      if (g && g.label === label) g.items.push(r);
      else out.push({ label, items: [r] });
    }
    return out;
  }, [records]);

  if (!loaded) return <main className="min-h-dvh" aria-hidden="true" />;

  const secCls =
    "mt-4 mb-2.5 ml-0.5 font-serif text-callout font-semibold tracking-wide text-ink";
  const cardCls =
    "rounded-lg bg-surface px-4 py-4 shadow-[var(--shadow-control)]";

  return (
    <main
      className="mx-auto min-h-dvh max-w-[460px] pb-16"
      style={{ background: "var(--gradient-page)" }}
    >
      {/* 顶栏吸顶 */}
      <header
        className="sticky top-0 z-30 flex items-center gap-2.5 border-b border-[var(--line)] bg-paper px-4 pb-2.5"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 10px)" }}
      >
        <button
          type="button"
          onClick={() => router.push("/pets")}
          aria-label="返回"
          className="grid size-9 place-items-center rounded-full text-ink"
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
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className="font-serif text-title font-semibold tracking-wide text-ink">
          {cat ? `${cat.name} · 健康记录` : "健康记录"}
        </span>
      </header>

      {/* tabs */}
      <div className="mx-4 mt-3 flex gap-1 rounded-xl bg-[var(--surface-2)] p-1">
        {(
          [
            ["report", "数据报表"],
            ["list", "全部记录"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={
              "flex-1 rounded-lg py-2 text-body font-medium transition-colors " +
              (tab === k
                ? "bg-white font-semibold text-accent shadow-[var(--shadow-control)]"
                : "text-ink-soft")
            }
          >
            {label}
          </button>
        ))}
      </div>

      {records.length === 0 ? (
        <div className="px-4 pt-10 text-center">
          <p className="text-body leading-relaxed text-ink-soft">
            还没有健康记录 —— {cat?.name ?? "它"}不对劲时来分诊,这里会自动长出它的病历和报表。
          </p>
          <Link
            href="/symptoms"
            className="mt-3 inline-block text-body font-medium text-accent"
          >
            试试分诊 →
          </Link>
        </div>
      ) : tab === "report" ? (
        <div className="px-4">
          {/* 概览 */}
          <div className="mt-4 grid grid-cols-4 gap-px overflow-hidden rounded-2xl bg-[var(--line)] shadow-[var(--shadow-control)]">
            {(
              [
                [stats.total, "总记录"],
                [stats.triage, "分诊"],
                [stats.behavior, "问答"],
                [stats.recent30, "近30天"],
              ] as const
            ).map(([v, k]) => (
              <div key={k} className="bg-surface px-1 py-3 text-center">
                <div className="font-serif text-title font-semibold text-ink">
                  {v}
                </div>
                <div className="mt-0.5 text-micro text-ink-faint">{k}</div>
              </div>
            ))}
          </div>

          {/* 体重趋势 */}
          <p className={secCls}>体重趋势</p>
          <div className={cardCls}>
            <WeightTrend log={cat?.weightLog ?? []} />
          </div>

          {/* 分诊风险分布 + 月度趋势 */}
          <p className={secCls}>分诊风险分布</p>
          <div className={cardCls}>
            {stats.totalTier === 0 ? (
              <p className="text-footnote leading-relaxed text-ink-soft">
                还没有分诊结果 —— 做一次分诊,这里会统计红黄绿分布。
              </p>
            ) : (
              <>
                <div className="mb-2.5 flex items-baseline justify-between">
                  <span className="text-footnote font-semibold text-ink">
                    {stats.totalTier} 次分诊
                  </span>
                  <span className="text-caption text-ink-soft">越多绿档越安心</span>
                </div>
                <div className="flex h-3.5 overflow-hidden rounded-full bg-[var(--neutral-bg)]">
                  {(["green", "yellow", "red"] as const).map(
                    (k) =>
                      stats.tierN[k] > 0 && (
                        <span
                          key={k}
                          style={{
                            width: `${(stats.tierN[k] / stats.totalTier) * 100}%`,
                            background: TIER[k].c,
                          }}
                        />
                      ),
                  )}
                </div>
                <div className="mt-2.5 flex gap-4 text-caption text-ink-soft">
                  {(["green", "yellow", "red"] as const).map((k) => (
                    <span key={k} className="inline-flex items-center gap-1.5">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ background: TIER[k].c }}
                      />
                      {TIER[k].tag.slice(0, 1)} {stats.tierN[k]}
                    </span>
                  ))}
                </div>
                {stats.months.length >= 2 && (
                  <div className="mt-3.5 flex items-end gap-2.5 border-t border-[var(--line)] pt-3">
                    {stats.months.map((m) => {
                      const t = m.g + m.y + m.r;
                      const hpx = Math.max(4, (t / stats.monthMax) * 46);
                      return (
                        <div
                          key={m.label}
                          className="flex flex-1 flex-col items-center gap-1.5"
                        >
                          <div
                            className="flex w-3/5 max-w-[26px] flex-col-reverse overflow-hidden rounded-t"
                            style={{ height: hpx }}
                          >
                            {(["red", "yellow", "green"] as const).map((k) => {
                              const map = { red: m.r, yellow: m.y, green: m.g };
                              return map[k] ? (
                                <span
                                  key={k}
                                  style={{
                                    height: `${(map[k] / t) * 100}%`,
                                    background: TIER[k].c,
                                  }}
                                />
                              ) : null;
                            })}
                          </div>
                          <span className="text-micro text-ink-faint">
                            {m.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* 常见主诉 Top */}
          {stats.topSym.length > 0 && (
            <>
              <p className={secCls}>常见主诉 Top</p>
              <div className={cardCls}>
                {stats.topSym.map(([name, n]) => (
                  <div key={name} className="mb-3 flex items-center gap-2.5 last:mb-0">
                    <span className="w-14 flex-none text-footnote text-ink">
                      {name}
                    </span>
                    <span className="h-[18px] flex-1 overflow-hidden rounded-md bg-[var(--neutral-bg)]">
                      <span
                        className="block h-full rounded-md"
                        style={{
                          width: `${(n / stats.symMax) * 100}%`,
                          background:
                            "linear-gradient(90deg,#d99a5c,var(--accent))",
                        }}
                      />
                    </span>
                    <span className="w-9 flex-none text-right text-caption text-ink-soft">
                      {n} 次
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* 分诊跟进 */}
          {stats.triage > 0 && (
            <>
              <p className={secCls}>分诊跟进</p>
              <div className={cardCls}>
                <div className="flex gap-2.5">
                  {(["已就医", "在家好转", "未跟进"] as const).map((k) => (
                    <div
                      key={k}
                      className="flex-1 rounded-sm bg-paper px-2 py-2.5 text-center"
                    >
                      <div className="font-serif text-title font-semibold text-ink">
                        {stats.fu[k]}
                      </div>
                      <div className="mt-0.5 text-caption text-ink-faint">{k}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <Disclaimer />
        </div>
      ) : (
        <div className="px-4 pt-2">
          {groups.map((g) => (
            <div key={g.label}>
              <p className="mt-4 mb-2.5 ml-0.5 text-caption tracking-[0.08em] text-ink-faint">
                {g.label}
              </p>
              <div className="relative pl-1.5">
                {g.items.map((r, i, arr) => {
                  const tv = r.kind === "triage" && r.tier ? TIER[r.tier] : null;
                  const href = recordHref(r);
                  const last = i === arr.length - 1;
                  const d = new Date(r.date);
                  const when = Number.isNaN(d.getTime())
                    ? recordWhen(r.date)
                    : `${d.getMonth() + 1}月${d.getDate()}日 ${timeHM(r.date)}`;
                  const card = (
                    <div className="flex-1 rounded-sm bg-surface px-3.5 py-3 shadow-[var(--shadow-control)]">
                      <p className="text-footnote leading-snug font-medium text-ink">
                        {r.summary}
                      </p>
                      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-caption text-ink-faint">
                        {tv && (
                          <>
                            <span
                              className="font-semibold"
                              style={{ color: tv.c }}
                            >
                              {tv.tag}
                            </span>
                            <span>·</span>
                          </>
                        )}
                        <span>{r.kind === "triage" ? "分诊" : "问答"}</span>
                        <span>·</span>
                        <span>{when}</span>
                      </p>
                    </div>
                  );
                  return (
                    <div
                      key={r.id}
                      className={"flex gap-3 " + (last ? "" : "pb-3.5")}
                    >
                      <div className="relative flex w-3 flex-none justify-center">
                        {!last && (
                          <span className="absolute top-3.5 -bottom-1 w-0.5 bg-[var(--line)]" />
                        )}
                        <span
                          className="relative z-[1] mt-0.5 size-3 rounded-full shadow-[var(--shadow-ring-paper)]"
                          style={{ background: tv?.c ?? "var(--neutral-line)" }}
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
                })}
              </div>
            </div>
          ))}
          <Disclaimer />
        </div>
      )}
    </main>
  );
}
