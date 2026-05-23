"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadStore } from "@/lib/storage";
import { SYMPTOM_LABELS } from "@/lib/triage";
import { Disclaimer } from "@/components/Disclaimer";
import { UnreviewedNotice } from "@/components/UnreviewedNotice";
import type { RiskTier } from "@/types/cat";

// ⚠️ 未经兽医审核 ——
//   报告文案、护理步骤、升级清单依据 docs/product/分诊证据-草稿-v0.2.md
//   (经「检索 + 证据核查」的草稿),【尚未经执业兽医审核】,不可作为诊断依据。
//   这里端口的是报告「机器」(分档结构、升级红线、地图深链),不是医学结论。
//
// 文案按「症状组」分流(GROUP_OF)—— 每个有意义差异化的症状各成一组,
// 共用文案只剩 general 一档,覆盖精神差 / 其它这两个真正泛化的入口:
//   · digest(呕吐 / 腹泻):v0.2 §1.1 / §1.2 有居家护理,黄档可「在家观察」。
//   · breath(呼吸怪):证据-anicira-急诊10信号.md §一.5 + v0.2 §2.1 ——
//     Anicira「猫呼吸困难反而安静、躲起来」,单独成组才不丢。
//   · blood(看到血):v0.2 §2.2 + Anicira #2 —— 内出血型急诊 vs 表浅
//     小伤可在家护理(断甲止血 / 鼻出血护理 / 鼠药提醒)。
//   · urethra(尿不出):证据-icatcare-尿道阻塞.md ——
//     完全阻塞 vs 能排尿但 FLUTD 的差异 iCatCare 写得很清楚。
//   · noeat(不吃东西):v0.2 §1.3 —— 厌食 24h 即影响、超 2 天必须急诊;
//     脂肪肝风险、别强制灌食、换碗换温度等居家鼓励技巧。
//   · sneeze(打喷嚏 / 流鼻涕):证据-cat-uri-上呼吸道感染.md(Cornell + Merck)——
//     主要病原 5 种(FHV/FCV/衣原体/支原体/Bordetella),需 PCR 确诊;App 不诊断,
//     红档对接 FCV 系统性 / 严重并发;黄档典型 URI 约门诊 + 居家护理;偶发可判绿。
//   · ear(耳朵问题):证据-cat-ear-耳朵问题.md(Cornell + Merck)——
//     红档对接中耳 / 内耳 / 面神经 / 耳血肿(可能不可逆);黄档典型外耳炎 / 耳螨
//     约门诊 + 多猫一起治 + 反对双氧水醋偏方;偶发挠耳可判绿。
//   · ingest(可能误食):v0.2 §3.2 —— 黄档尽快就医;「确实没吃到」可判绿。
//   · general(精神差 / 其它):保守的通用文案,作为兜底。

type TierInfo = {
  badge: string;
  headline: string;
  leadTpl: string; // {name} {symptom} 占位
  stepsTitle: string;
  steps: string[];
  why: string[];
  escalateTitle: string;
  escalateItems: string[];
  mapAction: boolean;
};

// 通用基档 —— general 组(精神差 / 其它)直接用,作为兜底。
// 各专属组按需在下方 OVERRIDE 里覆盖红 / 黄 / 绿三档。
const REPORT: Record<RiskTier, TierInfo> = {
  // 通用 red —— 主要服务 general 组(精神差 / 其它),依据 v0.2 §3.1(精神差)
  // + §3.3(跨症状红旗)+ 证据-anicira-急诊10信号.md §一.4 / §二(瘫倒 / 牙龈苍白
  // 自测 / 猫藏病的关键警示)。
  red: {
    badge: "红档 · 立刻就医",
    headline: "出现了需要立刻让兽医看的信号 —— 不要在家等。",
    leadTpl:
      "{name}「{symptom}」 —— 它的状态里出现了权威兽医资料列为「立刻就医」的征象。",
    stepsTitle: "去医院前 / 路上",
    steps: [
      "马上打电话给最近的动物医院,直说「需要急诊」,简单说明情况。",
      "装进航空箱或用厚毛巾包住固定、保暖;路上保持安静、减少颠簸和挣扎。",
      "别在家自己喂药、喂水、催吐 —— 拿不准的都交给兽医。",
      "记下:大概什么时候开始的、伴随哪些表现、最近吃 / 接触过什么不寻常的东西 —— 兽医会问。",
    ],
    why: [
      "猫很会藏病 —— 等到主人看出来「不对劲」,问题往往已经不轻;Anicira 等多家权威兽医资料反复强调这一点。",
      "牙龈苍白 + 严重萎靡 + 四肢和耳朵发凉 = 休克征兆;瘫倒 / 叫不醒 / 抽搐都是急诊。具体是什么病、怎么治,由兽医判断 —— 这里不做诊断。",
    ],
    escalateTitle: "路上如果出现这些 —— 就近找最近的急诊",
    escalateItems: [
      "呼吸越来越快、张口喘",
      "抽搐、倒地、叫不醒、意识不清",
      "牙龈或舌头发白、发黄、发紫(休克征兆)",
      "瘫软站不起来,或后腿突然拖行",
      "突然大量出血",
    ],
    mapAction: true,
  },
  yellow: {
    badge: "黄档 · 建议尽快就医",
    headline: "建议尽快带它去看兽医。",
    leadTpl:
      "{name}的「{symptom}」,现在不像是最危急的情况,但也不该一直在家干等。",
    stepsTitle: "在看兽医之前",
    steps: [
      "把它放在安静、暖和的地方,减少打扰和应激。",
      "留意并记下:吃不吃、喝不喝、用没用猫砂盆、精神和活动量 —— 都跟平时比。",
      "发作时拍张照、记下时间,去医院好给兽医看。",
      "别自己喂人吃的药 —— 很多人药对猫有毒。",
    ],
    why: [
      "你描述的情况里,没有出现需要此刻冲去急诊的信号。",
      "但猫很会藏病,「还算稳定」不等于没事 —— 所以是尽快就医,不是观望。",
    ],
    escalateTitle: "出现下面任何一个 → 立刻就医",
    escalateItems: [
      "呼吸变快、变费力,或张口喘",
      "吐血,或粪便、尿液里带血",
      "抽搐、站不稳、叫不醒",
      "牙龈或舌头发白、发紫",
      "超过 24 小时不吃不喝",
    ],
    mapAction: false,
  },
  green: {
    badge: "绿档 · 暂时低风险",
    headline: "看起来问题不大,在家留意就好。",
    leadTpl: "{name}的「{symptom}」,目前看是较常见、较低风险的情况。",
    stepsTitle: "可以这样做",
    steps: [
      "照常喂养、照常作息 —— 别因为紧张反而打乱它。",
      "今天多留意它的精神、食欲、喝水和排便。",
      "想自检一下:牙龈应是粉红色;轻轻提起后颈皮肤再松开,正常迅速回弹(回得慢就是脱水的信号)。",
      "在这里随手记一笔,方便以后对照。",
    ],
    why: [
      "你描述的情况里,没有出现需要担心的信号。",
      "不过猫很会藏病 ——「留意」不是「不管」,有变化随时再评估。",
    ],
    escalateTitle: "如果变成这样,再评估一次",
    escalateItems: [
      "反复出现,或一直不见好、超过两三天",
      "开始没精神、躲起来、不吃东西",
      "出现新症状:呕吐、出血、呼吸变怪等",
    ],
    mapAction: false,
  },
};

