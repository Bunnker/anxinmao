// 分诊流数据 + 判级引擎。
//
// 下面的分诊问题、选项、红旗、风险阈值,依据 docs/product/分诊证据-草稿-v0.2.md
// 与 docs/medical 资料卡维护,并已按权威资料核对和执业兽医审阅。判级仍刻意偏保守
// (拿不准即偏向"建议就医"),不可作为诊断依据。
import type { RiskTier } from "@/types/cat";

export interface TriageOption {
  label: string;
  weight?: number; // 风险分,用于黄 / 绿判定
  redFlag?: boolean; // 选中 → 立刻判红、分诊中途急停
  exclusive?: boolean; // 多选题的「否定 / 兜底」项:选它 → 清空其它;选其它 → 自动取消它
  claim?: string; // 依据的医学 claim_id(单条),挂到 docs/medical 的病情卡;见 npm run triage:check
  claims?: string[]; // 依据的多条 claim_id
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
  skin: "皮肤痒 / 掉毛",
  eye: "眼睛问题",
  mouth: "口腔问题",
  behavior: "行为突变",
  limp: "跛行 / 走路异常",
  eat: "可能误食",
  breath: "呼吸怪",
  blood: "看到血",
  pee: "尿不出",
  urine: "小便不对劲",
  other: "其它情况",
};

// 跨症状「立刻送医」红旗 —— 依据 v0.2 §3.3 + docs/product/证据-anicira-急诊10信号.md §一.9。
// 任何一个被勾中 → 直接判红、分诊急停。多个流程复用这一组。
const RED_FLAG_OPTIONS: TriageOption[] = [
  { label: "呼吸急促 / 张口喘 / 喘不上气", redFlag: true, claims: ["emg_001", "emg_002"] },
  { label: "大量出血,或吐血、便血、尿血", redFlag: true, claims: ["emg_003", "emg_004"] },
  { label: "抽搐 / 站不稳 / 意识不清", redFlag: true, claims: ["emg_005", "emg_006"] },
  { label: "一直尿不出来", redFlag: true, claim: "emg_007" },
  { label: "牙龈或舌头发白、发黄、发紫", redFlag: true, claim: "emg_009" },
  { label: "皮肤捏起来回弹很慢,或眼窝发陷(明显脱水)", redFlag: true, claim: "emg_009" },
  { label: "超过 24 小时不吃不喝", redFlag: true, claim: "emg_012" },
  { label: "后腿突然拖行、瘫软,还大声叫", redFlag: true, claim: "emg_010" },
  { label: "都没有", weight: 0, exclusive: true },
];

