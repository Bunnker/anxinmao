"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
import {
  loadStore,
  saveStoreLocal,
  seedTemplateStore,
  updateRecordOutcome,
} from "@/lib/storage";
import { pullHistory } from "@/lib/history-sync";
import { readPersisted, writePersisted } from "@/lib/persist";
import { recordHref } from "@/lib/profile";
import { Disclaimer } from "@/components/Disclaimer";
import { Welcome } from "@/components/Welcome";
import { Guide } from "@/components/Guide";
import PetSprite, { type PetSpriteState } from "@/components/PetSprite";
import { CatFace } from "@/components/CatFace";
import type { Cat, CatRecord, Store } from "@/types/cat";

// 新手教程「看过了」标记 —— 与猫档案分开,首次进入弹一次,首页可重开。
const GUIDE_SEEN_KEY = "catTriage:guideSeen:v1";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "凌晨好";
  if (h < 11) return "早上好";
  if (h < 13) return "中午好";
  if (h < 18) return "下午好";
  return "晚上好";
}

// 把 ISO 时间显示成口语化的相对日期。
function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dayIndex = (x: Date) =>
    Math.floor(
      new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime() / 86400000,
    );
  const diff = dayIndex(new Date()) - dayIndex(d);
  if (diff <= 0) return "今天";
  if (diff === 1) return "昨天";
  if (diff < 7) return `${diff} 天前`;
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

function ageLabel(months: number): string {
  if (months < 12) return `${months} 个月`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m ? `${y} 岁 ${m} 个月` : `${y} 岁`;
}

const TIER_DOT: Record<string, string> = {
  red: "var(--red)",
  yellow: "var(--amber)",
  green: "var(--green)",
};

// 分诊跟进 —— 找「最近一条 12 小时 ~ 7 天内、还没写跟进结果」的分诊记录。
// 太快问没意义(刚分诊完),太久了不再追问。records 本身最近在前。
const FOLLOWUP_MIN_AGE = 12 * 60 * 60 * 1000;
const FOLLOWUP_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function findFollowupTarget(records: CatRecord[]): CatRecord | null {
  // 只看「最近一次」分诊 —— 答完一条就收,不连环追问更早的记录
  // (用户反馈:有多条未跟进时,答一条、切页回来又问下一条,烦)。
  const latest = records.find((r) => r.kind === "triage");
  if (!latest || latest.outcome || !latest.tier) return null;
  const t = new Date(latest.date).getTime();
  if (Number.isNaN(t)) return null;
  const age = Date.now() - t;
  return age >= FOLLOWUP_MIN_AGE && age <= FOLLOWUP_MAX_AGE ? latest : null;
}

// 小猫陪伴提醒 —— 把分诊跟进 / 驱虫疫苗 / 新手引导统一成「猫在跟你说话」的气泡。
// 一次只说一件事,优先级:跟进回执 > 分诊跟进 > 护理提醒 > 零记录引导;没事不出现。
// 形象用产品吉祥物橘猫(public/guide/ 四表情),按场景换表情;点它会蹦一下说猫语。
// 红线:卡通形象在此仅作伴侣角色(允许位),不进任何医学示意。
type PetFace = "worry" | "curious" | "calm" | "happy";
// -t 版:抠掉米色方底的透明小图(256px ~55KB),专供气泡场景贴在页面背景上。
const PET_FACE_SRC: Record<PetFace, string> = {
  worry: "/guide/cat-worry-t.png",
  curious: "/guide/cat-curious-t.png",
  calm: "/guide/cat-calm-t.png",
  happy: "/guide/cat-happy-t.png",
};
const PET_TALK = [
  "咕噜~(手别停继续摸 ´ω`)",
  "喵~(这里也要摸摸 ฅ^•ﻌ•^ฅ)",
  "噜噜噜~(被你摸最幸福 ≧▽≦)",
  "咕噜咕噜……(最喜欢你了 =´∇`=)",
];
// 闲话已并入「思考泡」功能入口区;摸猫时才说猫语(PET_TALK)。

