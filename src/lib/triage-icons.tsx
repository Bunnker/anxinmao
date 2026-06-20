// 分诊「中性线性象形图」—— 自绘 SVG(非家猫卡通、非第三方库),配症状卡 / 选项做图文化。
// viewBox 24×24,stroke=currentColor、fill=none、圆角线头,与 TabBar.tsx 同手感(克制但友好)。
// 红线:绝不用桌宠橘猫或任何家猫形象做病情示意,只用概念 / 脏器 / 动作象形(见 CLAUDE.md)。
// 图标只是「图文化 + 扫读」的辅助,语义由旁边的文字标签承载;缺省回落 other(三点)。

// 每条 = 一个症状 id 对应的 svg 内层标记(继承父级 stroke/fill)。
const PATHS: Record<string, string> = {
  // 呕吐 —— 碗 + 上涌的波纹(吐)
  vomit:
    '<path d="M5 12h14"/><path d="M6.5 12a5.5 5.5 0 0 0 11 0"/><path d="M9 8.2c0-1.4 1.5-1.4 1.5 0s1.5 1.4 1.5 0 1.5-1.4 1.5 0"/>',
  // 腹泻 —— 三道松散波纹往下滴
  diarrhea:
    '<path d="M6 8c1.2-1.4 3-1.4 4.2 0s3 1.4 4.2 0 3-1.4 4.2 0"/><path d="M8 13.5c1-1.1 2.4-1.1 3.4 0s2.4 1.1 3.4 0"/><path d="M10.5 18v1.5M14 17.5v1.5"/>',
  // 不吃东西 —— 空碗 + 斜杠(拒食)
  noeat:
    '<path d="M4.5 11h12a6 6 0 0 1-12 0Z"/><path d="M10.5 11V4.5"/><path d="M16 5 7 19"/>',
  // 精神差 —— Z z z(蔫 / 不动)
  lethargy:
    '<path d="M5 7h5l-5 6h5"/><path d="M14 9h4l-4 4h4"/><path d="M5 18.5h11"/>',
  // 打喷嚏 / 流鼻涕 —— 口鼻 + 喷溅点
  sneeze:
    '<path d="M4 14c0-3.3 2.7-6 6-6 2.4 0 4 1.4 4.6 3"/><path d="M4 14c0 1.7 1.3 3 3 3h3"/><circle cx="6.5" cy="13.5" r=".4" fill="currentColor" stroke="none"/><path d="M17 9.5l2.5-1M17.5 13l2.6.4M18 16.5l2.3 1.4"/>',
  // 耳朵 —— 猫耳轮廓 + 内耳
  ear:
    '<path d="M6 18C5 12 7 5 12 5s6 7 5 13"/><path d="M9.5 16c-.6-3 .4-7 2.5-7s3.1 4 2.5 7"/>',
  // 皮肤痒 / 掉毛 —— 毛簇 + 抓痕
  skin:
    '<path d="M4 16c1-1 1-3 2-4M7 17c1-1.4 1-3.4 2-4.8M10 17.5c1-1.6 1-3.8 2-5.4"/><path d="M15 6l4 4M17 5l3 3M14.5 8.5l3.5 3.5"/>',
  // 眼睛 —— 眼形 + 瞳孔 + 泪滴
  eye:
    '<path d="M3.5 11.5c2.5-3.2 5.3-4.8 8.5-4.8s6 1.6 8.5 4.8c-2.5 3.2-5.3 4.8-8.5 4.8-1.6 0-3.1-.4-4.5-1.1"/><circle cx="12" cy="11.5" r="2.1"/><path d="M6 17.5c0 1 .8 1.8 1.6.6.5-.7-.1-1.6-.1-1.6"/>',
  // 口腔 —— 牙齿
  mouth:
    '<path d="M6 6.5h12v4c0 1.6-1 2.5-2 4l-1 4c-.3 1-1.3 1-1.6 0l-.9-3.3c-.1-.5-.9-.5-1 0L9.6 18.5c-.3 1-1.3 1-1.6 0l-1-4c-1-1.5-2-2.4-2-4Z"/>',
  // 行为突变 —— 头 + 问号(说不清的异常)
  behavior:
    '<circle cx="12" cy="12" r="8"/><path d="M9.7 9.8c0-1.4 1.1-2.3 2.4-2.3s2.3.9 2.3 2.1c0 1.6-2.2 1.8-2.2 3.4"/><circle cx="12.1" cy="16" r=".5" fill="currentColor" stroke="none"/>',
  // 跛行 / 走路异常 —— 肉垫 + 折线(瘸)
  limp:
    '<ellipse cx="9" cy="14.5" rx="3" ry="3.6"/><circle cx="6" cy="9.5" r="1.4"/><circle cx="9" cy="7.5" r="1.5"/><circle cx="12" cy="9.5" r="1.4"/><path d="M15 18.5l2-2.5 2 2.5 2-2.5"/>',
  // 小便不对劲 —— 尿滴 + 细流
  urine:
    '<path d="M12 4s5 6.2 5 9.6A5 5 0 0 1 7 13.6C7 10.2 12 4 12 4Z"/><path d="M9.5 19.5h.01M12 20.5h.01M14.5 19.5h.01"/>',
  // 误食 —— 警示三角 + 感叹号
  eat:
    '<path d="M12 4 21 19H3Z"/><path d="M12 10v4"/><circle cx="12" cy="16.5" r=".6" fill="currentColor" stroke="none"/>',
  // 呼吸怪 —— 气流波(呼吸费力)
  breath:
    '<path d="M4 9h9a2.5 2.5 0 1 0-2.5-2.5"/><path d="M4 13h13a3 3 0 1 1-3 3"/><path d="M4 17h6"/>',
  // 看到血 —— 单滴血
  blood:
    '<path d="M12 3.5s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11Z"/>',
  // 尿不出 —— 尿滴 + 斜杠(堵)
  pee:
    '<path d="M12 4s5 6.2 5 9.6a5 5 0 0 1-8.5 3.5"/><path d="M5 5l14 14"/>',
  // 其它 —— 三点
  other:
    '<circle cx="6" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
  // —— 以下为「分诊选项体征」补充图标(配 iconForOption 用)——
  // 抽搐 / 站不稳 / 意识不清 —— 闪电(神经急症)
  seizure: '<path d="M13 3 6 13h5l-2 8 9-12h-6Z"/>',
  // 瘫软 / 倒地 / 叫不醒 —— 向下到地面
  collapse:
    '<path d="M12 4v9"/><path d="M8 10l4 4 4-4"/><path d="M5 19h14"/>',
  // 牙龈 / 舌头发白发紫 —— 口 + 舌(看黏膜色)
  pale:
    '<path d="M5 9a7 5 0 0 0 14 0"/><path d="M5 9h14"/><path d="M9 9.5v1.5a3 2 0 0 0 6 0V9.5"/>',
  // 肚子鼓胀 / 腹痛 —— 圆腹 + 外胀
  belly:
    '<circle cx="12" cy="13" r="6.5"/><path d="M1.5 13h2M20.5 13h2M12 2.5v2"/>',
  // 线 / 绳 / 丝带异物 —— 双波纹(线)
  string:
    '<path d="M4 8c2.5 0 2.5 3.5 5 3.5S11.5 8 14 8s2.5 3.5 5 3.5"/><path d="M4 14c2.5 0 2.5 3.5 5 3.5S11.5 14 14 14s2.5 3.5 5 3.5"/>',
  // 发热 —— 温度计
  fever:
    '<rect x="10" y="3" width="4" height="11" rx="2"/><circle cx="12" cy="17.5" r="3"/><path d="M12 8.5v6"/>',
};