type Group =
  | "digest"
  | "breath"
  | "blood"
  | "urethra"
  | "noeat"
  | "sneeze"
  | "ear"
  | "ingest"
  | "general";

// 症状 → 症状组。未列出的(含空值)归入 general。
const GROUP_OF: Record<string, Group> = {
  vomit: "digest",
  diarrhea: "digest",
  breath: "breath",
  pee: "urethra",
  blood: "blood",
  noeat: "noeat",
  sneeze: "sneeze",
  ear: "ear",
  eat: "ingest",
  lethargy: "general",
  other: "general",
};

// 覆盖文案 —— 只写与通用基档不同的格子;其余回落到 REPORT。
const OVERRIDE: Partial<Record<Group, Partial<Record<RiskTier, TierInfo>>>> = {
  // 呕吐 / 腹泻 —— v0.2 §1.1 / §1.2 + §3.3 红旗。红档强调「别催吐 / 吞线不要拉
  // (v0.2 §1.1 线性异物急症)+ 反复呕吐+腹泻易脱水」;黄档可在家观察(脱水自检
  // + 居家护理);绿档放心。
  digest: {
    red: {
      badge: "红档 · 立刻就医",
      headline: "吐 / 拉得严重 —— 立刻送医,别拖。",
      leadTpl:
        "{name}「{symptom}」 —— 这次出现了需要兽医马上看的信号。反复呕吐+腹泻容易快速脱水,也可能是中毒、肠梗阻或严重感染。",
      stepsTitle: "去医院前 / 路上",
      steps: [
        "现在就打电话给最近的动物医院,直说「猫严重呕吐 / 腹泻,需要急诊」。",
        "别给它吃东西、喝水,除非兽医明确说可以 —— 让肠胃先停一停。",
        "绝不要自己催吐 —— 自己催吐对很多情况(线性异物、腐蚀剂等)反而更伤;拿不准就交给兽医。",
        "如果看到口腔或肛门口有线 / 绳 / 丝带露出来,绝对不要拉,固定一下直接送医(线性异物急症)。",
        "把呕吐物 / 粪便拍照、或装一小份带去 —— 兽医看样本对诊断很有用。",
      ],
      why: [
        "持续 / 反复呕吐 + 腹泻可能是中毒、肠梗阻、急性肠胃感染 —— 都需要兽医处理,且都有「越早处理越好」的窗口期。",
        "幼猫脱水比成猫快得多,吐 + 拉同时发生最容易脱水 —— 这就是急症基调。",
      ],
      escalateTitle: "路上如果出现这些 —— 提示在恶化",
      escalateItems: [
        "牙龈或舌头发白、发紫(脱水 / 休克征兆)",
        "越来越没力气、瘫软、叫不醒",
        "呕吐物或粪便里出现大量鲜血、或黑柏油样",
        "肚子越来越鼓、按一下就大叫",
        "突然呼吸又快又浅",
      ],
      mapAction: true,
    },
    yellow: {
      badge: "黄档 · 可在家观察",
      headline: "可以先在家观察、护理 —— 同时盯紧下面的信号。",
      leadTpl:
        "{name}的「{symptom}」,目前多数能在家先处理。按下面来,你做得到。",
      stepsTitle: "现在这样做",
      steps: [
        "先让肠胃歇一歇:接下来几小时少喂或不喂。具体禁食多久,最好先问问兽医。",
        "给水少量多次,别让它一次猛灌;留意脱水信号 —— 提起后颈皮肤再松开,回得慢就尽快就医。",
        "不再吐 / 不再拉之后,喂一点点清淡、易消化的食物(如水煮鸡胸肉)。",
        "每次发作拍照、记下时间 —— 万一要送医,好给兽医看。",
      ],
      why: [
        "你描述的情况里,没有出现需要立刻就医的信号,所以可以先观察、护理。",
        "但幼猫脱水很快 —— 这是「观察」,不是「放着不管」。",
      ],
      escalateTitle: "出现下面任何一个 → 立刻就医",
      escalateItems: [
        "吐血,或呕吐物、粪便里带血",
        "粪便发黑、像柏油一样",
        "一直吐 / 一直拉停不下来,或半天滴水不进",
        "明显没精神、缩成一团、不太动",
        "肚子鼓胀,或一碰就叫",
        "在家处理两三天还不见好",
      ],
      mapAction: false,
    },
    green: {
      badge: "绿档 · 暂时低风险",
      headline: "看起来问题不大,在家留意就好。",
      leadTpl: "{name}的「{symptom}」,目前看是较轻、较常见的情况。",
      stepsTitle: "可以这样做",
      steps: [
        "照常喂养,别突然换粮 —— 换粮本身就可能让它吐 / 拉。",
        "今天多留意它的精神、食欲、喝水和粪便的样子。",
        "在这里随手记一笔,方便以后对照。",
      ],
      why: [
        "你描述的情况里,没有出现令人担心的信号。",
        "健康的猫偶尔吐一次、软便一两次,常能自己缓过来 —— 但留意不等于不管。",
      ],
      escalateTitle: "如果变成这样,再评估一次",
      escalateItems: [
        "反复发作,或持续超过一两天还不见好",
        "开始没精神、不吃东西",
        "呕吐物或粪便里出现血,或粪便发黑",
      ],
      mapAction: false,
    },
  },
  // 出血 —— v0.2 §2.2 + 证据-anicira-急诊10信号.md §一.2。
  // 区分内出血型(吐 / 便 / 尿带血、黑便)= 急诊 vs 表浅小伤 = 可在家护理 +
  // 白天约门诊。怀疑误食抗凝血鼠药即便没出血也算急症(3-7 天后才显现)。
  blood: {
    red: {
      badge: "红档 · 立刻就医",
      headline: "出血严重 —— 立刻送医,边走边护理。",
      leadTpl: "{name}「{symptom}」 —— 这次的出血需要兽医马上看。",
      stepsTitle: "去医院前 / 路上",
      steps: [
        "打电话给最近的动物医院,直说「猫出血严重需急诊」,说清楚部位和大概量(像一咖啡杯?还是更多?)。",
        "外伤出血:用干净纱布或毛巾直接按住伤口持续压;敷料浸透别揭,直接再加一层。",
        "如果有异物插在身上,绝对不要拔 —— 固定住带去医院。",
        "怀疑舔 / 吃过鼠药?把残渣或包装带上 —— 鼠药中毒出血常延迟几天,早处理是关键。",
        "别用双氧水、酒精、茶树油或人药膏冲伤口 —— 会加重伤口损伤。",
      ],
      why: [
        "大出血、压不住的出血、伴牙龈苍白 / 虚弱 / 呼吸浅快(休克征兆)—— 都是立刻就医的信号。",
        "怀疑误食抗凝血鼠药即便没出血也算急症 —— 那种出血常在体内、看不见,3-7 天后才显现。",
      ],
      escalateTitle: "路上如果出现这些 —— 提示在恶化",
      escalateItems: [
        "牙龈或舌头发白、发紫(休克征兆)",
        "越来越没力气、站不稳",
        "呼吸又快又浅",
        "瘫软、叫不醒、抽搐",
      ],
      mapAction: true,
    },
    yellow: {
      badge: "黄档 · 可在家观察",
      headline: "出血不大、又止住了 —— 可以在家先处理。",
      leadTpl:
        "{name}「{symptom}」 —— 看着量不大、没其它紧急信号,可以按下面来。但小伤口也可能感染,白天还是约个门诊给兽医看一眼。",
      stepsTitle: "现在这样做",
      steps: [
        "还没完全止住?用干净纱布 / 毛巾按压;敷料浸透别揭,直接再加一层。",
        "爪子断甲流血:止血粉、止血笔;手边没有的话,泡打粉、玉米淀粉、面粉都能应急止血。",
        "清洁伤口只用温水或温生理盐水 —— 不要用双氧水、酒精、肥皂、茶树油、人药膏。",
        "鼻出血:保持猫安静、鼻梁敷冰袋;别往鼻孔塞棉花(打喷嚏会加重出血)。",
        "处理受伤的猫小心自己:即便平时温顺,因疼痛也可能抓咬。",
      ],
      why: [
        "外表小伤口在家清洁后可观察 ——「观察」不是「忽视」,新手不易判断伤口深度。",
        "白天打个电话约个门诊给兽医看一眼,比自己拿不准强。",
      ],
      escalateTitle: "出现下面任何一个 → 立刻急诊",
      escalateItems: [
        "压了 10-15 分钟还止不住",
        "牙龈或舌头发白、发紫(可能内出血 / 休克)",
        "突然没力气、站不稳、呼吸又快又浅",
        "新出血点出现,或瘀青越变越大",
        "伤口几天后开始流脓、发红肿胀、有臭味",
      ],
      mapAction: false,
    },
  },
  // 不吃东西 —— v0.2 §1.3。猫厌食 24h 即影响成年猫;完全不吃超 2 天必须立刻就医;
  // 突然不吃尤其超重 / 肥胖猫有肝脂沉积(脂肪肝)风险。无「放心不管」的安全区间。
  noeat: {
    red: {
      badge: "红档 · 立刻就医",
      headline: "猫不吃东西 —— 拖不得,立刻让兽医看。",
      leadTpl:
        "{name}「{symptom}」 —— 已经超过 2 天没好好吃东西,或者出现了让人担心的伴随表现。立刻动身。",
      stepsTitle: "去医院前 / 路上",
      steps: [
        "马上打电话给最近的动物医院,直说「猫超过 2 天不吃 / 严重厌食,需要急诊」。",
        "别强制喂食 / 灌食 —— 会增加吸入性肺炎风险、让它更厌恶食物,弊大于利。",
        "记下:最后一次正常吃东西是什么时候、有没有呕吐 / 流口水 / 凑近食物又走开 —— 兽医会问。",
        "如果它主动愿意吃,可以喂少量它最喜欢的食物;不接受就别强求。",
      ],
      why: [
        "猫厌食 24 小时就足以影响健康;完全不吃超 2 天必须立刻就医 —— 尤其超重 / 肥胖猫,有肝脂沉积(脂肪肝)风险,可危及生命。",
        "不吃伴萎靡、姿势僵硬、反胃迹象、或也在吐 / 拉 —— 说明有底层疾病,不能在家等了。",
      ],
      escalateTitle: "路上如果出现这些 —— 提示在恶化",
      escalateItems: [
        "牙龈或舌头发白、发黄、发紫",
        "倒地、叫不醒、抽搐",
        "呼吸明显费力",
        "流口水越来越多",
      ],
      mapAction: true,
    },
    yellow: {
      badge: "黄档 · 今天告诉兽医一声",
      headline: "胃口不对别等太久 —— 在家鼓励它吃,白天联系兽医。",
      leadTpl:
        "{name}「{symptom}」 —— 这次没勾到最危险的信号,但猫食欲下降几乎没有「放心不管」的安全区间。今天就告诉兽医一声。",
      stepsTitle: "现在这样做",
      steps: [
        "今天就联系兽医,说清楚:多久没好好吃、是完全不吃还是吃得少、有没有其它异常。",
        "保持冷静,别围着食物催它 —— 主人焦虑会让它更不想吃。",
        "试它以前最爱吃的东西、少量多次给(每 2 小时一汤匙左右),食物加热到接近体温更香。",
        "用陶瓷或不锈钢的宽浅碗 —— 塑料碗有气味、深窄碗碰胡须都可能让它拒食。",
        "别强制喂或灌食(适得其反、风险大);也别把药混进正餐(会让它从此对食物产生厌恶)。",
      ],
      why: [
        "猫食欲减退基本没有「放着不管」的安全区间 —— 24 小时不吃就足以影响健康,超重猫还有肝脂沉积风险。",
        "刚就医后、换粮、家里有变化时短暂胃口差较常见,但还是建议告诉兽医一声、先排除疾病。",
      ],
      escalateTitle: "出现下面任何一个 → 立刻急诊",
      escalateItems: [
        "完全不吃超过 24 小时",
        "开始没精神、躲起来、姿势僵硬",
        "凑近食物又走开、咂嘴、流口水、对着食物干呕",
        "也开始呕吐 / 拉肚子",
        "牙龈或舌头发白、发紫",
      ],
      mapAction: true,
    },
  },
  // 打喷嚏 / 上呼吸道感染 —— docs/product/证据-cat-uri-上呼吸道感染.md
  // (Cornell + Merck)。主要病原 5 种(FHV / FCV / 衣原体 / 支原体 / Bordetella),
  // 只能由兽医 PCR / 拭子确诊。本组红档对接严重并发(FCV 系统性 / 进展到下呼吸道);
  // 黄档典型 URI 要约门诊 + 居家支持性护理 + 隔离新猫 + 减少应激;偶发可判绿。
  sneeze: {
    red: {
      badge: "红档 · 立刻就医",
      headline: "上呼吸道感染出现严重信号 —— 立刻送医。",
      leadTpl:
        "{name}「{symptom}」 —— 这次伴随的征兆指向严重并发症,可能已经进展到下呼吸道或是系统性感染,不该在家等。",
      stepsTitle: "去医院前 / 路上",
      steps: [
        "现在就打电话给最近的动物医院,直说「猫上呼吸道感染严重 + 张口喘 / 不吃 / 嘴里溃疡」,问能不能马上接。",
        "装进航空箱,路上保持安静、减少颠簸 —— 应激会让 URI(尤其 FHV)恶化。",
        "拍照鼻涕 / 眼分泌物颜色、嘴里溃疡位置 —— 这些对兽医辨认病原很有帮助。",
        "别在家给它喂任何人药、抗生素、眼药水 —— 病原不同治法不同,要兽医做 PCR 拭子才确定。",
      ],
      why: [
        "张口喘、嘴里溃疡、明显不吃 —— 这几个组合可能是 FCV 系统性感染、严重继发细菌感染,或已经发展到下呼吸道(肺炎)。",
        "猫 URI 的具体病原(FHV / FCV / 衣原体 / 支原体 / Bordetella)只能由兽医做 PCR / 拭子确诊,治疗方向取决于病原 —— 这里不做诊断。",
      ],
      escalateTitle: "路上如果出现这些 —— 提示在恶化",
      escalateItems: [
        "嘴唇 / 牙龈 / 舌头发青、发紫(发绀,严重缺氧)",
        "呼吸越来越急、越费力,或张口喘",
        "瘫软、叫不醒、抽搐",
        "完全不吃不喝、流口水",
      ],
      mapAction: true,
    },
    yellow: {
      badge: "黄档 · 这周内约门诊",
      headline: "像是上呼吸道感染 —— 这周内带它去看兽医。",
      leadTpl:
        "{name}「{symptom}」 —— 这次的表现像猫常见的 URI(上呼吸道感染),需要兽医检查、做 PCR / 拭子确定病原,然后对症治疗。",
      stepsTitle: "现在这样做",
      steps: [
        "联系兽医约这周内的门诊,描述:打喷嚏多久了、有没有眼 / 鼻分泌物、有没有不吃 / 没精神。",
        "在家做支持性护理:用生理盐水浸湿的棉签或毛巾轻擦眼角和鼻子的分泌物;保持环境温暖、空气加湿(加湿器最好)。",
        "鼻塞闻不到食物会拒食 —— 食物加热到接近体温让香气出来;它实在不爱吃,可以试罐头 / 肉泥。",
        "家里其它猫要隔离!URI 高度传染,分喂、分猫砂盆;减少应激 —— 别洗澡、别带出门、别带新成员进家(FHV 是应激诱发型)。",
        "别给它吃人药 / 自己开抗生素 / 自行点眼药水 —— 病原不同治法不同;赖氨酸补剂经研究反而可能加重(Cornell),不再推荐。",
      ],
      why: [
        "打喷嚏 + 眼鼻分泌物是猫 URI 最典型表现。常见病原有 5 种:FHV(疱疹)、FCV(杯状)、衣原体、支原体、Bordetella —— FHV + FCV 占了 90%,支原体常作为并发或单独感染(Merck)。",
        "具体哪种病原决定用药方向:支原体 / 衣原体 / Bordetella 用强力霉素等抗生素;FHV 可能用抗病毒;细菌继发要抗生素。只能兽医 PCR / 拭子确诊,这里不诊断。",
        "FHV 一旦感染会终身潜伏,大多数感染猫会在应激时复发(搬家、洗澡、新成员)—— 这就是为什么这只猫可能反复「感冒」。",
      ],
      escalateTitle: "出现下面任何一个 → 立刻急诊",
      escalateItems: [
        "呼吸费力、张口喘、嘴唇发紫",
        "完全不吃 / 不喝超过 24 小时",
        "嘴里出现溃疡、流大量口水",
        "鼻涕变成黄绿脓性、或带血",
        "明显瘫软、躲起来叫不醒",
      ],
      mapAction: true,
    },
    green: {
      badge: "绿档 · 暂时低风险",
      headline: "偶尔打喷嚏没什么 —— 留意几天就好。",
      leadTpl:
        "{name}「{symptom}」 —— 偶尔打几个喷嚏在健康猫身上也常见,可能只是灰尘、气味、毛屑刺激。",
      stepsTitle: "可以这样做",
      steps: [
        "今明两天多留意:有没有变成持续打、有没有新出现眼 / 鼻分泌物、有没有不吃东西。",
        "环境检查:猫砂粉尘大?最近用了新香薰 / 空气清新剂 / 喷雾洗衣液?这些刺激物会让猫打喷嚏。",
        "如果家里刚有新到的猫,记得隔离 1-2 周观察 —— URI 高度传染,新到的猫常带病原。",
        "在这里随手记一笔,方便对照。",
      ],
      why: [
        "健康的猫偶尔打喷嚏是正常的 —— 跟人一样,灰尘、气味、温度变化都可能引起。",
        "URI 一般会持续 + 伴随鼻涕 / 眼分泌物 / 精神食欲变化 —— 这些都没有的话,可以先观察。",
      ],
      escalateTitle: "如果变成这样,再评估一次",
      escalateItems: [
        "喷嚏越打越多、连续好几天没缓解",
        "开始流鼻涕、眼睛有分泌物",
        "精神变差、不太吃东西",
        "出现咳嗽、呼吸异常",
      ],
      mapAction: false,
    },
  },
  // 耳朵问题 —— docs/product/证据-cat-ear-耳朵问题.md(Cornell 耳螨 + Merck 外耳 /
  // 中耳 / 内耳)。红档对接中耳 / 内耳 / 面神经 / 耳血肿这些可能不可逆的并发症;黄档
  // 典型外耳炎 / 耳螨怀疑要约门诊 + 反对家庭偏方 + 多猫一起治;偶发挠耳可判绿。
  ear: {
    red: {
      badge: "红档 · 立刻就医",
      headline: "耳朵问题出现神经 / 内耳信号 —— 不可逆风险,立刻就医。",
      leadTpl:
        "{name}「{symptom}」 —— 这次的征兆指向中耳 / 内耳或面神经受累,这是会留下永久损伤的方向,不能在家拖。",
      stepsTitle: "去医院前 / 路上",
      steps: [
        "现在就打电话给附近的动物医院,直说「猫头歪 / 走路不稳 / 眼球晃 / 嘴歪,可能中耳或内耳问题」,问能不能马上接。",
        "装进航空箱,路上保持安静、减少颠簸 —— 平衡受影响时挪动它要轻、避免再受伤。",
        "别在家给它点任何耳药、滴双氧水、塞棉签 —— 鼓膜可能已经穿孔,这些都会让损伤更重。",
        "记下:从什么时候开始的、有没有先甩头、之前耳道有没有分泌物 —— 兽医会问。",
      ],
      why: [
        "Merck 明确:中耳 / 内耳炎可造成永久性听力损失与平衡障碍,部分神经损伤即便感染消退也终身存在 —— 「Early treatment improves outcomes」是原话。",
        "猫的中耳问题除了感染扩散,还可能是「炎性息肉(inflammatory polyps)」—— 这是猫的特有常见病因,需要兽医耳镜 + X 光 / CT / MRI 才能定位。这里不诊断。",
      ],
      escalateTitle: "路上如果出现这些 —— 提示在恶化",
      escalateItems: [
        "完全瘫倒、叫不醒、抽搐",
        "呼吸急促、张口喘、嘴唇发紫",
        "牙龈或舌头发白、发紫",
        "耳里突然大量出血或流脓",
      ],
      mapAction: true,
    },
    yellow: {
      badge: "黄档 · 这周内约门诊",
      headline: "像是外耳炎或耳螨 —— 这周内带它去看兽医。",
      leadTpl:
        "{name}「{symptom}」 —— 像猫常见的外耳炎或耳螨,但具体是哪种病原(螨 / 细菌 / 酵母)只能兽医用耳镜 + 拭子显微镜才能确定。",
      stepsTitle: "现在这样做",
      steps: [
        "联系兽医约这周内的门诊,描述:挠多久了、耳里分泌物是什么颜色(黑咖啡渣 / 黄褐)、有没有臭味、单只耳朵还是两只。",
        "在家不要做的:别用双氧水 / 白醋 / 酒精冲耳朵(Merck 明确反对,会刺激发炎耳道、反而加重);别拿棉签往耳道深处掏(可能伤鼓膜)。",
        "在家不要做的(续):别自己买宠物店耳药就用 —— 耳螨用药和细菌 / 酵母感染用药完全不同,病因没确定前用错药可能加重。",
        "家里其它猫记得检查耳朵 —— 耳螨高度传染,家里所有猫都要一起治疗,否则反复感染。",
        "把猫窝、毛毯、玩具洗一下 —— 耳螨可在环境短暂存活。",
      ],
      why: [
        "Cornell 描述耳螨的特征性表现是「dark, gooey, foul-smelling」黑色蜡状分泌物 + 剧烈瘙痒;细菌 / 酵母感染则更多是黄褐色分泌物 + 臭味。但只靠肉眼分不清,需要兽医拭子做显微镜细胞学才能选对药。",
        "Merck:健康猫一般不需要常规清耳;现在挠 / 甩头 / 有分泌物说明已经出问题了 —— 兽医通常会先清耳、再选「抗寄生虫(螨)」或「抗生素 + 抗真菌 + 类固醇」局部用药。",
      ],
      escalateTitle: "出现下面任何一个 → 立刻急诊",
      escalateItems: [
        "头持续歪向一侧、走路不稳、转圈、跳不上去",
        "眼球快速左右晃动",
        "嘴歪、眨不了眼、眼睑下垂、第三眼睑突出",
        "耳廓突然肿胀、变厚(耳血肿)",
        "完全不让碰耳朵、一碰就尖叫",
        "耳里突然大量出血或流脓",
      ],
      mapAction: true,
    },
    green: {
      badge: "绿档 · 暂时低风险",
      headline: "偶尔挠一下耳朵没什么 —— 留意几天。",
      leadTpl:
        "{name}「{symptom}」 —— 偶尔挠挠耳朵、没有分泌物 / 异味 / 神经信号,健康猫也常这样。",
      stepsTitle: "可以这样做",
      steps: [
        "这两天多留意:有没有变成持续挠 / 甩头、耳里有没有分泌物 / 异味、头有没有歪。",
        "可以用手电照一下两只耳朵对比 —— 正常应该粉红、干净、没有结痂或大量蜡。",
        "Merck 提醒:健康猫不需要常规清耳。别主动去掏 / 拿棉签 / 滴清耳液 —— 没问题反而清出问题。",
        "如果家里刚到新猫,记得检查耳朵 + 隔离观察(耳螨高度传染)。",
        "在这里随手记一笔,方便对照。",
      ],
      why: [
        "猫偶尔挠耳跟人偶尔挠头一样,不一定是病。耳道问题一般会持续 + 伴随分泌物、异味、甩头、神经异常 —— 这些都没有的话可以先观察。",
      ],
      escalateTitle: "如果变成这样,再评估一次",
      escalateItems: [
        "挠耳 / 甩头变得频繁、持续几天没缓解",
        "耳里出现黑色咖啡渣、或黄褐色分泌物 / 异味",
        "头开始歪向一侧、走路不太稳",
        "耳廓变红、变厚、变烫",
      ],
      mapAction: false,
    },
  },
  // 可能误食 —— v0.2 §3.2。红档强调带可疑物 / 包装 + 时间窗(百合数小时、巧克力
  // 6-12h、抗凝血鼠药 3-7 天)+ 别催吐 / 别喂人药;黄档导向尽快就医;
  // 「确实没吃到」可判绿。
  ingest: {
    red: {
      badge: "红档 · 立刻就医",
      headline: "怀疑误食有毒物 —— 即使它现在看着没事,也立刻送医。",
      leadTpl:
        "{name}「{symptom}」 —— 这次出现了高度怀疑中毒的信号,或者它真的吃 / 舔到了高危物。这种情况靠观察是不行的。",
      stepsTitle: "去医院前 / 路上",
      steps: [
        "现在就打电话给最近的动物医院,直说「猫怀疑误食,需要急诊」,告诉他们你怀疑吃了什么。",
        "把可疑物的包装、剩下的残渣、植物的叶 / 花 / 茎都装个袋子带去 —— 信息越准救命越快。",
        "绝不要自己给它催吐 —— 用双氧水之类的自家催吐,对腐蚀性物质 / 油脂类反而更伤。",
        "也别给它喂牛奶、人药、任何东西 —— 这些不是解毒剂,反而可能加重。",
        "记下:大概什么时候吃 / 接触的、量多少、之后有没有呕吐 / 流口水 / 步态不稳 —— 兽医会问。",
      ],
      why: [
        "很多猫的中毒在它看起来没事时已经在体内造成损伤:百合极少量(花粉、瓶水都算)就能引发不可逆肾衰;对乙酰氨基酚一片可致命;抗凝血鼠药 3-7 天后才出现内出血。",
        "「等等看再决定」对中毒类问题没有安全窗口。具体是什么物质、要不要催吐 / 洗胃 / 用解毒剂,只能由兽医判断。",
      ],
      escalateTitle: "路上如果出现这些 —— 提示在恶化",
      escalateItems: [
        "突然抽搐、震颤,或瘫倒、叫不醒",
        "走路晃、站不稳,或前肢 / 后肢失控",
        "呼吸又快又费力,或张口喘",
        "流口水越来越多、呕吐越来越频繁",
        "牙龈或舌头发白、发黄、发紫",
      ],
      mapAction: true,
    },
    yellow: {
      badge: "黄档 · 建议尽快就医",
      headline: "建议尽快联系兽医,把情况说清楚。",
      leadTpl:
        "{name}的「{symptom}」,这次没指认出明确的高危物,也没出现中毒迹象 —— 但误食拿不准时,该让兽医来把关。",
      stepsTitle: "现在这样做",
      steps: [
        "现在就联系兽医或动物医院,说清楚:你怀疑它吃了什么、大概多少、多久之前。",
        "别自己给它催吐 —— 有些东西吐出来反而更伤,要不要催吐由兽医决定。",
        "也别给它喂人用的药 —— 很多人药对猫有毒。",
        "把可疑的东西、包装、剩下的残渣留好,带去给兽医看。",
      ],
      why: [
        "你的描述里没有指认出常见的高危物(人药、百合、灭鼠药、有毒食物等),它现在也没出现中毒迹象。",
        "但不少中毒在猫还看着没事时就已经在起作用 —— 所以是让兽医把关,不是在家等等看。",
      ],
      escalateTitle: "出现下面任何一个 → 立刻就医",
      escalateItems: [
        "没精神、发蔫,或走路晃、站不稳",
        "流口水变多、突然呕吐,或拉肚子",
        "发抖、抽搐",
        "呼吸变快、变费力",
        "牙龈或舌头发白、发黄、发紫",
      ],
      mapAction: true,
    },
    green: {
      badge: "绿档 · 暂时低风险",
      headline: "看起来它应该没真的吃到,先松口气。",
      leadTpl:
        "{name}的「{symptom}」,照你的描述它应该没真的吃下危险的东西,也没有不舒服的迹象。",
      stepsTitle: "可以这样做",
      steps: [
        "把你担心的那样东西收好 —— 药品、百合等植物、清洁剂,放到它够不到的地方。",
        "今天多留意它的精神、食欲,有没有流口水、呕吐。",
        "在这里随手记一笔,方便以后对照。",
      ],
      why: [
        "你的描述里没有出现误食危险物的迹象,它现在的状态也正常。",
        "不过有些中毒会延迟显现 ——「留意」不是「不管」,有变化随时再评估。",
      ],
      escalateTitle: "如果出现这些,再评估一次",
      escalateItems: [
        "开始没精神、发蔫,或走路不稳",
        "流口水、呕吐、拉肚子",
        "你发现它确实啃了、吞了不该吃的东西",
      ],
      mapAction: false,
    },
  },
  // 尿不出 —— docs/product/证据-icatcare-尿道阻塞.md + v0.2 §2.3。
  // iCatCare 明确「2-3 天可致命、几乎只发生在公猫」+「能排尿但 FLUTD」
  // 这层差异;从 urgent 组拆出来,文案才能体现这两点。
  urethra: {
    red: {
      badge: "红档 · 立刻就医",
      headline: "现在就带它去看兽医 —— 尿道阻塞拖不得。",
      leadTpl:
        "{name}「{symptom}」 —— 完全排不出尿,公猫尤其危险,几天内可致命。立刻动身。",
      stepsTitle: "去医院前 / 路上",
      steps: [
        "马上给附近的动物医院打电话,直说「公猫疑似尿道阻塞,需要急诊」,问他们能不能马上接。",
        "别在家按摩或挤压它的肚子 —— 那是兽医在镇静下做的操作,在家硬挤有膀胱破裂风险。",
        "用航空箱或带高边的容器送过去,路上保持安静、减少颠簸,它会很疼。",
        "记下:最后一次正常排尿大约多久前、有没有呕吐、最近几天饮食饮水变化 —— 兽医会问。",
      ],
      why: [
        "尿道阻塞几乎只发生在公猫(包括绝育的)。iCatCare 明确说「不治疗 2-3 天内可致命」—— 膀胱排不出 → 毒素回流 → 高血钾 → 心律失常 / 肾衰。",
        "兽医通常会做的:重度镇静或全麻 → 插导尿管疏通 → 排空膀胱 → 住院输液几天稳定。这里不做诊断,但这个时间窗,不能拖。",
      ],
      escalateTitle: "路上如果出现这些,就近找最近的急诊",
      escalateItems: [
        "牙龈或舌头发白、发紫",
        "倒地、叫不醒、抽搐",
        "呕吐越来越频繁",
        "呼吸明显变快、变费力",
      ],
      mapAction: true,
    },
    yellow: {
      badge: "黄档 · 尽快就医",
      headline: "它能排尿,但泌尿系统不太对 —— 别拖。",
      leadTpl:
        "{name}「{symptom}」 —— 还排得出尿,但有泌尿不适。这类问题(FLUTD)拖久了容易进展成完全阻塞,那就是真急症了。",
      stepsTitle: "今天或明天做这件事",
      steps: [
        "今天或明天就联系兽医约门诊,把症状(频率、姿势、有没有血、是不是在猫砂盆外尿)和持续多久说清楚。",
        "别自己挤膀胱,也别给它吃任何人用消炎或止痛药 —— 很多人药对猫剧毒。",
        "多放几碗清水在它常去的地方;有条件可以用流动水机鼓励它多喝。",
        "尽量减少应激 —— 最近有没有搬家、新成员、装修、噪音?这些诱发的概率不小。",
      ],
      why: [
        "「能排尿但有不适」对应的多是猫下泌尿道病(FLUTD),底层常见的是 feline idiopathic cystitis(应激相关)或泌尿结石。",
        "公猫尿道更细,从「有不适」进展到「完全堵」可能很快 —— 所以是尽快约门诊,不是观望。",
      ],
      escalateTitle: "出现下面任何一个 → 立刻急诊",
      escalateItems: [
        "完全尿不出来,或反复进猫砂盆只滴几滴",
        "在猫砂盆里嚎叫、用力时大声哀叫",
        "突然不吃东西、开始呕吐、躲起来不动",
        "牙龈或舌头发白、发紫",
      ],
      mapAction: true,
    },
  },
  // 呼吸异常 —— docs/product/证据-anicira-急诊10信号.md §一.5 + v0.2 §2.1。
  // Anicira 警示:猫呼吸困难时反而很安静、会躲起来 —— 新手最容易把「没动静」
  // 当「没事」。v0.2 §2.1 也明确:呼吸异常一律按急症,不设「在家观察」窗口。
  breath: {
    red: {
      badge: "红档 · 立刻就医",
      headline: "猫呼吸不对 —— 直接送医,不在家等。",
      leadTpl:
        "{name}「{symptom}」 —— 猫的呼吸困难一旦看出来,往往已经不轻了。立刻动身。",
      stepsTitle: "去医院前 / 路上",
      steps: [
        "马上给最近的动物医院打电话,直说「猫呼吸困难,需要急诊」,问能不能马上接。",
        "装进航空箱,别抱来抱去;路上保持安静、减少颠簸 —— 挣扎会让缺氧更严重。",
        "别在家喂药、喂水、做雾化 —— 不知道病因,任何操作都可能耽误时间。",
        "记下:大概什么时候开始的、有没有先咳嗽 / 张嘴喘、嘴唇颜色变化 —— 兽医会问。",
      ],
      why: [
        "Anicira 警示:猫呼吸困难时反而很安静、常会躲起来 —— 新手最容易把「没动静」当成「没事」。看到呼吸异常本身就是信号。",
        "v0.2 §2.1:猫的呼吸异常一律按急症,不设「在家观察」窗口 —— 进展极快,初期被忽视会迅速恶化甚至死亡。",
      ],
      escalateTitle: "路上如果出现这些 —— 提示在恶化",
      escalateItems: [
        "牙龈或舌头发白、发紫(严重缺氧)",
        "嘴张得越来越大、喘得越来越急",
        "倒地、瘫软、叫不醒",
        "抽搐",
      ],
      mapAction: true,
    },
    yellow: {
      badge: "黄档 · 尽快就医",
      headline: "呼吸不对就尽快让兽医看 —— 不在家观察。",
      leadTpl:
        "{name}「{symptom}」 —— 这次没勾到最危险的信号,但呼吸异常这类问题不该在家拖。",
      stepsTitle: "现在这样做",
      steps: [
        "今天就联系兽医或动物医院,描述清楚:呼吸频率、有没有张口喘、有没有咳嗽、什么时候开始的。",
        "把它放在安静的地方,别逗、别折腾 —— 应激会让呼吸更费力。",
        "别在家给它喂药、喂水试试看 —— 不知道病因,所有操作都可能耽误。",
        "在家测一次睡眠呼吸:它熟睡时数 30 秒胸口起伏次数 × 2,正常 15-30。",
      ],
      why: [
        "猫呼吸困难时常常很安静、躲起来(Anicira)—— 看到异常本身就是信号,「还算稳定」不等于安全。",
        "v0.2 §2.1:呼吸异常在猫身上没有「在家观察」的安全窗口,所以是尽快就医、不是观望。",
      ],
      escalateTitle: "出现下面任何一个 → 立刻急诊",
      escalateItems: [
        "张着嘴喘、喘不上气",
        "牙龈或舌头发青、发紫",
        "趴下时肘部外撑、脖子前伸不肯放下",
        "胸腹起伏特别用力",
        "突然倒下、叫不醒",
      ],
      mapAction: true,
    },
  },
};