// ── 2.5D 地板:院子有纵深(bottom 0~YARD_DEPTH 的深度带)──
// 猫还用左右跑动画,走斜线时 y 同步变、越靠前越大(伪透视);
// 猫与家具按 bottom 做画家算法排序,猫能绕到窝后面去。
const YARD_DEPTH = 140;
// 院子内容的固定设计基准宽:家具/猫/盖帧/泡泡坐标全部基于它布局,
// 外层 wrapper 再按 yardW/YARD_BASE_W 等比缩放 → 任何屏宽都协调(窄不裁、宽不留白)。
const YARD_BASE_W = 345;
// 家具摆位:bottom = 深度(大=靠后);玩球/喝水动画自带道具,播放时隐藏地面同款
const YARD_ITEMS = {
  bed: { src: "/pet/items/bed.webp", alt: "猫窝", left: 0, bottom: 92, w: 88 },
  // 空箱:由 cat-box-0 抠掉猫补绘而成(同 582×520 画布、箱位一致)。在箱帧渲染时直接读
  // 这里的 live 坐标(layout.box)→ 空箱与在箱帧像素级重合,钻进/钻出/拖动箱子都不变样。
  // 猫钻箱/蹦箱时藏掉它,换成在箱帧(见院子渲染)。w 用 BOX_W 常量。
  box: { src: "/pet/items/box.webp", alt: "纸箱", left: 257, bottom: 88, w: 88 },
  bowl: { src: "/pet/items/bowl.webp", alt: "水碗", left: 25, bottom: 46, w: 44 },
  yarn: { src: "/pet/items/yarn.webp", alt: "毛线球", left: 240, bottom: 0, w: 36 },
  // codex 出的新家具(可拖):猫抓板 —— 走过去挠抓
  scratch: { src: "/pet/items/scratch.webp", alt: "猫抓板", left: 124, bottom: 100, w: 78 },
  // 墙角小地毯:垫在地上的「地面物」(渲染 z 压到家具下、猫上 → 猫站毯上),走过去坐下洗脸
  rug: { src: "/pet/items/rug.webp", alt: "小地毯", left: 100, bottom: 9, w: 104 },
} as const;
type ItemKey = keyof typeof YARD_ITEMS;
// 挠抓板 2 帧(codex 出图、按板右下角对齐切片 → 板不抖):前爪在斜面 高→低 来回=挠。
// 画布 908×520,板占宽 0.58、板中 0.68;显示时让板与静态 scratch.webp 重合(见院子渲染)。
const CAT_SCRATCH_FRAMES = [
  "/pet/items/cat-scratch-0.webp",
  "/pet/items/cat-scratch-1.webp",
];
// 显示宽 134 → 板=78(=scratch.webp.w);相对板原点偏移(猫在板左):
const SCRATCH_W = 134;
const SCRATCH_DX = -52; // 帧 left = layout.scratch.left + DX
const SCRATCH_DY = -18; // 帧 bottom = layout.scratch.bottom + DY
// 梳毛 2 帧(codex 专门画的「疏毛动作」,非复用素材):针梳贴后背 上↔下 来回梳。
// 梳毛在猫的实时位置发生(不是固定家具),所以盖在 roam.x/roam.y 上、藏掉实时精灵。
// 梳毛动作 → 帧序列(brushFrame 在序列里 ping-pong 来回播)。
// codex 专门画的「疏毛」帧:猫身体/表情锁死,只梳子(+被带起的局部毛)移动。
// back 顺毛长梳:梳子从头颈 → 背 → 腰 → 尾根,来回播 = 从头梳到尾再回头。
// (head/tail 帧 codex 出好后把 back 扩成 4 帧;belly 梳肚皮变体后续加)
const BRUSH_SEQS: Record<string, string[]> = {
  // 顺毛长梳:梳子 肩背 → 腰 → 尾根,来回播 = 从背一路梳到尾再回
  back: [
    "/pet/items/cat-brush-0.webp",
    "/pet/items/cat-brush-1.webp",
    "/pet/items/cat-brush-tail.webp",
  ],
  // 梳肚皮:半躺露肚,梳子在肚皮上来回
  belly: [
    "/pet/items/cat-brush-belly-0.webp",
    "/pet/items/cat-brush-belly-1.webp",
  ],
};
const BRUSH_VARIANTS = ["back", "belly"] as const;
// 每种梳毛动作的对齐:显示宽(scale 1 时)/ 水平微调 / 垂直贴地微调。
// 半躺(belly)比坐姿(back)更宽、身体下沿离画布底更远,所以分开调。
const BRUSH_ALIGN: Record<string, { w: number; dx: number; dy: number }> = {
  back: { w: 124, dx: 0, dy: -4 },
  belly: { w: 150, dx: 0, dy: -14 },
};
// 逗猫棒「扑抓」2 帧(codex 专门画的「猫举爪扑头顶羽毛」,非复用蹦跶):来回切 = 扑打。
// 在猫实时位置盖帧、藏掉实时精灵(同梳毛盖帧)。帧里猫身体偏左、棒在右上,DX 右移对齐猫身体。
const CAT_WAND_FRAMES = [
  "/pet/items/cat-wand-0.webp",
  "/pet/items/cat-wand-1.webp",
];
const WAND_W = 156;
const WAND_DX = 16;
const WAND_DY = -4;
// 洗脸动作 → 帧序列(codex 专门画的「洗脸/理毛」盖帧,非复用 groom row;点地毯随机演一组)。
// 同梳毛盖帧机制:藏实时精灵、在猫位置盖帧、2 帧 ping-pong。先上 paw(舔爪抹脸)+ hindleg(举旗杆),
// 后补 ear(抹耳后)/scratch(后腿挠耳)。
const WASH_SEQS: Record<string, string[]> = {
  paw: ["/pet/items/cat-wash-paw-0.webp", "/pet/items/cat-wash-paw-1.webp"],
};
const WASH_VARIANTS = ["paw"] as const;
const WASH_ALIGN: Record<string, { w: number; dx: number; dy: number }> = {
  paw: { w: 124, dx: 0, dy: -4 },
};
const WASH_TALK = [
  "舔舔~(先把爪子舔湿再抹脸 ´ω`)",
  "呼噜~(脸要洗得香香的 =^‥^=)",
  "喵嗯~(一抹一抹好认真呀 ˘ω˘)",
  "喵呜~(脸蛋抹干净最舒服 ฅ^•ﻌ•^ฅ)",
];
// 钻箱 4 帧(gpt-image-2 一次生成、按箱底中心对齐切片 → 箱子帧间锁死):
// 0 低头探 → 1 探头扒沿 → 2 坐 → 3 抬头坐。hopin 顺序播 0→3 = 猫从箱里由低升起=跳进去。
const CAT_JUMP_FRAMES = [
  "/pet/items/cat-box-0.webp",
  "/pet/items/cat-box-1.webp",
  "/pet/items/cat-box-2.webp",
  "/pet/items/cat-box-3.webp",
];
// 在箱里随机循环:复用同 4 帧当姿势(抬头坐/探头/躲低/坐),同次生成箱一致、绝不错层。
// [0]=帧3,正好接上 hopin 落定那帧 → 无缝。
const CAT_IN_BOX_POSES = [
  "/pet/items/cat-box-3.webp",
  "/pet/items/cat-box-1.webp",
  "/pet/items/cat-box-0.webp",
  "/pet/items/cat-box-2.webp",
];
// 跳帧 + 姿势共用一套显示:新帧画布 582×520、箱翼跨满整帧 → BOX_W 即箱翼显示宽 88px
//(=猫窝大小)。在箱帧的 left/bottom 直接用 live 的 layout.box(空箱坐标)→ 拖动箱子时
// 在箱帧/钻入帧跟着箱子走、像素级重合。
const BOX_W = 88;
type InteractKind = "nap" | "play" | "drink" | "box" | "scratch" | "rug";
// 家具可拖拽:left/bottom 抽成 layout state(见 PetNudge 内),w/src/alt 仍是常量。
// 院子布局存档(全局一份,院子是共享的家,不分猫)+ 默认值(=各家具初始坐标)。
type Pos = { left: number; bottom: number };
const YARD_LAYOUT_KEY = "yardLayout:v1";
function defaultLayout(): Record<ItemKey, Pos> {
  const o = {} as Record<ItemKey, Pos>;
  for (const k of Object.keys(YARD_ITEMS) as ItemKey[])
    o[k] = { left: YARD_ITEMS[k].left, bottom: YARD_ITEMS[k].bottom };
  return o;
}
// 猫去互动时的站位:猫(84px)中心对物件中心、同深度。传 live 坐标 → 家具挪了走位也跟着挪。
function itemAnchor(it: { left: number; bottom: number; w: number }): {
  x: number;
  y: number;
} {
  return { x: Math.round(it.left + it.w / 2 - 42), y: it.bottom };
}
const INTERACT_ITEM: Record<InteractKind, ItemKey> = {
  nap: "bed",
  play: "yarn",
  drink: "bowl",
  box: "box",
  scratch: "scratch",
  rug: "rug",
};
// 深度 → 层级 / 透视缩放(越靠前 z 越大、猫越大)
const zOf = (bottom: number) => 100 - Math.round(bottom);
const scaleOf = (y: number) => 0.92 + ((YARD_DEPTH - y) / YARD_DEPTH) * 0.14;
// 晒太阳点:猫自主走到这块「阳光地面」(对齐背景右下暖光斑)趴下眯眼晒太阳
const SUN_SPOT = { x: 190, y: 30 };
// 走过去再做事:距离近直接做,远了先散步(then 接续)
function walkTo(
  r: { x: number; y: number; facing: "left" | "right" },
  a: { x: number; y: number },
  then: InteractKind | "sunbathe",
) {
  const dx = a.x - r.x;
  const dist = Math.hypot(dx, a.y - r.y);
  if (dist <= 24)
    return {
      kind: then === "box" ? ("hopin" as const) : then,
      x: a.x,
      y: a.y,
      facing: r.facing,
      dur: 0,
    } as const;
  return {
    kind: "stroll" as const,
    x: a.x,
    y: a.y,
    facing: dx >= 0 ? ("right" as const) : ("left" as const),
    dur: Math.round(dist / 0.035),
    then,
  };
}
// 互动完成的猫语正反馈:猫语拟声 +(中文翻译),拟声按真实叫声情绪(查证见对话:
// trill/咕噜=友好满足、唧唧/咯咯=捕猎兴奋、拖长喵/嗷=委屈抗议)
const INTERACT_TALK: Record<InteractKind, string[]> = {
  play: ["唧唧唧~(猎物休想逃 ↀДↀ✧)", "咯咯咯~(扑它扑它扑它 =ↀωↀ=)", "喵嗷~(看我一爪定胜负 ฅ^•ﻌ•^ฅ)"],
  drink: ["咕噜咕噜~(这口水甜甜的 ˘ω˘)", "吧嗒吧嗒~(喝饱啦超舒服 ｡•ᴗ•｡)", "噜~(今天的水满分 ´∀`)"],
  box: ["噗噜噜~(这是我的城堡 =｀ω´=)", "喵~(箱子完美刚刚好 ´ω`)", "咕噜~(躲进来好安心 ˘ω˘)"],
  nap: [],
  scratch: ["唰唰唰~(这块板子太懂我 ฅ^•ﻌ•^ฅ)", "喵嗯~(爪子爽到飞起 ≧▽≦)", "噜噜~(磨完爪子神清气爽 ´∀`)"],
  rug: ["噜噜~(这块毯子真软乎 ´ω`)", "喵~(我的专属位置 =^‥^=)", "咕噜~(趴这儿刚刚好 ˘ω˘)"],
};
// 梳毛 / 没水了 的猫语(不是 InteractKind,单独存)
const BRUSH_TALK = [
  "咕噜咕噜~(再往后背梳梳 ´ω`)",
  "噜~(舒服到要化掉了 ˘ω˘)",
  "喵呜~(毛梳得顺顺的真好 =^‥^=)",
];
const EMPTY_WATER_TALK = [
  "喵呜——(碗空了啦好渴 ´；ω；`)",
  "嗷呜~(主人水没了 >﹏<)",
  "喵…喵…(快给我加点水嘛 ╥﹏╥)",
];
const SUNBATHE_TALK = [
  "咕噜~(晒得暖洋洋的 ´ω`)",
  "喵~(这块阳光归我啦 ˘ω˘)",
  "噜噜~(晒太阳最幸福了 =^‥^=)",
];
// 物件 → 点击它触发的互动
const TARGET_OF: Record<ItemKey, InteractKind> = {
  bed: "nap",
  yarn: "play",
  bowl: "drink",
  box: "box",
  scratch: "scratch",
  rug: "rug",
};
// 道具工具栏(「最近」上方):长按拖拽到 target 上触发动作(梳子→猫梳毛 / 瓶子→碗续水)
type ToolKey = "brush" | "bottle" | "wand";
const TOOLBAR_ITEMS: Record<
  ToolKey,
  { src: string; alt: string; target: "cat" | "bowl" }
> = {
  brush: { src: "/pet/toolbar/brush.webp", alt: "梳子", target: "cat" },
  bottle: { src: "/pet/toolbar/bottle.webp", alt: "矿泉水瓶", target: "bowl" },
  wand: { src: "/pet/toolbar/wand.webp", alt: "逗猫棒", target: "cat" },
};

