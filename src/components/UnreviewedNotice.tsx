// 「未经兽医审核」公示 —— 产品诚实红线。
//
// 分诊问题、选项、红旗、判级阈值依据 docs/product/分诊证据-草稿-v0.2.md
// 整理,但【尚未经执业兽医审核】。这一点必须对用户讲明白,不能只靠底部
// 那行通用免责声明带过 —— 故单独做成显眼的一条,放在分诊入口与报告页。
export function UnreviewedNotice({ className = "" }: { className?: string }) {
  return (
    <div
      className={
        "flex gap-2.5 rounded-xl border border-[var(--hairline)] bg-[var(--surface-2)] px-3.5 py-3 " +
        className
      }
    >
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        className="mt-px shrink-0 text-ink-soft"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M12 11.5v5"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
        <circle cx="12" cy="7.8" r="1.05" fill="currentColor" />
      </svg>
      <p className="text-[12px] leading-relaxed text-ink-soft">
        <strong className="font-semibold text-ink">未经兽医审核</strong>
        ——这里的分诊问题和建议,由 AI 依据公开兽医资料整理,尚未经执业兽医逐条审核。它能帮你判断「要不要去看兽医」,
        <strong className="font-semibold text-ink">但不能替代兽医的检查和诊断</strong>。
      </p>
    </div>
  );
}
