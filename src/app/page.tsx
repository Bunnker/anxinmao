"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import {
  loadStore,
  saveStore,
  saveStoreLocal,
  seedTemplateStore,
  updateRecordOutcome,
} from "@/lib/storage";
import { pullHistory } from "@/lib/history-sync";
import { readPersisted, writePersisted } from "@/lib/persist";
import { Disclaimer } from "@/components/Disclaimer";
import { CatAvatar } from "@/components/CatAvatar";
import { Welcome } from "@/components/Welcome";
import { Guide } from "@/components/Guide";
import PetSprite, { type PetSpriteState } from "@/components/PetSprite";
import type { Cat, CatRecord, Store } from "@/types/cat";

// 新手教程「看过了」标记 —— 与猫档案分开,首次进入弹一次,首页可重开。
const GUIDE_SEEN_KEY = "catTriage:guideSeen:v1";
const MAX_HOME_PHOTOS = 6;

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

function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CameraIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 8.2A2.2 2.2 0 0 1 6.2 6h2.1l1.4-1.8h4.6L15.7 6h2.1A2.2 2.2 0 0 1 20 8.2v8.1a2.2 2.2 0 0 1-2.2 2.2H6.2A2.2 2.2 0 0 1 4 16.3V8.2Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12.7" r="3.1" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("图片读取失败。"));
    reader.onerror = () => reject(new Error("图片读取失败。"));
    reader.readAsDataURL(file);
  });
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

// 日常护理提醒 —— 只基于用户自己填的日期做保守提示,不替用户定周期。
// 驱虫超 45 天 / 最后一针疫苗超 350 天才出现;没填就不打扰。
function careReminders(cat: Cat): string[] {
  const out: string[] = [];
  const daysSince = (iso: string) => {
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return -1;
    return Math.floor((Date.now() - t) / 86400000);
  };
  if (cat.deworm) {
    const d = daysSince(cat.deworm);
    if (d > 45 && d < 3650) {
      out.push(
        `我上次驱虫已经 ${d} 天啦 —— 体内外驱虫一般 1-3 个月一次,可以帮我安排了`,
      );
    }
  }
  const lastVac = (cat.vaccines ?? [])
    .map((v) => v.date)
    .filter(Boolean)
    .sort()
    .at(-1);
  if (lastVac) {
    const d = daysSince(lastVac);
    if (d > 350 && d < 3650) {
      out.push(
        `我上次打疫苗满 ${Math.floor(d / 30)} 个月了 —— 年度加强可以下次问问医生`,
      );
    }
  }
  return out;
}

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
  "喵~",
  "蹭蹭你!",
  "好舒服,再摸一会儿嘛~",
  "我超乖的。",
  "今天也要记得陪我玩呀。",
  "呼噜呼噜……",
];
// 闲话已并入「思考泡」功能入口区;摸猫时才说猫语(PET_TALK)。

