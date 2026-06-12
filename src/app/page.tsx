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
  // 读猫当前实际横位(散步动画进行中是 transform 矩阵里的 tx)
  function readCatX(fallback: number): number {
    const el = catRef.current;
    if (!el) return fallback;
    const t = getComputedStyle(el).transform;
    if (!t || t === "none") return fallback;
    const m = t.match(/matrix\(([^)]+)\)/);
    if (!m) return fallback;
    const tx = parseFloat(m[1].split(",")[4]);
    return Number.isFinite(tx) ? tx : fallback;
  }
  const [yardW, setYardW] = useState(343);
  const [roam, setRoam] = useState<{
    kind: "sit" | "stroll" | "groom" | "nap" | "wake";
    x: number;
    facing: "left" | "right";
    dur: number;
    // wake 时演哪个起床动作(伸懒腰/打哈欠/弓背)
    wake?: PetSpriteState;
  }>({ kind: "sit", x: 0, facing: "right", dur: 0 });
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
        setRoam((r) =>
          r.kind === "stroll"
            ? {
                kind: "sit",
                x: Math.round(readCatX(r.x)),
                facing: r.facing,
                dur: 0,
              }
            : r,
        );
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

  function petTheCat() {
    // 散步途中被摸:就地停下再回应
    setRoam((r) =>
      r.kind === "stroll"
        ? {
            kind: "sit",
            x: Math.round(readCatX(r.x)),
            facing: r.facing,
            dur: 0,
          }
        : { ...r, kind: "sit", dur: 0 },
    );
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
          if (roll < 0.5 && maxX > 120) {
            const target = Math.round(Math.random() * maxX);
            const dx = target - roam.x;
            if (Math.abs(dx) >= 60) {
              setRoam({
                kind: "stroll",
                x: target,
                facing: dx > 0 ? "right" : "left",
                dur: Math.round(Math.abs(dx) / 0.035),
              });
              return;
            }
          }
          setRoam((r) => ({ ...r, kind: roll < 0.75 ? "groom" : "nap", dur: 0 }));
        },
        12000 + Math.random() * 14000,
      );
    } else if (roam.kind === "stroll") {
      t = window.setTimeout(
        () => setRoam((r) => ({ ...r, kind: "sit", dur: 0 })),
        roam.dur + 80,
      );
    } else if (roam.kind === "groom") {
      t = window.setTimeout(() => setRoam((r) => ({ ...r, kind: "sit" })), 3600);
    } else if (roam.kind === "wake") {
      // 起床动作演一遍(~2.5-2.9s)后定格收尾,再坐回
      t = window.setTimeout(() => setRoam((r) => ({ ...r, kind: "sit" })), 3300);
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
      ? (touch?.action ?? "petted")
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
              : "idle";
    // 摸猫说话才冒对话泡;平时的「心事」由下方思考泡(功能入口)承担
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
    return (
      <section
        ref={yardRef}
        className="relative mt-5 h-[104px]"
        aria-label={`${cat.name}的提醒`}
      >
        {/* 位移走合成器(transform 独立图层),避免 left+背景换帧+阴影联手留残影;
            呼吸 scale 动画在内层按钮上,跟位移不抢同一个 transform */}
        <div
          ref={catRef}
          className="absolute bottom-0 left-0"
          style={{
            transform: `translateX(${roam.x}px)`,
            transition:
              roam.kind === "stroll"
                ? `transform ${roam.dur}ms linear`
                : "none",
            willChange: roam.kind === "stroll" ? "transform" : undefined,
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
        {showBubble && (
          <div
            className={
              "pet-bubble absolute bottom-1.5 rounded-[22px] bg-surface px-4 py-3 shadow-[var(--shadow-card)] " +
              (bubbleOnRight ? "rounded-bl-md" : "rounded-br-md")
            }
            style={bubbleStyle}
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

      {/* 小猫的思考泡 —— 真·漫画椭圆泡:不占满宽、右侧错落漂浮,从猫的方向
          经两个引导点斜着冒上来;整泡可点,猫第一人称。分诊泡保持 accent 锚点。 */}
      <section className="relative mt-1 flex flex-col gap-3 pb-1" aria-label="功能入口">
        <div className="flex items-center gap-2.5 pl-10" aria-hidden="true">
          <span className="thought-float size-[8px] rounded-full bg-surface shadow-[var(--shadow-control)]" />
          <span
            className="thought-float size-[14px] rounded-full bg-surface shadow-[var(--shadow-control)]"
            style={{ animationDelay: "0.5s" }}
          />
        </div>

        <Link
          href="/symptoms"
          className="thought-pop thought-float self-end px-9 py-4 text-center bg-accent text-accent-fg shadow-[var(--shadow-accent)] transition-transform duration-500 active:scale-[0.97]"
          style={{ borderRadius: "50%", animationDelay: "0.05s, 0s" }}
        >
          <span className="block text-[1.08rem] font-medium leading-tight tracking-tight">
            我有点不对劲,帮我看看?
          </span>
          <span className="mt-0.5 block text-[11.5px] tracking-wide opacity-80">
            红黄绿就医建议 · 30 秒
          </span>
        </Link>

        <Link
          href="/behavior"
          className="thought-pop thought-float self-end mr-10 px-9 py-3.5 text-center bg-surface text-ink shadow-[var(--shadow-card)] transition-transform duration-500 active:scale-[0.97]"
          style={{ borderRadius: "50%", animationDelay: "0.18s, 0.9s" }}
        >
          <span className="block text-[1rem] font-medium leading-tight tracking-tight">
            想问我点什么?
          </span>
          <span className="mt-0.5 block text-[11.5px] tracking-wide text-ink-soft">
            生病 / 喂养 / 行为都能聊
          </span>
        </Link>

        <Link
          href="/knowledge"
          className="thought-pop thought-float self-end mr-4 px-8 py-3 text-center bg-surface text-ink shadow-[var(--shadow-control)] transition-transform duration-500 active:scale-[0.97]"
          style={{ borderRadius: "50%", animationDelay: "0.3s, 1.7s" }}
        >
          <span className="block text-[13.5px] font-medium leading-tight">
            看着吓人的情况,其实不慌
          </span>
          <span className="mt-0.5 block text-[11px] text-ink-soft">
            6 种 · 权威兽医来源
          </span>
        </Link>
      </section>

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