// 呕吐专属流 —— 依据 v0.2 §1.1。
const vomitFlow: TriageQuestion[] = [
  {
    id: "count",
    text: "今天吐了几次?",
    hint: "从早上算到现在,看到一次算一次。",
    options: [
      { label: "1–2 次", weight: 1, claim: "vom_001" },
      { label: "3 次或更多", weight: 2, redFlag: true, claims: ["vom_002", "vom_005"] },
      { label: "我没数清楚", weight: 2, claim: "vom_002" },
    ],
  },
  {
    id: "with",
    text: "除了吐,还有下面这些吗?",
    hint: "可多选,都没有就选最后一项。",
    multi: true,
    options: [
      { label: "没什么精神 / 很萎靡", weight: 2, claim: "vom_005" },
      { label: "不吃东西", weight: 2, claim: "vom_005" },
      { label: "呕吐物里带血", weight: 2, redFlag: true, claims: ["vom_005", "emg_003"] },
      { label: "肚子鼓胀,或一碰就叫", weight: 2, redFlag: true, claims: ["vom_005", "vom_006"] },
      { label: "也在拉肚子", weight: 1, claim: "vom_007" },
      { label: "都没有", weight: 0, exclusive: true },
    ],
  },
  {
    id: "string",
    text: "有没有可能吞了线、绳、丝带这类长条东西?",
    hint: "线性异物对猫很危险。",
    options: [
      { label: "应该没有", weight: 0 },
      { label: "不太确定", weight: 1, claim: "vom_009" },
      { label: "很可能吞了", weight: 2, redFlag: true, claim: "vom_009" },
    ],
  },
  {
    id: "toxin",
    text: "最近有没有可能误食有毒的东西?",
    hint: "百合等植物、人用药、化学品…",
    options: [
      { label: "应该没有", weight: 0 },
      { label: "不太确定", weight: 1, claim: "vom_008" },
      { label: "很可能误食了", weight: 2, redFlag: true, claim: "vom_008" },
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
      { label: "看着很难受、叫不醒、站不起来,或一直没停", weight: 3, redFlag: true, claims: ["leth_006", "emg_006"] },
      { label: "有点不对劲,但还算稳定", weight: 2, claims: ["leth_001", "leth_002"] },
      { label: "好像缓解了,可能是我多虑", weight: 0, claims: ["leth_001", "leth_013"] },
    ],
  },
  {
    id: "since",
    text: "这个情况持续多久了?",
    options: [
      { label: "几个小时内", weight: 0, claim: "leth_013" },
      { label: "一两天", weight: 1, claim: "leth_013" },
      { label: "三天以上", weight: 2, claim: "leth_013" },
    ],
  },
  {
    id: "context",
    text: "为了判断能不能先观察,这些情况有吗?",
    hint: "可多选 —— 这些会明显缩短观察窗口;都没有就选最后一项。",
    multi: true,
    options: [
      { label: "张口喘、呼吸很快 / 很费力", weight: 2, redFlag: true, claims: ["leth_007", "emg_001"] },
      { label: "牙龈、舌头或眼白发白、发黄、发蓝紫", weight: 2, redFlag: true, claims: ["leth_005", "emg_009"] },
      { label: "皮肤捏起来回弹慢、眼窝发陷,或明显不喝水", weight: 2, redFlag: true, claims: ["leth_004", "emg_009"] },
      { label: "不正常吃东西接近或超过 24 小时", weight: 2, redFlag: true, claims: ["leth_003", "emg_012"] },
      { label: "频繁蹲猫砂盆,但尿不出或只有几滴", weight: 2, redFlag: true, claims: ["leth_008", "emg_007"] },
      { label: "幼猫 / 未免疫,还伴随呕吐、腹泻、发热感或不吃", weight: 2, redFlag: true, claims: ["leth_009", "leth_010", "leth_011"] },
      { label: "都没有", weight: 0, exclusive: true },
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
      { label: "人吃的药(止痛药、感冒药、保健品…)", weight: 2, redFlag: true, claims: ["tox_003", "tox_004"] },
      { label: "百合,或其它植物、鲜花(含花粉、插花的水)", weight: 2, redFlag: true, claim: "tox_005" },
      { label: "灭鼠药、杀虫剂、防冻液等化学品", weight: 2, redFlag: true, claims: ["tox_002", "tox_010"] },
      { label: "巧克力、洋葱大蒜、葡萄、木糖醇口香糖等", weight: 2, redFlag: true, claims: ["tox_006", "tox_007", "tox_008"] },
      { label: "线、绳、丝带、橡皮筋这类细长东西", weight: 2, redFlag: true, claim: "tox_011" },
      { label: "别的不该吃的东西(说不清,或不在上面)", weight: 2, claims: ["tox_012", "tox_014"] },
      { label: "其实没有,只是担心", weight: 0, exclusive: true },
    ],
  },
  {
    id: "signs",
    text: "它现在有没有出现这些?",
    hint: "可多选 —— 这些都建议立刻就医;都没有就选最后一项。",
    multi: true,
    options: [
      { label: "没精神、发蔫、反应迟钝", weight: 2, redFlag: true, claims: ["tox_001", "emg_006"] },
      { label: "走路晃、站不稳,或发抖、抽搐", weight: 2, redFlag: true, claims: ["tox_001", "emg_005"] },
      { label: "流口水变多,或突然呕吐、拉肚子", weight: 2, redFlag: true, claim: "tox_001" },
      { label: "呼吸变快、变沉重,或张口喘", weight: 2, redFlag: true, claims: ["tox_001", "emg_001"] },
      { label: "牙龈或舌头发白、发黄、发紫", weight: 2, redFlag: true, claims: ["tox_001", "emg_009"] },
      { label: "都没有", weight: 0, exclusive: true },
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
      { label: "张着嘴喘、喘不上气,或呼吸很费力", redFlag: true, claims: ["bre_001", "bre_004", "emg_001"] },
      { label: "比平时快,或感觉有点费劲", weight: 2, redFlag: true, claims: ["bre_002", "bre_003"] },
      { label: "看着还算平稳,只是我觉得不太对", weight: 1, claim: "bre_007" },
    ],
  },
  {
    id: "with",
    text: "除了呼吸,还有下面这些吗?",
    hint: "可多选 —— 这些都建议立刻就医;都没有就选最后一项。",
    multi: true,
    options: [
      { label: "牙龈、舌头或鼻子发青、发紫", weight: 2, redFlag: true, claims: ["bre_004", "emg_001"] },
      { label: "为了呼吸,蹲着伸脖子、肘部外撑、不肯趴下", weight: 2, redFlag: true, claims: ["bre_001", "bre_002"] },
      { label: "肚子和胸口起伏得很用力、很明显", weight: 2, redFlag: true, claims: ["bre_001", "bre_002"] },
      { label: "没力气、发蔫,或一直在咳", weight: 2, redFlag: true, claims: ["bre_005", "emg_006"] },
      { label: "都没有", weight: 0, exclusive: true },
    ],
  },
  {
    id: "rate",
    text: "趁它安静或睡着,数 30 秒呼吸、再乘 2 —— 大概多少?",
    hint: "胸口一起一伏算一次。安静时正常约每分钟 15–30 次。",
    options: [
      { label: "30 次以内", weight: 0, claim: "bre_007" },
      { label: "超过 30 次", weight: 2, redFlag: true, claims: ["bre_001", "bre_004"] },
      { label: "数不清,或它没法安静下来让我数", weight: 2, claim: "bre_001" },
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
        claims: ["bld_012", "emg_003"],
      },
      { label: "口、鼻里流血", weight: 2, claim: "bld_007" },
      { label: "身上有伤口在流血", weight: 1, claims: ["bld_003", "bld_009"] },
      { label: "皮下有瘀青、肿块,但没破皮", weight: 2, claim: "bld_010" },
    ],
  },
  {
    id: "much",
    text: "出血的情况,更像哪种?",
    options: [
      { label: "量很大(像装满一咖啡杯了),或压了十几分钟还止不住", redFlag: true, claims: ["bld_004", "emg_004"] },
      { label: "不算多,或已经止住了", weight: 1, claim: "bld_003" },
      { label: "我没看清、说不准", weight: 2, claim: "bld_004" },
    ],
  },
  {
    id: "with",
    text: "除了出血,还有这些吗?",
    hint: "可多选 —— 这些都建议立刻就医;都没有就选最后一项。",
    multi: true,
    options: [
      { label: "牙龈发白、发紫", weight: 2, redFlag: true, claims: ["bld_002", "emg_009"] },
      { label: "呼吸又快又浅,或没力气、站不稳", weight: 2, redFlag: true, claims: ["bld_002", "emg_006"] },
      { label: "最近摔过、出过车祸,或和猫狗打过架", weight: 2, redFlag: true, claim: "bld_006" },
      { label: "可能舔到、啃过灭鼠药", weight: 2, redFlag: true, claims: ["bld_010", "bld_011", "emg_008"] },
      { label: "肚子明显膨大、发硬(可能腹腔内出血)", weight: 2, redFlag: true, claims: ["bld_001", "bld_006"] },
      { label: "身上扎着 / 插着异物(先别拔)", weight: 2, redFlag: true, claim: "bld_005" },
      { label: "都没有", weight: 0, exclusive: true },
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
      { label: "几乎尿不出,或只有几滴", redFlag: true, claims: ["uo_001", "uo_002"] },
      { label: "尿得出,但比平时少、或次数变多", weight: 2, claims: ["uo_006", "uo_007"] },
      { label: "尿得出,但好像很不舒服,或带血", weight: 2, claim: "uo_007" },
    ],
  },
  {
    id: "with",
    text: "除了尿的问题,还有这些吗?",
    hint: "可多选 —— 这些都建议立刻就医;都没有就选最后一项。",
    multi: true,
    options: [
      { label: "在猫砂盆里嚎叫,或因疼痛大叫", weight: 2, redFlag: true, claim: "uo_003" },
      { label: "没精神、不吃东西,或在呕吐", weight: 2, redFlag: true, claim: "uo_004" },
      { label: "肚子绷得紧、一碰就疼,或不停舔屁股", weight: 2, redFlag: true, claims: ["uo_003", "uo_004"] },
      { label: "它是公猫,而且这次尿费劲、尿量明显变少", weight: 2, redFlag: true, claim: "uo_005" },
      { label: "都没有", weight: 0, exclusive: true },
    ],
  },
];