function PetNudge({
  cat,
  onOpenGuide,
}: {
  cat: Cat;
  onOpenGuide: () => void;
}) {
  // 摸猫彩蛋:随机「眯眼享受 / 洗脸」+ 临时说一句猫语(盖过当前气泡 4.2s,
  // 给慢节奏动作留足播完+定格回味的时间);n 递增让连续摸每次都从头重播动作
  const [talk, setTalk] = useState<string | null>(null);
  const [touch, setTouch] = useState<{
    action: "petted" | "groom";
    n: number;
  } | null>(null);
  const talkTimer = useRef<number | null>(null);

  // ── 院子漫游(仅无事可说的 idle 场景):坐着 → 随机散步/洗脸/打盹 ──
  // x 是猫在院子里的横向位置,散步用 CSS transition 匀速走过去。
  const yardRef = useRef<HTMLElement | null>(null);
  const catRef = useRef<HTMLDivElement | null>(null);
  // 读猫当前实际位置(散步动画进行中从 transform 矩阵取;
  // translate 后接 scale,平移分量不受 scale 影响:m41 = x, m42 = -y)
  function readCatXY(fallback: { x: number; y: number }): {
    x: number;
    y: number;
  } {
    const el = catRef.current;
    if (!el) return fallback;
    const t = getComputedStyle(el).transform;
    if (!t || t === "none") return fallback;
    const m = t.match(/matrix\(([^)]+)\)/);
    if (!m) return fallback;
    const p = m[1].split(",").map(parseFloat);
    return Number.isFinite(p[4]) && Number.isFinite(p[5])
      ? { x: p[4], y: -p[5] }
      : fallback;
  }
  const [yardW, setYardW] = useState(343);
  // 院子实际高(全屏 stage 模式下随机身/视口变);内容层据此把地面带上抬到背景地面。
  const [yardH, setYardH] = useState(560);
  const [roam, setRoam] = useState<{
    kind:
      | "sit"
      | "stroll"
      | "groom"
      | "nap"
      | "wake"
      | "play"
      | "drink"
      | "hopin"
      | "hopout"
      | "box"
      | "greet"
      | "hop"
      | "scratch"
      | "drybowl"
      | "brushing"
      | "rug"
      | "pounce"
      | "sunbathe"
      | "washing";
    x: number;
    // 地板深度(bottom 偏移,0=最前沿,YARD_DEPTH=最里)
    y: number;
    facing: "left" | "right";
    dur: number;
    // wake 时演哪个起床动作(伸懒腰/打哈欠/弓背)
    wake?: PetSpriteState;
    // 散步到达后的下一步(走到窝边再蜷睡 / 走到球边再玩……)
    then?: InteractKind | "sunbathe";
    // 梳毛动作变体(back 顺毛长梳 / belly 梳肚皮……),决定盖帧序列
    brushVariant?: string;
    // 洗脸动作变体(paw 舔爪抹脸 / hindleg 举旗杆……),决定盖帧序列
    washVariant?: string;
  }>({ kind: "sit", x: 4, y: 58, facing: "right", dur: 0 });
  // 减弱动效偏好或页面隐藏时不漫游;藏页瞬间散步中的猫就地坐下,回来不跳位
  const [calm, setCalm] = useState(false);

  // ── 家具拖拽摆位:坐标存 layout(默认=初始坐标,有存档则覆盖);长按拿起再拖 ──
  const [layout, setLayout] = useState<Record<ItemKey, Pos>>(defaultLayout);
  // 水碗水量 0~100:猫喝降一截、喝光见底,用矿泉水瓶倒水续满(localStorage 持久化)
  const [waterLevel, setWaterLevel] = useState(100);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("yardWater:v1");
      const n = raw == null ? NaN : parseInt(raw, 10);
      if (Number.isFinite(n)) setWaterLevel(Math.max(0, Math.min(100, n)));
    } catch {}
  }, []);
  const setWater = (n: number) => {
    const v = Math.max(0, Math.min(100, Math.round(n)));
    setWaterLevel(v);
    try {
      window.localStorage.setItem("yardWater:v1", String(v));
    } catch {}
  };
  const [dragKey, setDragKey] = useState<ItemKey | null>(null);
  const pressRef = useRef<{
    k: ItemKey;
    pointerId: number;
    startX: number;
    startY: number;
    startLeft: number;
    startBottom: number;
    lifted: boolean;
    moved: boolean;
    timer: number;
  } | null>(null);
  const suppressClickRef = useRef(false);
  // live 家具:默认常量(w/src/alt)+ 可变坐标(left/bottom)
  const liveItem = (k: ItemKey) => ({ ...YARD_ITEMS[k], ...layout[k] });

  // 读存档(仅客户端,首帧用默认避免水合不一致)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(YARD_LAYOUT_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<Record<ItemKey, Pos>>;
      setLayout((cur) => {
        const next = { ...cur };
        for (const k of Object.keys(YARD_ITEMS) as ItemKey[]) {
          const p = saved[k];
          if (p && Number.isFinite(p.left) && Number.isFinite(p.bottom))
            next[k] = { left: p.left, bottom: p.bottom };
        }
        return next;
      });
    } catch {}
  }, []);
  const saveLayout = (next: Record<ItemKey, Pos>) => {
    try {
      window.localStorage.setItem(YARD_LAYOUT_KEY, JSON.stringify(next));
    } catch {}
  };

  const LIFT_MS = 400; // 长按这么久才拿起
  const MOVE_CANCEL = 8; // 拿起前移动超过这个 px 就当滑动、不拿起
  function onItemPointerDown(k: ItemKey, e: ReactPointerEvent<HTMLButtonElement>) {
    if (talk || pressRef.current) return;
    suppressClickRef.current = false;
    const timer = window.setTimeout(() => {
      const pr = pressRef.current;
      if (pr && !pr.moved) {
        pr.lifted = true;
        setDragKey(pr.k);
      }
    }, LIFT_MS);
    pressRef.current = {
      k,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: layout[k].left,
      startBottom: layout[k].bottom,
      lifted: false,
      moved: false,
      timer,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  }
  function onItemPointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    const pr = pressRef.current;
    if (!pr || pr.pointerId !== e.pointerId) return;
    const dx = e.clientX - pr.startX;
    const dy = e.clientY - pr.startY;
    if (!pr.lifted) {
      if (Math.hypot(dx, dy) > MOVE_CANCEL) {
        pr.moved = true; // 滑动 → 放弃长按(不拿起,松手也不互动)
        window.clearTimeout(pr.timer);
      }
      return;
    }
    // 家具在按 sx 缩放的 wrapper 内,屏幕位移要除以 sx 换算回基准坐标
    const sx = Math.min(1, (yardRef.current?.offsetWidth ?? YARD_BASE_W) / YARD_BASE_W);
    const w = YARD_ITEMS[pr.k].w;
    const left = Math.round(
      Math.min(Math.max(0, YARD_BASE_W - w), Math.max(0, pr.startLeft + dx / sx)),
    );
    // 屏幕往上拖 = bottom 变大(往院子里);夹在地面带
    const bottom = Math.round(Math.min(100, Math.max(0, pr.startBottom - dy / sx)));
    setLayout((cur) => ({ ...cur, [pr.k]: { left, bottom } }));
  }
  function onItemPointerUp(e: ReactPointerEvent<HTMLButtonElement>) {
    const pr = pressRef.current;
    if (!pr || pr.pointerId !== e.pointerId) return;
    window.clearTimeout(pr.timer);
    pressRef.current = null;
    if (pr.lifted) {
      setDragKey(null);
      suppressClickRef.current = true; // 刚拖完,别让随后的 click 触发互动
      setLayout((cur) => {
        saveLayout(cur);
        return cur;
      });
    }
  }

  // 钻箱里东张西望:roam==="box" 时每 2-4s 随机切一张姿势(只 ① 一张时不切;减弱动效不切)
  const [boxPose, setBoxPose] = useState(0);
  useEffect(() => {
    if (roam.kind !== "box" || calm || CAT_IN_BOX_POSES.length < 2) {
      setBoxPose(0);
      return;
    }
    let t: number;
    const tick = () => {
      t = window.setTimeout(
        () => {
          setBoxPose((p) => {
            let n = Math.floor(Math.random() * CAT_IN_BOX_POSES.length);
            if (n === p) n = (n + 1) % CAT_IN_BOX_POSES.length;
            return n;
          });
          tick();
        },
        5000 + Math.random() * 3000,
      );
    };
    tick();
    return () => clearTimeout(t);
  }, [roam.kind, calm]);

  // 钻箱帧序:hopin 顺序播 0→3(猫从箱里由低升起=跳进去);
  // hopout 倒着播 3→1(坐起 → 扒到箱沿探出去=爬出来),停在 1,随后切回漫游精灵走开。
  const [jumpFrame, setJumpFrame] = useState(0);
  useEffect(() => {
    const last = CAT_JUMP_FRAMES.length - 1;
    if (roam.kind === "hopin") {
      let i = 0;
      setJumpFrame(0);
      const id = window.setInterval(() => {
        i = Math.min(i + 1, last);
        setJumpFrame(i);
      }, 230);
      return () => clearInterval(id);
    }
    if (roam.kind === "hopout") {
      let i = last;
      setJumpFrame(i);
      const id = window.setInterval(() => {
        i = Math.max(i - 1, 1);
        setJumpFrame(i);
      }, 200);
      return () => clearInterval(id);
    }
    setJumpFrame(0);
  }, [roam.kind]);

  // 挠抓板:scratch 期间 0↔1 来回切(前爪在斜面上下挠),~220ms 一拍
  const [scratchFrame, setScratchFrame] = useState(0);
  useEffect(() => {
    if (roam.kind !== "scratch") {
      setScratchFrame(0);
      return;
    }
    const id = window.setInterval(
      () => setScratchFrame((f) => (f === 0 ? 1 : 0)),
      220,
    );
    return () => clearInterval(id);
  }, [roam.kind]);

  // 梳毛:brushing 期间帧序列来回播(ping-pong)——从头顺到尾再回头 = 明显的顺毛长梳。
  // 帧数随梳毛动作(brushVariant)对应的序列长度变化,2 帧时退化为 0↔1。
  const [brushFrame, setBrushFrame] = useState(0);
  useEffect(() => {
    if (roam.kind !== "brushing") {
      setBrushFrame(0);
      return;
    }
    const seq = BRUSH_SEQS[roam.brushVariant ?? "back"] ?? BRUSH_SEQS.back;
    const n = seq.length;
    if (n < 2) {
      setBrushFrame(0);
      return;
    }
    let i = 0;
    let dir = 1;
    setBrushFrame(0);
    const id = window.setInterval(() => {
      i += dir;
      if (i >= n - 1) {
        i = n - 1;
        dir = -1;
      } else if (i <= 0) {
        i = 0;
        dir = 1;
      }
      setBrushFrame(i);
    }, 230);
    return () => clearInterval(id);
  }, [roam.kind, roam.brushVariant]);

  // 逗猫棒扑抓:pounce 期间 0↔1 来回切(举爪扑羽毛),~260ms 一拍
  const [pounceFrame, setPounceFrame] = useState(0);
  useEffect(() => {
    if (roam.kind !== "pounce") {
      setPounceFrame(0);
      return;
    }
    const id = window.setInterval(
      () => setPounceFrame((f) => (f === 0 ? 1 : 0)),
      260,
    );
    return () => clearInterval(id);
  }, [roam.kind]);

  // 洗脸:washing 期间 0↔1 来回切(局部动作:舔爪抹脸/抬后腿),~240ms 一拍
  const [washFrame, setWashFrame] = useState(0);
  useEffect(() => {
    if (roam.kind !== "washing") {
      setWashFrame(0);
      return;
    }
    const id = window.setInterval(
      () => setWashFrame((f) => (f === 0 ? 1 : 0)),
      620,
    );
    return () => clearInterval(id);
  }, [roam.kind]);

  useEffect(() => {
    const el = yardRef.current;
    const measure = () => {
      setYardW(el?.offsetWidth ?? 343);
      setYardH(el?.offsetHeight ?? 560);
    };
    measure();
    // 全屏 stage 模式:院子高随 sheet 内容/视口变 → ResizeObserver 重测,floorLift 跟着调。
    const ro =
      el && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(measure)
        : null;
    if (el && ro) ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      setCalm(mq.matches || document.hidden);
      if (document.hidden) {
        setRoam((r) => {
          if (r.kind !== "stroll") return r;
          const cur = readCatXY({ x: r.x, y: r.y });
          return {
            kind: "sit",
            x: Math.round(cur.x),
            y: Math.round(cur.y),
            facing: r.facing,
            dur: 0,
          };
        });
      }
    };
    apply();
    mq.addEventListener("change", apply);
    document.addEventListener("visibilitychange", apply);
    return () => {
      mq.removeEventListener("change", apply);
      document.removeEventListener("visibilitychange", apply);
    };
  }, []);

  // 说一句话(复用 talk 泡;不触发摸猫动作重播)
  function sayText(text: string) {
    setTalk(text);
    if (talkTimer.current) clearTimeout(talkTimer.current);
    talkTimer.current = window.setTimeout(() => {
      setTalk(null);
      setTouch(null);
    }, 3800);
  }
  // 互动完成后随机说一句对应猫语
  function sayLine(k: InteractKind) {
    const lines = INTERACT_TALK[k];
    if (lines.length) sayText(lines[Math.floor(Math.random() * lines.length)]);
  }

  // 点家具:让猫走过去互动(说话/被摸中不接单)
  function goInteract(target: InteractKind) {
    if (talk) return;
    setRoam((r) => {
      const cur =
        r.kind === "stroll"
          ? readCatXY({ x: r.x, y: r.y })
          : { x: r.x, y: r.y };
      return walkTo(
        { x: Math.round(cur.x), y: Math.round(cur.y), facing: r.facing },
        itemAnchor(liveItem(INTERACT_ITEM[target])),
        target,
      );
    });
  }

  function petTheCat() {
    // 散步途中被摸:就地停下再回应
    setRoam((r) => {
      if (r.kind !== "stroll") return { ...r, kind: "sit", dur: 0 };
      const cur = readCatXY({ x: r.x, y: r.y });
      return {
        kind: "sit",
        x: Math.round(cur.x),
        y: Math.round(cur.y),
        facing: r.facing,
        dur: 0,
      };
    });
    setTalk(PET_TALK[Math.floor(Math.random() * PET_TALK.length)]);
    setTouch((t) => ({
      action: Math.random() < 0.6 ? "petted" : "groom",
      n: (t?.n ?? 0) + 1,
    }));
    if (talkTimer.current) clearTimeout(talkTimer.current);
    talkTimer.current = window.setTimeout(() => {
      setTalk(null);
      setTouch(null);
    }, 3800);
  }

  // 梳子拖到猫身上:就地停下,演专属「疏毛」动作(盖帧,见院子渲染),
  // ~3.4s 后由调度器坐回并说句梳毛猫语(不在这里 setTalk,否则调度器会被 talk 挡住)。
  function brushTheCat() {
    const variant =
      BRUSH_VARIANTS[Math.floor(Math.random() * BRUSH_VARIANTS.length)];
    setRoam((r) => {
      if (r.kind === "stroll") {
        const cur = readCatXY({ x: r.x, y: r.y });
        return {
          kind: "brushing",
          x: Math.round(cur.x),
          y: Math.round(cur.y),
          facing: r.facing,
          dur: 0,
          brushVariant: variant,
        };
      }
      return { ...r, kind: "brushing", dur: 0, brushVariant: variant };
    });
  }

  // 逗猫棒拖到猫身上:就地停下原地扑跳捕猎(jumping 帧),~2.4s 后坐回说句捕猎猫语
  function pounceForWand() {
    setRoam((r) => {
      if (r.kind === "stroll") {
        const cur = readCatXY({ x: r.x, y: r.y });
        return {
          kind: "pounce",
          x: Math.round(cur.x),
          y: Math.round(cur.y),
          facing: r.facing,
          dur: 0,
        };
      }
      return { ...r, kind: "pounce", dur: 0 };
    });
  }

  // ── 道具工具栏拖拽:按住拖出 → 落到目标(猫/碗)→ 命中触发动作,没中回工具栏 ──
  const [carried, setCarried] = useState<{
    key: ToolKey;
    x: number;
    y: number;
  } | null>(null);
  const toolPressRef = useRef<{ key: ToolKey; pointerId: number } | null>(null);
  function onToolPointerDown(key: ToolKey, e: ReactPointerEvent<HTMLButtonElement>) {
    if (toolPressRef.current) return;
    toolPressRef.current = { key, pointerId: e.pointerId };
    setCarried({ key, x: e.clientX, y: e.clientY });
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  }
  function onToolPointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    const pr = toolPressRef.current;
    if (!pr || pr.pointerId !== e.pointerId) return;
    setCarried((c) => (c ? { ...c, x: e.clientX, y: e.clientY } : c));
  }
  function onToolPointerUp(e: ReactPointerEvent<HTMLButtonElement>) {
    const pr = toolPressRef.current;
    if (!pr || pr.pointerId !== e.pointerId) return;
    toolPressRef.current = null;
    setCarried(null);
    const tool = TOOLBAR_ITEMS[pr.key];
    const inRect = (r?: DOMRect | null) =>
      !!r &&
      e.clientX >= r.left &&
      e.clientX <= r.right &&
      e.clientY >= r.top &&
      e.clientY <= r.bottom;
    const hit =
      tool.target === "cat"
        ? inRect(catRef.current?.getBoundingClientRect())
        : inRect(
            document
              .querySelector('button[aria-label*="水碗"]')
              ?.getBoundingClientRect() ?? null,
          );
    if (!hit) return; // 没命中 → 道具留在工具栏(carried 已清)
    if (pr.key === "brush") {
      brushTheCat();
    } else if (pr.key === "bottle") {
      setWater(100); // 倒满
      goInteract("drink"); // 猫跑来喝新水
    } else if (pr.key === "wand") {
      pounceForWand(); // 逗猫棒:猫原地扑跳捕猎
    }
  }

  // 院子行为调度:坐 12-26s 后掷骰子 —— 50% 散步(约 35px/s 匀速)/
  // 25% 洗脸 / 25% 打盹(9-15s);摸猫说话时暂停,说完从坐姿重新计时。
  // 院子是常驻沉浸 stage,猫始终鲜活(回访/护理等改由 HomePage 底部 sheet 承载)。
  useEffect(() => {
    if (calm || talk) return;
    let t: number;
    // 院子真实宽度同步(场景切进 idle 后 ref 才挂上)
    const live = yardRef.current?.offsetWidth;
    if (live && live !== yardW) setYardW(live);
    if (roam.kind === "sit") {
      t = window.setTimeout(
        () => {
          const w = YARD_BASE_W;
          const maxX = Math.max(0, w - 84);
          const roll = Math.random();
          // 35% 散步 / 15% 洗脸 / 20% 回窝睡 / 10% 玩球 / 10% 喝水 / 10% 钻箱
          if (roll < 0.35 && maxX > 120) {
            const tx = Math.round(Math.random() * maxX);
            const dxAbs = Math.abs(tx - roam.x);
            // 斜率约束:横向分量必须主导 —— 侧面猫做纯纵向移动会穿帮
            const maxDy = Math.max(8, Math.round(dxAbs / 2));
            const ty = Math.max(
              0,
              Math.min(
                YARD_DEPTH,
                roam.y + Math.round((Math.random() * 2 - 1) * maxDy),
              ),
            );
            const dist = Math.hypot(tx - roam.x, ty - roam.y);
            if (dist >= 40) {
              setRoam({
                kind: "stroll",
                x: tx,
                y: ty,
                facing: tx - roam.x > 0 ? "right" : "left",
                dur: Math.round(dist / 0.035),
              });
              return;
            }
          }
          if (roll < 0.46) {
            setRoam((r) => ({ ...r, kind: "groom", dur: 0 }));
            return;
          }
          if (roll < 0.54) {
            // 招手:坐着抬爪挥手打个招呼
            setRoam((r) => ({ ...r, kind: "greet", dur: 0 }));
            return;
          }
          if (roll < 0.61) {
            // 蹦跶:原地开心蹦一下
            setRoam((r) => ({ ...r, kind: "hop", dur: 0 }));
            return;
          }
          if (roll < 0.67) {
            // 晒太阳:走到阳光地面趴下眯眼(自主安静停留点)
            setRoam((r) => walkTo(r, SUN_SPOT, "sunbathe"));
            return;
          }
          const target: InteractKind =
            roll < 0.7
              ? "nap"
              : roll < 0.78
                ? "play"
                : roll < 0.86
                  ? "drink"
                  : roll < 0.93
                    ? "scratch"
                    : "box";
          setRoam((r) =>
            walkTo(r, itemAnchor(liveItem(INTERACT_ITEM[target])), target),
          );
        },
        12000 + Math.random() * 14000,
      );
    } else if (roam.kind === "stroll") {
      t = window.setTimeout(
        () =>
          setRoam((r) => {
            // 凑到碗前才看水:空碗就改演「委屈」(drybowl),不进喝水动作
            const next =
              r.then === "drink" && waterLevel <= 0
                ? "drybowl"
                : r.then === "box"
                  ? "hopin"
                  : (r.then ?? "sit");
            return { ...r, kind: next, then: undefined, dur: 0 };
          }),
        roam.dur + 80,
      );
    } else if (roam.kind === "groom") {
      t = window.setTimeout(() => setRoam((r) => ({ ...r, kind: "sit" })), 3600);
    } else if (roam.kind === "wake") {
      // 起床动作演一遍(~2.5-2.9s)后定格收尾,再坐回
      t = window.setTimeout(() => setRoam((r) => ({ ...r, kind: "sit" })), 3300);
    } else if (roam.kind === "greet") {
      // 招手:挥手定格一拍后坐回
      t = window.setTimeout(() => setRoam((r) => ({ ...r, kind: "sit" })), 1600);
    } else if (roam.kind === "hop") {
      // 蹦跶:蹦一下定格回味后坐回
      t = window.setTimeout(() => setRoam((r) => ({ ...r, kind: "sit" })), 1100);
    } else if (roam.kind === "scratch") {
      // 挠抓板:伸展(stretch)演一遍后坐起说句猫语
      t = window.setTimeout(() => {
        setRoam((r) => ({ ...r, kind: "sit" }));
        sayLine("scratch");
      }, 3200);
    } else if (roam.kind === "rug") {
      // 到地毯:随机选一组洗脸动作,立即转 washing(codex 专属洗脸盖帧)
      const v =
        WASH_VARIANTS[Math.floor(Math.random() * WASH_VARIANTS.length)];
      setRoam((r) => ({ ...r, kind: "washing", washVariant: v }));
    } else if (roam.kind === "washing") {
      // 洗脸:盖帧演 ~3.4s 后坐回,说句洗脸猫语
      t = window.setTimeout(() => {
        setRoam((r) => ({ ...r, kind: "sit" }));
        sayText(WASH_TALK[Math.floor(Math.random() * WASH_TALK.length)]);
      }, 3600);
    } else if (roam.kind === "pounce") {
      // 逗猫棒:原地扑跳捕猎 ~2.4s 后坐回,说句捕猎猫语(复用 play 捕猎语)
      t = window.setTimeout(() => {
        setRoam((r) => ({ ...r, kind: "sit" }));
        sayLine("play");
      }, 2400);
    } else if (roam.kind === "sunbathe") {
      // 晒太阳:趴在阳光里眯眼 ~6s 后坐起,说句晒太阳猫语
      t = window.setTimeout(() => {
        setRoam((r) => ({ ...r, kind: "sit" }));
        sayText(
          SUNBATHE_TALK[Math.floor(Math.random() * SUNBATHE_TALK.length)],
        );
      }, 6000);
    } else if (roam.kind === "brushing") {
      // 梳毛:专属疏毛盖帧演 ~3.4s 后坐回,说句梳毛猫语
      t = window.setTimeout(() => {
        setRoam((r) => ({ ...r, kind: "sit" }));
        sayText(BRUSH_TALK[Math.floor(Math.random() * BRUSH_TALK.length)]);
      }, 2600);
    } else if (roam.kind === "play" || roam.kind === "drink") {
      // 玩球/喝水:动画播一遍定格回味,完了坐起说句猫语;喝水还会降水量
      // (空碗已在凑近时改去 drybowl,这里 drink 必有水)
      const done = roam.kind;
      t = window.setTimeout(() => {
        setRoam((r) => ({ ...r, kind: "sit" }));
        if (done === "drink") {
          setWater(Math.max(0, waterLevel - 50)); // 满→半→空,每口看得出降
          sayLine("drink");
        } else {
          sayLine(done);
        }
      }, 4200);
    } else if (roam.kind === "drybowl") {
      // 凑到空碗前发现没水:委屈表情定格一拍后坐回,说句委屈猫语
      t = window.setTimeout(() => {
        setRoam((r) => ({ ...r, kind: "sit" }));
        sayText(
          EMPTY_WATER_TALK[Math.floor(Math.random() * EMPTY_WATER_TALK.length)],
        );
      }, 2200);
    } else if (roam.kind === "hopin") {
      // 蹦进箱子:0→3 升起播完(~900ms)再落进箱里
      t = window.setTimeout(() => setRoam((r) => ({ ...r, kind: "box" })), 850);
    } else if (roam.kind === "box") {
      // 钻箱:在箱里蹲 10-15s,到点先爬出来(hopout)
      t = window.setTimeout(
        () => setRoam((r) => ({ ...r, kind: "hopout" })),
        10000 + Math.random() * 5000,
      );
    } else if (roam.kind === "hopout") {
      // 爬出箱子:3→1 扒着箱沿探出去(~800ms)后落地坐下、说句猫语
      t = window.setTimeout(() => {
        setRoam((r) => ({ ...r, kind: "sit" }));
        sayLine("box");
      }, 480);
    } else {
      // 打盹 18-32s —— 睡够了随机演一个起床动作(伸懒腰/打哈欠/弓背)再坐起
      t = window.setTimeout(
        () => {
          const wake = (["stretch", "yawn", "arch"] as const)[
            Math.floor(Math.random() * 3)
          ];
          setRoam((r) => ({ ...r, kind: "wake", wake, dur: 0 }));
        },
        18000 + Math.random() * 14000,
      );
    }
    return () => clearTimeout(t);
  }, [calm, talk, roam, yardW, waterLevel]);

  // ── 院子始终是沉浸 stage:小猫在院子里生活,气泡跟着猫走。
  //    回访/护理/新用户引导等内容改由 HomePage 底部 sheet 承载(不再返回小气泡卡)。 ──
  {
    const yardSprite: PetSpriteState = talk
      ? (touch?.action ?? "idle")
      : roam.kind === "stroll"
        ? roam.facing === "right"
          ? "running-right"
          : "running-left"
        : roam.kind === "groom" || roam.kind === "rug"
          ? "groom"
          : roam.kind === "scratch"
            ? "stretch"
            : roam.kind === "nap" || roam.kind === "sunbathe"
              ? "nap"
            : roam.kind === "wake"
              ? (roam.wake ?? "stretch")
              : roam.kind === "play"
                ? "play"
                : roam.kind === "drink"
                  ? "drink"
                  : roam.kind === "greet"
                    ? "waving"
                    : roam.kind === "hop" || roam.kind === "pounce"
                      ? "jumping"
                      : roam.kind === "hopin"
                        ? "jumping"
                        : roam.kind === "drybowl"
                          ? "failed"
                          : "idle";
    // 摸猫说话才冒对话泡 —— 气泡跟随小猫:贴着猫身体边缘的左/右侧,按边界选边
    const showBubble = talk !== null;
    // 猫的视觉范围:容器锚在 roam.x,精灵宽 84、底中心缩放(按深度 scaleOf)
    const catScale = scaleOf(roam.y);
    const catCenterX = roam.x + 42;
    const catHalfW = 42 * catScale;
    const catLeftEdge = catCenterX - catHalfW;
    const catRightEdge = catCenterX + catHalfW;
    const GAP = 10;
    const EDGE = 6;
    // 选空间更大的一侧贴着猫放,气泡宽度收进该侧可用空间(窄了就换行),不压到猫
    const rightRoom = YARD_BASE_W - catRightEdge - GAP - EDGE;
    const leftRoom = catLeftEdge - GAP - EDGE;
    const bubbleOnRight = rightRoom >= leftRoom;
    const bubbleW = Math.min(240, Math.max(96, bubbleOnRight ? rightRoom : leftRoom));
    const bubbleStyle = bubbleOnRight
      ? { left: Math.round(catRightEdge + GAP), maxWidth: bubbleW }
      : {
          left: Math.round(Math.max(EDGE, catLeftEdge - GAP - bubbleW)),
          maxWidth: bubbleW,
        };
    // 垂直:贴在猫头/肩高度(精灵高约 91*scale),尾角朝下指向猫,不再钉在脚边
    const bubbleBottom = Math.round(roam.y + 52 * catScale);
    // 看病/问答入口在底部 sheet;院子顶只留 小知识💡 + 使用说明? 两个图标(见下)。
    // 全屏 stage:院子内容层(345×280 设计坐标)整体上抬 floorLift,落到背景地面带;
    // floorLift 按实际院子高 yardH 比例,适配不同机身高度(地面在背景下部)。
    const contentScale = Math.min(1, yardW / YARD_BASE_W);
    const floorLift = Math.round(yardH * 0.12);
    return (
      <>
      <section
        ref={yardRef}
        className="relative isolate min-h-0 flex-1 overflow-hidden"
        aria-label={`${cat.name}的家`}
      >
        {/* 院子背景:codex 出的温馨房间图(暖墙 + 右上窗户/窗台 + 浅木地板 + 窗边暖光斑)。
            铺满 yard 垫底(zIndex 0、object-cover、pointer-events-none、aria-hidden);柔和低饱和
            当底不抢戏。三色信号层在 yard section 外、被 overflow-hidden 隔离,背景不碰红黄绿。 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/pet/items/yard-bg-v2.webp"
          alt=""
          aria-hidden="true"
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          style={{ zIndex: 0, filter: "saturate(0.92) brightness(1.02)" }}
        />
        {/* 极淡一层奶白把房间图融进页面奶白调(新背景已低饱和温馨,只轻扫一下不洗白)
            (filter/遮罩只作用背景层叶子节点,三色圆点在 yard section 外,零影响) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ zIndex: 0, background: "rgba(247,246,243,0.12)" }}
        />
        {/* 院子内容层:家具/猫/盖帧/泡泡全部基于 YARD_BASE_W×280 设计坐标,整层按
            yardW/YARD_BASE_W 等比缩放 → 任何屏宽协调(窄屏不裁家具、宽屏不留白);
            背景图在本层外(section 直接)、object-cover 自适应铺满,不随内容缩放。 */}
        <div
          className="absolute left-1/2"
          style={{
            width: YARD_BASE_W,
            height: 280,
            bottom: floorLift,
            transform: `translateX(-50%) scale(${contentScale.toFixed(4)})`,
            transformOrigin: "bottom center",
          }}
        >
        {/* 地板家具:点了让猫走过去互动;按深度排层(画家算法)。
            钻箱时空箱子换成 cat-in-box 整图(见下),所以这里把空箱子藏掉;
            玩球/喝水动画自带道具,进行时把地上同款隐掉防止出现两个 */}
        {(Object.keys(YARD_ITEMS) as ItemKey[]).map((k) => {
          const it = YARD_ITEMS[k];
          const hideForAction =
            (k === "yarn" && roam.kind === "play") ||
            (k === "bowl" && roam.kind === "drink") ||
            (k === "scratch" && roam.kind === "scratch") ||
            (k === "box" &&
              (roam.kind === "box" ||
                roam.kind === "hopin" ||
                roam.kind === "hopout"));
          const pos = layout[k];
          const lifted = dragKey === k;
          const z = lifted ? 200 : k === "rug" ? 1 : zOf(pos.bottom);
          return (
            <button
              key={k}
              type="button"
              onClick={() => {
                if (suppressClickRef.current) {
                  suppressClickRef.current = false;
                  return;
                }
                goInteract(TARGET_OF[k]);
              }}
              onPointerDown={(e) => onItemPointerDown(k, e)}
              onPointerMove={onItemPointerMove}
              onPointerUp={onItemPointerUp}
              onPointerCancel={onItemPointerUp}
              aria-label={`让${cat.name}去${it.alt}那儿(长按可拖动摆位)`}
              className="absolute cursor-pointer select-none p-0"
              style={{
                left: pos.left,
                bottom: pos.bottom,
                width: it.w,
                zIndex: z,
                touchAction: "none",
                transformOrigin: "bottom center",
                transform: lifted ? "scale(1.08)" : undefined,
                filter: lifted
                  ? "drop-shadow(0 7px 9px rgba(0,0,0,0.28))"
                  : undefined,
                transition: lifted ? "none" : "transform 0.14s ease-out",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  k === "bowl"
                    ? waterLevel > 50
                      ? it.src // 满
                      : waterLevel > 0
                        ? "/pet/items/bowl-half.webp" // 半
                        : "/pet/items/bowl-empty.webp" // 空
                    : it.src
                }
                alt=""
                draggable={false}
                className={"w-full " + (hideForAction ? "opacity-0" : "")}
              />
            </button>
          );
        })}

        {/* 位移走合成器(transform 独立图层),避免 left+背景换帧+阴影联手留残影;
            呼吸 scale 动画在内层按钮上,跟位移不抢同一个 transform。
            脚下用一块静态椭圆当影子,不再给精灵挂 drop-shadow 滤镜 —— 滤镜每帧重算,
            奔跑高频换帧时会残留上一帧的虚影(像涂层);静态 div 不随帧重算,无残影。
            钻箱时整只换成 cat-in-box 整图(见下),实时精灵藏起。 */}
        {(() => {
          // 帧状态(box/hopin/hopout/scratch)期间用 gpt 帧盖在上面,这只实时精灵隐藏。
          // 关键:不「卸载」而是隐藏 —— 卸载后切回 stroll 会重新挂载,新挂载的 div 没有
          // 上一帧 transform 作为 CSS transition 起点,会从家具位置「瞬移」到新目标
          // (item2:从纸箱出来连点别的家具会瞬移)。常驻挂载则平移能平滑过渡走过去。
          const catHidden =
            roam.kind === "box" ||
            roam.kind === "hopin" ||
            roam.kind === "hopout" ||
            roam.kind === "scratch" ||
            roam.kind === "brushing" ||
            roam.kind === "pounce" ||
            roam.kind === "washing";
          return (
          <div
            ref={catRef}
            className="absolute bottom-0 left-0"
            style={{
              transform: `translate(${roam.x}px, ${-roam.y}px) scale(${scaleOf(roam.y).toFixed(3)})`,
              transformOrigin: "50% 100%",
              transition:
                roam.kind === "stroll"
                  ? `transform ${roam.dur}ms linear`
                  : "none",
              willChange: roam.kind === "stroll" ? "transform" : undefined,
              // 猫是前景角色:z 始终高于地面家具(zOf 上限 ~100),漫游到院子深处
              // 也不会被家具图整个盖住消失;yard 已加 isolate 把这套高 z 封在院子内。
              zIndex: Math.max(zOf(roam.y), 150),
              opacity: catHidden ? 0 : 1,
              pointerEvents: catHidden ? "none" : undefined,
            }}
          >
            {/* 脚下静态影子 */}
            <span
              aria-hidden="true"
              className="absolute left-1/2 bottom-[5px] -translate-x-1/2 rounded-[50%] bg-black/10 blur-[2px]"
              style={{ width: 44, height: 8 }}
            />
            <button
              type="button"
              onClick={petTheCat}
              aria-label={`摸摸${cat.name}`}
              className="pet-enter relative block cursor-pointer select-none"
            >
              <PetSprite
                state={yardSprite}
                width={84}
                fallbackSrc={PET_FACE_SRC[talk ? "happy" : "calm"]}
                playKey={touch?.n}
                idleFlourish={false}
              />
            </button>
          </div>
          );
        })()}

        {/* 钻箱动画:hopin 播 0→3(跳进去)/ hopout 播 3→1(爬出来),整张盖在箱位、箱帧间锁死。 */}
        {(roam.kind === "hopin" || roam.kind === "hopout") && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={CAT_JUMP_FRAMES[jumpFrame] ?? CAT_JUMP_FRAMES[0]}
              alt=""
              aria-hidden="true"
              draggable={false}
              className={
                "absolute " +
                (roam.kind === "hopin" ? "box-hop-in" : "box-hop-out")
              }
              style={{
                left: layout.box.left,
                bottom: layout.box.bottom,
                width: BOX_W,
                zIndex: zOf(layout.box.bottom) + 1,
              }}
            />
          </>
        )}

        {/* 在箱里:box 循环切组合帧 4-6(猫+箱画在一起、箱子固定),整张盖在箱位 → 东张西望、
            箱子不重叠不跳。 */}
        {roam.kind === "box" && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={CAT_IN_BOX_POSES[boxPose] ?? CAT_IN_BOX_POSES[0]}
              alt=""
              aria-hidden="true"
              draggable={false}
              className="absolute"
              style={{
                left: layout.box.left,
                bottom: layout.box.bottom,
                width: BOX_W,
                zIndex: zOf(layout.box.bottom) + 1,
              }}
            />
          </>
        )}

        {/* 挠抓板:scratch 期间隐掉静态板 + 实时精灵,换成 codex「猫挠板」2 帧来回切,
            帧里的板与静态板重合(SCRATCH_DX/DY/W 算好),猫在板左侧前爪上下挠。 */}
        {roam.kind === "scratch" && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={CAT_SCRATCH_FRAMES[scratchFrame] ?? CAT_SCRATCH_FRAMES[0]}
              alt=""
              aria-hidden="true"
              draggable={false}
              className="absolute"
              style={{
                left: layout.scratch.left + SCRATCH_DX,
                bottom: layout.scratch.bottom + SCRATCH_DY,
                width: SCRATCH_W,
                zIndex: zOf(layout.scratch.bottom) + 1,
              }}
            />
          </>
        )}

        {/* 梳毛:brushing 期间藏掉实时精灵,在猫的实时位置(roam.x/roam.y,按深度缩放)
            盖上 codex 专门画的「疏毛」2 帧,针梳贴后背上下来回梳。猫脚底对齐 roam.y、
            水平居中对齐猫中心(roam.x+42),DX/DY/W 微调。 */}
        {roam.kind === "brushing" &&
          (() => {
            const variant = roam.brushVariant ?? "back";
            const align = BRUSH_ALIGN[variant] ?? BRUSH_ALIGN.back;
            const s = scaleOf(roam.y);
            const w = Math.round(align.w * s);
            const seq = BRUSH_SEQS[variant] ?? BRUSH_SEQS.back;
            const src = seq[brushFrame] ?? seq[0];
            // 水平居中对齐猫中心,再 clamp 进院子内 → 靠边时不出界被截
            const rawLeft = roam.x + 42 - w / 2 + align.dx * s;
            const left = Math.round(
              Math.max(4, Math.min(YARD_BASE_W - w - 4, rawLeft)),
            );
            return (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  className="absolute cat-groom-sway"
                  style={{
                    left,
                    bottom: Math.round(roam.y + align.dy * s),
                    width: w,
                    zIndex: Math.max(zOf(roam.y), 150) + 1, // 同 live sprite:前景化,梳毛盖帧也不被家具遮
                  }}
                />
              </>
            );
          })()}

        {/* 逗猫棒扑抓:pounce 期间藏实时精灵,在猫位置盖 codex「扑逗猫棒」2 帧来回切。 */}
        {roam.kind === "pounce" &&
          (() => {
            const s = scaleOf(roam.y);
            const w = Math.round(WAND_W * s);
            const src = CAT_WAND_FRAMES[pounceFrame] ?? CAT_WAND_FRAMES[0];
            const rawLeft = roam.x + 42 - w / 2 + WAND_DX * s;
            const left = Math.round(
              Math.max(4, Math.min(YARD_BASE_W - w - 4, rawLeft)),
            );
            return (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  className="absolute"
                  style={{
                    left,
                    bottom: Math.round(roam.y + WAND_DY * s),
                    width: w,
                    zIndex: Math.max(zOf(roam.y), 150) + 1,
                  }}
                />
              </>
            );
          })()}

        {/* 洗脸:washing 期间藏实时精灵,在猫位置盖 codex 专属洗脸帧(随机一组)2 帧来回切。 */}
        {roam.kind === "washing" &&
          (() => {
            const variant = roam.washVariant ?? "paw";
            const align = WASH_ALIGN[variant] ?? WASH_ALIGN.paw;
            const s = scaleOf(roam.y);
            const w = Math.round(align.w * s);
            const seq = WASH_SEQS[variant] ?? WASH_SEQS.paw;
            const src = seq[washFrame] ?? seq[0];
            const rawLeft = roam.x + 42 - w / 2 + align.dx * s;
            const left = Math.round(
              Math.max(4, Math.min(YARD_BASE_W - w - 4, rawLeft)),
            );
            return (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  className="absolute"
                  style={{
                    left,
                    bottom: Math.round(roam.y + align.dy * s),
                    width: w,
                    zIndex: Math.max(zOf(roam.y), 150) + 1,
                  }}
                />
              </>
            );
          })()}

        {showBubble && (
          <div
            className={
              "pet-bubble absolute rounded-[22px] bg-surface px-4 py-3 shadow-[var(--shadow-card)] " +
              (bubbleOnRight ? "rounded-bl-md" : "rounded-br-md")
            }
            style={{ ...bubbleStyle, bottom: bubbleBottom, zIndex: 200 }}
          >
            <p className="text-[14px] leading-relaxed text-ink">{talk}</p>
          </div>
        )}
        </div>

        {/* ── 院子浮层 ── 全在 section 内、content 层外:不随内容缩放、不被裁。 */}
        {/* 浮动问候(左上,毛玻璃胶囊):头像 + 衬线问候 + 月龄/性别 */}
        <div
          className="pointer-events-none absolute left-4 z-30 flex items-center gap-2.5 rounded-full bg-white/55 py-1.5 pr-3.5 pl-2 shadow-[0_6px_16px_rgba(120,90,60,0.14),inset_0_0_0_1px_rgba(255,255,255,0.6)] backdrop-blur-md"
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 14px)" }}
        >
          <CatFace
            mood="relieved"
            size={36}
            className="shrink-0 rounded-full bg-[var(--accent-tint)] shadow-[inset_0_0_0_2px_#fff]"
          />
          <div className="min-w-0">
            <p className="font-serif text-[15px] font-semibold leading-tight tracking-wide text-ink">
              {greeting()},{cat.name}
            </p>
            <p className="mt-px truncate text-[11px] tracking-wide text-ink-soft">
              {[ageLabel(cat.ageMonths), cat.sex, cat.coat]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>

        {/* 右上两个同款毛玻璃圆按钮:小知识 💡(→/knowledge)+ 使用说明 ?(开 Guide)。
            看病/问答已在底部 sheet(CTA + 问问),不再在院子顶重复入口。 */}
        <div
          className="absolute right-4 z-30 flex items-center gap-2"
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 14px)" }}
        >
          <Link
            href="/knowledge"
            aria-label="小知识:看着吓人但不必慌的 6 种情况,权威兽医来源"
            className="grid size-9 place-items-center rounded-full bg-white/60 text-accent shadow-[0_4px_12px_rgba(120,90,60,0.16),inset_0_0_0_1px_rgba(255,255,255,0.6)] backdrop-blur-md transition-transform active:scale-90"
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 18h6" />
              <path d="M10 21h4" />
              <path d="M12 3a6 6 0 0 0-3.8 10.7c.5.6.8 1.1.8 1.8V16h6v-.5c0-.7.3-1.2.8-1.8A6 6 0 0 0 12 3Z" />
            </svg>
          </Link>
          <button
            type="button"
            onClick={onOpenGuide}
            aria-label="使用说明"
            className="grid size-9 place-items-center rounded-full bg-white/60 font-serif text-[16px] font-bold text-accent shadow-[0_4px_12px_rgba(120,90,60,0.16),inset_0_0_0_1px_rgba(255,255,255,0.6)] backdrop-blur-md transition-transform active:scale-90"
          >
            ?
          </button>
        </div>

        {/* 道具栏迁到院子 floor(care-float):梳子/水/逗猫棒,长按拖到猫/碗上触发(拖拽逻辑不变) */}
        <div
          className="absolute left-4 z-20 flex items-end gap-2.5"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 32px)" }}
          aria-label="道具工具栏"
        >
          {(Object.keys(TOOLBAR_ITEMS) as ToolKey[]).map((tk) => {
            const tool = TOOLBAR_ITEMS[tk];
            const grabbed = carried?.key === tk;
            return (
              <button
                key={tk}
                type="button"
                aria-label={`${tool.alt}(长按拖到${tool.target === "cat" ? "猫" : "水碗"}上)`}
                className="grid size-[52px] place-items-center rounded-[15px] bg-white/65 p-1.5 shadow-[0_4px_12px_rgba(120,90,60,0.16),inset_0_0_0_1px_rgba(255,255,255,0.55)] backdrop-blur-md select-none"
                style={{ touchAction: "none", opacity: grabbed ? 0.35 : 1 }}
                onPointerDown={(e) => onToolPointerDown(tk, e)}
                onPointerMove={onToolPointerMove}
                onPointerUp={onToolPointerUp}
                onPointerCancel={onToolPointerUp}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={tool.src}
                  alt=""
                  draggable={false}
                  className="h-9 w-9 object-contain"
                />
              </button>
            );
          })}
        </div>
      </section>

      {carried && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={TOOLBAR_ITEMS[carried.key].src}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{
            position: "fixed",
            left: carried.x,
            top: carried.y,
            transform: "translate(-50%, -50%) rotate(-12deg)",
            width: 56,
            height: "auto",
            zIndex: 999,
            pointerEvents: "none",
            filter: "drop-shadow(0 6px 8px rgba(0,0,0,0.25))",
          }}
        />
      )}
      </>
    );
  }
}

