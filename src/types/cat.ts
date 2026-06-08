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
  breed?: string; // 品种(如 英短 / 布偶 / 中华田园)—— 用于品种特异风险(扁脸呼吸、波斯泪痕等)
  chronicConditions?: string; // 慢性病史(如 心脏病 / 糖尿病 / 慢性肾病)
  allergies?: string; // 过敏史(如 对鸡肉过敏 / 某药物过敏)
  homeDate: string; // ISO date
  vaccines: Vaccine[];
  deworm: string; // ISO date
  notes: string;
  // AI 生成的卡通头像 base64 dataURL,仅做身份 / 伴侣角色用。
  // 边界见 docs/product/AI生成形象-实施说明.md §二 —— 不出现在症状示意 /
  // 分诊页 / 报告主体内容,仅 greeting / 报告卡角落等位置。
  // 空字符串 / undefined = 用默认 icon 兜底。
  avatar?: string;
  // 用户上传的生活照相册 base64 dataURL。仅用于本地画像展示,不参与分诊判断。
  photos?: string[];
}

// 风险三色 —— 分诊的核心输出。
export type RiskTier = "red" | "yellow" | "green";

// 一条问答对话消息。
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// 一次分诊或问答的记录 —— 按时间累积,构成猫的"长期记忆"。
export interface CatRecord {
  id: string;
  catId: string;
  date: string; // ISO
  kind: "triage" | "behavior";
  symptom?: string; // 分诊:症状中文标签(如"呕吐"),用于「最近」列表展示
  symptomKey?: string; // 分诊:症状键(如"vomit"),用于从「最近」点回报告卡
  tier?: RiskTier; // 分诊:红/黄/绿结果
  claimIds?: string[]; // 分诊:命中的医学资料库 claim_id,给 AI 报告/追问做依据
  question?: string; // 问答:用户的问题
  conversationId?: string; // 问答:会话 id(= 记录 id),用于从「最近」点回这次聊天
  messages?: ChatMessage[]; // 问答:完整对话(localStorage / 云端存;Cookie 兜底会剔除)
  memo?: string; // 问答:对话压缩摘要 —— 恢复时还原压缩状态
  memoCount?: number; // 问答:已折叠进 memo 的消息条数
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