// 小便不对劲专属流 —— 入口给「尿得出但不正常」的猫(尿频 / 尿血 / 尿痛 / 乱尿,多为
// FLUTD / 特发性膀胱炎 / 结石),与「尿不出」尿闭卡互补:撞到尿不出 / 嚎叫 / 系统症状 /
// 公猫尿少 → 自动升红。复用尿闭(uo)证据底稿:FLUTD 黄档 uo_006/uo_007,尿闭红旗 uo_001~005。
const urineFlow: TriageQuestion[] = [
  {
    id: "what",
    text: "它的小便,最近哪里不对劲?",
    hint: "可多选;勾到要紧的会直接提示就医,都没有就选最后一项。",
    multi: true,
    options: [
      {
        label: "频繁进猫砂盆使劲,却几乎尿不出 / 只有几滴",
        weight: 2,
        redFlag: true,
        claims: ["uo_001", "uo_002"],
      },
      { label: "尿里有血,或尿色发红 / 发褐", weight: 2, claim: "uo_007" },
      { label: "尿次数变多、每次只尿一点点", weight: 2, claims: ["uo_006", "uo_007"] },
      { label: "排尿时用力、姿势别扭、好像疼", weight: 2, claim: "uo_007" },
      { label: "突然在猫砂盆外乱尿", weight: 2, claim: "uo_007" },
      { label: "频繁舔舐下体 / 尿道口", weight: 1, claim: "uo_007" },
      { label: "都没有 / 说不清", weight: 0, exclusive: true },
    ],
  },
  {
    id: "with",
    text: "除了小便,还有这些吗?",
    hint: "可多选 —— 这些都建议立刻就医;都没有就选最后一项。",
    multi: true,
    options: [
      { label: "在猫砂盆里嚎叫,或排尿时痛得大叫", weight: 2, redFlag: true, claim: "uo_003" },
      { label: "没精神、不吃东西,或在呕吐", weight: 2, redFlag: true, claim: "uo_004" },
      { label: "肚子绷得紧、一碰就疼,或不停舔屁股", weight: 2, redFlag: true, claims: ["uo_003", "uo_004"] },
      { label: "它是公猫,而且这次尿费劲、尿量明显变少", weight: 2, redFlag: true, claim: "uo_005" },
      { label: "都没有", weight: 0, exclusive: true },
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
      { label: "一口都不吃,水也不太喝", weight: 2, claims: ["ano_001", "ano_005"] },
      { label: "比平时吃得少很多,但还吃一点", weight: 2, claim: "ano_007" },
      { label: "只是不碰新换的粮,或某一种食物", weight: 1, claims: ["ano_007", "ano_009"] },
    ],
  },
  {
    id: "since",
    text: "它大概多久没好好吃东西了?",
    hint: "幼猫、和本来就不太吃的猫,饿太久很伤身体。",
    options: [
      { label: "不到一天", weight: 1, claim: "ano_007" },
      { label: "一天到两天", weight: 2, claim: "ano_001" },
      { label: "超过两天", weight: 2, redFlag: true, claim: "ano_003" },
      { label: "说不准,有一阵了", weight: 2, claims: ["ano_001", "ano_003"] },
    ],
  },
  {
    id: "with",
    text: "除了不吃,还有这些吗?",
    hint: "可多选 —— 这些都建议立刻就医;都没有就选最后一项。",
    multi: true,
    options: [
      { label: "没精神、发蔫,或躲起来不动", weight: 2, redFlag: true, claims: ["ano_005", "emg_006"] },
      { label: "动一动就僵硬,或总睡在奇怪的地方", weight: 2, claim: "ano_005" },
      {
        label: "凑近食物又走开、咂嘴、流口水,或对着食物干呕",
        weight: 2,
        claim: "ano_006",
      },
      { label: "也在吐,或在拉肚子", weight: 2, redFlag: true, claim: "ano_005" },
      { label: "很小的奶猫(还没断奶 / 一个多月大),已经半天左右没吃", weight: 2, redFlag: true, claim: "ano_002" },
      { label: "它明显偏胖 / 超重(超重猫饿久了容易脂肪肝)", weight: 2, claim: "ano_004" },
      { label: "都没有", weight: 0, exclusive: true },
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
      { label: "粪便发黑,或像柏油一样黑亮", weight: 2, redFlag: true, claim: "dia_006" },
      { label: "很稀、像水,量大、次数也多", weight: 2, claims: ["dia_004", "dia_008"] },
      { label: "比平时软、不太成形,但不算严重", weight: 1, claims: ["dia_001", "dia_002"] },
    ],
  },
  {
    id: "with",
    text: "除了拉肚子,还有下面这些吗?",
    hint: "可多选 —— 有这些都要让兽医尽快看;都没有就选最后一项。",
    multi: true,
    options: [
      { label: "便便里带血(红色血丝、血点)", weight: 2, claim: "dia_006" },
      { label: "便血量大、有血块,或反复血便", weight: 2, redFlag: true, claims: ["dia_004", "emg_003"] },
      { label: "也在吐,或反复吐个不停", weight: 2, redFlag: true, claim: "dia_004" },
      { label: "没精神、发蔫,或不太吃东西", weight: 2, claims: ["dia_004", "dia_005"] },
      { label: "肚子一碰就叫、弓着背,或身上发烫", weight: 2, redFlag: true, claim: "dia_005" },
      { label: "整个塌下去没力气,或嘴干、眼窝发陷", weight: 2, redFlag: true, claims: ["dia_005", "emg_009"] },
      { label: "很小的奶猫(一个多月大),在拉稀", weight: 2, claim: "dia_010" },
      { label: "都没有", weight: 0, exclusive: true },
    ],
  },
  {
    id: "since",
    text: "这样拉肚子,持续多久了?",
    hint: "幼猫拉久了,脱水会很快。",
    options: [
      { label: "今天才开始,或就几个小时", weight: 0 },
      { label: "一两天", weight: 1, claim: "dia_003" },
      { label: "超过两天", weight: 2, claims: ["dia_003", "dia_007"] },
      { label: "说不准,反正有一阵了", weight: 2, claim: "dia_007" },
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
      { label: "偶尔打一两个,平时正常", weight: 0, claims: ["uri_006", "uri_007"] },
      { label: "一阵一阵打,中间有缓解", weight: 1, claim: "uri_002" },
      { label: "一直在打,或一天打很多次", weight: 2, claim: "uri_002" },
    ],
  },
  {
    id: "with",
    text: "除了打喷嚏,还有这些吗?",
    hint: "可多选 —— 有些是急症;都没有就选最后一项。",
    multi: true,
    options: [
      { label: "流鼻涕、鼻子结鼻屎", weight: 1, claim: "uri_002" },
      { label: "眼睛红 / 流泪,或眼角有黄、绿色分泌物", weight: 2, claims: ["uri_002", "uri_008"] },
      { label: "鼻涕黄 / 绿 / 带血", weight: 2, claim: "uri_008" },
      { label: "嘴里有溃疡、流口水、不愿吃硬粮", weight: 2, redFlag: true, claim: "uri_003" },
      { label: "明显不吃东西,或活动量明显减少", weight: 2, redFlag: true, claims: ["uri_002", "uri_009"] },
      { label: "呼吸费力、张口喘", weight: 2, redFlag: true, claims: ["uri_001", "emg_001"] },
      { label: "都没有", weight: 0, exclusive: true },
    ],
  },
  {
    id: "since",
    text: "这样多久了?",
    options: [
      { label: "今天才开始,或一两天", weight: 0, claim: "uri_007" },
      { label: "三五天", weight: 1, claim: "uri_010" },
      { label: "超过一周", weight: 2, claim: "uri_010" },
      { label: "时好时坏,反复出现(可能是 FHV 应激复发型)", weight: 1, claim: "uri_011" },
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
      { label: "偶尔挠一下耳朵,平时正常", weight: 0, claim: "ear_007" },
      { label: "明显挠耳、甩头,耳里能看到一些东西", weight: 1, claims: ["ear_001", "ear_004"] },
      { label: "一直挠 / 甩头,耳里有明显分泌物或气味", weight: 2, claims: ["ear_001", "ear_004"] },
    ],
  },
  {
    id: "with",
    text: "除了挠耳 / 甩头,还有这些吗?",
    hint: "可多选 —— 红旗项建议立刻就医;都没有就选最后一项。",
    multi: true,
    options: [
      { label: "耳里有像咖啡渣的黑色分泌物", weight: 2, claim: "ear_001" },
      { label: "耳里黄 / 褐色分泌物,带臭味", weight: 2, claims: ["ear_001", "ear_004"] },
      { label: "耳廓突然肿胀、变厚(可能耳血肿)", weight: 2, redFlag: true, claims: ["ear_004", "ear_010"] },
      { label: "头持续歪向一侧、走路转圈,或跳不上去了", weight: 2, redFlag: true, claims: ["ear_008", "ear_009"] },
      { label: "眼球快速左右晃动", weight: 2, redFlag: true, claims: ["ear_008", "ear_009"] },
      {
        label: "嘴歪、眨不了眼、眼睑下垂、第三眼睑突出",
        weight: 2,
        redFlag: true,
        claim: "ear_008",
      },
      { label: "完全不让碰耳朵,或一碰就尖叫", weight: 2, redFlag: true, claims: ["ear_004", "ear_010"] },
      { label: "都没有", weight: 0, exclusive: true },
    ],
  },
  {
    id: "since",
    text: "这样多久了?",
    options: [
      { label: "几天", weight: 0 },
      { label: "一两周", weight: 1, claim: "ear_010" },
      { label: "超过两周,或时好时坏反复出现", weight: 2, claim: "ear_010" },
    ],
  },
];

