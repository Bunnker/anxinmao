#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "knowledge-posters", "detailed");
const VERSION = "2026-06-17-detailed-mobile-svg";
const CAT_DATA_URI = {};

const SOURCE = {
  aafpEnv: "AAFP/ISFM Environmental Needs Guidelines",
  aafpIntercat: "2024 AAFP Intercat Tension Guidelines",
  aahaLife: "AAHA/AAFP Feline Life Stage Guidelines",
  aahaVax: "AAHA/AAFP Feline Vaccination Guidelines",
  avma: "AVMA Pet First Aid",
  capc: "CAPC Parasite Guidelines",
  cornell: "Cornell Feline Health Center",
  icatcare: "International Cat Care",
  merck: "Merck Veterinary Manual",
  vca: "VCA Hospitals",
  vohc: "Veterinary Oral Health Council",
  wsava: "WSAVA Global Guidelines",
  aspca: "ASPCA Animal Poison Control",
  fda: "FDA animal health literacy",
};

const SOURCE_URL = {
  aafpEnv: "https://catvets.com/guidelines/practice-guidelines/environmental-needs-guidelines",
  aafpIntercat: "https://catvets.com/guidelines/practice-guidelines/intercat-tension-guidelines",
  aahaLife: "https://www.aaha.org/resources/2021-aaha-aafp-feline-life-stage-guidelines/",
  aahaVax: "https://www.aaha.org/resources/2020-aahaaafp-feline-vaccination-guidelines/",
  avma: "https://www.avma.org/resources-tools/pet-owners/emergencycare/first-aid-tips-pet-owners",
  capc: "https://capcvet.org/guidelines/",
  cornell: "https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics",
  icatcare: "https://icatcare.org/advice/",
  merck: "https://www.merckvetmanual.com/cat-owners",
  vca: "https://vcahospitals.com/know-your-pet",
  vohc: "https://vohc.org/accepted-products/",
  wsava: "https://wsava.org/global-guidelines/",
  aspca: "https://www.aspca.org/pet-care/animal-poison-control",
  fda: "https://www.fda.gov/animal-veterinary/animal-health-literacy",
};

const SOURCE_SHORT = {
  aafpEnv: "AAFP/ISFM",
  aafpIntercat: "AAFP 2024",
  aahaLife: "AAHA/AAFP",
  aahaVax: "AAHA/AAFP",
  avma: "AVMA",
  capc: "CAPC",
  cornell: "Cornell",
  icatcare: "iCatCare",
  merck: "Merck",
  vca: "VCA",
  vohc: "VOHC",
  wsava: "WSAVA",
  aspca: "ASPCA",
  fda: "FDA",
};

const medicalSource = (id) => `docs/medical/source/${id}.source.md`;
const medicalCard = (id) => `docs/medical/ai-cards/${id}.ai-card.md`;
const careCard = (id) => `docs/care/ai-cards/${id}.care-card.md`;

