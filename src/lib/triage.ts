// 分诊流数据 + 判级引擎。
//
// ⚠️ 未经兽医审核 ——
//   下面的分诊问题、选项、红旗、风险阈值,依据
//   docs/product/分诊证据-草稿-v0.2.md(经「检索 + 证据核查」的草稿),
//   但【尚未经执业兽医审核】。判级刻意偏保守(拿不准即偏向"建议就医"),
//   仍【不可作为诊断依据】。App 必须向用户明示"未经兽医审核"。
import type { RiskTier } from "@/types/cat";

export interface TriageOption {
  label: string;
  weight?: number; // 风险分,用于黄 / 绿判定
  redFlag?: boolean; // 选中 → 立刻判红、分诊中途急停
}

export interface TriageQuestion {
  id: string;
  text: string;
  hint?: string;
  multi?: boolean;
  options: TriageOption[];
}

export interface TriageFlow {
  symptom: string;
  questions: TriageQuestion[];
}

export const SYMPTOM_LABELS: Record<string, string> = {
  vomit: "呕吐",
  diarrhea: "腹泻",
  noeat: "不吃东西",
  lethargy: "精神差",
  sneeze: "打喷嚏 / 流鼻涕",
  ear: "耳朵问题",
  eat: "可能误食",
  breath: "呼吸怪",
  blood: "看到血",
  pee: "尿不出",
  other: "其它情况",
};

// 跨症状「立刻送医」红旗 —— 依据 v0.2 §3.3 + docs/product/证据-anicira-急诊10信号.md §一.9。
// 任何一个被勾中 → 直接判红、分诊急停。多个流程复用这一组。
const RED_FLAG_OPTIONS: TriageOption[] = [
  { label: "呼吸急促 / 张口喘 / 喘不上气", redFlag: true },
  { label: "大量出血,或吐血、便血、尿血", redFlag: true },
  { label: "抽搐 / 站不稳 / 意识不清", redFlag: true },
  { label: "一直尿不出来", redFlag: true },
  { label: "牙龈或舌头发白、发紫", redFlag: true },
  { label: "超过 24 小时不吃不喝", redFlag: true },
  { label: "后腿突然拖行、瘫软,还大声叫", redFlag: true },
  { label: "都没有", weight: 0 },
];

// 呕吐专属流 —— 依据 v0.2 §1.1。
const vomitFlow: TriageQuestion[] = [
  {
    id: "count",
    text: "今天吐了几次?",
    hint: "从早上算到现在,看到一次算一次。",
    options: [
      { label: "1–2 次", weight: 1 },
      { label: "3 次或更多", weight: 2, redFlag: true },
      { label: "我没数清楚", weight: 2 },
    ],
  },
  {
    id: "with",
    text: "除了吐,还有下面这些吗?",
    hint: "可多选,都没有就选最后一项。",
    multi: true,
    options: [
      { label: "没什么精神 / 很萎靡", weight: 2, redFlag: true },
      { label: "不吃东西", weight: 2, redFlag: true },
      { label: "呕吐物里带血", weight: 2, redFlag: true },
      { label: "肚子鼓胀,或一碰就叫", weight: 2, redFlag: true },
      { label: "也在拉肚子", weight: 1 },
      { label: "都没有", weight: 0 },
    ],
  },
  {
    id: "string",
    text: "有没有可能吞了线、绳、丝带这类长条东西?",
    hint: "线性异物对猫很危险。",
    options: [
      { label: "应该没有", weight: 0 },
      { label: "不太确定", weight: 1 },
      { label: "很可能吞了", weight: 2, redFlag: true },
    ],
  },
  {
    id: "toxin",
    text: "最近有没有可能误食有毒的东西?",
    hint: "百合等植物、人用药、化学品…",
    options: [
      { label: "应该没有", weight: 0 },
      { label: "不太确定", weight: 1 },
      { label: "很可能误食了", weight: 2, redFlag: true },
    ],
  },
  {
    id: "flags",
    text: "有没有同时出现下面任何一个?",
    hint: "可多选 —— 这些都建议立刻就医;都没有就选最后一项。",
    multi: true,
    options: RED_FLAG_OPTIONS,
  },
];