// 皮肤问题专属流 —— 依据 docs/product/证据-cat-skin-皮肤问题.md(Cornell + Merck)。
// 涵盖猫癣 / 跳蚤 / 过敏 / 过度梳理 / 自家伤口。Q2 里「家人皮肤也出现红痒圈」
// 是黄档人畜共患提示;开放伤口流脓 / 精神差不吃 / 幼猫蚤贫血风险才是红旗。
const skinFlow: TriageQuestion[] = [
  {
    id: "look",
    text: "皮肤问题主要长什么样?",
    options: [
      { label: "局部脱毛 + 皮屑、结痂、皮肤发红", weight: 2, claim: "skin_008" },
      { label: "全身大面积痒,一直挠或蹭家具", weight: 2, claim: "skin_016" },
      { label: "皮肤上有伤口、流脓、结痂", weight: 2, claims: ["skin_010", "skin_015"] },
      { label: "只是毛粗糙、皮屑多一点,没明显病灶", weight: 1, claim: "skin_021" },
    ],
  },
  {
    id: "with",
    text: "除了皮肤本身,还有这些吗?",
    hint: "可多选 —— 红旗项建议立刻就医;都没有就选最后一项。",
    multi: true,
    options: [
      {
        label: "我自己 / 家人皮肤上也出现了红痒圈、脱皮",
        weight: 2,
        claim: "skin_003",
      },
      {
        label: "毛根能看到跳蚤,或皮屑里有黑色小颗粒(跳蚤粪)",
        weight: 2,
        claim: "skin_014",
      },
      { label: "猫一直舔同一个地方,把毛舔秃了", weight: 2, claim: "skin_016" },
      { label: "皮肤变厚、变色、闻到异味", weight: 2, claim: "skin_011" },
      { label: "猫精神变差、不太吃东西", weight: 2, redFlag: true, claims: ["skin_004", "skin_017"] },
      {
        label: "有明显伤口在流血 / 流脓 / 红肿发热",
        weight: 2,
        redFlag: true,
        claims: ["skin_010", "skin_015"],
      },
      {
        label: "疑似跳蚤,而且是很小的奶猫、已经很虚弱或牙龈发白(跳蚤会让小猫贫血)",
        weight: 2,
        redFlag: true,
        claims: ["skin_014", "emg_009"],
      },
      { label: "都没有", weight: 0, exclusive: true },
    ],
  },
  {
    id: "flags",
    text: "有没有同时出现下面任何一个?",
    hint: "可多选 —— 这些都建议立刻就医;都没有就选最后一项。",
    multi: true,
    options: RED_FLAG_OPTIONS,
  },
  {
    id: "since",
    text: "这样多久了?",
    options: [
      { label: "几天", weight: 0, claim: "skin_021" },
      { label: "一两周", weight: 1, claim: "skin_021" },
      { label: "超过两周,或反复出现", weight: 2, claim: "skin_021" },
    ],
  },
];