// 按选项「字面」映射体征图标(关键词,顺序=优先级:更急/更特异在前)。
// 只给描述具体体征的选项配图;次数 / 时长 / 「都没有」这类抽象项匹配不到 → 不配图(返回 null)。
export function iconForOption(label: string): string | null {
  const RULES: [RegExp, string][] = [
    [/抽搐|痉挛|站不稳|意识|转圈|乱撞/, "seizure"],
    [/瘫|倒地|叫不醒|站不起|塌软|昏/, "collapse"],
    [/牙龈|舌头|发白|发紫|发蓝|苍白|发黄|黏膜/, "pale"],
    [/喘|呼吸|张口|张嘴|憋气/, "breath"],
    [/血/, "blood"],
    [/线|绳|丝带|橡皮筋|异物/, "string"],
    [/发热|发烧|体温/, "fever"],
    [/萎靡|没精神|没什么精神|发蔫|没力气|嗜睡|蔫/, "lethargy"],
    [/不吃|没胃口|食欲|拒食/, "noeat"],
    // 注意:diarrhea(拉肚)须在 belly(肚子)之前 —— 否则「拉肚子」含「肚子」会被误判为鼓胀
    [/拉肚|腹泻|软便|水样|拉稀/, "diarrhea"],
    [/鼓胀|肚子|腹部|膨大|发硬/, "belly"],
    [/呕吐|吐了|干呕/, "vomit"],
    [/误食|中毒|舔到|吃了|吃下|啃/, "eat"],
    [/尿/, "urine"],
    [/挠耳|甩头|耳道|耳朵/, "ear"],
    [/眼|流泪|眯眼|怕光/, "eye"],
    [/口水|口臭|流涎|牙|口腔/, "mouth"],
    [/痒|掉毛|皮屑|皮肤|脱毛|结痂/, "skin"],
    [/瘸|跛|拖行|走路|负重|瘫腿/, "limp"],
  ];
  for (const [re, id] of RULES) if (re.test(label)) return id;
  return null;
}

export function SymptomIcon({
  id,
  size = 22,
  className,
}: {
  id: string;
  size?: number;
  className?: string;
}) {
  const inner = PATHS[id] ?? PATHS.other;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}

export const SYMPTOM_ICON_IDS = Object.keys(PATHS);
