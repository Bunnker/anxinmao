"use client";

import { useEffect, useState } from "react";

// 吉祥物雪碧图渲染器 —— 资产由 hatch-pet 管线孵化:
// 8 列 × 11 行图集(1536×2288,单格 192×208,透明底),每行一个状态。
// 前 9 行沿用 Codex 桌宠合同(行序与基础时长同官方表),后 2 行是本产品
// 专属动作(petted 被摸享受 / groom 洗脸)。
// 播放模式:loop 循环;hold 播一遍后定格(招手抬爪不放下、跳一次就好,
// 避免无限快循环的忙乱感)。reduced-motion 静止第 1 帧;切后台暂停;
// 图集未就绪/加载失败回退静态 PNG。
export type PetSpriteState =
  | "idle"
  | "running-right"
  | "running-left"
  | "waving"
  | "jumping"
  | "failed"
  | "waiting"
  | "working"
  | "review"
  | "petted"
  | "groom";

const SHEET_SRC = "/pet/spritesheet.webp";
const SHEET_COLS = 8;
const SHEET_ROWS = 11;
const CELL_W = 192;
const CELL_H = 208;

type RowConfig = {
  row: number;
  durations: number[];
  mode: "loop" | "hold";
  /** hold 模式定格的帧号,缺省 = 最后一帧 */
  holdFrame?: number;
};

// working 对应图集合同里的 "running" 行(专注处理,非跑步)。
const ROWS: Record<PetSpriteState, RowConfig> = {
  idle: { row: 0, durations: [280, 110, 110, 140, 140, 320], mode: "loop" },
  "running-right": {
    row: 1,
    durations: [120, 120, 120, 120, 120, 120, 120, 220],
    mode: "loop",
  },
  "running-left": {
    row: 2,
    durations: [120, 120, 120, 120, 120, 120, 120, 220],
    mode: "loop",
  },
  // 招手:抬到最高那帧就定格,不再放下(循环挥个不停反而忙乱)
  waving: { row: 3, durations: [260, 260, 260, 280], mode: "hold", holdFrame: 2 },
  // 跳跃:庆祝跳一次,落定收尾
  jumping: { row: 4, durations: [140, 140, 140, 140, 280], mode: "hold" },
  // 低落:演一遍情绪后安静趴着,不反复垂头
  failed: {
    row: 5,
    durations: [180, 180, 180, 180, 180, 180, 180, 240],
    mode: "hold",
  },
  waiting: { row: 6, durations: [150, 150, 150, 150, 150, 260], mode: "loop" },
  working: { row: 7, durations: [120, 120, 120, 120, 120, 220], mode: "loop" },
  review: { row: 8, durations: [150, 150, 150, 150, 150, 280], mode: "loop" },
  // 被摸享受:慢慢眯眼蹭过去,停在满足的表情上 —— 真猫节奏,每个姿势细品
  petted: {
    row: 9,
    durations: [380, 420, 480, 520, 560, 700],
    mode: "hold",
  },
  // 洗脸:舔爪 → 抹头 → 挠耳后 → 坐好 —— 慢悠悠的,像真猫洗脸不赶时间
  groom: { row: 10, durations: [400, 480, 520, 560, 520, 600], mode: "hold" },
};

// idle 时偶发的自理小动作(下限/随机区间,毫秒)
const FLOURISH_MIN_DELAY = 18000;
const FLOURISH_JITTER = 17000;
const FLOURISH_REST = 900;

// 图集只预载一次,模块级缓存结果(true=可用 / false=失败)。
let sheetStatus: boolean | null = null;
const sheetWaiters: Array<(ok: boolean) => void> = [];
function preloadSheet(cb: (ok: boolean) => void) {
  if (sheetStatus !== null) {
    cb(sheetStatus);
    return;
  }
  sheetWaiters.push(cb);
  if (sheetWaiters.length > 1) return;
  const img = new Image();
  img.onload = () => {
    sheetStatus = true;
    sheetWaiters.splice(0).forEach((w) => w(true));
  };
  img.onerror = () => {
    sheetStatus = false;
    sheetWaiters.splice(0).forEach((w) => w(false));
  };
  img.src = SHEET_SRC;
}