// 眼睛问题专属流 —— 依据 docs/product/证据-cat-eye-眼睛问题.md(Cornell)。
// 多数结膜炎可控,但必须由兽医做 fluorescein 染色排除角膜溃疡(可致失明)。
// Q1 / Q2 里的「眯眼揉眼怕光」「角膜混浊」「第三眼睑突出」「外伤后」「视力像异常」
// 都是红旗 —— 指向角膜溃疡或眼内问题,延误可不可逆。
const eyeFlow: TriageQuestion[] = [
  {
    id: "look",
    text: "眼睛主要长什么样?",
    options: [
      { label: "只是流眼泪、眼角有点分泌物", weight: 1, claims: ["eye_001", "eye_003"] },
      { label: "眼睛红肿、分泌物变多", weight: 2, claim: "eye_001" },
      {
        label: "眯眼不睁、一直揉、对光线敏感",
        weight: 2,
        redFlag: true,
        claims: ["eye_004", "eye_008"],
      },
      {
        label: "眼里看到白色雾状、白点、或异物",
        weight: 2,
        redFlag: true,
        claims: ["eye_004", "eye_005"],
      },
    ],
  },
  {
    id: "with",
    text: "还有这些吗?",
    hint: "可多选 —— 神经 / 外伤 / 视力相关都是真急症;都没有就选最后一项。",
    multi: true,
    options: [
      { label: "分泌物变黄、绿、脓性", weight: 2, claims: ["eye_001", "eye_002"] },
      {
        label: "第三眼睑突出(眼内角白膜往外鼓盖住眼球)",
        weight: 2,
        redFlag: true,
        claim: "eye_001",
      },
      { label: "也在打喷嚏、流鼻涕", weight: 2, claims: ["eye_002", "eye_003"] },
      {
        label: "刚被打架 / 撞到,或被清洁剂、刺激性液体、异物溅进或进了眼睛",
        weight: 2,
        redFlag: true,
        claims: ["eye_005", "eye_006"],
      },
      {
        label: "好像看不见(撞东西、对光不躲、走路不灵活)",
        weight: 2,
        redFlag: true,
        claims: ["eye_004", "eye_005"],
      },
      { label: "都没有", weight: 0, exclusive: true },
    ],
  },
  {
    id: "since",
    text: "这样多久了?",
    options: [
      { label: "今天才开始,或一两天", weight: 0 },
      { label: "三五天", weight: 1 },
      { label: "超过一周,或反复出现", weight: 2 },
    ],
  },
];