// 通用流 —— 其余症状共用。依据 v0.2 §3.3 + 通用分诊思路。
const generalFlow: TriageQuestion[] = [
  {
    id: "now",
    text: "现在它的状态,哪个最接近?",
    options: [
      { label: "看着很难受,或一直没停", weight: 3, redFlag: true },
      { label: "有点不对劲,但还算稳定", weight: 2 },
      { label: "好像缓解了,可能是我多虑", weight: 0 },
    ],
  },
  {
    id: "since",
    text: "这个情况持续多久了?",
    options: [
      { label: "几个小时内", weight: 0 },
      { label: "一两天", weight: 1 },
      { label: "三天以上", weight: 2 },
    ],
  },
  {
    id: "flags",
    text: "有没有同时出现下面任何一个?",
    hint: "可多选 —— 这些都建议立刻就医;都没有就选最后一项。",
    multi: true,
    options: RED_FLAG_OPTIONS,
  },
];

// 误食 / 中毒专属流 —— 依据 v0.2 §3.2 + §1.1(线性异物)。
// 误食的判级核心是「吃没吃、吃了什么」,不是「现在多难受」—— 很多中毒在猫
// 还看着没事时就已在起作用(v0.2 §3.2:即使看似没事,确知误食高危物也应
// 立即就医)。故 Q1 命中高危物即红旗急停,Q2 是中毒征象安全网。
const eatFlow: TriageQuestion[] = [
  {
    id: "what",
    text: "它可能吃下、舔到、或咬破了哪种东西?",
    hint: "可多选 —— 它真的接触到的才勾;都没有就选最后一项。",
    multi: true,
    options: [
      { label: "人吃的药(止痛药、感冒药、保健品…)", weight: 2, redFlag: true },
      { label: "百合,或其它植物、鲜花(含花粉、插花的水)", weight: 2, redFlag: true },
      { label: "灭鼠药、杀虫剂、防冻液等化学品", weight: 2, redFlag: true },
      { label: "巧克力、洋葱大蒜、葡萄、木糖醇口香糖等", weight: 2, redFlag: true },
      { label: "线、绳、丝带、橡皮筋这类细长东西", weight: 2, redFlag: true },
      { label: "别的不该吃的东西(说不清,或不在上面)", weight: 2 },
      { label: "其实没有,只是担心", weight: 0 },
    ],
  },
  {
    id: "signs",
    text: "它现在有没有出现这些?",
    hint: "可多选 —— 这些都建议立刻就医;都没有就选最后一项。",
    multi: true,
    options: [
      { label: "没精神、发蔫、反应迟钝", weight: 2, redFlag: true },
      { label: "走路晃、站不稳,或发抖、抽搐", weight: 2, redFlag: true },
      { label: "流口水变多,或突然呕吐、拉肚子", weight: 2, redFlag: true },
      { label: "呼吸变快、变沉重,或张口喘", weight: 2, redFlag: true },
      { label: "牙龈或舌头发白、发黄、发紫", weight: 2, redFlag: true },
      { label: "都没有", weight: 0 },
    ],
  },
];

// 呼吸异常专属流 —— 依据 v0.2 §2.1。v0.2 强调:猫的呼吸异常一律按急症,
// 不设「在家观察」安全区间。故任何急性呼吸征象即红旗急停,最轻也是黄。
const breathFlow: TriageQuestion[] = [
  {
    id: "now",
    text: "它现在的呼吸,哪个最接近?",
    options: [
      { label: "张着嘴喘、喘不上气,或呼吸很费力", redFlag: true },
      { label: "比平时快,或感觉有点费劲", weight: 2 },
      { label: "看着还算平稳,只是我觉得不太对", weight: 1 },
    ],
  },
  {
    id: "with",
    text: "除了呼吸,还有下面这些吗?",
    hint: "可多选 —— 这些都建议立刻就医;都没有就选最后一项。",
    multi: true,
    options: [
      { label: "牙龈、舌头或鼻子发青、发紫", weight: 2, redFlag: true },
      { label: "为了呼吸,蹲着伸脖子、肘部外撑、不肯趴下", weight: 2, redFlag: true },
      { label: "肚子和胸口起伏得很用力、很明显", weight: 2, redFlag: true },
      { label: "没力气、发蔫,或一直在咳", weight: 2, redFlag: true },
      { label: "都没有", weight: 0 },
    ],
  },
  {
    id: "rate",
    text: "趁它安静或睡着,数 30 秒呼吸、再乘 2 —— 大概多少?",
    hint: "胸口一起一伏算一次。安静时正常约每分钟 15–30 次。",
    options: [
      { label: "30 次以内", weight: 0 },
      { label: "超过 30 次", weight: 2, redFlag: true },
      { label: "数不清,或它没法安静下来让我数", weight: 2 },
    ],
  },
];

