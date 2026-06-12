"use client";

import { useEffect, useState } from "react";

// 吉祥物雪碧图渲染器 —— 资产与 Codex 桌宠同合同:
// 8 列 × 9 行图集(1536×1872,单格 192×208,透明底),每行一个状态,
// 逐帧时长沿用 Codex 官方表(非匀速,所以看着活)。
// 渲染 = background-position 逐帧步进;图集没到位前用静态 PNG 占位,
// 加载失败就一直用静态图(优雅降级)。reduced-motion 静止在当前状态第 1 帧。
export type PetSpriteState =
  | "idle"
  | "running-right"
  | "running-left"
  | "waving"
  | "jumping"
  | "failed"
  | "waiting"
  | "working"
  | "review";

const SHEET_SRC = "/pet/spritesheet.webp";
const SHEET_COLS = 8;
const SHEET_ROWS = 9;
const CELL_W = 192;
const CELL_H = 208;

// working 对应图集合同里的 "running" 行(专注处理,非跑步)。
const ROWS: Record<PetSpriteState, { row: number; durations: number[] }> = {
  idle: { row: 0, durations: [280, 110, 110, 140, 140, 320] },
  "running-right": {
    row: 1,
    durations: [120, 120, 120, 120, 120, 120, 120, 220],
  },
  "running-left": {
    row: 2,
    durations: [120, 120, 120, 120, 120, 120, 120, 220],
  },
  waving: { row: 3, durations: [140, 140, 140, 280] },
  jumping: { row: 4, durations: [140, 140, 140, 140, 280] },
  failed: { row: 5, durations: [140, 140, 140, 140, 140, 140, 140, 240] },
  waiting: { row: 6, durations: [150, 150, 150, 150, 150, 260] },
  working: { row: 7, durations: [120, 120, 120, 120, 120, 220] },
  review: { row: 8, durations: [150, 150, 150, 150, 150, 280] },
};

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
}: {
  state: PetSpriteState;
  width?: number;
  /** 图集未就绪/加载失败时显示的静态形象 */
  fallbackSrc?: string;
  className?: string;
}) {
  const height = (width * CELL_H) / CELL_W;
  const [frame, setFrame] = useState(0);
  const [ready, setReady] = useState(sheetStatus === true);
  const [still, setStill] = useState(false);
  const [paused, setPaused] = useState(false);

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

  // 逐帧步进:状态切换从第 0 帧重来,按每帧时长链式调度
  useEffect(() => {
    setFrame(0);
    if (!ready || still || paused) return;
    const { durations } = ROWS[state];
    let i = 0;
    let timer: number;
    const tick = () => {
      timer = window.setTimeout(() => {
        i = (i + 1) % durations.length;
        setFrame(i);
        tick();
      }, durations[i]);
    };
    tick();
    return () => clearTimeout(timer);
  }, [state, ready, still, paused]);

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

  const row = ROWS[state].row;
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
