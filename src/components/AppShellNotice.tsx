"use client";

// App 壳首启一次性提示:本次大版本升级会重置本地数据(PRD §4.5 如实告知)。
// 仅在 App 壳(Capacitor)显示;用 localStorage 标记只弹一次。Web 站不挂。
import { useEffect, useState } from "react";
import { readPersisted, writePersisted } from "@/lib/persist";

const SEEN_KEY = "appShellNotice:v1:seen";

export function AppShellNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (readPersisted(SEEN_KEY) === "1") return;
    setShow(true);
  }, []);

  if (!show) return null;

  function dismiss() {
    writePersisted(SEEN_KEY, "1");
    setShow(false);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="升级提示"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "rgba(26,26,24,0.45)",
      }}
    >
      <div
        style={{
          background: "var(--surface, #fff)",
          color: "var(--ink, #1a1a18)",
          borderRadius: 20,
          padding: "24px 22px",
          maxWidth: 320,
          boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>升级到新版 App</h2>
        <p style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.85 }}>
          这次是大版本升级,App 改用了本地存储,<strong>之前的猫咪档案和历史记录不会带过来</strong>,
          需要重新建档。给你添麻烦了 🙏
        </p>
        <button
          onClick={dismiss}
          style={{
            marginTop: 18,
            width: "100%",
            padding: "12px 0",
            borderRadius: 12,
            border: "none",
            background: "var(--accent, #b05a50)",
            color: "#fff",
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          知道了,开始建档
        </button>
      </div>
    </div>
  );
}