const POSTERS = [
  {
    id: "cat-emergency-red-flags",
    kind: "medical",
    priority: 1,
    title: "通用急诊红旗",
    subtitle: "命中这些信号,不要继续在家观察",
    docs: [medicalCard("cat-emergency-red-flags"), medicalSource("cat-emergency-red-flags")],
    sourceRefs: ["avma", "vca", "merck"],
    panels: [
      ["呼吸红旗", "张口喘、呼吸费力、牙龈或舌头发紫,按急诊处理。", "breath"],
      ["排尿红旗", "频繁蹲砂但尿不出或只有几滴,尤其公猫,立刻联系急诊。", "litter"],
      ["误食红旗", "人药、百合、鼠药、防冻液、巧克力等,带包装联系医院。", "toxin"],
      ["神经/休克", "抽搐、叫不醒、站不起来、牙龈白紫,停止普通追问。", "alert"],
    ],
    observe: ["记录开始时间、拍视频、准备最近医院电话。", "运输时保持安静,减少搬动。"],
    avoid: ["不要喂人药、止痛药、抗生素或镇静药。", "不要自行催吐、挤压膀胱。"],
    redFlags: ["呼吸异常", "尿不出", "误食高危物", "抽搐/叫不醒"],
  },
  {
    id: "cat-urethral-obstruction",
    kind: "medical",
    priority: 1,
    title: "尿不出硬急症",
    subtitle: "频繁蹲砂但没尿,优先排尿闭",
    docs: [medicalCard("cat-urethral-obstruction"), medicalSource("cat-urethral-obstruction")],
    sourceRefs: ["icatcare", "cornell", "merck", "vca"],
    panels: [
      ["先看尿量", "反复蹲、尿团很少或没有,不要当便秘拖。", "litter"],
      ["公猫更急", "公猫尿不出或只有几滴,按急诊路径处理。", "male"],
      ["疼痛信号", "排尿时嚎叫、舔尿道口、腹部紧张,需要马上联系医院。", "pain"],
      ["带上记录", "尿团照片、蹲砂视频、发作时间,路上给医院说明。", "camera"],
    ],
    observe: ["能尿但尿频/血尿也要尽快门诊。", "尿不出没有绿档。"],
    avoid: ["不要按压肚子或膀胱。", "不要强灌水、喂人药、等到明天。"],
    redFlags: ["几乎尿不出", "公猫尿不出", "痛苦嚎叫", "不吃/呕吐/精神差"],
  },
  {
    id: "cat-general-triage",
    kind: "medical",
    priority: 1,
    title: "通用分诊入口",
    subtitle: "先排急症,再转具体症状或日常护理",
    docs: [medicalCard("cat-general-triage"), medicalSource("cat-general-triage")],
    sourceRefs: ["aahaLife", "cornell", "aahaVax", "wsava"],
    panels: [
      ["第一问红旗", "呼吸、尿不出、误食、出血、抽搐、叫不醒先排除。", "alert"],
      ["看状态时长", "精神、食欲、饮水、排尿排便和持续多久决定下一步。", "record"],
      ["转具体路径", "呕吐、腹泻、耳眼皮肤、口腔、跛行等进入专门资料卡。", "search"],
      ["日常护理边界", "没有健康信号时,再转喂养、训练、环境和护理建议。", "home"],
    ],
    observe: ["每轮只问1-2个关键问题,不要把用户拖在普通追问里。", "信息不足时按保守风险处理。"],
    avoid: ["不要直接诊断病名。", "不要给药名、剂量或替代兽医检查。"],
    redFlags: ["张口喘/牙龈发紫", "尿不出", "高危误食", "抽搐/站不起来"],
  },
  {
    id: "cat-dyspnea",
    kind: "medical",
    priority: 1,
    title: "呼吸异常",
    subtitle: "猫张口喘不是普通累了",
    docs: [medicalCard("cat-dyspnea"), medicalSource("cat-dyspnea")],
    sourceRefs: ["cornell", "vca", "avma"],
    panels: [
      ["张口喘", "像狗一样喘、嘴张着呼吸,直接按急诊处理。", "breath"],
      ["费力呼吸", "腹部用力、头颈伸直、身体前伸,不要继续追问。", "chest"],
      ["颜色变化", "舌头、牙龈、嘴唇发蓝发紫,马上联系急诊。", "gum"],
      ["安全运输", "安静放入猫包,减少刺激,提前电话说明呼吸情况。", "carrier"],
    ],
    observe: ["如果只是喷嚏/鼻涕,也要持续观察呼吸是否变费力。"],
    avoid: ["不要强行喂水喂药。", "不要洗澡、折腾、长时间拍照。"],
    redFlags: ["张口喘", "腹部用力", "牙龈发紫", "瘫软/抽搐"],
  },
  {
    id: "cat-toxin-ingestion",
    kind: "medical",
    priority: 1,
    title: "误食/中毒风险",
    subtitle: "先收集信息,不要自行处理",
    docs: [medicalCard("cat-toxin-ingestion"), medicalSource("cat-toxin-ingestion")],
    sourceRefs: ["cornell", "aspca", "merck", "fda", "vca"],
    panels: [
      ["先问吃了什么", "人药、百合、鼠药、清洁剂、巧克力、绳线都属高风险。", "toxin"],
      ["记录三件事", "什么时候、可能吃多少、猫体重多少,带包装或照片。", "timer"],
      ["看伴随症状", "呕吐、流口水、走不稳、抽搐、呼吸重,直接急诊。", "alert"],
      ["联系路径", "优先联系兽医/毒物热线,按当地可用资源处理。", "phone"],
    ],
    observe: ["不确定成分时,按不确定高风险处理。"],
    avoid: ["不要自行催吐。", "不要喂牛奶、油、人药或网传解毒方法。"],
    redFlags: ["百合/人药/鼠药", "绳线异物", "抽搐/走不稳", "不知道吃了什么"],
  },
  {
    id: "cat-trauma-first-aid",
    kind: "medical",
    priority: 1,
    title: "创伤急救与转运",
    subtitle: "止血、少搬动、尽快联系医院",
    docs: [medicalCard("cat-trauma-first-aid"), medicalSource("cat-trauma-first-aid")],
    sourceRefs: ["avma", "merck", "vca"],
    panels: [
      ["先看ABC", "呼吸、出血、意识是第一优先级。", "alert"],
      ["出血按压", "用干净布持续直接按压,不要频繁掀开看。", "bandage"],
      ["少搬动", "坠楼、车撞、疑似骨折,平稳放入硬底猫包。", "carrier"],
      ["带信息", "事件时间、视频、伤口照片、能否站立,路上告知医院。", "camera"],
    ],
    observe: ["小伤口也要防舔,肿胀化脓转当天门诊。"],
    avoid: ["不要喂人用止痛药。", "不要酒精、双氧水、精油处理伤口。"],
    redFlags: ["呼吸困难", "压不住血", "坠楼/车撞", "意识异常"],
  },
  {
    id: "cat-seizure-neurologic-emergency",
    kind: "medical",
    priority: 1,
    title: "抽搐/神经急症",
    subtitle: "保护安全,记录时间,别伸手进嘴",
    docs: [medicalCard("cat-seizure-neurologic-emergency"), medicalSource("cat-seizure-neurologic-emergency")],
    sourceRefs: ["vca", "merck"],
    panels: [
      ["先计时", "记录开始和结束,超过5分钟或不停发作按急诊。", "timer"],
      ["清开周围", "移开硬物,避免摔落,让猫在安全地面恢复。", "safe"],
      ["看次数", "短时间多次、发作间不恢复,不要在家观察。", "repeat"],
      ["带视频", "能安全拍就拍,方便兽医判断发作类型。", "camera"],
    ],
    observe: ["单次短暂且恢复正常,也建议联系兽医评估发作史。"],
    avoid: ["不要把手、勺子、筷子伸进猫嘴。", "不要强行喂水、喂食、喂药。"],
    redFlags: ["超过5分钟", "连续发作", "叫不醒/站不起来", "误食或外伤相关"],
  },
  {
    id: "care-nail-trimming",
    kind: "care",
    priority: 1,
    title: "剪指甲训练",
    subtitle: "先脱敏,只剪透明尖尖",
    docs: [careCard("care-nail-trimming")],
    sourceRefs: ["icatcare", "vca", "aahaLife"],
    panels: [
      ["摸爪奖励", "先不剪,每天摸爪1-2秒就给奖励。", "paw"],
      ["按出指甲", "能接受后,轻轻按出指甲,马上放开并奖励。", "claw"],
      ["熟悉工具", "让猫闻指甲剪,听开合声,不要直接上手剪。", "clipper"],
      ["剪透明尖", "第一次只剪1个透明尖尖,避开粉色血线。", "nail"],
    ],
    observe: ["选猫困、放松、吃完饭后的时间。", "一次剪不完没关系,分几天完成。"],
    avoid: ["不要两个人强按着剪。", "不要失败后追着猫继续剪。"],
    redFlags: ["劈裂或止不住血", "肉垫红肿/跛行/一直舔脚", "老年猫指甲弯进肉垫"],
  },
  {
    id: "cat-anorexia",
    kind: "medical",
    priority: 2,
    title: "猫不吃/食欲下降",
    subtitle: "看时长、年龄和是否想吃但吃不了",
    docs: [medicalCard("cat-anorexia"), medicalSource("cat-anorexia")],
    sourceRefs: ["cornell", "vca", "icatcare"],
    panels: [
      ["看持续多久", "成年猫完全不吃接近24小时,不要继续拖。", "bowl"],
      ["幼猫更短", "6周以下幼猫不吃约12小时就要联系医院。", "kitten"],
      ["真假厌食", "想吃但咬不动、吞不下、流口水,走口腔风险。", "mouth"],
      ["宿主风险", "肥胖、慢病、幼猫突然不吃,风险更高。", "scale"],
    ],
    observe: ["记录吃了多少、喝水、精神、呕吐腹泻和体重。"],
    avoid: ["不要硬灌或强喂。", "不要把持续不吃当挑食。"],
    redFlags: ["成年猫接近24小时不吃", "幼猫约12小时不吃", "肥胖猫突然不吃", "伴呕吐/腹泻/呼吸异常"],
  },
  {
    id: "cat-vomiting",
    kind: "medical",
    priority: 2,
    title: "猫呕吐",
    subtitle: "频率和伴随症状决定急不急",
    docs: [medicalCard("cat-vomiting"), medicalSource("cat-vomiting")],
    sourceRefs: ["cornell", "merck", "vca"],
    panels: [
      ["先数次数", "连续吐、一天多次吐、吐完又吐,尽快门诊/急诊。", "vomit"],
      ["看内容", "有血、咖啡渣样、绳线异物,风险升级。", "alert"],
      ["看状态", "精神差、虚弱、腹痛、脱水、体重下降,不按毛球处理。", "catWorry"],
      ["看误食", "药、植物、巧克力、洋葱、塑料、绳线,转误食路径。", "toxin"],
    ],
    observe: ["拍呕吐物照片,记录时间、频率、饮食变化。"],
    avoid: ["不要直接判断是毛球。", "不要自行喂止吐药或人药。"],
    redFlags: ["一天多次", "呕吐物有血", "精神很差", "误食可能"],
  },
  {
    id: "cat-diarrhea",
    kind: "medical",
    priority: 2,
    title: "猫腹泻",
    subtitle: "便便形态 + 精神食欲一起看",
    docs: [medicalCard("cat-diarrhea"), medicalSource("cat-diarrhea")],
    sourceRefs: ["cornell", "icatcare", "vca"],
    panels: [
      ["看颜色", "黑色柏油样便或大量血便,尽快就医。", "stool"],
      ["看频率", "严重水样、反复腹泻或超过观察窗口,联系兽医。", "repeat"],
      ["看全身", "同时呕吐、不吃、精神差、腹痛、脱水,风险升级。", "alert"],
      ["幼猫更急", "幼猫水样/频繁腹泻或精神差,不要等。", "kitten"],
    ],
    observe: ["准备新鲜粪便样本或照片。", "记录换粮、零食、驱虫和接触史。"],
    avoid: ["不要自行喂人用止泻药。", "不要只靠断粮处理。"],
    redFlags: ["大量血便/黑便", "伴呕吐不吃", "幼猫腹泻", "脱水/虚弱"],
  },
  {
    id: "cat-bleeding",
    kind: "medical",
    priority: 2,
    title: "看到血/出血",
    subtitle: "先止血,再判断来源和休克",
    docs: [medicalCard("cat-bleeding"), medicalSource("cat-bleeding")],
    sourceRefs: ["vca", "merck"],
    panels: [
      ["直接按压", "外部出血用干净纱布/布料持续按压。", "bandage"],
      ["看止不止", "按压10-15分钟仍止不住、大量出血,急诊。", "timer"],
      ["看牙龈", "牙龈苍白、呼吸快、虚弱,提示休克风险。", "gum"],
      ["查来源", "呕血、黑便、尿血、鼻血、鼠药接触,路径不同。", "search"],
    ],
    observe: ["拍出血部位和量,记录是否外伤或误食鼠药。"],
    avoid: ["不要拔深插异物。", "不要把绷带缠太紧。"],
    redFlags: ["按压不止", "牙龈苍白", "无外伤但虚弱", "鼠药/多处出血"],
  },
  {
    id: "cat-eye-problem",
    kind: "medical",
    priority: 2,
    title: "眼睛问题",
    subtitle: "疼痛、外伤、浑浊优先当天处理",
    docs: [medicalCard("cat-eye-problem"), medicalSource("cat-eye-problem")],
    sourceRefs: ["cornell"],
    panels: [
      ["先看疼痛", "眯眼、睁不开、怕光、一直揉眼,当天联系兽医。", "eye"],
      ["看眼球", "表面发白、发蓝、发浑、像有坑或膜,风险高。", "cloud"],
      ["问外伤", "抓伤、打架、撞伤、异物或清洁剂接触,不要拖。", "spark"],
      ["记录变化", "拍同角度照片,说明单眼/双眼、分泌物和时长。", "camera"],
    ],
    observe: ["轻微分泌物可短期观察,但持续或恶化就转黄。"],
    avoid: ["不要自行滴人用眼药。", "不要揉眼、冲刺激性液体。"],
    redFlags: ["睁不开/怕光", "眼球浑浊", "外伤/化学刺激", "突然看不见"],
  },
  {
    id: "cat-ear-problem",
    kind: "medical",
    priority: 2,
    title: "耳朵问题",
    subtitle: "先排头歪走不稳,再谈清洁",
    docs: [medicalCard("cat-ear-problem"), medicalSource("cat-ear-problem")],
    sourceRefs: ["cornell", "merck"],
    panels: [
      ["先排平衡", "头歪、走不稳、眼球左右摆动,不是普通耳垢。", "ear"],
      ["看外耳", "频繁甩头、挠耳、臭味、黑色/脓性分泌物,需检查。", "search"],
      ["问风险", "幼猫、外出、多猫或近期接触新猫,耳螨传染风险更高。", "group"],
      ["可做记录", "拍耳道外观、分泌物、甩头和走路视频。", "camera"],
    ],
    observe: ["只擦外耳可见脏污,病耳先让兽医判断。"],
    avoid: ["不要双氧水、醋、酒精、精油入耳。", "不要棉签深入掏耳或自行滴药。"],
    redFlags: ["头歪/走不稳", "面部或眼球异常", "剧痛/肿胀/抓出血"],
  },
  {
    id: "cat-uri",
    kind: "medical",
    priority: 2,
    title: "打喷嚏/流鼻涕",
    subtitle: "轻症观察,呼吸和不吃要升级",
    docs: [medicalCard("cat-uri"), medicalSource("cat-uri")],
    sourceRefs: ["cornell", "merck"],
    panels: [
      ["看呼吸", "张口喘、呼吸费力、牙龈发紫,直接急诊。", "breath"],
      ["看进食", "明显不吃,尤其超过24小时或幼猫不吃,尽快联系兽医。", "bowl"],
      ["看口腔", "口腔溃疡、流口水、不愿吃硬粮,要门诊评估。", "mouth"],
      ["做记录", "喷嚏频率、鼻涕颜色、眼分泌物、同住猫情况。", "camera"],
    ],
    observe: ["精神食欲正常、呼吸平稳时可短期观察。"],
    avoid: ["不要自行用抗生素或人用感冒药。", "不要用香薰/精油熏。"],
    redFlags: ["张口喘", "不吃超过24小时", "幼猫不吃", "瘫软/叫不醒"],
  },
  {
    id: "cat-lethargy",
    kind: "medical",
    priority: 2,
    title: "精神差/嗜睡",
    subtitle: "系统性风险入口,先排硬红旗",
    docs: [medicalCard("cat-lethargy"), medicalSource("cat-lethargy")],
    sourceRefs: ["vca", "merck", "icatcare"],
    panels: [
      ["叫不醒", "瘫软、不能站立、明显虚弱,立即就医。", "catWorry"],
      ["看呼吸", "张口喘、呼吸费力、牙龈蓝紫,直接急诊。", "breath"],
      ["看牙龈", "苍白、白、黄、蓝紫都不是普通困。", "gum"],
      ["看吃喝尿", "不吃接近24小时、脱水、尿不出,风险升级。", "litter"],
    ],
    observe: ["记录持续多久、体温感、食欲、饮水、排尿排便。"],
    avoid: ["不要只说“睡多了”就忽略。", "不要用人药提神或退烧。"],
    redFlags: ["叫不醒/不能站", "呼吸异常", "牙龈异常", "不吃/尿不出"],
  },
  {
    id: "cat-heatstroke-weather-hazard",
    kind: "medical",
    priority: 2,
    title: "高温/中暑风险",
    subtitle: "先降温通风,同时联系医院",
    docs: [medicalCard("cat-heatstroke-weather-hazard"), medicalSource("cat-heatstroke-weather-hazard")],
    sourceRefs: ["cornell"],
    panels: [
      ["看暴露", "车内、阳台、无通风高温空间,即使暂时清醒也要联系医院。", "sun"],
      ["看呼吸", "高温后张口喘、呼吸急促、流口水,按急症处理。", "breath"],
      ["温和降温", "移到阴凉通风处,凉水温和打湿毛发或脚垫。", "water"],
      ["记录时间", "暴露多久、什么时候开始异常,路上告诉医院。", "timer"],
    ],
    observe: ["精神恢复也要观察是否呕吐、腹泻或虚弱。"],
    avoid: ["不要冰水浸泡或冰块强冷。", "不要强灌水或喂人用退烧药。"],
    redFlags: ["倒下/站不稳", "张口喘/流口水", "呕吐腹泻", "被关高温空间"],
  },
  {
    id: "cat-constipation-straining",
    kind: "medical",
    priority: 2,
    title: "便秘/排便用力",
    subtitle: "先分清尿不出还是拉不出",
    docs: [medicalCard("cat-constipation-straining"), medicalSource("cat-constipation-straining")],
    sourceRefs: ["cornell", "aahaLife"],
    panels: [
      ["先看尿团", "频繁蹲砂但不确定尿还是便,优先排尿闭。", "litter"],
      ["看最后排便", "多日未排便、反复用力无结果、干硬小球,联系兽医。", "stool"],
      ["看全身", "伴呕吐、腹痛、精神差、不吃,风险升级。", "alert"],
      ["宿主风险", "幼猫、老年猫、慢病猫、脱水或术后,不要拖。", "senior"],
    ],
    observe: ["记录最后排便时间、粪便照片和尿团情况。"],
    avoid: ["不要人用泻药、灌肠剂、矿物油。", "不要挤压腹部或膀胱。"],
    redFlags: ["可能尿不出", "多日无便", "呕吐/腹痛", "高风险猫"],
  },
  {
    id: "cat-skin-problem",
    kind: "medical",
    priority: 3,
    title: "皮肤痒/掉毛/猫癣疑似",
    subtitle: "会传染给人,但先让兽医确诊",
    docs: [medicalCard("cat-skin-problem"), medicalSource("cat-skin-problem")],
    sourceRefs: ["cornell", "merck", "vca"],
    panels: [
      ["看破溃", "多发开放溃疡、流脓、红肿热痛,尽快就医。", "skin"],
      ["看全身", "皮肤问题同时萎靡、不吃或发热感,不要只擦药。", "alert"],
      ["问人和环境", "家人红痒圈、多猫、跳蚤黑点,都要记录。", "group"],
      ["确诊优先", "猫癣、过敏、跳蚤、感染外观相似,需要检查。", "search"],
    ],
    observe: ["拍皮损清晰照片,记录扩散速度和是否抓挠。"],
    avoid: ["不要乱涂人用药、精油或激素药膏。", "不要只靠洗澡解决跳蚤。"],
    redFlags: ["流脓/破溃", "伴不吃/发热", "幼猫跳蚤虚弱", "叫不醒/张口喘"],
  },
  {
    id: "cat-oral-problem",
    kind: "medical",
    priority: 3,
    title: "口腔问题",
    subtitle: "疼痛口腔不靠刷牙解决",
    docs: [medicalCard("cat-oral-problem"), medicalSource("cat-oral-problem")],
    sourceRefs: ["cornell", "merck", "vca", "vohc", "aahaLife", "wsava"],
    panels: [
      ["先排异物", "舌下线、绳、丝带不要拉,立刻联系医院。", "string"],
      ["看疼痛", "流口水、掉食、抓嘴、拒食、牙齿打颤,需要检查。", "mouth"],
      ["护理边界", "健康口腔可刷牙训练;红肿疼痛时不要硬刷。", "tooth"],
      ["产品边界", "洁齿产品看VOHC等背书,不能替代治疗。", "seal"],
    ],
    observe: ["拍口腔外观、吃饭视频、掉食或流口水情况。"],
    avoid: ["不要用人牙膏、人漱口水、酒精、双氧水。", "不要自行刮牙结石。"],
    redFlags: ["舌下线异物", "灼伤/化学品", "流口水伴拒食", "口腔肿块/气道风险"],
  },
  {
    id: "cat-behavior-change",
    kind: "medical",
    priority: 3,
    title: "行为突然变化",
    subtitle: "先排疼痛和身体病,再谈行为训练",
    docs: [medicalCard("cat-behavior-change"), medicalSource("cat-behavior-change")],
    sourceRefs: ["merck", "cornell", "vca"],
    panels: [
      ["摸到就咬", "以前温顺,现在摸某部位嚎叫/咬/躲,可能在疼。", "pain"],
      ["伴身体症状", "不吃、呕吐、腹泻、张口喘、流口水,先就医。", "alert"],
      ["看神经", "突然走不稳、转圈、撞东西、意识异常,急诊。", "brain"],
      ["记录变化", "何时开始、触发场景、视频、猫砂盆和食欲变化。", "camera"],
    ],
    observe: ["持续行为改变建议先做体检和基础检查。"],
    avoid: ["不要惩罚、喷水或强迫接触。", "不要直接归因为报复或不乖。"],
    redFlags: ["疼痛攻击", "合并呕吐不吃", "走不稳/意识异常", "张口喘"],
  },
  {
    id: "cat-limping",
    kind: "medical",
    priority: 3,
    title: "跛行/走路异常",
    subtitle: "从小伤到硬急症,先排后腿瘫软",
    docs: [medicalCard("cat-limping"), medicalSource("cat-limping")],
    sourceRefs: ["merck", "vca"],
    panels: [
      ["后腿突然瘫", "后腿拖行、大声疼、脚垫发紫或苍白,立即急诊。", "leg"],
      ["不能负重", "完全不用某条腿、三条腿走、角度畸形,尽快就医。", "bone"],
      ["问外伤", "坠落、车祸、打架、门夹后跛行,即使能走也要评估。", "spark"],
      ["限制活动", "短期内减少跳跃,拍走路视频给医生看。", "camera"],
    ],
    observe: ["老年猫长期跳不上去,可能是关节疼痛而不只是变懒。"],
    avoid: ["不要喂人用止痛药。", "不要强迫跳跃或按摩疼痛关节。"],
    redFlags: ["后腿瘫软/发凉", "完全不能负重", "明显肿胀畸形", "外伤后跛行"],
  },
  {
    id: "care-kitten-feeding",
    kind: "care",
    priority: 3,
    title: "幼猫喂养频率",
    subtitle: "按年龄阶段,看体重和便便",
    docs: [careCard("care-kitten-feeding")],
    sourceRefs: ["icatcare", "vca", "aahaLife"],
    panels: [
      ["4周以下", "以奶为主,需要保温和频繁喂养,新手不建议只靠文字处理。", "kitten"],
      ["4-8周", "逐步断奶,少量多餐,从湿粮/泡软幼猫粮过渡。", "bowl"],
      ["2-6月龄", "通常一天3-4餐更稳,看体况和便便调整。", "scale"],
      ["6月龄后", "多数可慢慢过渡到一天2-3餐。", "calendar"],
    ],
    observe: ["每周称重比单次吃多少更有用。", "新粮至少5-7天过渡。"],
    avoid: ["不要用牛奶当主食。", "不要频繁换粮试错。"],
    redFlags: ["幼猫精神差/不吃", "腹泻脱水", "体重不增", "低体温"],
  },
  {
    id: "care-reproduction-neonatal-kitten",
    kind: "care",
    priority: 3,
    title: "怀孕分娩/新生幼猫",
    subtitle: "繁殖和手养奶猫要保守处理",
    docs: [careCard("care-reproduction-neonatal-kitten")],
    sourceRefs: ["vca", "icatcare"],
    panels: [
      ["母猫异常", "虚弱、异常分泌物、难产迹象,尽快联系医院。", "mother"],
      ["保温优先", "健康幼猫温暖干燥时会找乳头,冷幼猫吃不好。", "heat"],
      ["喂养频率", "孤儿幼猫第一周通常需2-4小时间隔喂养。", "bottle"],
      ["体重记录", "每只编号,每天同一时间称重,看是否持续增重。", "scale"],
    ],
    observe: ["记录吃奶、叫声、腹泻、母猫是否照顾。"],
    avoid: ["不要用牛奶当主食。", "不要在幼猫冰冷时硬喂或自行管饲。"],
    redFlags: ["一直叫/不吃奶", "体重不增", "母猫不哺乳", "异常分娩"],
  },
  {
    id: "care-toothbrushing-training",
    kind: "care",
    priority: 3,
    title: "刷牙训练",
    subtitle: "健康口腔训练,不是疼痛时硬刷",
    docs: [careCard("care-toothbrushing-training")],
    sourceRefs: ["cornell", "aahaLife", "vohc", "wsava"],
    panels: [
      ["碰嘴1秒", "先用手指或纱布碰嘴边1秒,马上奖励。", "hand"],
      ["逐步扩大", "碰嘴唇、犬齿外侧、后牙外侧,每步都短。", "tooth"],
      ["猫用牙膏", "先让猫主动舔一点猫专用牙膏气味。", "paste"],
      ["外侧牙面", "最后用指套或小刷头,从几秒开始刷外侧。", "brush"],
    ],
    observe: ["目标是长期习惯,不是第一天刷干净。"],
    avoid: ["牙龈红肿或疼时不要硬刷。", "不要用人牙膏、人漱口水、酒精、双氧水。"],
    redFlags: ["流口水/拒食", "牙龈红肿疼痛", "掉食/抓嘴", "口腔异物"],
  },
  {
    id: "care-vaccine-schedule-reactions",
    kind: "care",
    priority: 3,
    title: "疫苗与疫苗后观察",
    subtitle: "不是固定答案,按风险评估",
    docs: [careCard("care-vaccine-schedule-reactions")],
    sourceRefs: ["aahaVax", "aahaLife"],
    panels: [
      ["带免疫史", "年龄、既往记录、来源、接触史,给医院建档。", "record"],
      ["核心讨论", "疱疹、杯状、泛白、狂犬;FeLV按年龄和暴露评估。", "syringe"],
      ["当天休息", "疫苗后24小时安静休息,观察精神食欲。", "sleep"],
      ["问下一针", "下一针时间、是否避开绝育搬家寄养等压力事件。", "calendar"],
    ],
    observe: ["记录呼吸、脸部肿胀、呕吐腹泻、精神食欲。"],
    avoid: ["不要网购来路不明疫苗或自行注射。", "不要猫明显生病时自行安排疫苗。"],
    redFlags: ["呼吸异常", "脸部肿胀", "持续呕吐腹泻", "严重精神差"],
  },
  {
    id: "care-parasite-prevention-zoonosis",
    kind: "care",
    priority: 3,
    title: "驱虫/寄生虫预防",
    subtitle: "按猫和家庭风险,不要自行混药",
    docs: [careCard("care-parasite-prevention-zoonosis")],
    sourceRefs: ["capc", "aahaLife"],
    panels: [
      ["问风险", "年龄、体重、地区、外出、接触动物、是否生食。", "search"],
      ["室内不等于零", "跳蚤可由人、其它宠物或环境带入。", "flea"],
      ["同住动物", "看到跳蚤、虫节、耳垢增多,不只处理一只猫。", "group"],
      ["家庭防护", "孕妇、儿童、免疫低下成员要重视清理和洗手。", "home"],
    ],
    observe: ["记录商品名、规格、日期、猫体重。"],
    avoid: ["不要用狗用驱虫药、农药或精油。", "不要叠加驱虫药来加强效果。"],
    redFlags: ["幼猫虚弱牙龈苍白", "严重瘙痒破皮", "疑似中毒反应", "人畜共患风险"],
  },
  {
    id: "care-nutrition-weight-bcs",
    kind: "care",
    priority: 3,
    title: "营养/体重/体况",
    subtitle: "别只问几克,要看体况和热量",
    docs: [careCard("care-nutrition-weight-bcs")],
    sourceRefs: ["wsava", "aahaLife"],
    panels: [
      ["看体况", "能摸到肋骨但不硌手、有腰线,比只看公斤数更有参考。", "scale"],
      ["算热量", "主食、湿粮、零食都要算进每日摄入。", "bowl"],
      ["慢慢减重", "减重应和兽医确认目标体重和热量,不要突然断粮。", "chart"],
      ["记录7天", "每天吃了多少、包装热量、体重、便便和活动变化。", "record"],
    ],
    observe: ["零食可用主粮的一小部分替代训练奖励。"],
    avoid: ["不要给固定克数当医嘱。", "不要无方案长期自制粮/生骨肉。"],
    redFlags: ["快速消瘦", "多饮多尿", "长期呕吐腹泻", "完全不吃"],
  },
  {
    id: "care-litter-box-habits",
    kind: "care",
    priority: 4,
    title: "猫砂盆习惯",
    subtitle: "先把环境做好,再判断医疗信号",
    docs: [careCard("care-litter-box-habits")],
    sourceRefs: ["aafpEnv"],
    panels: [
      ["每天清洁", "每天铲至少1-2次,整盆定期换砂清洗。", "litter"],
      ["数量够", "猫砂盆建议猫数+1,多猫家庭尤其重要。", "plus"],
      ["位置安全", "够大、安静、通风、容易到达,不要放门后或饭盆旁。", "home"],
      ["换砂慢慢来", "新旧混合或并排放两盆,让猫选择。", "swap"],
    ],
    observe: ["不埋屎不一定是问题,重点看是否干净和安全。"],
    avoid: ["不要用强香型猫砂掩盖味道。", "不要因不埋屎惩罚猫。"],
    redFlags: ["尿不出/频繁蹲", "便血/黑便", "排便用力伴精神差", "突然乱尿"],
  },
  {
    id: "care-food-transition-picky-eating",
    kind: "care",
    priority: 4,
    title: "挑食/换粮",
    subtitle: "先排不舒服,再稳定过渡",
    docs: [careCard("care-food-transition-picky-eating")],
    sourceRefs: ["wsava", "aahaLife"],
    panels: [
      ["先排疾病", "完全不吃、精神差、呕吐腹泻,不是普通挑食。", "search"],
      ["5-7天过渡", "旧粮多、新粮少,每天慢慢增加新粮比例。", "calendar"],
      ["软便放慢", "曾经软便的猫,可把过渡拉到10-14天。", "stool"],
      ["定时放饭", "到点收走,比全天不断添新口味更稳定。", "bowl"],
    ],
    observe: ["可少量温水或原本爱吃湿粮香气辅助。"],
    avoid: ["不要突然整袋换新粮。", "不要长期只喂零食或冻干。"],
    redFlags: ["完全不吃", "精神差", "持续呕吐腹泻", "体重下降"],
  },
  {
    id: "care-grooming-hairballs",
    kind: "care",
    priority: 4,
    title: "梳毛/掉毛/毛球",
    subtitle: "少量多次,别用洗澡解决掉毛",
    docs: [careCard("care-grooming-hairballs")],
    sourceRefs: ["icatcare", "aafpEnv"],
    panels: [
      ["短时间", "从猫喜欢的位置开始,每次1-3分钟,结束前奖励。", "brush"],
      ["顺毛轻梳", "不要一上来逆毛硬梳,先顺毛、轻力。", "fur"],
      ["毛结边缘拆", "轻微毛结从边缘慢慢拆,贴皮大结不要硬剪。", "scissors"],
      ["减少吞毛", "规律梳毛、足够饮水、稳定饮食是毛球管理核心。", "water"],
    ],
    observe: ["换毛季可增加梳毛频率,同时看皮肤红痒秃。"],
    avoid: ["不要用力扯毛结。", "不要频繁洗澡来解决掉毛。"],
    redFlags: ["皮肤红痒秃", "频繁吐毛球", "贴皮毛结", "精神食欲异常"],
  },
  {
    id: "care-scratching-furniture",
    kind: "care",
    priority: 4,
    title: "抓家具/抓沙发",
    subtitle: "这是正常需求,给替代物",
    docs: [careCard("care-scratching-furniture")],
    sourceRefs: ["aafpEnv", "aafpIntercat"],
    panels: [
      ["正常需求", "抓挠是伸展、气味标记、维护爪子的需求。", "scratch"],
      ["放对位置", "抓板放在猫已经想抓的地方,如沙发边、门口、睡醒路线。", "home"],
      ["材质匹配", "有的爱竖抓柱,有的爱横抓板或瓦楞纸。", "board"],
      ["奖励正确", "用抓板时立刻奖励;抓错时平静转移注意力。", "reward"],
    ],
    observe: ["抓柱要稳,高度要让猫能伸展开。"],
    avoid: ["不要打猫、喷水或大声吓。", "不要把去爪当普通解决方案。"],
    redFlags: ["抓挠伴疼痛", "爪子劈裂出血", "肉垫红肿", "突然行为改变"],
  },
  {
    id: "care-carrier-vet-visit",
    kind: "care",
    priority: 4,
    title: "猫包/去医院训练",
    subtitle: "平时打开猫包,别只在看病日出现",
    docs: [careCard("care-carrier-vet-visit")],
    sourceRefs: ["aafpEnv", "vca"],
    panels: [
      ["生活区常驻", "平时打开门放生活区,里面放垫子、零食或熟悉气味。", "carrier"],
      ["分步练习", "靠近、闻、踩进去、短关门、提起来、出门口、短车程。", "steps"],
      ["出门准备", "带疫苗/驱虫/病历、正在吃的药、症状视频。", "record"],
      ["路上安全", "猫必须在可靠猫包里,不要抱在怀里坐车。", "car"],
    ],
    observe: ["急症可以硬塞就医,但日常训练要低压力。"],
    avoid: ["不要用不透气袋子代替猫包。", "不要自行用镇静药让它冷静。"],
    redFlags: ["呼吸异常", "误食/抽搐/出血", "路上恶化", "无法安全转运"],
  },
  {
    id: "care-intercat-introduction-tension",
    kind: "care",
    priority: 4,
    title: "多猫关系/新猫引入",
    subtitle: "隔离、气味交换、资源分散",
    docs: [careCard("care-intercat-introduction-tension")],
    sourceRefs: ["aafpIntercat", "aafpEnv"],
    panels: [
      ["安全房", "新猫先单独房间,有砂盆、水、食物、躲藏处。", "home"],
      ["气味交换", "互换垫子或毛巾,先熟悉气味再见面。", "swap"],
      ["隔门喂食", "隔门两边吃饭,距离从远到近。", "bowl"],
      ["短时见面", "用玩具和奖励,一紧张就结束,保留退路高处。", "group"],
    ],
    observe: ["盯视、堵路、守资源、追逐、躲藏也是紧张信号。"],
    avoid: ["不要一到家直接见面。", "不要惩罚哈气或硬凑近和好。"],
    redFlags: ["咬伤/流血", "一只长期躲藏不吃", "排尿异常", "明显疼痛"],
  },
  {
    id: "care-play-biting",
    kind: "care",
    priority: 4,
    title: "咬手/扑腿",
    subtitle: "手只负责抚摸,猎物交给玩具",
    docs: [careCard("care-play-biting")],
    sourceRefs: ["aafpEnv", "vca", "cornell"],
    panels: [
      ["别用手逗", "手只负责抚摸和给奖励,猎物交给逗猫棒。", "hand"],
      ["被咬就停", "不要尖叫拉扯,停止互动,收走手脚10-20秒。", "pause"],
      ["固定玩耍", "每天2-3次互动,让猫追、扑、咬玩具。", "wand"],
      ["玩后进食", "玩完给一小口食物或正餐,结束狩猎流程。", "bowl"],
    ],
    observe: ["高发时段提前用逗猫棒导走精力。"],
    avoid: ["不要打嘴、弹鼻子、喷水。", "不要一边喊疼一边继续用手逗。"],
    redFlags: ["突然攻击加重", "触碰某处就咬", "伴不吃/躲藏", "伤口化脓"],
  },
  {
    id: "care-enrichment-play",
    kind: "care",
    priority: 4,
    title: "玩耍/环境丰容",
    subtitle: "短而稳定,让猫抓到“猎物”",
    docs: [careCard("care-enrichment-play")],
    sourceRefs: ["aafpEnv"],
    panels: [
      ["短互动", "每天2-3次,每次5-15分钟,比偶尔玩很久更稳定。", "calendar"],
      ["模拟猎物", "躲、跑、停、让猫抓到,别一直在脸前乱晃。", "wand"],
      ["结束奖励", "玩完给一小口食物或正餐,形成捕猎成功感。", "reward"],
      ["环境点位", "高处、抓板、窗边观察点、纸箱、藏食玩具。", "home"],
    ],
    observe: ["咬手玩时停止互动,换成玩具。"],
    avoid: ["不要只靠激光笔让猫永远抓不到。", "不要把精力需求都理解成不乖。"],
    redFlags: ["突然不玩/精神差", "疼痛跛行", "呼吸异常", "食欲下降"],
  },
  {
    id: "care-new-home-hiding",
    kind: "care",
    priority: 4,
    title: "新猫到家躲藏",
    subtitle: "这是确认安全,不是不喜欢你",
    docs: [careCard("care-new-home-hiding")],
    sourceRefs: ["aafpEnv", "icatcare"],
    panels: [
      ["安全屋", "小房间放砂盆、水、食物、窝、纸箱或遮挡处。", "home"],
      ["少打扰", "前2-3天少打扰,人在房间安静坐着即可。", "quiet"],
      ["固定作息", "固定喂饭、轻声说话、离开,建立可预测感。", "calendar"],
      ["让猫决定", "等猫主动靠近,先闻手背,不要直接抱。", "hand"],
    ],
    observe: ["零食和逗猫棒可建立正向联系,距离由猫决定。"],
    avoid: ["不要掀床、拖出来、强抱拍照。", "不要全屋开放让猫找不到安全点。"],
    redFlags: ["持续不吃不喝", "呕吐腹泻", "呼吸异常", "极度虚弱"],
  },
  {
    id: "care-night-vocalization",
    kind: "care",
    priority: 4,
    title: "夜间叫/半夜扒门",
    subtitle: "先排健康问题,再调作息",
    docs: [careCard("care-night-vocalization")],
    sourceRefs: ["aafpEnv", "merck"],
    panels: [
      ["睡前游戏", "睡前10-15分钟互动,模拟追逐、抓到、结束。", "wand"],
      ["玩后小餐", "游戏后给小餐或少量夜宵,进入进食后休息节奏。", "bowl"],
      ["白天丰容", "高处、窗边、嗅闻玩具、藏食玩具,减少白天睡满。", "home"],
      ["别强化叫", "夜里不要一叫就喂食、开门或陪玩。", "moon"],
    ],
    observe: ["关门训练白天先短时间练,不要只在夜里突然关。"],
    avoid: ["不要打骂、喷水、关笼惩罚。", "不要把突然异常叫都当调皮。"],
    redFlags: ["突然异常叫", "排尿异常", "疼痛/跛行", "精神食欲差"],
  },
  {
    id: "care-spay-neuter-postop-medication",
    kind: "care",
    priority: 4,
    title: "绝育术后/喂药",
    subtitle: "执行出院医嘱,观察伤口和精神",
    docs: [careCard("care-spay-neuter-postop-medication")],
    sourceRefs: ["cornell", "vca"],
    panels: [
      ["以医嘱为准", "吃药、戴圈、限制活动、复查拆线按手术医院要求。", "record"],
      ["防舔伤口", "戴圈/术后服是避免舔咬,不是惩罚。", "cone"],
      ["每天照片", "伤口每天同角度拍一张,比反复扒开看更清楚。", "camera"],
      ["核对药物", "药名、剂量、频率、疗程不确定就联系医院。", "pill"],
    ],
    observe: ["看精神、食欲、喝水、排尿排便、伤口渗液。"],
    avoid: ["不要给人用止痛药。", "不要酒精、双氧水、精油或人药膏涂伤口。"],
    redFlags: ["伤口张开/流脓/持续出血", "持续不吃/精神差", "一直舔咬", "吃错药/疑似过量"],
  },
  {
    id: "care-senior-chronic-monitoring",
    kind: "care",
    priority: 4,
    title: "老年猫/慢病监测",
    subtitle: "记录变化,复诊前整理清楚",
    docs: [careCard("care-senior-chronic-monitoring")],
    sourceRefs: ["aahaLife", "cornell"],
    panels: [
      ["每周体重", "同一称、同一时间,看趋势比单次数字更有用。", "scale"],
      ["吃喝尿便", "食欲、饮水、尿团、排便、呕吐频率都要记。", "record"],
      ["活动变化", "跳不上高处、跛行、躲藏、夜间叫、梳毛变差。", "senior"],
      ["复诊材料", "2-4周记录、用药清单、异常视频、想问的问题。", "doctor"],
    ],
    observe: ["慢病猫看起来还行不代表指标稳定。"],
    avoid: ["不要自行停药或改药。", "不要用其它猫方案套用。"],
    redFlags: ["快速消瘦", "多饮多尿", "长期呕吐", "明显不吃/精神差"],
  },
  {
    id: "care-chronic-kidney-endocrine-monitoring",
    kind: "care",
    priority: 4,
    title: "肾病/糖尿病/甲亢/高血压记录",
    subtitle: "不能靠聊天诊断,但能把记录做好",
    docs: [careCard("care-chronic-kidney-endocrine-monitoring")],
    sourceRefs: ["cornell", "aahaLife"],
    panels: [
      ["常见信号", "多饮多尿、体重下降、食欲异常、呕吐腹泻要记录。", "water"],
      ["每周称重", "同一称、同一时间,配合体况照片。", "scale"],
      ["药物清单", "处方粮、胰岛素、补液、药名剂量时间和漏用情况。", "pill"],
      ["问医生", "是否需要血检、尿检、血压、甲状腺、血糖或果糖胺。", "doctor"],
    ],
    observe: ["异常视频包括走路、精神、呼吸、抽搐或低血糖疑似表现。"],
    avoid: ["不要自行调整胰岛素、甲亢药、降压药、处方粮或补液。", "不要把快速消瘦当老了正常。"],
    redFlags: ["快速消瘦", "明显多饮多尿", "不吃/呕吐", "疑似低血糖/抽搐"],
  },
  {
    id: "care-mobility-arthritis-home",
    kind: "care",
    priority: 4,
    title: "关节/行动变慢",
    subtitle: "老猫懒得动,可能是疼",
    docs: [careCard("care-mobility-arthritis-home")],
    sourceRefs: ["cornell", "icatcare"],
    panels: [
      ["看隐蔽信号", "跳不上去、不愿下楼、梳毛差、猫砂盆困难。", "senior"],
      ["加台阶坡道", "常去高处加台阶或坡道,避免必须大跳。", "ramp"],
      ["低入口砂盆", "换低入口、大空间砂盆,放容易到达的位置。", "litter"],
      ["拍视频", "跳上/跳下、走路、进出砂盆、上下楼,带给医生。", "camera"],
    ],
    observe: ["体重和体况也要记,超重会增加关节负担。"],
    avoid: ["不要给人用止痛药。", "不要强迫跳跃或只买保健品代替评估。"],
    redFlags: ["突然不能走", "明显疼痛嚎叫", "肢体肿胀变形", "伴发热不吃"],
  },
  {
    id: "care-vet-summary",
    kind: "care",
    priority: 5,
    title: "整理给医生看的病情说明",
    subtitle: "只整理事实,不替医生下诊断",
    docs: [careCard("care-vet-summary")],
    sourceRefs: ["aahaLife", "vca"],
    panels: [
      ["时间线", "什么时候开始、持续多久、有没有加重或缓解。", "timer"],
      ["客观证据", "照片、视频、体重、食欲、饮水、尿团、便便。", "record"],
      ["处理经过", "已经喂了什么、用了什么、剂量和时间如实写。", "pill"],
      ["医生问题", "想问的检查、是否急诊、回家观察哪些指标。", "doctor"],
    ],
    observe: ["红档场景保持立刻就医级别,不要写降级措辞。"],
    avoid: ["不要写具体病原名和诊断结论。", "不要给药名剂量或购买建议。"],
    redFlags: ["呼吸异常", "尿不出", "误食/抽搐", "大量出血/叫不醒"],
  },
];