// 口腔问题专属流 —— 依据 docs/medical/source/cat-oral-problem.source.md。
// 重点:50-90% 4 岁+ 猫有牙病;严重 FCGS/牙吸收/牙周病常被藏起来;
// 舌下线异物 / 颌下肿块 / 烫伤电伤 / 可疑肿瘤 / 面部下巴肿胀流脓 /
// 看食物哆嗦拒食(FCGS 严重疼痛信号)都是红旗或当天就医信号。
// 幼猫换牙期掉小乳牙、少量血是正常生理过程,不必慌。
const mouthFlow: TriageQuestion[] = [
  {
    id: "look",
    text: "口腔问题主要长什么样?",
    options: [
      { label: "口臭、有点流口水", weight: 1, claim: "oral_004" },
      { label: "牙齿只是轻微发黄 / 软垢", weight: 1, claim: "oral_025" },
      { label: "硬的黄棕色牙垢 / 牙结石", weight: 2, claim: "oral_025" },
      {
        label: "明显流口水 / 嘴边毛沾湿 / 单边咀嚼",
        weight: 2,
        claim: "oral_004",
      },
      {
        label: "抓嘴、甩头、牙齿咯咯响 / 下巴抖、吃饭掉出来",
        weight: 2,
        claim: "oral_029",
      },
      {
        label: "张嘴、打哈欠或叼食时会叫 / 跳开",
        weight: 2,
        redFlag: true,
        claims: ["oral_032", "oral_007"],
      },
      { label: "嘴里看到溃疡、红肿、出血", weight: 2, claims: ["oral_004", "oral_005"] },
      {
        label: "看食物哆嗦、靠近又躲开、完全拒食",
        weight: 2,
        redFlag: true,
        claims: ["oral_006", "oral_007"],
      },
    ],
  },
  {
    id: "with",
    text: "还有这些吗?",
    hint: "可多选 —— 异物 / 肿块 / 灼伤都是真急症;都没有就选最后一项。",
    multi: true,
    options: [
      {
        label: "嘴里 / 舌头底下看到线、绳、丝带卡住",
        weight: 2,
        redFlag: true,
        claim: "oral_010",
      },
      {
        label: "下颌或喉部出现肿块",
        weight: 2,
        redFlag: true,
        claims: ["oral_012", "oral_021"],
      },
      {
        label: "嘴里有不愈合的伤口、肿瘤样东西、反复出血",
        weight: 2,
        redFlag: true,
        claim: "oral_013",
      },
      {
        label: "刚被电线 / 化学品 / 烫水接触过嘴巴",
        weight: 2,
        redFlag: true,
        claim: "oral_011",
      },
      { label: "有牙齿松动 / 掉牙", weight: 2, claims: ["oral_002", "oral_003", "oral_004"] },
      {
        label: "牙面有粉红小洞、缺损,或像牙缺了一块",
        weight: 2,
        claims: ["oral_030", "oral_003"],
      },
      {
        label: "脸 / 眼下 / 下巴肿起来,或有流脓口",
        weight: 2,
        redFlag: true,
        claim: "oral_031",
      },
      {
        label: "嘴里有白色斑块 / 白膜,或舌头嘴巴像破了",
        weight: 2,
        claims: ["oral_033", "oral_005"],
      },
      {
        label: "一直咂嘴、伸舌头,像口干,想吃又退开",
        weight: 2,
        claims: ["oral_034", "oral_020"],
      },
      { label: "也在打喷嚏 / 流鼻涕", weight: 2, claim: "oral_005" },
      {
        label: "幼猫(2-7 月)换牙期掉小乳牙、少量血(正常生理)",
        weight: 0,
        claim: "oral_016",
      },
      {
        label: "突然大量流口水,而且没打疫苗 / 近期被流浪猫狗咬过抓过",
        weight: 2,
        redFlag: true,
        claim: "oral_014",
      },
      { label: "都没有", weight: 0, exclusive: true },
    ],
  },
  {
    id: "since",
    text: "这样多久了?",
    options: [
      { label: "几天", weight: 0 },
      { label: "一两周", weight: 1, claim: "oral_020" },
      { label: "超过两周,或反复出现", weight: 2, claim: "oral_020" },
    ],
  },
];

