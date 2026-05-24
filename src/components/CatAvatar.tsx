// 猫卡通头像展示 —— 有 avatar(base64 dataURL)就显示生成的图,
// 没有就回退到默认 icon。仅做身份 / 伴侣角色用,不出现在症状示意位置。
// 边界:docs/product/AI生成形象-实施说明.md §二

type Props = {
  /** 由 /api/avatar 生成的 base64 dataURL,空 = 用默认 icon */
  avatar?: string;
  /** alt 文字,默认空(纯装饰);若有意义请传(如猫名) */
  name?: string;
  /** 渲染尺寸 px,默认 36(首页 header 同尺寸) */
  size?: number;
  /** 额外样式 hook(边框、阴影等) */
  className?: string;
};

export function CatAvatar({ avatar, name, size = 36, className = "" }: Props) {
  const base =
    "grid place-items-center rounded-full border border-[var(--line)] bg-surface overflow-hidden shrink-0";
  const style = { width: size, height: size };

  if (avatar) {
    return (
      <span className={`${base} ${className}`} style={style}>
        {/* 使用原生 img:base64 dataURL 不需要 Next/Image 优化 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatar}
          alt={name ? `${name}的卡通形象` : ""}
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  // 默认猫脸 icon —— 用之前 home page header 那个人形 icon 的替代风格。
  // 简化的猫头(三角耳 + 圆脸 + 胡须),线稿。
  const iconSize = Math.round(size * 0.55);
  return (
    <span
      className={`${base} text-ink-soft ${className}`}
      style={style}
      aria-hidden={!name}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        {/* 猫头 + 三角耳 */}
        <path
          d="M5 8l2 4M19 8l-2 4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="12" cy="13" r="5" stroke="currentColor" strokeWidth="1.5" />
        {/* 眼睛 + 鼻子 */}
        <circle cx="10" cy="12.5" r="0.6" fill="currentColor" />
        <circle cx="14" cy="12.5" r="0.6" fill="currentColor" />
        <path
          d="M12 14.5l-0.8 0.8M12 14.5l0.8 0.8"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
