"use client";

// 报告页的"我知道了"——红/黄档专用,点了即解除桌宠收敛(PRD §5.10 的显式确认路径)。
// 绿档不渲染。
import type { RiskTier } from "@/types/cat";
import { clearRiskFlag } from "@/lib/risk-flag";
import { useState } from "react";

export function RiskAcknowledge({ tier }: { tier: RiskTier }) {
  const [done, setDone] = useState(false);
  if (tier !== "red" && tier !== "yellow") return null;
  if (done) return null;
  return (
    <button
      type="button"
      onClick={() => {
        clearRiskFlag();
        setDone(true);
      }}
      style={{
        display: "block",
        width: "100%",
        marginTop: 12,
        padding: "12px 0",
        borderRadius: 12,
        border: "1px solid var(--line, #e6e3dd)",
        background: "var(--surface, #fff)",
        color: "var(--ink, #1a1a18)",
        fontSize: 14,
        fontWeight: 600,
      }}
    >
      我知道了,会尽快处理
    </button>
  );
}