// 行为突变专属流 —— 依据 docs/product/证据-cat-behavior-行为问题.md(Merck +
// Cornell)。核心医学原则:行为问题先排除医学原因。Q2 里「触碰激发攻击」=
// pain aggression(那里在疼)、联合躯体症状 / 神经症状都是红旗;母猫发情和应激
// 是正常生理过程(weight 0/1)。
const behaviorFlow: TriageQuestion[] = [
  {
    id: "change",
    text: "行为变化主要是什么样?",
    options: [
      { label: "稍微敏感、偶尔躲一下", weight: 1, claims: ["beh_001", "beh_013"] },
      { label: "突然变凶 / 攻击 / 咬人", weight: 2, claim: "beh_002" },
      { label: "突然躲起来不出门、不见人", weight: 2, claims: ["beh_001", "beh_013"] },
      { label: "突然半夜大叫 / 过度发声", weight: 2, claims: ["beh_001", "beh_017"] },
      { label: "突然乱尿 / 拉在猫砂盆外", weight: 2, claims: ["beh_004", "beh_015"] },
      { label: "突然不爱玩、对喜欢的东西没兴趣", weight: 2, claims: ["beh_001", "beh_010"] },
    ],
  },
  {
    id: "with",
    text: "还有这些吗?",
    hint: "可多选 —— 联合身体症状 / 神经异常是真急症;都没有就选最后一项。",
    multi: true,
    options: [
      {
        label: "一碰它就嚎叫 / 攻击,像在保护某个部位",
        weight: 2,
        redFlag: true,
        claims: ["beh_006", "beh_007"],
      },
      {
        label: "也开始不太吃东西、呕吐、或拉肚子",
        weight: 2,
        redFlag: true,
        claim: "beh_008",
      },
      {
        label: "也开始流口水、张口喘、或瘫软",
        weight: 2,
        redFlag: true,
        claims: ["beh_008", "emg_001", "emg_006"],
      },
      {
        label: "突然走路转圈、撞东西、像看不见",
        weight: 2,
        redFlag: true,
        claims: ["beh_009", "emg_005", "emg_006"],
      },
      {
        label: "老年猫(> 10 岁):白天睡多、晚上叫、在家里走丢迷路",
        weight: 2,
        claim: "beh_017",
      },
      {
        label: "母猫处于发情期(吼叫、在地上打滚、抬尾巴)",
        weight: 0,
      },
      {
        label: "最近有大变化:搬家 / 新成员 / 装修 / 新猫狗",
        weight: 1,
        claim: "beh_013",
      },
      { label: "都没有,只是行为有变", weight: 0, exclusive: true },
    ],
  },
  {
    id: "since",
    text: "这样多久了?",
    options: [
      { label: "刚一两天", weight: 0, claim: "beh_013" },
      { label: "一两周", weight: 1, claim: "beh_015" },
      { label: "超过两周持续,或反复出现", weight: 2, claim: "beh_015" },
    ],
  },
];