// 出血专属流 —— 依据 v0.2 §2.2。v0.2 §2 把出血与呼吸 / 尿不出并列为偏急症,
// 基调保守。内出血型(吐血 / 便血 / 黑便)、压不住、休克征象、鼠药 / 外伤即红旗。
const bloodFlow: TriageQuestion[] = [
  {
    id: "where",
    text: "你看到的血,主要在哪儿?",
    hint: "可多选;不确定就把最像的勾上。",
    multi: true,
    options: [
      {
        label: "吐出来的血,或粪便、尿里带血,或粪便发黑发亮",
        weight: 2,
        redFlag: true,
      },
      { label: "口、鼻里流血", weight: 2 },
      { label: "身上有伤口在流血", weight: 1 },
      { label: "皮下有瘀青、肿块,但没破皮", weight: 2 },
    ],
  },
  {
    id: "much",
    text: "出血的情况,更像哪种?",
    options: [
      { label: "量很大(像装满一咖啡杯了),或压了十几分钟还止不住", redFlag: true },
      { label: "不算多,或已经止住了", weight: 1 },
      { label: "我没看清、说不准", weight: 2 },
    ],
  },
  {
    id: "with",
    text: "除了出血,还有这些吗?",
    hint: "可多选 —— 这些都建议立刻就医;都没有就选最后一项。",
    multi: true,
    options: [
      { label: "牙龈发白、发紫", weight: 2, redFlag: true },
      { label: "呼吸又快又浅,或没力气、站不稳", weight: 2, redFlag: true },
      { label: "最近摔过、出过车祸,或和猫狗打过架", weight: 2, redFlag: true },
      { label: "可能舔到、啃过灭鼠药", weight: 2, redFlag: true },
      { label: "都没有", weight: 0 },
    ],
  },
];

// 尿不出专属流 —— 依据 v0.2 §2.3。完全性尿道阻塞(几乎只见于公猫)是
// 数小时到数天内可致命的真急症。最关键的一题是「使劲后到底有没有尿」。
const peeFlow: TriageQuestion[] = [
  {
    id: "output",
    text: "它进猫砂盆使劲之后,有没有尿出来?",
    hint: "这一点最关键 —— 完全尿不出可能是要命的急症,公猫尤其危险。",
    options: [
      { label: "几乎尿不出,或只有几滴", redFlag: true },
      { label: "尿得出,但比平时少、或次数变多", weight: 2 },
      { label: "尿得出,但好像很不舒服,或带血", weight: 2 },
    ],
  },
  {
    id: "with",
    text: "除了尿的问题,还有这些吗?",
    hint: "可多选 —— 这些都建议立刻就医;都没有就选最后一项。",
    multi: true,
    options: [
      { label: "在猫砂盆里嚎叫,或因疼痛大叫", weight: 2, redFlag: true },
      { label: "没精神、不吃东西,或在呕吐", weight: 2, redFlag: true },
      { label: "肚子绷得紧、一碰就疼,或不停舔屁股", weight: 2, redFlag: true },
      { label: "都没有", weight: 0 },
    ],
  },
];

// 不吃东西专属流 —— 依据 v0.2 §1.3。猫厌食短至 24 小时即影响健康,
// 完全不吃超 2 天须立即就医;v0.2 称此症状基本没有「放着不管」的安全区间。
const noeatFlow: TriageQuestion[] = [
  {
    id: "how",
    text: "它不吃的情况,更像哪种?",
    options: [
      { label: "一口都不吃,水也不太喝", weight: 2 },
      { label: "比平时吃得少很多,但还吃一点", weight: 2 },
      { label: "只是不碰新换的粮,或某一种食物", weight: 1 },
    ],
  },
  {
    id: "since",
    text: "它大概多久没好好吃东西了?",
    hint: "幼猫、和本来就不太吃的猫,饿太久很伤身体。",
    options: [
      { label: "不到一天", weight: 1 },
      { label: "一天到两天", weight: 2 },
      { label: "超过两天", weight: 2, redFlag: true },
      { label: "说不准,有一阵了", weight: 2 },
    ],
  },
  {
    id: "with",
    text: "除了不吃,还有这些吗?",
    hint: "可多选 —— 这些都建议立刻就医;都没有就选最后一项。",
    multi: true,
    options: [
      { label: "没精神、发蔫,或躲起来不动", weight: 2, redFlag: true },
      { label: "动一动就僵硬,或总睡在奇怪的地方", weight: 2, redFlag: true },
      {
        label: "凑近食物又走开、咂嘴、流口水,或对着食物干呕",
        weight: 2,
        redFlag: true,
      },
      { label: "也在吐,或在拉肚子", weight: 2, redFlag: true },
      { label: "都没有", weight: 0 },
    ],
  },
];