export default function PetSprite({
  state,
  width = 86,
  fallbackSrc,
  className,
  playKey,
}: {
  state: PetSpriteState;
  width?: number;
  /** 图集未就绪/加载失败时显示的静态形象 */
  fallbackSrc?: string;
  className?: string;
  /** 变化时从头重播当前状态(连续摸猫每次都有反应) */
  playKey?: number | string;
}) {
  const height = (width * CELL_H) / CELL_W;
  const [frame, setFrame] = useState(0);
  const [ready, setReady] = useState(sheetStatus === true);
  const [still, setStill] = useState(false);
  const [paused, setPaused] = useState(false);
  // idle 时小猫偶尔自己洗个脸 —— 活物不会一动不动
  const [flourish, setFlourish] = useState<PetSpriteState | null>(null);

  const shown: PetSpriteState = flourish ?? state;

  useEffect(() => {
    let alive = true;
    preloadSheet((ok) => {
      if (alive) setReady(ok);
    });
    return () => {
      alive = false;
    };
  }, []);

  // 偏好减弱动效 → 静止;切后台 → 暂停步进(省电)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyMq = () => setStill(mq.matches);
    const applyVis = () => setPaused(document.hidden);
    applyMq();
    applyVis();
    mq.addEventListener("change", applyMq);
    document.addEventListener("visibilitychange", applyVis);
    return () => {
      mq.removeEventListener("change", applyMq);
      document.removeEventListener("visibilitychange", applyVis);
    };
  }, []);

  // 场景或重播信号变化时,放下手头的小动作,有正事说事
  useEffect(() => {
    setFlourish(null);
  }, [state, playKey]);

  // 闲着时随机安排一次洗脸
  useEffect(() => {
    if (state !== "idle" || flourish || !ready || still || paused) return;
    const t = window.setTimeout(
      () => setFlourish("groom"),
      FLOURISH_MIN_DELAY + Math.random() * FLOURISH_JITTER,
    );
    return () => clearTimeout(t);
  }, [state, flourish, ready, still, paused]);

  // 逐帧步进:loop 循环 / hold 播到定格帧停;状态切换从第 0 帧重来
  useEffect(() => {
    setFrame(0);
    if (!ready || still || paused) return;
    const cfg = ROWS[shown];
    const end =
      cfg.mode === "hold" ? (cfg.holdFrame ?? cfg.durations.length - 1) : -1;
    let i = 0;
    let timer: number;
    const step = () => {
      if (end >= 0 && i >= end) {
        // 定格;自理小动作歇一拍后回到 idle
        if (flourish) {
          timer = window.setTimeout(() => setFlourish(null), FLOURISH_REST);
        }
        return;
      }
      timer = window.setTimeout(() => {
        i = end >= 0 ? i + 1 : (i + 1) % cfg.durations.length;
        setFrame(i);
        step();
      }, cfg.durations[i]);
    };
    step();
    return () => clearTimeout(timer);
  }, [shown, ready, still, paused, playKey, flourish]);

  if (!ready) {
    if (!fallbackSrc) {
      return <span style={{ width, height }} className={className} />;
    }
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={fallbackSrc}
        alt=""
        width={width}
        height={Math.round(height)}
        draggable={false}
        className={className}
        style={{ width, height, objectFit: "contain" }}
      />
    );
  }

  const row = ROWS[shown].row;
  return (
    <span
      aria-hidden="true"
      className={"block " + (className ?? "")}
      style={{
        width,
        height,
        backgroundImage: `url(${SHEET_SRC})`,
        backgroundSize: `${SHEET_COLS * width}px ${SHEET_ROWS * height}px`,
        backgroundPosition: `${-frame * width}px ${-row * height}px`,
        backgroundRepeat: "no-repeat",
      }}
    />
  );
}
