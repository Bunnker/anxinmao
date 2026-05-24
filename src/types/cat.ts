// 猫档案与分诊相关的核心类型。

export interface Vaccine {
  name: string;
  date: string; // ISO date
}

export interface Cat {
  id: string;
  name: string;
  ageMonths: number;
  sex: "雌" | "雄" | "不确定";
  coat: "短毛" | "长毛" | "无毛" | "";
  weight: number; // kg
  neutered: "是" | "否" | "暂未";
  homeDate: string; // ISO date
  vaccines: Vaccine[];
  deworm: string; // ISO date
  notes: string;
  // AI 生成的卡通头像 base64 dataURL,仅做身份 / 伴侣角色用。
  // 边界见 docs/product/AI生成形象-实施说明.md §二 —— 不出现在症状示意 /
  // 分诊页 / 报告主体内容,仅 greeting / 报告卡角落等位置。
  // 空字符串 / undefined = 用默认 icon 兜底。
  avatar?: string;
}

// 风险三色 —— 分诊的核心输出。
export type RiskTier = "red" | "yellow" | "green";

// 一次分诊或问答的记录 —— 按时间累积,构成猫的"长期记忆"。
export interface CatRecord {
  id: string;
  catId: string;
  date: string; // ISO
  kind: "triage" | "behavior";
  symptom?: string; // 分诊:症状(如"呕吐")
  tier?: RiskTier; // 分诊:红/黄/绿结果
  question?: string; // 问答:用户的问题
  summary: string; // 一句话摘要(用于"最近"列表 + 下次分诊的上下文)
  outcome?: "已就医" | "在家好转" | "未跟进";
}

// localStorage 持久化结构。
// 数据层按"多只猫"设计(留接口),MVP 的 UI 只做单猫。
export interface Store {
  cats: Cat[];
  activeCatId: string | null;
  records: CatRecord[];
}