// 腹泻专属流 —— 依据 v0.2 §1.2。黑柏油便(melaena)即红旗;便血按 v0.2
// 保守草稿归「尽快就医」(新手难判断血量);全身征象、反复呕吐 + 腹泻即红旗。
const diarrheaFlow: TriageQuestion[] = [
  {
    id: "look",
    text: "它拉的便便,最接近哪种?",
    options: [
      { label: "粪便发黑,或像柏油一样黑亮", weight: 2, redFlag: true },
      { label: "很稀、像水,量大、次数也多", weight: 2 },
      { label: "比平时软、不太成形,但不算严重", weight: 1 },
    ],
  },
  {
    id: "with",
    text: "除了拉肚子,还有下面这些吗?",
    hint: "可多选 —— 有这些都要让兽医尽快看;都没有就选最后一项。",
    multi: true,
    options: [
      { label: "便便里带血(红色血丝、血点)", weight: 2 },
      { label: "也在吐,或反复吐个不停", weight: 2, redFlag: true },
      { label: "没精神、发蔫,或不太吃东西", weight: 2, redFlag: true },
      { label: "肚子一碰就叫、弓着背,或身上发烫", weight: 2, redFlag: true },
      { label: "整个塌下去没力气,或嘴干、眼窝发陷", weight: 2, redFlag: true },
      { label: "都没有", weight: 0 },
    ],
  },
  {
    id: "since",
    text: "这样拉肚子,持续多久了?",
    hint: "幼猫拉久了,脱水会很快。",
    options: [
      { label: "今天才开始,或就几个小时", weight: 0 },
      { label: "一两天", weight: 1 },
      { label: "超过两天", weight: 2 },
      { label: "说不准,反正有一阵了", weight: 2 },
    ],
  },
];

// 打喷嚏 / 上呼吸道感染专属流 —— 依据 docs/product/证据-cat-uri-上呼吸道感染.md。
// 病原(FHV / FCV / 衣原体 / 支原体 / Bordetella)只能由兽医做 PCR / 拭子确诊;
// 这里识别「像 URI」的模式 + 引导就医,绝不做病原诊断。Q2 里嘴里溃疡 / 完全不吃 /
// 张口喘 = 红旗(对应严重 FCV / 严重感染 / 已进展到下呼吸道)。
const sneezeFlow: TriageQuestion[] = [
  {
    id: "freq",
    text: "它打喷嚏的情况,哪种最接近?",
    options: [
      { label: "偶尔打一两个,平时正常", weight: 0 },
      { label: "一阵一阵打,中间有缓解", weight: 1 },
      { label: "一直在打,或一天打很多次", weight: 2 },
    ],
  },
  {
    id: "with",
    text: "除了打喷嚏,还有这些吗?",
    hint: "可多选 —— 有些是急症;都没有就选最后一项。",
    multi: true,
    options: [
      { label: "流鼻涕、鼻子结鼻屎", weight: 1 },
      { label: "眼睛红 / 流泪,或眼角有黄、绿色分泌物", weight: 2 },
      { label: "鼻涕黄 / 绿 / 带血", weight: 2 },
      { label: "嘴里有溃疡、流口水、不愿吃硬粮", weight: 2, redFlag: true },
      { label: "明显不吃东西,或活动量明显减少", weight: 2, redFlag: true },
      { label: "呼吸费力、张口喘", weight: 2, redFlag: true },
      { label: "都没有", weight: 0 },
    ],
  },
  {
    id: "since",
    text: "这样多久了?",
    options: [
      { label: "今天才开始,或一两天", weight: 0 },
      { label: "三五天", weight: 1 },
      { label: "超过一周", weight: 2 },
      { label: "时好时坏,反复出现(可能是 FHV 应激复发型)", weight: 2 },
    ],
  },
];