// ── 2.5D 地板:院子有纵深(bottom 0~YARD_DEPTH 的深度带)──
// 猫还用左右跑动画,走斜线时 y 同步变、越靠前越大(伪透视);
// 猫与家具按 bottom 做画家算法排序,猫能绕到窝后面去。
const YARD_DEPTH = 90;
// 家具摆位:bottom = 深度(大=靠后);玩球/喝水动画自带道具,播放时隐藏地面同款
const YARD_ITEMS = {
  bed: { src: "/pet/items/bed.webp", alt: "猫窝", left: 2, bottom: 58, w: 88 },
  box: { src: "/pet/items/box.webp", alt: "纸箱", left: 262, bottom: 52, w: 74 },
  bowl: { src: "/pet/items/bowl.webp", alt: "水碗", left: 132, bottom: 26, w: 44 },
  yarn: { src: "/pet/items/yarn.webp", alt: "毛线球", left: 218, bottom: 8, w: 36 },
} as const;
type ItemKey = keyof typeof YARD_ITEMS;
type InteractKind = "nap" | "play" | "drink" | "box";
// 猫去互动时的站位:猫(84px)中心对物件中心、同深度;
// 钻箱往深处多坐 8px,让前壁遮住更多下半身(「在箱里」的关键)
function itemAnchor(k: ItemKey): { x: number; y: number } {
  const it = YARD_ITEMS[k];
  return {
    x: Math.round(it.left + it.w / 2 - 42),
    y: it.bottom + (k === "box" ? 8 : 0),
  };
}
const INTERACT_ITEM: Record<InteractKind, ItemKey> = {
  nap: "bed",
  play: "yarn",
  drink: "bowl",
  box: "box",
};
// 深度 → 层级 / 透视缩放(越靠前 z 越大、猫越大)
const zOf = (bottom: number) => 100 - Math.round(bottom);
const scaleOf = (y: number) => 0.92 + ((YARD_DEPTH - y) / YARD_DEPTH) * 0.14;
// 走过去再做事:距离近直接做,远了先散步(then 接续)
function walkTo(
  r: { x: number; y: number; facing: "left" | "right" },
  a: { x: number; y: number },
  then: InteractKind,
) {
  const dx = a.x - r.x;
  const dist = Math.hypot(dx, a.y - r.y);
  if (dist <= 24)
    return { kind: then, x: a.x, y: a.y, facing: r.facing, dur: 0 } as const;
  return {
    kind: "stroll" as const,
    x: a.x,
    y: a.y,
    facing: dx >= 0 ? ("right" as const) : ("left" as const),
    dur: Math.round(dist / 0.035),
    then,
  };
}
// 互动完成后的猫语正反馈(Finch 式:行为 → 可爱回报)
const INTERACT_TALK: Record<InteractKind, string[]> = {
  play: ["毛线球最好玩了!", "再来一回合!", "看我猫猫拳!"],
  drink: ["咕咚咕咚……舒服~", "水很新鲜,谢谢铲屎官!"],
  box: ["这个箱子,本喵承包了。", "箱子里好有安全感……"],
  nap: [],
};
// 物件 → 点击它触发的互动
const TARGET_OF: Record<ItemKey, InteractKind> = {
  bed: "nap",
  yarn: "play",
  bowl: "drink",
  box: "box",
};