const KIND = {
  medical: {
    label: "分诊资料",
    accent: "#b85b50",
    tint: "#fff0ed",
    border: "#eab6ad",
    note: "用于风险分层,不替代兽医诊断",
    cat: "medical",
  },
  care: {
    label: "日常护理",
    accent: "#45836f",
    tint: "#eef8f3",
    border: "#afd8ca",
    note: "用于低压力护理和记录准备",
    cat: "care",
  },
};

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapText(text, maxChars) {
  const chunks = String(text)
    .replace(/\s+/g, " ")
    .split(/(?<=[,，。；;、])/u);
  const lines = [];
  let line = "";
  for (const chunk of chunks) {
    if ((line + chunk).length <= maxChars) {
      line += chunk;
      continue;
    }
    if (line) lines.push(line);
    if (chunk.length <= maxChars) {
      line = chunk;
      continue;
    }
    for (let i = 0; i < chunk.length; i += maxChars) {
      const part = chunk.slice(i, i + maxChars);
      if (part.length === maxChars) lines.push(part);
      else line = part;
    }
  }
  if (line) lines.push(line);
  const normalized = [];
  for (const item of lines) {
    if (/^[,，。；;、.!！?？)）]+$/.test(item) && normalized.length) {
      normalized[normalized.length - 1] += item;
    } else if (/^[,，。；;、.!！?？)）]/.test(item) && normalized.length) {
      normalized[normalized.length - 1] += item[0];
      if (item.slice(1)) normalized.push(item.slice(1));
    } else {
      normalized.push(item);
    }
  }
  return normalized.slice(0, 4);
}