// 耳朵问题专属流 —— 依据 docs/product/证据-cat-ear-耳朵问题.md(Cornell + Merck)。
// Q2 里头歪 / 平衡 / 眼震 / 面神经 / 耳廓肿胀 / 极度拒触 = 红旗(对应中耳 /
// 内耳 / 面神经 / 耳血肿这些可能不可逆的并发症)。App 不诊断具体病原,只引导兽医。
const earFlow: TriageQuestion[] = [
  {
    id: "state",
    text: "它耳朵的情况,哪种最接近?",
    options: [
      { label: "偶尔挠一下耳朵,平时正常", weight: 0 },
      { label: "明显挠耳、甩头,耳里能看到一些东西", weight: 1 },
      { label: "一直挠 / 甩头,耳里有明显分泌物或气味", weight: 2 },
    ],
  },
  {
    id: "with",
    text: "除了挠耳 / 甩头,还有这些吗?",
    hint: "可多选 —— 神经类信号是真急症;都没有就选最后一项。",
    multi: true,
    options: [
      { label: "耳里有像咖啡渣的黑色分泌物", weight: 2 },
      { label: "耳里黄 / 褐色分泌物,带臭味", weight: 2 },
      { label: "耳廓突然肿胀、变厚(可能耳血肿)", weight: 2, redFlag: true },
      { label: "头持续歪向一侧、走路转圈,或跳不上去了", weight: 2, redFlag: true },
      { label: "眼球快速左右晃动", weight: 2, redFlag: true },
      {
        label: "嘴歪、眨不了眼、眼睑下垂、第三眼睑突出",
        weight: 2,
        redFlag: true,
      },
      { label: "完全不让碰耳朵,或一碰就尖叫", weight: 2, redFlag: true },
      { label: "都没有", weight: 0 },
    ],
  },
  {
    id: "since",
    text: "这样多久了?",
    options: [
      { label: "几天", weight: 0 },
      { label: "一两周", weight: 1 },
      { label: "超过两周,或时好时坏反复出现", weight: 2 },
    ],
  },
];

// 症状 → 分诊流。未列出的(精神差 / 其它)走通用流。
const FLOWS: Record<string, TriageQuestion[]> = {
  vomit: vomitFlow,
  diarrhea: diarrheaFlow,
  eat: eatFlow,
  breath: breathFlow,
  blood: bloodFlow,
  pee: peeFlow,
  noeat: noeatFlow,
  sneeze: sneezeFlow,
  ear: earFlow,
};

export function getFlow(symptom: string): TriageFlow {
  const known = symptom in SYMPTOM_LABELS ? symptom : "other";
  return {
    symptom: known,
    questions: FLOWS[known] ?? generalFlow,
  };
}

// 当前这一题的选择里,有没有红旗选项(用于分诊中途急停)。
export function hasRedFlag(q: TriageQuestion, selected: number[]): boolean {
  return selected.some((i) => q.options[i]?.redFlag === true);
}

// 偏急症的症状 —— 依据 v0.2 §2(呼吸异常 / 出血 / 尿不出均属急症)、
// §1.3(不吃东西没有「放着不管」的安全区间)。这些症状即便每题都答得还行,
// 判级也【不给绿档】—— 最轻也是黄(建议尽快就医)。
// (误食走专属流 eatFlow,由其红旗选项把关,「确实没吃到」时可正常判绿。)
const NO_GREEN_SYMPTOMS: ReadonlySet<string> = new Set([
  "breath",
  "pee",
  "blood",
  "noeat",
]);

// 综合判级。红旗任意命中 → 红;否则按风险分给黄 / 绿。
// 阈值刻意偏保守:有任何不轻的分(≥2)即归黄,只有近乎无异常才归绿;
// 且偏急症的症状(见 NO_GREEN_SYMPTOMS)直接封掉绿档。
export function decideTier(flow: TriageFlow, answers: number[][]): RiskTier {
  let red = false;
  let score = 0;
  flow.questions.forEach((q, i) => {
    (answers[i] ?? []).forEach((optIdx) => {
      const opt = q.options[optIdx];
      if (!opt) return;
      if (opt.redFlag) red = true;
      score += opt.weight ?? 0;
    });
  });
  if (red) return "red";
  if (score >= 2) return "yellow";
  return NO_GREEN_SYMPTOMS.has(flow.symptom) ? "yellow" : "green";
}