// 「最近」一行 —— 复用 lib/profile 的 recordHref(分诊→报告卡 / 问答→对话)。
function RecentRow({ record }: { record: CatRecord }) {
  const dot =
    record.kind === "triage" && record.tier
      ? TIER_DOT[record.tier]
      : "var(--ink-ghost)";
  const href = recordHref(record);
  const rowCls =
    "flex items-center gap-3.5 border-b border-[var(--line-soft)] py-4 last:border-b-0";

  const body = (
    <>
      <span
        className="size-[7px] shrink-0 rounded-full"
        style={{ background: dot }}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium text-ink">
          {record.summary}
        </span>
        <span className="mt-0.5 block text-[12px] tracking-wide text-ink-faint">
          {formatDate(record.date)}
        </span>
      </span>
      {href && (
        <svg
          className="shrink-0 text-ink-faint"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M9 6l6 6-6 6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </>
  );

  if (!href) return <div className={rowCls}>{body}</div>;

  return (
    <Link
      href={href}
      aria-label={`查看「${record.summary}」`}
      className={`${rowCls} transition-colors active:bg-[var(--surface-2)]`}
    >
      {body}
    </Link>
  );
}

export default function HomePage() {
  const [store, setStore] = useState<Store | null>(null);
  const [cat, setCat] = useState<Cat | null>(null);
  const [records, setRecords] = useState<CatRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const applyStore = (store: Store) => {
      const active =
        store.cats.find((c) => c.id === store.activeCatId) ?? store.cats[0];
      setStore(store);
      setCat(active);
      setRecords(store.records.filter((r) => r.catId === active.id));
    };

    queueMicrotask(() => {
      if (cancelled) return;

      // 首次进入(没看过教程)自动弹一次。读 persist(Cookie 兜底)——
      // 微信 webview 不保 localStorage,否则教程会每次都弹。
      if (!readPersisted(GUIDE_SEEN_KEY)) setShowGuide(true);

      const local = loadStore();
      if (local && local.cats.length > 0) {
        applyStore(local);
        setLoaded(true);
        return;
      }

      // 本地空 —— 可能微信清了存储。按匿名 deviceId 从云端拉回历史(带超时);
      // 拉到就回填本地(不再推回云端,避免回声)。失败就当新用户走欢迎页。
      pullHistory().then((cloud) => {
        if (cancelled) return;
        if (cloud && cloud.cats.length > 0) {
          saveStoreLocal(cloud);
          applyStore(cloud);
        }
        setLoaded(true);
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  function closeGuide() {
    setShowGuide(false);
    // 写 persist(localStorage + Cookie),保证微信里也记得「看过了」。
    writePersisted(GUIDE_SEEN_KEY, "1");
  }

  // 用户在欢迎页选「先用默认模版逛逛」—— seed 中性「我的猫」,首页就地重渲染。
  function useTemplate() {
    const store = seedTemplateStore();
    setStore(store);
    setCat(store.cats[0]);
    setRecords([]);
  }

  // 分诊跟进卡 —— 选中目标记录 + 点选后的回执文案(「还没好」带再分诊链接)。
  const followupTarget = useMemo(() => findFollowupTarget(records), [records]);
  const [followupNote, setFollowupNote] = useState<{
    text: string;
    href?: string;
    label?: string;
    face?: PetFace; // 回执时小猫的表情(开心 / 担心)
  } | null>(null);

  function pickOutcome(
    rec: CatRecord,
    outcome: NonNullable<CatRecord["outcome"]>,
  ) {
    const next = updateRecordOutcome(rec.id, outcome);
    if (next && cat) {
      setStore(next);
      setRecords(next.records.filter((r) => r.catId === cat.id));
    }
    if (outcome === "在家好转") {
      setFollowupNote({
        text: "我好多啦!谢谢你记着 —— 有反复随时再带我来分诊。",
        face: "happy",
      });
      setTimeout(() => setFollowupNote(null), 3200);
    } else if (outcome === "已就医") {
      setFollowupNote({
        text: "带我看过医生啦,记下了 —— 之后以医生的判断为准。",
        face: "happy",
      });
      setTimeout(() => setFollowupNote(null), 3200);
    } else {
      const urgent = rec.tier === "red" || rec.tier === "yellow";
      setFollowupNote({
        text: urgent
          ? "我还没好就别再等了 —— 尽快带我去医院,面诊为准。"
          : "还没好的话,再帮我分诊一次,看看要不要升级处理。",
        href: rec.symptomKey
          ? `/triage?symptom=${rec.symptomKey}`
          : "/symptoms",
        label: "再分诊一次 →",
        face: urgent ? "worry" : "curious",
      });
    }
  }

  // localStorage 仅客户端可读:首帧渲染空壳避免水合不一致。
  if (!loaded) return <main className="min-h-dvh" aria-hidden="true" />;

  const guide = showGuide ? <Guide onClose={closeGuide} /> : null;

  // 无档案(新用户首次进入):欢迎页,不再直接甩进表单、不再 seed 豆豆。
  if (!cat)
    return (
      <>
        {guide}
        <Welcome onUseTemplate={useTemplate} />
      </>
    );

  return (
    <>
      {guide}
      <main
        className="relative mx-auto flex h-dvh max-w-[430px] flex-col overflow-hidden"
        style={{ background: "var(--paper)" }}
      >
        {/* 全屏 stage:沉浸院子 —— 浮动问候 / 小知识💡 / 「?」/ floor 道具栏 / 搭话泡全在 PetNudge 内 */}
        <PetNudge cat={cat} onOpenGuide={() => setShowGuide(true)} />

        {/* 底部上拉 sheet:盖院子下沿、圆角顶、上向阴影 —— 回访(如有)+ 看病 CTA + 问问 + 最近 */}
        <div
          className="relative z-10 -mt-[30px] flex-none rounded-t-[28px] px-5 pt-3"
          style={{
            background: "var(--paper)",
            boxShadow: "0 -10px 30px rgba(60,45,30,0.1)",
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 4rem)",
          }}
        >
          <div
            className="mx-auto mb-3.5 h-1 w-9 rounded-full bg-[var(--paper-deep)]"
            aria-hidden="true"
          />

          {/* 回访闭环(从院子小卡迁来):待回访记录 → 问一句 + 三选一回执;回执后转致谢 note */}
          {followupNote ? (
            <div className="mb-2.5 rounded-[18px] bg-surface px-4 py-3 shadow-[var(--shadow-card)]">
              <p className="text-[14px] leading-relaxed text-ink">
                {followupNote.text}
              </p>
              {followupNote.href && (
                <Link
                  href={followupNote.href}
                  className="mt-1.5 inline-block text-[13.5px] font-medium text-accent"
                >
                  {followupNote.label}
                </Link>
              )}
            </div>
          ) : followupTarget ? (
            <div className="mb-2.5 rounded-[18px] bg-surface px-4 py-3 shadow-[var(--shadow-card)]">
              <p className="text-[14px] leading-relaxed text-ink">
                上次「{followupTarget.summary}」之后,{cat.name}好点了吗?
              </p>
              <div className="mt-2.5 flex gap-2">
                {(
                  [
                    ["好多了", "在家好转"],
                    ["已就医", "已就医"],
                    ["还没好", "未跟进"],
                  ] as const
                ).map(([label, oc]) => (
                  <button
                    key={oc}
                    type="button"
                    onClick={() => pickOutcome(followupTarget, oc)}
                    className="flex-1 rounded-full bg-[var(--surface-2)] px-2 py-2 text-[13px] font-medium text-ink shadow-[var(--shadow-control)] transition-transform active:scale-[0.97]"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* 看病 CTA —— 页面级主入口(陶土红渐变 + 内嵌 rgy + 30 秒红黄绿) */}
          <Link
            href="/symptoms"
            aria-label="看病:选症状做分诊,30 秒红黄绿就医建议"
            className="flex items-center justify-between rounded-[20px] px-5 py-4 text-white transition-transform active:scale-[0.99]"
            style={{
              background:
                "linear-gradient(180deg,#bd6258,var(--accent) 42%,var(--accent-deep))",
              boxShadow:
                "0 12px 26px rgba(176,90,80,0.34), inset 0 1px 0 rgba(255,255,255,0.22)",
            }}
          >
            <span className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-[12px] bg-white/[0.16]">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4.8 3v5a4 4 0 0 0 8 0V3" />
                  <path d="M4.8 3h-1M12.8 3h1" />
                  <path d="M8.8 12v3a5 5 0 0 0 10 0v-2" />
                  <circle cx="18.8" cy="11" r="2.2" />
                </svg>
              </span>
              <span className="text-left">
                <span className="block font-serif text-[18px] font-semibold tracking-[0.04em]">
                  猫不对劲?选症状看病
                </span>
                <span className="mt-1 flex items-center gap-1.5 text-[11.5px] opacity-90">
                  <span className="flex items-center gap-1" aria-hidden="true">
                    <i className="size-[7px] rounded-full bg-[var(--red)] shadow-[0_0_0_2px_rgba(255,255,255,0.25)]" />
                    <i className="size-[7px] rounded-full bg-[var(--amber)] shadow-[0_0_0_2px_rgba(255,255,255,0.25)]" />
                    <i className="size-[7px] rounded-full bg-[var(--green)] shadow-[0_0_0_2px_rgba(255,255,255,0.25)]" />
                  </span>
                  30 秒红黄绿就医建议
                </span>
              </span>
            </span>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 opacity-90"
              aria-hidden="true"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </Link>

          {/* 问问哈基米 —— 行为问答入口 */}
          <Link
            href="/behavior"
            aria-label={`问问${cat.name}:喂养 / 习性 / 拿不准的病情都能问`}
            className="mt-2.5 flex items-center gap-3 rounded-[18px] bg-surface px-4 py-3 shadow-[var(--shadow-card)] transition-transform active:scale-[0.99]"
          >
            <span
              className="grid size-9 shrink-0 place-items-center rounded-[12px]"
              style={{ background: "var(--accent-tint)", color: "var(--accent)" }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 5.5h16v10H10l-4 3.2V15.5H4z" />
                <circle cx="9" cy="10.5" r=".4" fill="currentColor" />
                <circle cx="12" cy="10.5" r=".4" fill="currentColor" />
                <circle cx="15" cy="10.5" r=".4" fill="currentColor" />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-semibold tracking-wide text-ink">
                问问{cat.name}
              </span>
              <span className="mt-0.5 block truncate text-[11.5px] text-ink-faint">
                喂养 · 习性 · 拿不准的病情,都能问
              </span>
            </span>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 text-ink-faint"
              aria-hidden="true"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </Link>

          {/* 最近一条 */}
          {records.length > 0 ? (
            <div className="mt-2.5">
              <RecentRow record={records[0]} />
            </div>
          ) : (
            <p className="mt-3 px-1 text-[12.5px] leading-relaxed text-ink-faint">
              还没有记录 —— {cat.name}有情况,选症状看病就行。
            </p>
          )}

          {/* 红线:每屏底部固定免责。反馈入口做成可见小药丸(/feedback 仅此一处入口,勿删致孤立);
              免责行守红线留在最底。 */}
          <div className="mt-2.5 flex flex-col items-center gap-1.5">
            <Link
              href="/feedback"
              className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3.5 py-1.5 text-[12.5px] font-medium tracking-wide text-ink-soft shadow-[var(--shadow-control)] transition-transform active:scale-[0.97]"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 9 9 0 0 1-3.8-.8L3 21l1.9-5.7A8.38 8.38 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z" />
              </svg>
              有话想说?提个意见
            </Link>
            <Disclaimer />
          </div>
        </div>
      </main>
    </>
  );
}
