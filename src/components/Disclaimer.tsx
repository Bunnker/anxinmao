// 全局免责声明 —— 每屏底部固定。产品红线:AI 不能替代兽医。
export function Disclaimer() {
  return (
    <div className="flex items-center justify-center gap-2 pt-4 text-caption tracking-[0.12em] text-ink-faint">
      <span className="h-px w-3.5 bg-[var(--hairline)]" />
      AI 整理 · 不能替代兽医
      <span className="h-px w-3.5 bg-[var(--hairline)]" />
    </div>
  );
}