// breath / blood / urethra / noeat 四组都没有「绿档」的安心结论 —— 即便判级或
// URL 给到绿,也按黄档呈现(防御层:即便 ?tier=green&symptom=... 被人工构造也安全)。
const NO_GREEN_GROUPS: ReadonlySet<Group> = new Set<Group>([
  "breath",
  "blood",
  "urethra",
  "noeat",
]);
function resolveTier(group: Group, tier: RiskTier): RiskTier {
  return NO_GREEN_GROUPS.has(group) && tier === "green" ? "yellow" : tier;
}

function resolveInfo(group: Group, tier: RiskTier): TierInfo {
  return OVERRIDE[group]?.[tier] ?? REPORT[tier];
}

// 风险信号层视觉 —— 用 globals.css 的 --red / --amber / --green 三套。
const VIS: Record<RiskTier, { accent: string; bg: string; ink: string }> = {
  red: { accent: "var(--red)", bg: "var(--red-bg)", ink: "var(--red-ink)" },
  yellow: { accent: "var(--amber)", bg: "var(--amber-bg)", ink: "var(--amber-ink)" },
  green: { accent: "var(--green)", bg: "var(--green-bg)", ink: "var(--green-ink)" },
};

function TierIcon({ tier }: { tier: RiskTier }) {
  const common = {
    width: 15,
    height: 15,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#fff",
    strokeWidth: 2.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (tier === "red") return <svg {...common}><path d="M12 7v10M7 12h10" /></svg>;
  if (tier === "green") return <svg {...common}><path d="M5 13l4 4L19 7" /></svg>;
  return (
    <svg {...common} strokeWidth={1.9}>
      <path d="M2.5 12C5 8 8.4 6 12 6s7 2 9.5 6c-2.5 4-5.9 6-9.5 6s-7-2-9.5-6Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex gap-3.5 border-b border-[var(--line-soft)] py-3 last:border-b-0">
      <span className="mt-px grid size-6 shrink-0 place-items-center rounded-full border border-[var(--hairline)] text-[12px] font-medium text-ink-soft">
        {n}
      </span>
      <p className="flex-1 text-[14.5px] leading-relaxed text-ink">{text}</p>
    </div>
  );
}

export default function ReportPage() {
  const [tier, setTier] = useState<RiskTier | null>(null);
  const [symptom, setSymptom] = useState("");
  const [catName, setCatName] = useState("它");

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const t = p.get("tier");
    setTier(t === "red" || t === "yellow" || t === "green" ? t : "yellow");
    setSymptom(p.get("symptom") ?? "");
    const store = loadStore();
    if (store) {
      const cat = store.cats.find((c) => c.id === store.activeCatId) ?? store.cats[0];
      if (cat?.name) setCatName(cat.name);
    }
  }, []);

  if (!tier) return <main className="min-h-dvh" aria-hidden="true" />;

  const group = GROUP_OF[symptom] ?? "general";
  const shownTier = resolveTier(group, tier);
  const info = resolveInfo(group, shownTier);
  const vis = VIS[shownTier];
  const symptomLabel = SYMPTOM_LABELS[symptom] ?? "这个情况";
  const lead = info.leadTpl
    .replace("{name}", catName)
    .replace("{symptom}", symptomLabel);
  const alarm = shownTier !== "green";

  return (
    <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col bg-paper px-7 pb-9 pt-3">
      {/* 顶栏 */}
      <header className="flex items-center">
        <span className="size-9" />
        <span className="flex-1 text-center text-[12px] font-medium uppercase tracking-[0.18em] text-ink-soft">
          安心报告
        </span>
        <Link
          href="/"
          className="grid h-9 place-items-center px-1 text-[13px] text-ink-soft"
        >
          完成
        </Link>
      </header>

      {/* 分级卡 */}
      <div className="mt-3 rounded-2xl p-5" style={{ background: vis.bg }}>
        <div className="mb-3 flex items-center gap-2.5">
          <span
            className="grid size-7 shrink-0 place-items-center rounded-full"
            style={{ background: vis.accent }}
          >
            <TierIcon tier={shownTier} />
          </span>
          <span
            className="text-[12px] font-semibold tracking-[0.08em]"
            style={{ color: vis.ink }}
          >
            {info.badge}
          </span>
        </div>
        <h1 className="font-serif text-[1.7rem] font-medium leading-snug tracking-tight text-ink">
          {info.headline}
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">{lead}</p>
      </div>

      {/* 找医院(地图深链,不自建医院库) */}
      {info.mapAction && (
        <a
          href="https://uri.amap.com/search?keyword=宠物医院"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center justify-center gap-2 rounded-2xl py-4 text-[16px] font-medium text-white"
          style={{ background: "var(--red)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 21s-6.5-5.4-6.5-10.5a6.5 6.5 0 1 1 13 0C18.5 15.6 12 21 12 21Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="10.5" r="2.4" stroke="currentColor" strokeWidth="1.8" />
          </svg>
          找附近的动物医院 →
        </a>
      )}

      {/* 未经兽医审核 —— 产品诚实红线,紧跟分级结论,不可错过 */}
      <UnreviewedNotice className="mt-3" />

      {/* 现在做什么 */}
      <section className="mt-8">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-ink-faint">
          {info.stepsTitle}
        </p>
        <div className="mt-1.5">
          {info.steps.map((s, i) => (
            <Step key={i} n={i + 1} text={s} />
          ))}
        </div>
      </section>

      {/* 为什么这么判断 */}
      <section className="mt-8">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-ink-faint">
          为什么这么判断
        </p>
        <div className="mt-2.5 flex flex-col gap-2">
          {info.why.map((w, i) => (
            <p key={i} className="text-[14px] leading-relaxed text-ink-soft">
              {w}
            </p>
          ))}
        </div>
      </section>

      {/* 升级清单 —— 黄/红档是红线,绿档是温和提醒 */}
      <div
        className="mt-7 rounded-2xl border p-4"
        style={
          alarm
            ? { background: "var(--red-bg)", borderColor: "var(--red)" }
            : { background: "var(--surface)", borderColor: "var(--line)" }
        }
      >
        <p
          className="text-[13px] font-semibold leading-snug"
          style={{ color: alarm ? "var(--red-ink)" : "var(--ink)" }}
        >
          {info.escalateTitle}
        </p>
        <ul className="mt-2.5 flex flex-col gap-2">
          {info.escalateItems.map((it, i) => (
            <li key={i} className="flex gap-2.5 text-[13.5px] leading-snug text-ink">
              <span
                className="mt-[7px] size-1.5 shrink-0 rounded-full"
                style={{ background: alarm ? "var(--red)" : "var(--ink-faint)" }}
              />
              <span className="flex-1">{it}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex-1" />
      <Disclaimer />
    </main>
  );
}