function PetNudge({
  cat,
  followupTarget,
  followupNote,
  careList,
  recordsEmpty,
  onPick,
}: {
  cat: Cat;
  followupTarget: CatRecord | null;
  followupNote: {
    text: string;
    href?: string;
    label?: string;
    face?: PetFace;
  } | null;
  careList: string[];
  recordsEmpty: boolean;
  onPick: (rec: CatRecord, oc: NonNullable<CatRecord["outcome"]>) => void;
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
  const [roam, setRoam] = useState<{
    kind:
      | "sit"
      | "stroll"
      | "groom"
      | "nap"
      | "wake"
      | "play"
      | "drink"
      | "box";
    x: number;
    // 地板深度(bottom 偏移,0=最前沿,YARD_DEPTH=最里)
    y: number;
    facing: "left" | "right";
    dur: number;
    // wake 时演哪个起床动作(伸懒腰/打哈欠/弓背)
    wake?: PetSpriteState;
    // 散步到达后的下一步(走到窝边再蜷睡 / 走到球边再玩……)
    then?: InteractKind;
  }>({ kind: "sit", x: 4, y: 58, facing: "right", dur: 0 });
  // 减弱动效偏好或页面隐藏时不漫游;藏页瞬间散步中的猫就地坐下,回来不跳位
  const [calm, setCalm] = useState(false);

  useEffect(() => {
    const measure = () => setYardW(yardRef.current?.offsetWidth ?? 343);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
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

  // 互动完成后说一句猫语(复用 talk 泡;不触发摸猫动作重播)
  function sayLine(k: InteractKind) {
    const lines = INTERACT_TALK[k];
    if (!lines.length) return;
    setTalk(lines[Math.floor(Math.random() * lines.length)]);
    if (talkTimer.current) clearTimeout(talkTimer.current);
    talkTimer.current = window.setTimeout(() => {
      setTalk(null);
      setTouch(null);
    }, 3800);
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
        itemAnchor(INTERACT_ITEM[target]),
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

  // 猫常驻:有事说事,没事也蹲在这儿说句闲话(宠物不该有事才出现)
  const say = followupNote
    ? ({ kind: "note" } as const)
    : followupTarget
      ? ({ kind: "followup" } as const)
      : careList.length > 0
        ? ({ kind: "care" } as const)
        : recordsEmpty
          ? ({ kind: "starter" } as const)
          : ({ kind: "idle" } as const);

  // 院子行为调度:坐 12-26s 后掷骰子 —— 50% 散步(约 35px/s 匀速)/
  // 25% 洗脸 / 25% 打盹(9-15s);摸猫说话时暂停,说完从坐姿重新计时
  useEffect(() => {
    if (say.kind !== "idle" || calm || talk) return;
    let t: number;
    // 院子真实宽度同步(场景切进 idle 后 ref 才挂上)
    const live = yardRef.current?.offsetWidth;
    if (live && live !== yardW) setYardW(live);
    if (roam.kind === "sit") {
      t = window.setTimeout(
        () => {
          const w = yardRef.current?.offsetWidth ?? yardW;
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
            if (dist >= 60) {
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
          if (roll < 0.5) {
            setRoam((r) => ({ ...r, kind: "groom", dur: 0 }));
            return;
          }
          const target: InteractKind =
            roll < 0.7
              ? "nap"
              : roll < 0.8
                ? "play"
                : roll < 0.9
                  ? "drink"
                  : "box";
          setRoam((r) => walkTo(r, itemAnchor(INTERACT_ITEM[target]), target));
        },
        12000 + Math.random() * 14000,
      );
    } else if (roam.kind === "stroll") {
      t = window.setTimeout(
        () =>
          setRoam((r) => ({
            ...r,
            kind: r.then ?? "sit",
            then: undefined,
            dur: 0,
          })),
        roam.dur + 80,
      );
    } else if (roam.kind === "groom") {
      t = window.setTimeout(() => setRoam((r) => ({ ...r, kind: "sit" })), 3600);
    } else if (roam.kind === "wake") {
      // 起床动作演一遍(~2.5-2.9s)后定格收尾,再坐回
      t = window.setTimeout(() => setRoam((r) => ({ ...r, kind: "sit" })), 3300);
    } else if (roam.kind === "play" || roam.kind === "drink") {
      // 玩球/喝水:动画播一遍定格回味,完了坐起说句猫语
      const done = roam.kind;
      t = window.setTimeout(() => {
        setRoam((r) => ({ ...r, kind: "sit" }));
        sayLine(done);
      }, 4200);
    } else if (roam.kind === "box") {
      // 钻箱:在箱里蹲 10-15s(箱子前壁遮着,只露上半身)
      t = window.setTimeout(
        () => {
          setRoam((r) => ({ ...r, kind: "sit" }));
          sayLine("box");
        },
        10000 + Math.random() * 5000,
      );
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
  }, [say.kind, calm, talk, roam, yardW]);

  // 动作随场景:摸猫=随机享受/洗脸 / 回执好转=蹦一次、没好转=耷耳 /
  // 待回答=双爪合十期待 / 新人引导=招手(抬爪定格)/ 护理提醒、闲着=idle(自带眨眼呼吸)。
  const spriteState: PetSpriteState = talk
    ? (touch?.action ?? "petted")
    : say.kind === "note"
      ? followupNote?.face === "worry"
        ? "failed"
        : followupNote?.face === "curious"
          ? "review"
          : "jumping"
      : say.kind === "followup"
        ? "waiting"
        : say.kind === "starter"
          ? "waving"
          : "idle";
  // 雪碧图未就绪/加载失败时的静态占位(沿用旧四表情透明图)
  const fallbackFace: PetFace =
    spriteState === "jumping" ||
    spriteState === "waving" ||
    spriteState === "petted" ||
    spriteState === "groom"
      ? "happy"
      : spriteState === "failed"
        ? "worry"
        : spriteState === "waiting" || spriteState === "review"
          ? "curious"
          : "calm";

  const bubbleCls =
    "pet-bubble min-w-0 flex-1 rounded-[22px] rounded-bl-md bg-surface px-4 py-3.5 shadow-[var(--shadow-card)]";

  const catImg = (
    <button
      type="button"
      onClick={petTheCat}
      aria-label={`摸摸${cat.name}`}
      className="pet-enter shrink-0 cursor-pointer select-none"
    >
      {/* 真·逐帧动画:摸猫随机享受/洗脸并每次重播,其余按场景行(雪碧图挂了就回静态图) */}
      <PetSprite
        state={spriteState}
        width={84}
        fallbackSrc={PET_FACE_SRC[fallbackFace]}
        className="drop-shadow-sm"
        playKey={touch?.n}
      />
    </button>
  );

  // ── 院子模式:没事时小猫在整行里生活,气泡跟着猫走 ──
  if (say.kind === "idle") {
    const yardSprite: PetSpriteState = talk
      ? (touch?.action ?? "idle")
      : roam.kind === "stroll"
        ? roam.facing === "right"
          ? "running-right"
          : "running-left"
        : roam.kind === "groom"
          ? "groom"
          : roam.kind === "nap"
            ? "nap"
            : roam.kind === "wake"
              ? (roam.wake ?? "stretch")
              : roam.kind === "play"
                ? "play"
                : roam.kind === "drink"
                  ? "drink"
                  : roam.kind === "box"
                    ? "idle"
                    : "idle";
    // 摸猫说话才冒对话泡;坐着思考时冒「心事泡」(功能入口,跟着猫选边)
    const showBubble = talk !== null;
    // 选剩余空间够的一侧,宽度跟着空间缩,避免压到猫身上
    const rightRoom = yardW - roam.x - 98;
    const bubbleOnRight = rightRoom >= 150;
    const bubbleW = bubbleOnRight
      ? Math.min(240, rightRoom)
      : Math.min(240, Math.max(140, roam.x - 16));
    const bubbleStyle = bubbleOnRight
      ? { left: roam.x + 90, maxWidth: bubbleW }
      : { left: Math.max(8, roam.x - 8 - bubbleW), maxWidth: bubbleW };
    // 心事泡:猫坐下(思考)才冒,散步/洗脸/打盹时收起 —— 入口是猫的行为产物。
    // 猫在左半场泡往右上冒,右半场往左上冒;三个点链从猫头斜向泡群。
    const thinking = roam.kind === "sit" && !talk;
    const toRight = roam.x + 42 < yardW / 2;
    const dotBase = roam.x + (toRight ? 62 : 14);
    // 点链从猫头(随深度抬升)斜向泡群
    const dots = [
      { size: 6, bottom: roam.y + 88, dx: 0 },
      { size: 9, bottom: roam.y + 112, dx: toRight ? 26 : -28 },
      { size: 12, bottom: roam.y + 136, dx: toRight ? 54 : -58 },
    ];
    const THOUGHTS = [
      {
        href: "/symptoms",
        label: "看病",
        aria: "它有点不对劲?选症状做分诊,30 秒红黄绿就医建议",
        cls: "bg-accent text-accent-fg shadow-[var(--shadow-accent)]",
      },
      {
        href: "/behavior",
        label: "聊天",
        aria: "想问点什么?生病、喂养、行为都能聊",
        cls: "bg-surface text-ink shadow-[var(--shadow-card)]",
      },
      {
        href: "/knowledge",
        label: "小知识",
        aria: "看着吓人但不必慌的 6 种情况,权威兽医来源",
        cls: "bg-surface text-ink shadow-[var(--shadow-control)]",
      },
    ];
    return (
      <section
        ref={yardRef}
        className="relative mt-4 h-[264px]"
        aria-label={`${cat.name}的家`}
      >
        {/* 地板家具:点了让猫走过去互动;按深度排层(画家算法),
            钻箱时箱子临时提到猫前面 = 前壁遮住下半身;
            玩球/喝水动画自带道具,进行时把地上同款隐掉防止出现两个 */}
        {(Object.keys(YARD_ITEMS) as ItemKey[]).map((k) => {
          const it = YARD_ITEMS[k];
          const hideForAction =
            (k === "yarn" && roam.kind === "play") ||
            (k === "bowl" && roam.kind === "drink");
          const z =
            k === "box" && roam.kind === "box"
              ? zOf(roam.y) + 1
              : zOf(it.bottom);
          return (
            <button
              key={k}
              type="button"
              onClick={() => goInteract(TARGET_OF[k])}
              aria-label={`让${cat.name}去${it.alt}那儿`}
              className="absolute cursor-pointer select-none p-0"
              style={{
                left: it.left,
                bottom: it.bottom,
                width: it.w,
                zIndex: z,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={it.src}
                alt=""
                draggable={false}
                className={"w-full " + (hideForAction ? "opacity-0" : "")}
              />
            </button>
          );
        })}

        {/* 位移走合成器(transform 独立图层),避免 left+背景换帧+阴影联手留残影;
            呼吸 scale 动画在内层按钮上,跟位移不抢同一个 transform */}
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
            zIndex: zOf(roam.y),
          }}
        >
          <button
            type="button"
            onClick={petTheCat}
            aria-label={`摸摸${cat.name}`}
            className="pet-enter block cursor-pointer select-none"
          >
            <PetSprite
              state={yardSprite}
              width={84}
              fallbackSrc={PET_FACE_SRC[talk ? "happy" : "calm"]}
              className="drop-shadow-sm"
              playKey={touch?.n}
              idleFlourish={false}
            />
          </button>
        </div>

        {thinking && (
          <div key={`th-${Math.round(roam.x)}`}>
            {dots.map((d, i) => (
              <span
                key={i}
                aria-hidden="true"
                className="thought-in absolute rounded-full bg-surface shadow-[var(--shadow-control)]"
                style={{
                  width: d.size,
                  height: d.size,
                  bottom: d.bottom,
                  left: Math.max(4, Math.min(yardW - 16, dotBase + d.dx)),
                  animationDelay: `${i * 0.09}s, ${0.7 + i * 0.35}s`,
                }}
              />
            ))}
            <nav
              className={
                "absolute top-0 flex flex-col gap-2 " +
                (toRight ? "right-1 items-end" : "left-1 items-start")
              }
              aria-label="功能入口"
            >
              {THOUGHTS.map((t, i) => (
                <Link
                  key={t.href}
                  href={t.href}
                  aria-label={t.aria}
                  className={
                    "thought-in px-7 py-2.5 text-[15.5px] font-medium tracking-wide transition-transform duration-300 active:scale-[0.94] " +
                    t.cls +
                    (i === 1 ? (toRight ? " mr-5" : " ml-5") : "") +
                    (i === 2 ? (toRight ? " mr-2" : " ml-2") : "")
                  }
                  style={{
                    borderRadius: "50%",
                    animationDelay: `${0.28 + i * 0.13}s, ${1 + i * 0.45}s`,
                  }}
                >
                  {t.label}
                </Link>
              ))}
            </nav>
          </div>
        )}

        {showBubble && (
          <div
            className={
              "pet-bubble absolute rounded-[22px] bg-surface px-4 py-3 shadow-[var(--shadow-card)] " +
              (bubbleOnRight ? "rounded-bl-md" : "rounded-br-md")
            }
            style={{ ...bubbleStyle, bottom: roam.y + 4, zIndex: 200 }}
          >
            <p className="text-[14px] leading-relaxed text-ink">{talk}</p>
          </div>
        )}
      </section>
    );
  }

  // 摸猫时:猫语气泡盖过一切
  if (talk) {
    return (
      <section
        className="mt-5 flex items-end gap-2"
        aria-label={`${cat.name}的提醒`}
      >
        {catImg}
        <div className={bubbleCls}>
          <p className="text-[14px] leading-relaxed text-ink">{talk}</p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="mt-5 flex items-end gap-2"
      aria-label={`${cat.name}的提醒`}
    >
      {catImg}

      {say.kind === "starter" ? (
        <Link
          href="/symptoms"
          className={bubbleCls + " block transition-transform active:scale-[0.985]"}
        >
          <p className="text-[14px] leading-relaxed text-ink">
            带我去试一次分诊吧!选个最像的情况、答几个小问题,30
            秒看到红黄绿报告。现在没事,拿「打喷嚏」练手也行 →
          </p>
        </Link>
      ) : (
        <div className={bubbleCls}>
          {say.kind === "note" && followupNote && (
            <>
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
            </>
          )}

          {say.kind === "followup" && followupTarget && (
            <>
              <p className="text-[14px] leading-relaxed text-ink">
                上次「{followupTarget.summary}」之后,我看起来好点了吗?
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
                    onClick={() => onPick(followupTarget, oc)}
                    className="flex-1 rounded-full bg-[var(--surface-2)] px-2 py-2 text-[13px] font-medium text-ink shadow-[var(--shadow-control)] transition-transform active:scale-[0.97]"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}

          {say.kind === "care" && (
            <div className="flex flex-col gap-1.5">
              {careList.slice(0, 2).map((t) => (
                <p key={t} className="text-[13.5px] leading-relaxed text-ink">
                  {t}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// 记录 → 可点回的目标:
// - 分诊 → 重开当时那张报告卡(确定性,只靠 tier/symptom/claims 重建)。
//   老记录没存 symptomKey 则不可点(优雅降级)。
// - 问答 → 回到那次聊天 /behavior?c=<id> 还原对话。
function recordHref(record: CatRecord): string | null {
  if (record.kind === "triage") {
    if (!record.symptomKey || !record.tier) return null;
    const params = new URLSearchParams({
      tier: record.tier,
      symptom: record.symptomKey,
    });
    if (record.claimIds && record.claimIds.length > 0) {
      params.set("claims", record.claimIds.join(","));
    }
    return `/report?${params.toString()}`;
  }
  if (record.kind === "behavior") {
    return `/behavior?c=${encodeURIComponent(record.id)}`;
  }
  return null;
}

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

  function persistCat(nextCat: Cat) {
    if (!store) return;
    const nextStore: Store = {
      ...store,
      cats: store.cats.map((c) => (c.id === nextCat.id ? nextCat : c)),
    };
    saveStore(nextStore);
    setStore(nextStore);
    setCat(nextCat);
  }

  async function onAlbumPick(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0 || !cat) return;
    const usable = files
      .filter((file) => file.size <= 5 * 1024 * 1024)
      .slice(0, MAX_HOME_PHOTOS);
    const dataUrls = await Promise.all(usable.map(fileToDataUrl));
    persistCat({
      ...cat,
      photos: [...(cat.photos ?? []), ...dataUrls].slice(0, MAX_HOME_PHOTOS),
    });
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

  const meta = [ageLabel(cat.ageMonths), cat.sex, cat.coat, `${cat.weight} kg`]
    .filter(Boolean)
    .join(" · ");
  const vaccines = cat.vaccines?.length ?? 0;
  const photos = cat.photos ?? [];

  return (
    <>
      {guide}
      <main
        className="relative mx-auto flex min-h-dvh max-w-[430px] flex-col px-6 pb-24"
        style={{
          background: "var(--gradient-page)",
          paddingTop: "calc(1.25rem + env(safe-area-inset-top, 0px))",
        }}
      >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-56"
        style={{
          background:
            "radial-gradient(ellipse 85% 60% at 50% 0%, rgba(176,90,80,0.11) 0%, transparent 100%)",
        }}
        aria-hidden="true"
      />
      {/* 顶栏 */}
      <header className="flex items-center gap-2.5 py-2">
        <span className="text-[11px] font-semibold tracking-[0.16em] text-ink-faint">
          {greeting()}
        </span>
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium tracking-[0.06em]"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
        >
          使用说明
        </button>
      </header>

      {/* 宠物画像 */}
      <section className="pt-7">
        <div className="relative overflow-hidden rounded-[34px] bg-surface p-5 shadow-[var(--shadow-card)]">
          <div className="absolute -right-10 -top-12 size-36 rounded-full bg-[var(--accent-soft)]" />
          <div className="relative flex items-start gap-4">
            <div className="shrink-0">
              <CatAvatar
                avatar={cat.avatar}
                name={cat.name}
                size={92}
                className="shadow-[var(--shadow-control)]"
              />
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <p className="text-[12px] font-semibold tracking-[0.16em] text-accent">
                {greeting()}
              </p>
              <h1 className="mt-2 text-[2.25rem] font-semibold leading-none tracking-tight text-ink">
                {cat.name}
              </h1>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{meta}</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <span className="rounded-[22px] bg-[var(--surface-2)] px-3 py-2.5">
                  <span className="block text-[11px] text-ink-faint">疫苗</span>
                  <span className="mt-0.5 block text-[14px] font-semibold tabular-nums text-ink">
                    {vaccines ? `${vaccines} 针` : "未记"}
                  </span>
                </span>
                <span className="rounded-[22px] bg-[var(--surface-2)] px-3 py-2.5">
                  <span className="block text-[11px] text-ink-faint">绝育</span>
                  <span className="mt-0.5 block text-[14px] font-semibold text-ink">
                    {cat.neutered}
                  </span>
                </span>
                <span className="rounded-[22px] bg-[var(--surface-2)] px-3 py-2.5">
                  <span className="block text-[11px] text-ink-faint">相册</span>
                  <span className="mt-0.5 block text-[14px] font-semibold tabular-nums text-ink">
                    {photos.length}/6
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="relative mt-5 flex items-center justify-between rounded-[24px] bg-white/65 px-4 py-3 shadow-[var(--shadow-control)]">
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-ink">
                {photos.length ? `已保存 ${photos.length} 张生活照` : "还没有生活照"}
              </span>
              <span className="mt-0.5 block text-[12px] text-ink-faint">
                详细相册在「我的」档案里管理
              </span>
            </span>
            <label className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full bg-[var(--surface-2)] text-accent shadow-[var(--shadow-control)]">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={onAlbumPick}
                className="hidden"
              />
              <CameraIcon />
            </label>
          </div>

        </div>
      </section>

      {/* 小猫陪伴提醒 —— 跟进 / 驱虫疫苗 / 新手引导,统一从它的气泡说出来 */}
      <PetNudge
        cat={cat}
        followupTarget={followupTarget}
        followupNote={followupNote}
        careList={careReminders(cat)}
        recordsEmpty={records.length === 0}
        onPick={pickOutcome}
      />

      {/* 功能入口已变成小猫的「心事泡」,长在上面的院子里(坐下思考时冒出);
          底部 Tab 的分诊/问答仍是常驻兜底。 */}

      {/* 最近 */}
      <section className="mt-6 flex-1">
        <p className="text-[11px] font-semibold tracking-[0.22em] text-ink-faint">
          最近
        </p>
        {records.length === 0 ? (
          <p className="mt-3 text-[13px] leading-relaxed text-ink-faint">
            还没有记录 —— {cat.name}有情况,点上面就行。
          </p>
        ) : (
          <div className="mt-1">
            {records.slice(0, 6).map((r) => (
              <RecentRow key={r.id} record={r} />
            ))}
          </div>
        )}
      </section>

      <Link
        href="/feedback"
        className="mt-7 inline-flex items-center justify-center gap-2 self-center rounded-full bg-surface px-5 py-2.5 text-[13px] font-medium tracking-wide text-ink-soft shadow-[var(--shadow-control)] transition-transform duration-500 active:scale-[0.985]"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="text-accent"
        >
          <path
            d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 9 9 0 0 1-3.8-.8L3 21l1.9-5.7A8.38 8.38 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        有话想说?给我提个意见
      </Link>

      <Disclaimer />
      </main>
    </>
  );
}