// 跛行 / 走路异常专属流 —— 依据 docs/product/证据-cat-limp-跛行问题.md
// (Merck + VCA)。Q1 里「突然后腿瘫软+大叫+冰凉」是 ATE 真急症(几小时窗口);
// Q2 里腿部肿胀畸形 / 刚摔过车祸打架 / 联合发热不吃萎靡都是红旗。
// 60-90% 老年猫有 OA 但常被忽视(Merck)—— 跳跃减少是关键线索。
const limpFlow: TriageQuestion[] = [
  {
    id: "state",
    text: "走路问题主要是什么样?",
    options: [
      { label: "偶尔一瘸一拐,过一会就好", weight: 1, claim: "limp_014" },
      { label: "持续一瘸一拐,某条腿不太敢用", weight: 2, claim: "limp_002" },
      { label: "完全不能用某条腿,提着走", weight: 2, redFlag: true, claim: "limp_004" },
      {
        label: "突然后腿瘫软 + 大叫 + 后腿冰凉(可能动脉血栓)",
        weight: 2,
        redFlag: true,
        claims: ["limp_010", "limp_011", "emg_010"],
      },
      {
        label: "跳不上以前能跳的地方、犹豫上下台阶",
        weight: 2,
        claim: "limp_005",
      },
    ],
  },
  {
    id: "with",
    text: "还有这些吗?",
    hint: "可多选 —— 外伤 / 系统症状 / 明显畸形是真急症;都没有就选最后一项。",
    multi: true,
    options: [
      {
        label: "腿部肿胀、有开放伤口、或明显畸形",
        weight: 2,
        redFlag: true,
        claims: ["limp_003", "limp_004"],
      },
      {
        label: "刚摔过 / 出过车祸 / 被打架过",
        weight: 2,
        redFlag: true,
        claim: "limp_012",
      },
      { label: "一碰那条腿就嚎叫 / 攻击", weight: 2, claims: ["limp_006", "limp_007"] },
      {
        label: "也在发热 / 不吃 / 明显萎靡",
        weight: 2,
        redFlag: true,
        claims: ["limp_006", "limp_007"],
      },
      { label: "肉垫里看到刺、玻璃、异物", weight: 2, claim: "limp_009" },
      { label: "脚指甲断了、流血、嵌入肉垫", weight: 2, claim: "limp_009" },
      {
        label: "老年猫(> 10 岁):最近躲在低处、不爱上下跳",
        weight: 2,
        claim: "limp_005",
      },
      { label: "幼猫,疯玩后偶尔瘸一下", weight: 1, claim: "limp_014" },
      { label: "都没有", weight: 0, exclusive: true },
    ],
  },
  {
    id: "since",
    text: "这样多久了?",
    options: [
      { label: "今天才开始,或一两天", weight: 0, claim: "limp_014" },
      { label: "几天到一周", weight: 1, claims: ["limp_002", "limp_014"] },
      { label: "超过一周持续,或反复出现", weight: 2, claim: "limp_002" },
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
  urine: urineFlow,
  noeat: noeatFlow,
  sneeze: sneezeFlow,
  ear: earFlow,
  skin: skinFlow,
  eye: eyeFlow,
  mouth: mouthFlow,
  behavior: behaviorFlow,
  limp: limpFlow,
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

function claimIdsOfOption(opt: TriageOption): string[] {
  return [...(opt.claim ? [opt.claim] : []), ...(opt.claims ?? [])];
}

// 把用户已经选中的选项映射为医学资料库 claim_id,供报告页 / AI prompt 串起证据链。
export function selectedClaimIds(flow: TriageFlow, answers: number[][]): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  flow.questions.forEach((q, i) => {
    (answers[i] ?? []).forEach((optIdx) => {
      const opt = q.options[optIdx];
      if (!opt) return;
      claimIdsOfOption(opt).forEach((id) => {
        if (seen.has(id)) return;
        seen.add(id);
        ids.push(id);
      });
    });
  });
  return ids;
}

// 把这次分诊「问了什么、用户答了什么」整理成简短问答记录,喂给 AI 当上下文。
// 只包含已作答的题(中途急停时自然只到答过的那几题)。
export function triageTranscript(flow: TriageFlow, answers: number[][]): string {
  const lines: string[] = [];
  flow.questions.forEach((q, i) => {
    const picked = (answers[i] ?? [])
      .map((idx) => q.options[idx]?.label)
      .filter((label): label is string => Boolean(label));
    if (picked.length === 0) return;
    lines.push(`问:${q.text} 答:${picked.join("、")}`);
  });
  return lines.join("\n");
}

// 偏急症的症状 —— 依据 v0.2 §2(呼吸异常 / 出血 / 尿不出均属急症)、
// §1.3(不吃东西没有「放着不管」的安全区间)。这些症状即便每题都答得还行,
// 判级也【不给绿档】—— 最轻也是黄(建议尽快就医)。
// (误食走专属流 eatFlow,由其红旗选项把关,「确实没吃到」时可正常判绿。)
const NO_GREEN_SYMPTOMS: ReadonlySet<string> = new Set([
  "breath",
  "pee",
  "urine",
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
