// 「经兽医审阅 · 权威来源核对」信任公示 —— 取代早期的「未经兽医审核」提示。
//
// 措辞对应实际:分诊内容逐条挂权威源(Cornell / Merck / VCA / iCatCare 等)claim_id,
// 且【经执业兽医逐条审核】(用户确认已完成)、判级刻意偏保守。仍明示不替代面诊 ——
// 即便逐条审核过,AI 整理的内容也不替代兽医对「具体这只猫」的当面检查(医疗产品诚实红线)。
export function ReviewedNotice({ className = "" }: { className?: string }) {
  return (
    <div
      className={
        "flex gap-2.5 rounded-xl border border-[var(--hairline)] bg-[var(--surface-2)] px-3.5 py-3 " +
        className
      }
    >
      {/* 盾 + 勾 —— 陶土红(accent),不用绿色(绿是风险信号层专用) */}
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        className="mt-px shrink-0 text-accent"
        aria-hidden="true"
      >
        <path
          d="M12 3l7 3v5c0 4.2-2.9 7.4-7 8.5-4.1-1.1-7-4.3-7-8.5V6l7-3z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path
          d="M9 11.8l2 2 4-4.3"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p className="text-[12px] leading-relaxed text-ink-soft">
        <strong className="font-semibold text-ink">
          经执业兽医逐条审核 · 权威来源核对
        </strong>
        ——分诊的每个问题、判级与建议都依据 Cornell、Merck、VCA、iCatCare 等权威兽医资料整理,并经执业兽医逐条审核、判级偏保守。它能帮你判断「要不要去看兽医」,
        <strong className="font-semibold text-ink">但不替代兽医的面诊和检查</strong>。
      </p>
    </div>
  );
}