function textSvg(text, x, y, width, fontSize, color, opts = {}) {
  const lineHeight = opts.lineHeight ?? Math.round(fontSize * 1.38);
  const weight = opts.weight ?? 500;
  const maxChars = opts.maxChars ?? Math.max(8, Math.floor(width / (fontSize * 0.92)));
  const lines = wrapText(text, maxChars);
  return lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * lineHeight}" fill="${color}" font-size="${fontSize}" font-weight="${weight}" font-family="-apple-system,BlinkMacSystemFont,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif">${esc(line)}</text>`,
    )
    .join("");
}

function iconSvg(name, x, y, size, accent) {
  const c = accent;
  const pale = "#f6d7b7";
  const dark = "#6b4938";
  const common = `stroke="${c}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  const map = {
    alert: `<path d="M${x + size / 2} ${y + 10} L${x + size - 10} ${y + size - 10} H${x + 10} Z" fill="#fff5d7" stroke="${c}" stroke-width="6"/><path d="M${x + size / 2} ${y + 42} v40 M${x + size / 2} ${y + 96} v2" ${common}/>`,
    bandage: `<rect x="${x + 16}" y="${y + 34}" width="${size - 32}" height="52" rx="18" fill="#fff7f0" stroke="${c}" stroke-width="6"/><path d="M${x + 46} ${y + 60} h48 M${x + 70} ${y + 36} v48" ${common}/><circle cx="${x + 28}" cy="${y + 50}" r="4" fill="${c}"/><circle cx="${x + size - 28}" cy="${y + 78}" r="4" fill="${c}"/>`,
    board: `<rect x="${x + 22}" y="${y + 14}" width="${size - 44}" height="${size - 28}" rx="18" fill="#f5d9b9" stroke="${c}" stroke-width="6"/><path d="M${x + 42} ${y + 36} h${size - 84} M${x + 42} ${y + 62} h${size - 84} M${x + 42} ${y + 88} h${size - 84}" ${common}/>`,
    bone: `<path d="M${x + 26} ${y + 74} L${x + 88} ${y + 32} M${x + 24} ${y + 72} c-20-10-4-34 12-20 c2-22 32-17 24 4 M${x + 88} ${y + 32} c14-20 39-2 21 15 c19 15-3 38-17 18" ${common}/>` ,
    bottle: `<rect x="${x + 40}" y="${y + 18}" width="46" height="88" rx="14" fill="#e7f5fb" stroke="${c}" stroke-width="6"/><path d="M${x + 50} ${y + 18} v-10 h26 v10 M${x + 52} ${y + 70} h22" ${common}/>`,
    bowl: `<path d="M${x + 18} ${y + 62} h${size - 36} a42 42 0 0 1 -84 0" fill="#fff7f0" stroke="${c}" stroke-width="6"/><ellipse cx="${x + size / 2}" cy="${y + 62}" rx="${size / 2 - 18}" ry="16" fill="#f7dfb9" stroke="${c}" stroke-width="5"/>`,
    brain: `<path d="M${x + 34} ${y + 56} c-24-20 4-50 26-30 c22-24 60 6 38 30 c25 17 0 54-26 32 c-14 21-52 8-38-32 z" fill="#fde0df" stroke="${c}" stroke-width="6"/><path d="M${x + 54} ${y + 38} c8 8 8 20 0 30 M${x + 82} ${y + 40} c-10 10-10 24 0 34" ${common}/>`,
    breath: `<path d="M${x + 30} ${y + 76} c20-28 44-28 64 0 M${x + 30} ${y + 48} c20-24 44-24 64 0 M${x + 20} ${y + 24} c34 16 70 16 104 0" ${common}/><circle cx="${x + 28}" cy="${y + 96}" r="7" fill="${c}"/>`,
    brush: `<rect x="${x + 28}" y="${y + 18}" width="40" height="86" rx="18" fill="#f7dfb9" stroke="${c}" stroke-width="6" transform="rotate(-22 ${x + 48} ${y + 61})"/><path d="M${x + 64} ${y + 28} l42 54 M${x + 76} ${y + 24} l34 44" ${common}/>`,
    calendar: `<rect x="${x + 20}" y="${y + 22}" width="${size - 40}" height="${size - 36}" rx="14" fill="#fff" stroke="${c}" stroke-width="6"/><path d="M${x + 20} ${y + 50} h${size - 40} M${x + 44} ${y + 14} v22 M${x + size - 44} ${y + 14} v22" ${common}/><path d="M${x + 42} ${y + 72} h20 M${x + 72} ${y + 72} h20 M${x + 42} ${y + 94} h20" ${common}/>`,
    camera: `<rect x="${x + 18}" y="${y + 32}" width="${size - 36}" height="72" rx="16" fill="#eef5fb" stroke="${c}" stroke-width="6"/><path d="M${x + 42} ${y + 32} l12-14 h36 l12 14" ${common}/><circle cx="${x + size / 2}" cy="${y + 68}" r="18" fill="#fff" stroke="${c}" stroke-width="6"/>`,
    car: `<path d="M${x + 22} ${y + 68} h${size - 44} v24 h-${size - 44} z M${x + 38} ${y + 68} l14-28 h48 l14 28" fill="#eef5fb" stroke="${c}" stroke-width="6"/><circle cx="${x + 44}" cy="${y + 96}" r="10" fill="${dark}"/><circle cx="${x + size - 44}" cy="${y + 96}" r="10" fill="${dark}"/>`,
    carrier: `<rect x="${x + 18}" y="${y + 34}" width="${size - 36}" height="76" rx="18" fill="#f6efe4" stroke="${c}" stroke-width="6"/><path d="M${x + 42} ${y + 34} c2-22 50-22 54 0 M${x + 72} ${y + 55} v42 M${x + 50} ${y + 62} h44 M${x + 50} ${y + 82} h44" ${common}/>`,
    catWorry: `<circle cx="${x + size / 2}" cy="${y + 58}" r="36" fill="${pale}" stroke="${c}" stroke-width="6"/><path d="M${x + 38} ${y + 32} l-20-22 l8 34 M${x + 90} ${y + 32} l20-22 l-8 34" fill="${pale}" stroke="${c}" stroke-width="6"/><circle cx="${x + 50}" cy="${y + 56}" r="5" fill="${dark}"/><circle cx="${x + 78}" cy="${y + 56}" r="5" fill="${dark}"/><path d="M${x + 58} ${y + 78} q8-10 16 0" stroke="${dark}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    chart: `<path d="M${x + 20} ${y + 100} h90 M${x + 28} ${y + 92} v-24 M${x + 56} ${y + 92} v-46 M${x + 84} ${y + 92} v-66" ${common}/><path d="M${x + 26} ${y + 70} l30-22 l26 8 l28-34" ${common}/>`,
    chest: `<path d="M${x + 38} ${y + 32} c-30 24-24 76 10 76 h32 c34 0 40-52 10-76 M${x + 64} ${y + 30} v76" fill="#fff7f0" stroke="${c}" stroke-width="6"/><path d="M${x + 64} ${y + 54} c-18 2-26 14-24 28 M${x + 64} ${y + 54} c18 2 26 14 24 28" ${common}/>`,
    claw: `<path d="M${x + 34} ${y + 92} c-20-34 0-74 30-74 s50 40 30 74" fill="#ffe2c3" stroke="${c}" stroke-width="6"/><path d="M${x + 44} ${y + 48} q10-24 20 0 M${x + 64} ${y + 42} q10-28 20 0" ${common}/>`,
    clipper: `<path d="M${x + 26} ${y + 92} l70-70 M${x + 46} ${y + 28} l54 54 M${x + 80} ${y + 40} l24-18" ${common}/><circle cx="${x + 32}" cy="${y + 88}" r="14" fill="#fff" stroke="${c}" stroke-width="6"/><circle cx="${x + 52}" cy="${y + 68}" r="10" fill="#fff" stroke="${c}" stroke-width="6"/>`,
    cloud: `<path d="M${x + 22} ${y + 76} c-14-26 18-42 36-24 c8-28 56-16 52 16 c22-2 28 34 2 38 h-84 c-18 0-24-18-6-30z" fill="#eef5fb" stroke="${c}" stroke-width="6"/>`,
    cone: `<path d="M${x + 22} ${y + 18} l84 24 l-18 70 l-48-16 z" fill="#e7f5fb" stroke="${c}" stroke-width="6"/><circle cx="${x + 60}" cy="${y + 64}" r="20" fill="#f6d7b7" stroke="${c}" stroke-width="5"/>`,
    doctor: `<rect x="${x + 22}" y="${y + 18}" width="${size - 44}" height="${size - 36}" rx="16" fill="#fff" stroke="${c}" stroke-width="6"/><path d="M${x + 52} ${y + 34} h24 M${x + 64} ${y + 22} v24 M${x + 42} ${y + 70} h44 M${x + 42} ${y + 90} h34" ${common}/>`,
    ear: `<path d="M${x + 36} ${y + 24} c44-36 70 28 30 76 c-16 18-46 6-40-20 c4-18 26-18 32-6" fill="#ffe2c3" stroke="${c}" stroke-width="6"/><path d="M${x + 54} ${y + 44} c22-8 32 20 12 40" ${common}/>`,
    eye: `<ellipse cx="${x + size / 2}" cy="${y + 66}" rx="48" ry="28" fill="#fff" stroke="${c}" stroke-width="6"/><circle cx="${x + size / 2}" cy="${y + 66}" r="15" fill="${dark}"/><circle cx="${x + size / 2 + 6}" cy="${y + 60}" r="5" fill="#fff"/>`,
    flea: `<ellipse cx="${x + 64}" cy="${y + 64}" rx="24" ry="32" fill="#5b4b3f" stroke="${c}" stroke-width="5"/><path d="M${x + 40} ${y + 54} l-22-14 M${x + 38} ${y + 72} l-24 8 M${x + 88} ${y + 54} l22-14 M${x + 90} ${y + 72} l24 8" ${common}/><path d="M${x + 52} ${y + 38} l-8-14 M${x + 76} ${y + 38} l8-14" ${common}/>`,
    fur: `<path d="M${x + 24} ${y + 78} c28-38 52-38 80 0 M${x + 32} ${y + 94} c22-24 42-24 64 0" ${common}/><circle cx="${x + 40}" cy="${y + 42}" r="8" fill="${c}"/><circle cx="${x + 86}" cy="${y + 34}" r="6" fill="${c}"/>`,
    group: `<circle cx="${x + 48}" cy="${y + 52}" r="22" fill="${pale}" stroke="${c}" stroke-width="6"/><circle cx="${x + 88}" cy="${y + 62}" r="18" fill="#ffe9cf" stroke="${c}" stroke-width="6"/><path d="M${x + 20} ${y + 106} c8-24 48-24 56 0 M${x + 68} ${y + 106} c6-20 38-20 44 0" ${common}/>`,
    gum: `<path d="M${x + 26} ${y + 58} c18 34 58 34 76 0 c-12 54-64 54-76 0z" fill="#ffd2d0" stroke="${c}" stroke-width="6"/><path d="M${x + 38} ${y + 68} h52" ${common}/>` ,
    hand: `<path d="M${x + 34} ${y + 104} c-8-42 0-72 12-62 c4-34 20-28 18 4 c6-30 22-24 18 6 c12-22 26-10 14 14 c28-8 32 16 8 28 c-20 10-40 14-70 14z" fill="#ffe2c3" stroke="${c}" stroke-width="6"/>`,
    heat: `<path d="M${x + 48} ${y + 100} c-32-26 8-44 10-78 c34 28 52 60 20 78 c-10 6-20 6-30 0z" fill="#ffd38b" stroke="${c}" stroke-width="6"/><path d="M${x + 62} ${y + 92} c-14-14 4-24 8-42 c16 20 22 34 8 42" fill="#fff5d7" stroke="${c}" stroke-width="5"/>`,
    home: `<path d="M${x + 16} ${y + 62} l48-42 l48 42 v48 h-96 z" fill="#fff7f0" stroke="${c}" stroke-width="6"/><path d="M${x + 52} ${y + 110} v-34 h24 v34" ${common}/>`,
    kitten: `<circle cx="${x + 64}" cy="${y + 60}" r="28" fill="${pale}" stroke="${c}" stroke-width="6"/><path d="M${x + 42} ${y + 38} l-16-18 l4 28 M${x + 86} ${y + 38} l16-18 l-4 28" fill="${pale}" stroke="${c}" stroke-width="6"/><circle cx="${x + 54}" cy="${y + 58}" r="4" fill="${dark}"/><circle cx="${x + 74}" cy="${y + 58}" r="4" fill="${dark}"/><path d="M${x + 56} ${y + 76} q8 7 16 0" stroke="${dark}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    leg: `<path d="M${x + 48} ${y + 18} c22 28 24 58 2 92 M${x + 78} ${y + 20} c16 32 12 60-12 88" ${common}/><path d="M${x + 38} ${y + 108} h34 M${x + 64} ${y + 108} h34" ${common}/>`,
    litter: `<rect x="${x + 18}" y="${y + 54}" width="${size - 36}" height="50" rx="16" fill="#e9edf0" stroke="${c}" stroke-width="6"/><path d="M${x + 28} ${y + 54} h${size - 56} l-12-30 h-${size - 80}z" fill="#f6efe4" stroke="${c}" stroke-width="6"/><circle cx="${x + 42}" cy="${y + 82}" r="5" fill="#adb9bc"/><circle cx="${x + 66}" cy="${y + 88}" r="5" fill="#adb9bc"/><circle cx="${x + 88}" cy="${y + 80}" r="5" fill="#adb9bc"/>`,
    male: `<circle cx="${x + 58}" cy="${y + 72}" r="32" fill="#e7f5fb" stroke="${c}" stroke-width="6"/><path d="M${x + 80} ${y + 50} l28-28 M${x + 92} ${y + 22} h16 v16" ${common}/>`,
    moon: `<path d="M${x + 88} ${y + 24} c-38 4-56 44-28 72 c18 18 44 12 56-6 c-42 10-64-34-28-66z" fill="#fff5d7" stroke="${c}" stroke-width="6"/><circle cx="${x + 28}" cy="${y + 36}" r="5" fill="${c}"/><circle cx="${x + 38}" cy="${y + 82}" r="4" fill="${c}"/>`,
    mother: `<circle cx="${x + 52}" cy="${y + 62}" r="30" fill="${pale}" stroke="${c}" stroke-width="6"/><circle cx="${x + 92}" cy="${y + 82}" r="18" fill="#ffe9cf" stroke="${c}" stroke-width="5"/><path d="M${x + 26} ${y + 106} c20-18 66-18 88 0" ${common}/>`,
    mouth: `<path d="M${x + 24} ${y + 58} q40 50 80 0 q-40 24-80 0z" fill="#ffd2d0" stroke="${c}" stroke-width="6"/><path d="M${x + 46} ${y + 70} v20 M${x + 64} ${y + 74} v22 M${x + 82} ${y + 70} v20" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`,
    nail: `<path d="M${x + 34} ${y + 90} c4-46 24-78 54-78 c-14 30-16 54-4 86" fill="#fff7f0" stroke="${c}" stroke-width="6"/><path d="M${x + 76} ${y + 26} c-8 18-10 34-6 52" stroke="#e7a7a1" stroke-width="7" fill="none" stroke-linecap="round"/>`,
    pain: `<path d="M${x + 26} ${y + 80} l22-28 l20 22 l28-42 l8 54" ${common}/><path d="M${x + 90} ${y + 18} l10 18 l20 2 l-14 14 l4 20 l-20-10 l-18 10 l4-20 l-14-14 l20-2z" fill="#fff5d7" stroke="${c}" stroke-width="5"/>`,
    paste: `<rect x="${x + 30}" y="${y + 24}" width="68" height="34" rx="12" fill="#e7f5fb" stroke="${c}" stroke-width="6" transform="rotate(-20 ${x + 64} ${y + 41})"/><path d="M${x + 38} ${y + 70} c14 18 40 18 54 0" ${common}/>` ,
    pause: `<circle cx="${x + 64}" cy="${y + 64}" r="46" fill="#fff" stroke="${c}" stroke-width="6"/><path d="M${x + 50} ${y + 40} v48 M${x + 78} ${y + 40} v48" ${common}/>`,
    paw: `<ellipse cx="${x + 64}" cy="${y + 80}" rx="28" ry="22" fill="#ffe2c3" stroke="${c}" stroke-width="6"/><circle cx="${x + 36}" cy="${y + 48}" r="11" fill="#ffe2c3" stroke="${c}" stroke-width="5"/><circle cx="${x + 58}" cy="${y + 34}" r="11" fill="#ffe2c3" stroke="${c}" stroke-width="5"/><circle cx="${x + 82}" cy="${y + 34}" r="11" fill="#ffe2c3" stroke="${c}" stroke-width="5"/><circle cx="${x + 104}" cy="${y + 48}" r="11" fill="#ffe2c3" stroke="${c}" stroke-width="5"/>`,
    phone: `<rect x="${x + 42}" y="${y + 12}" width="48" height="100" rx="14" fill="#fff" stroke="${c}" stroke-width="6"/><path d="M${x + 58} ${y + 28} h16 M${x + 62} ${y + 96} h8" ${common}/>`,
    pill: `<path d="M${x + 32} ${y + 86} c-20-20-2-50 20-30 l24-24 c20-20 52 10 28 34 l-24 24 c-22 22-34 10-48-4z" fill="#fff7f0" stroke="${c}" stroke-width="6"/><path d="M${x + 68} ${y + 42} l42 42" ${common}/>`,
    plus: `<circle cx="${x + 64}" cy="${y + 64}" r="46" fill="#fff" stroke="${c}" stroke-width="6"/><path d="M${x + 64} ${y + 38} v52 M${x + 38} ${y + 64} h52" ${common}/>`,
    quiet: `<path d="M${x + 30} ${y + 52} c18-22 50-22 68 0 M${x + 38} ${y + 78} c14 14 38 14 52 0" ${common}/><path d="M${x + 96} ${y + 28} l20-14 M${x + 104} ${y + 48} h24 M${x + 96} ${y + 68} l20 14" ${common}/>` ,
    ramp: `<path d="M${x + 18} ${y + 104} h92 v-26 h-48 z" fill="#f6efe4" stroke="${c}" stroke-width="6"/><path d="M${x + 30} ${y + 92} h22 M${x + 52} ${y + 82} h22 M${x + 74} ${y + 72} h22" ${common}/>`,
    record: `<rect x="${x + 28}" y="${y + 18}" width="72" height="96" rx="12" fill="#fff" stroke="${c}" stroke-width="6"/><path d="M${x + 46} ${y + 44} h36 M${x + 46} ${y + 66} h36 M${x + 46} ${y + 88} h24" ${common}/><path d="M${x + 78} ${y + 18} v22 h22" fill="#f6efe4" stroke="${c}" stroke-width="6"/>`,
    repeat: `<path d="M${x + 32} ${y + 42} c18-22 62-22 78 6 l-14 0 M${x + 96} ${y + 48} l18-2 l-8-16 M${x + 96} ${y + 88} c-18 22-62 22-78-6 l14 0 M${x + 32} ${y + 82} l-18 2 l8 16" ${common}/>`,
    reward: `<path d="M${x + 64} ${y + 18} l12 28 l30 4 l-22 20 l6 30 l-26-16 l-26 16 l6-30 l-22-20 l30-4z" fill="#fff5d7" stroke="${c}" stroke-width="6"/>`,
    safe: `<path d="M${x + 64} ${y + 16} l42 18 v32 c0 26-18 44-42 52 c-24-8-42-26-42-52 v-32 z" fill="#eef8f3" stroke="${c}" stroke-width="6"/><path d="M${x + 44} ${y + 64} l14 14 l30-34" ${common}/>`,
    scale: `<rect x="${x + 22}" y="${y + 42}" width="${size - 44}" height="64" rx="18" fill="#fff" stroke="${c}" stroke-width="6"/><path d="M${x + 50} ${y + 62} q14-14 28 0" ${common}/><circle cx="${x + 64}" cy="${y + 68}" r="5" fill="${c}"/>`,
    scissors: `<path d="M${x + 34} ${y + 94} L${x + 96} ${y + 28} M${x + 34} ${y + 28} L${x + 96} ${y + 94}" ${common}/><circle cx="${x + 30}" cy="${y + 98}" r="13" fill="#fff" stroke="${c}" stroke-width="6"/><circle cx="${x + 30}" cy="${y + 24}" r="13" fill="#fff" stroke="${c}" stroke-width="6"/>`,
    scratch: `<path d="M${x + 32} ${y + 30} c18 20 18 52 0 72 M${x + 62} ${y + 22} c18 24 18 62 0 86 M${x + 92} ${y + 30} c18 20 18 52 0 72" ${common}/><path d="M${x + 18} ${y + 104} h92" ${common}/>`,
    search: `<circle cx="${x + 54}" cy="${y + 54}" r="32" fill="#fff" stroke="${c}" stroke-width="6"/><path d="M${x + 78} ${y + 78} l34 34" ${common}/>`,
    seal: `<circle cx="${x + 64}" cy="${y + 64}" r="44" fill="#fff5d7" stroke="${c}" stroke-width="6"/><path d="M${x + 44} ${y + 66} l14 14 l30-36" ${common}/>`,
    senior: `<path d="M${x + 28} ${y + 82} c20-36 52-46 82-10 M${x + 30} ${y + 104} c20-18 52-18 76 0" ${common}/><circle cx="${x + 42}" cy="${y + 42}" r="6" fill="${c}"/><circle cx="${x + 64}" cy="${y + 34}" r="6" fill="${c}"/>`,
    skin: `<path d="M${x + 28} ${y + 66} c28-34 58-34 86 0 c-28 34-58 34-86 0z" fill="#ffe2c3" stroke="${c}" stroke-width="6"/><circle cx="${x + 58}" cy="${y + 62}" r="6" fill="#d87972"/><circle cx="${x + 82}" cy="${y + 72}" r="5" fill="#d87972"/>`,
    sleep: `<path d="M${x + 30} ${y + 80} c26-38 62-38 88 0 c-22 24-66 24-88 0z" fill="#ffe2c3" stroke="${c}" stroke-width="6"/><path d="M${x + 30} ${y + 38} h34 l-34 28 h34 M${x + 80} ${y + 26} h28 l-28 22 h28" ${common}/>`,
    spark: `<path d="M${x + 64} ${y + 12} l12 34 l36-14 l-20 32 l30 18 l-36 4 l4 36 l-26-24 l-26 24 l4-36 l-36-4 l30-18 l-20-32 l36 14z" fill="#fff5d7" stroke="${c}" stroke-width="6"/>`,
    steps: `<circle cx="${x + 34}" cy="${y + 38}" r="14" fill="#fff" stroke="${c}" stroke-width="6"/><circle cx="${x + 64}" cy="${y + 64}" r="14" fill="#fff" stroke="${c}" stroke-width="6"/><circle cx="${x + 94}" cy="${y + 90}" r="14" fill="#fff" stroke="${c}" stroke-width="6"/><path d="M${x + 46} ${y + 48} l8 8 M${x + 76} ${y + 74} l8 8" ${common}/>`,
    stool: `<path d="M${x + 26} ${y + 90} c20-40 56-50 78 0 z" fill="#c79257" stroke="${c}" stroke-width="6"/><path d="M${x + 44} ${y + 70} c12-24 34-26 44 0" ${common}/>` ,
    string: `<path d="M${x + 18} ${y + 60} c24-46 70 50 94 4 c12-24-24-42-38-14 c-16 32 20 56 38 28" ${common}/>`,
    sun: `<circle cx="${x + 64}" cy="${y + 64}" r="28" fill="#ffd38b" stroke="${c}" stroke-width="6"/><path d="M${x + 64} ${y + 12} v18 M${x + 64} ${y + 98} v18 M${x + 12} ${y + 64} h18 M${x + 98} ${y + 64} h18 M${x + 28} ${y + 28} l12 12 M${x + 88} ${y + 88} l12 12 M${x + 100} ${y + 28} l-12 12 M${x + 40} ${y + 88} l-12 12" ${common}/>`,
    syringe: `<path d="M${x + 30} ${y + 92} l54-54 M${x + 74} ${y + 28} l28 28 M${x + 86} ${y + 16} l26 26 M${x + 34} ${y + 88} l-16 16 M${x + 58} ${y + 56} l18 18" ${common}/>` ,
    timer: `<circle cx="${x + 64}" cy="${y + 70}" r="42" fill="#fff" stroke="${c}" stroke-width="6"/><path d="M${x + 64} ${y + 70} v-24 M${x + 64} ${y + 70} l22 12 M${x + 52} ${y + 16} h24" ${common}/>`,
    tooth: `<path d="M${x + 42} ${y + 20} c16-10 28 4 44 0 c28 10 16 90-8 94 c-10-12-18-12-28 0 c-24-4-36-84-8-94z" fill="#fff" stroke="${c}" stroke-width="6"/>`,
    toxin: `<path d="M${x + 44} ${y + 26} h40 l-6 24 l28 50 c4 8-2 18-12 18 h-60 c-10 0-16-10-12-18 l28-50z" fill="#eef5fb" stroke="${c}" stroke-width="6"/><path d="M${x + 48} ${y + 78} h32 M${x + 64} ${y + 62} v32" stroke="#b85b50" stroke-width="6" stroke-linecap="round"/>`,
    vomit: `<circle cx="${x + 64}" cy="${y + 54}" r="30" fill="${pale}" stroke="${c}" stroke-width="6"/><path d="M${x + 48} ${y + 54} l10 6 l-10 6 M${x + 80} ${y + 54} l-10 6 l10 6 M${x + 54} ${y + 86} c8 18 28 18 36 0" ${common}/>`,
    wand: `<path d="M${x + 20} ${y + 104} L${x + 100} ${y + 24}" ${common}/><path d="M${x + 98} ${y + 22} c22 8 18 34-4 42 c-20-8-22-34 4-42z" fill="#fff5d7" stroke="${c}" stroke-width="6"/>`,
    water: `<path d="M${x + 64} ${y + 18} c24 34 38 54 38 72 c0 22-18 34-38 34 s-38-12-38-34 c0-18 14-38 38-72z" fill="#dff3fb" stroke="${c}" stroke-width="6"/>`,
  };
  return map[name] || map.record;
}

function panelSvg(panel, index, x, y, width, height, style) {
  const [title, text, icon] = panel;
  return `
    <g>
      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="30" fill="#fffdf8" stroke="${style.border}" stroke-width="3"/>
      <circle cx="${x + 56}" cy="${y + 58}" r="31" fill="${style.tint}" stroke="${style.border}" stroke-width="3"/>
      <text x="${x + 56}" y="${y + 69}" text-anchor="middle" font-family="Georgia,serif" font-size="38" fill="${style.accent}" font-weight="700">${index}</text>
      <g opacity=".72">${iconSvg(icon, x + width - 138, y + 188, 96, style.accent)}</g>
      ${textSvg(title, x + 102, y + 58, width - 150, 34, "#2d241d", { weight: 760, maxChars: 10 })}
      ${textSvg(text, x + 34, y + 128, width - 66, 25, "#5e5046", { weight: 520, maxChars: 12, lineHeight: 36 })}
    </g>`;
}

function bulletList(title, items, x, y, width, style, mode = "plain") {
  const isBad = mode === "bad";
  const fill = isBad ? "#fff3f1" : style.tint;
  const stroke = isBad ? "#e6a49c" : style.border;
  const mark = isBad ? "×" : "✓";
  const markColor = isBad ? "#b85b50" : style.accent;
  const textColor = isBad ? "#7b3d36" : "#465149";
  const rows = items.slice(0, 3);
  return `
    <g>
      <rect x="${x}" y="${y}" width="${width}" height="208" rx="28" fill="${fill}" stroke="${stroke}" stroke-width="3"/>
      ${textSvg(title, x + 28, y + 48, width - 56, 31, isBad ? "#8f4038" : style.accent, { weight: 760, maxChars: 12 })}
      ${rows
        .map((item, i) => {
          const rowY = y + 88 + i * 38;
          return `<circle cx="${x + 34}" cy="${rowY - 8}" r="12" fill="#fff"/><text x="${x + 34}" y="${rowY + 1}" text-anchor="middle" fill="${markColor}" font-size="21" font-weight="800" font-family="-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif">${mark}</text>${textSvg(item, x + 58, rowY, width - 88, 24, textColor, { weight: 560, maxChars: 22 })}`;
        })
        .join("")}
    </g>`;
}

function posterSvg(poster) {
  const style = KIND[poster.kind];
  const sourceNames = poster.sourceRefs.map((key) => SOURCE[key] || key);
  const sourceShort =
    poster.sourceRefs
      .slice(0, 4)
      .map((key) => SOURCE_SHORT[key] || key)
      .join(" / ") + (poster.sourceRefs.length > 4 ? " 等" : "");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#7b5a42" flood-opacity=".14"/>
    </filter>
    <pattern id="paperDots" width="32" height="32" patternUnits="userSpaceOnUse">
      <circle cx="3" cy="3" r="1.4" fill="#ead9c8" opacity=".45"/>
    </pattern>
  </defs>
  <rect width="1080" height="1920" fill="#f8efdf"/>
  <rect width="1080" height="1920" fill="url(#paperDots)" opacity=".8"/>
  <path d="M42 128 C90 80 138 80 188 132 M888 86 C934 126 984 126 1032 86" stroke="#e4cbb1" stroke-width="11" stroke-linecap="round" opacity=".75"/>
  <rect x="44" y="44" width="992" height="1832" rx="40" fill="#fffaf0" stroke="#e2c6a7" stroke-width="6" filter="url(#softShadow)"/>
  <rect x="76" y="70" width="216" height="54" rx="27" fill="${style.tint}" stroke="${style.border}" stroke-width="3"/>
  <text x="184" y="107" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif" font-size="26" font-weight="700" fill="${style.accent}">${style.label}</text>
  <text x="76" y="178" font-family="-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif" font-size="58" font-weight="820" fill="#201914">${esc(poster.title)}</text>
  ${textSvg(poster.subtitle, 80, 228, 660, 30, "#726052", { weight: 560, maxChars: 24 })}
  <image href="${CAT_DATA_URI[style.cat]}" x="744" y="92" width="232" height="232" preserveAspectRatio="xMidYMid meet"/>
  <path d="M784 102 l-48 -34 M916 83 l44 -28" stroke="#d7b28f" stroke-width="16" stroke-linecap="round" opacity=".45"/>
  <path d="M782 104 l-48 -34 M916 85 l44 -28" stroke="#efc0bd" stroke-width="9" stroke-linecap="round" opacity=".65"/>
  <g opacity=".45">
    <text x="110" y="315" font-size="28" fill="#d7a65e">✦</text>
    <text x="1000" y="330" font-size="32" fill="#d7a65e">✦</text>
    <text x="928" y="210" font-size="24" fill="#85b6a2">✦</text>
  </g>
  ${panelSvg(poster.panels[0], 1, 82, 334, 440, 334, style)}
  ${panelSvg(poster.panels[1], 2, 558, 334, 440, 334, style)}
  ${panelSvg(poster.panels[2], 3, 82, 700, 440, 334, style)}
  ${panelSvg(poster.panels[3], 4, 558, 700, 440, 334, style)}
  ${bulletList("现在可以记录", poster.observe, 82, 1080, 916, style)}
  ${bulletList("不要这样做", poster.avoid, 82, 1320, 916, style, "bad")}
  ${bulletList("这些信号要升级", poster.redFlags, 82, 1560, 916, style, "bad")}
  <line x1="112" y1="1800" x2="968" y2="1800" stroke="#e4cbb1" stroke-width="3" stroke-dasharray="10 16"/>
  ${textSvg(style.note, 112, 1840, 430, 22, "#8a7768", { weight: 560, maxChars: 24 })}
  ${textSvg(`来源: ${sourceShort}`, 536, 1840, 430, 19, "#8a7768", { weight: 540, maxChars: 80, lineHeight: 27 })}
</svg>`;
}

