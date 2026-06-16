// 小猫表情组件 —— 渲染 lib/cat-illus 的 SVG 猫脸(零依赖、可换表情)。
// 用法:<CatFace mood="relieved" size={56} /> / <CatFace sym="呕吐" /> / <CatFace eyes={EYE.happy} mouth={MOU.smile} />
// 纯渲染、无 hooks,可在 server component 直接用。
import { cat, SYM, MOOD, type CatOpts, type MoodKey } from "@/lib/cat-illus";

export function CatFace({
  size = 44,
  sym,
  mood,
  eyes,
  mouth,
  noBlush,
  className,
  style,
}: {
  size?: number;
  /** 症状卡标题(SYM 的键),如 "呕吐"、"打喷嚏 / 流鼻涕" */
  sym?: string;
  /** 情绪态:worried / relieved / sleepy */
  mood?: MoodKey;
  /** 自定义眼/嘴(用 EYE.* / MOU.*) */
  eyes?: string;
  mouth?: string;
  noBlush?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const svg =
    sym && SYM[sym]
      ? SYM[sym]
      : mood && MOOD[mood]
        ? MOOD[mood]
        : cat({ eyes, mouth, noBlush } as CatOpts);
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        lineHeight: 0,
        ...style,
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
