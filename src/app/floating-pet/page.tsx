"use client";

// 悬浮桌宠 WebView 页 —— 复用主角雪碧图渲染器 PetSprite。
// 原生通过 evaluateJavascript 调用挂在 window 上的钩子:
//   window.__fpGait(state)       切动作(idle / running-left / running-right / groom / nap / stretch)
//   window.__fpReact()           被点:卖萌挥手一下
//   window.__fpConverged(bool)   红黄收敛:停卖萌、安静趴下
import { useEffect, useRef, useState } from "react";
import PetSprite, { type PetSpriteState } from "@/components/PetSprite";

declare global {
  interface Window {
    __fpGait?: (s: string) => void;
    __fpReact?: () => void;
    __fpConverged?: (c: boolean) => void;
  }
}

const ALLOWED: ReadonlySet<string> = new Set<PetSpriteState>([
  "idle", "running-left", "running-right", "groom", "nap", "stretch", "yawn", "waving",
]);

export default function FloatingPetPage() {
  const [gait, setGait] = useState<PetSpriteState>("idle");
  const [converged, setConverged] = useState(false);
  const [playKey, setPlayKey] = useState(0);
  const convergedRef = useRef(false);

  // 透明化:这页要浮在桌面,html/body 不能带 App 的暖白底。
  useEffect(() => {
    const html = document.documentElement;
    const prevHtml = html.style.background;
    const prevBody = document.body.style.background;
    html.style.background = "transparent";
    document.body.style.background = "transparent";
    return () => {
      html.style.background = prevHtml;
      document.body.style.background = prevBody;
    };
  }, []);

  // 挂载原生钩子。
  useEffect(() => {
    window.__fpGait = (s: string) => {
      if (convergedRef.current) return; // 收敛时无视卖萌步态
      if (ALLOWED.has(s)) setGait(s as PetSpriteState);
    };
    window.__fpReact = () => {
      if (convergedRef.current) return;
      setGait("waving");
      setPlayKey((k) => k + 1);
    };
    window.__fpConverged = (c: boolean) => {
      convergedRef.current = c;
      setConverged(c);
      setGait(c ? "nap" : "idle");
    };
    return () => {
      window.__fpGait = undefined;
      window.__fpReact = undefined;
      window.__fpConverged = undefined;
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        margin: 0,
        background: "transparent",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <PetSprite
        state={gait}
        width={96}
        playKey={playKey}
        idleFlourish={!converged}
        fallbackSrc="/pet/welcome-hero.webp"
      />
    </div>
  );
}