function indexHtml(posters) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>安心猫详细知识海报</title>
  <style>
    body{margin:0;background:#f4eadc;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;color:#2d241d}
    main{max-width:1180px;margin:0 auto;padding:32px 18px 64px}
    h1{font-size:24px;margin:0 0 6px}
    p{margin:0 0 22px;color:#766455}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:18px}
    a{display:block;text-decoration:none;color:inherit}
    img{width:100%;aspect-ratio:9/16;object-fit:cover;border-radius:12px;box-shadow:0 12px 28px rgba(86,60,34,.16);background:#fffaf0}
    span{display:block;margin-top:8px;font-size:13px;line-height:1.4}
    small{display:block;color:#8b796a}
  </style>
</head>
<body>
  <main>
    <h1>安心猫详细知识海报</h1>
    <p>${VERSION} · ${posters.length} 张 · 先重点急症和高频护理,再覆盖全部资料卡。SVG 为源图,PNG 用于分享。</p>
    <div class="grid">
      ${posters
        .map(
          (p) => `<a href="./${p.id}.svg" target="_blank"><img src="./png/${p.id}.png" alt="${esc(p.title)}" /><span>${esc(p.title)}</span><small>${KIND[p.kind].label} · priority ${p.priority}</small></a>`,
        )
        .join("")}
    </div>
  </main>
</body>
</html>`;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  CAT_DATA_URI.care = `data:image/png;base64,${(await readFile(join(__dirname, "..", "public", "guide", "cat-curious-t.png"))).toString("base64")}`;
  CAT_DATA_URI.medical = `data:image/png;base64,${(await readFile(join(__dirname, "..", "public", "guide", "cat-worry-t.png"))).toString("base64")}`;
  const posters = [...POSTERS].sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
  for (const poster of posters) {
    await writeFile(join(OUT_DIR, `${poster.id}.svg`), posterSvg(poster), "utf8");
  }
  const manifest = {
    version: VERSION,
    format: "svg",
    width: 1080,
    height: 1920,
    generatedAt: new Date().toISOString(),
    count: posters.length,
    posters: posters.map((poster) => ({
      id: poster.id,
      kind: poster.kind,
      priority: poster.priority,
      title: poster.title,
      subtitle: poster.subtitle,
      asset: `/knowledge-posters/detailed/${poster.id}.svg`,
      pngAsset: `/knowledge-posters/detailed/png/${poster.id}.png`,
      sourceDocs: poster.docs,
      sourceRefs: poster.sourceRefs.map((key) => ({
        id: key,
        name: SOURCE[key] || key,
        url: SOURCE_URL[key] || null,
      })),
      bindTargets: poster.docs,
    })),
  };
  await writeFile(join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  await writeFile(join(OUT_DIR, "index.html"), indexHtml(posters), "utf8");
  console.log(`Generated ${posters.length} detailed posters in ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
