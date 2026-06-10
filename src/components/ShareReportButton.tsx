"use client";

// 报告分享卡 —— 把红黄绿结论画成一张可保存的图片(canvas 手绘,零依赖),
// 用来发群里问朋友 / 给家人看。红线:图上必须带「AI 整理 · 不能替代兽医」。
// 导出顺序:navigator.share(移动端存相册/转发最顺)→ a[download] → 新窗口长按保存。
import { useState } from "react";
import type { RiskTier } from "@/types/cat";

const TIER_COLOR: Record<RiskTier, { main: string; soft: string }> = {
  red: { main: "#d92d20", soft: "#fbe9e7" },
  yellow: { main: "#b97900", soft: "#f7efdc" },
  green: { main: "#238146", soft: "#e7f1ea" },
};

type Props = {
  tier: RiskTier;
  badge: string;
  headline: string;
  lead: string;
  escalateTitle: string;
  escalateItems: string[];
};

// 中文按字符折行(无空格语言,逐字测量)。
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else {
      line += ch;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawCard(props: Props): HTMLCanvasElement {
  const W = 750;
  const P = 56; // 左右留白
  const CW = W - P * 2;
  const c = TIER_COLOR[props.tier];

  const SANS = '"PingFang SC", "Hiragino Sans GB", system-ui, sans-serif';
  const SERIF = '"Songti SC", "STSong", "Noto Serif SC", serif';

  // 先用临时画布测量布局,算出总高再正式绘制。
  const probe = document.createElement("canvas");
  const pctx = probe.getContext("2d")!;

  pctx.font = `600 40px ${SERIF}`;
  const headlineLines = wrapText(pctx, props.headline, CW);
  pctx.font = `28px ${SANS}`;
  const leadLines = wrapText(pctx, props.lead, CW);
  const itemLines = props.escalateItems
    .slice(0, 5)
    .map((it) => wrapText(pctx, it, CW - 36));

  let h = 0;
  h += 96; // 顶部品牌行
  h += 64; // badge pill
  h += headlineLines.length * 56 + 24;
  h += leadLines.length * 44 + 36;
  h += 56; // 升级标题
  for (const ls of itemLines) h += ls.length * 42 + 14;
  h += 36 + 92; // 分隔 + 底部免责

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // 背景
  ctx.fillStyle = "#f7f6f3";
  ctx.fillRect(0, 0, W, h);

  let y = 64;
  // 品牌行:圆点 + 名字
  ctx.fillStyle = c.main;
  ctx.beginPath();
  ctx.arc(P + 8, y - 8, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8a8782";
  ctx.font = `600 26px ${SANS}`;
  ctx.fillText("小猫怎么了 · 安心报告", P + 30, y);
  y += 56;

  // badge pill
  ctx.font = `600 28px ${SANS}`;
  const bw = ctx.measureText(props.badge).width + 48;
  ctx.fillStyle = c.soft;
  ctx.beginPath();
  ctx.roundRect(P, y - 36, bw, 56, 28);
  ctx.fill();
  ctx.fillStyle = c.main;
  ctx.fillText(props.badge, P + 24, y + 3);
  y += 84;

  // headline(衬线大标题)
  ctx.fillStyle = "#1a1a18";
  ctx.font = `600 40px ${SERIF}`;
  for (const ln of headlineLines) {
    ctx.fillText(ln, P, y);
    y += 56;
  }
  y += 8;

  // lead
  ctx.fillStyle = "#6f6c66";
  ctx.font = `28px ${SANS}`;
  for (const ln of leadLines) {
    ctx.fillText(ln, P, y);
    y += 44;
  }
  y += 28;

  // 升级清单标题
  ctx.fillStyle = props.tier === "green" ? "#1a1a18" : c.main;
  ctx.font = `600 28px ${SANS}`;
  ctx.fillText(props.escalateTitle, P, y);
  y += 48;

  // 条目
  ctx.font = `28px ${SANS}`;
  for (const ls of itemLines) {
    ctx.fillStyle = props.tier === "green" ? "#8a8782" : c.main;
    ctx.beginPath();
    ctx.arc(P + 8, y - 9, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a1a18";
    ls.forEach((ln, i) => {
      ctx.fillText(ln, P + 36, y + i * 42);
    });
    y += ls.length * 42 + 14;
  }

  // 底部免责
  y += 16;
  ctx.strokeStyle = "#e3e0da";
  ctx.beginPath();
  ctx.moveTo(P, y);
  ctx.lineTo(W - P, y);
  ctx.stroke();
  y += 48;
  ctx.fillStyle = "#8a8782";
  ctx.font = `22px ${SANS}`;
  ctx.textAlign = "center";
  ctx.fillText("AI 整理 · 不能替代兽医 —— whatsupkitty.cn", W / 2, y);
  ctx.textAlign = "left";

  return canvas;
}

export function ShareReportButton(props: Props) {
  const [busy, setBusy] = useState(false);
  // 兜底预览层:微信 / 部分手机浏览器既不支持系统分享也不支持下载,
  // 把图渲染在页面里让用户长按保存 —— 任何 WebView 都走得通。
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function share() {
    if (busy) return;
    setBusy(true);
    try {
      const canvas = drawCard(props);
      const dataUrl = canvas.toDataURL("image/png");
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );

      // 1) 系统分享(支持的手机上体验最好:存相册 / 发微信都在这一步)
      if (blob) {
        const file = new File([blob], "小猫怎么了-安心报告.png", {
          type: "image/png",
        });
        if (
          typeof navigator.canShare === "function" &&
          navigator.canShare({ files: [file] })
        ) {
          try {
            await navigator.share({ files: [file] });
            return;
          } catch (e) {
            if ((e as Error)?.name === "AbortError") return; // 用户取消
            // 其它失败(微信内核常见)→ 继续走兜底
          }
        }
      }

      // 2) 触屏设备(微信 / 手机浏览器):下载不可靠,直接弹长按保存层
      const isTouch =
        typeof window !== "undefined" &&
        ("ontouchstart" in window || navigator.maxTouchPoints > 0);
      if (isTouch) {
        setPreviewUrl(dataUrl);
        return;
      }

      // 3) 桌面:直接下载
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "小猫怎么了-安心报告.png";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      } else {
        setPreviewUrl(dataUrl); // toBlob 都失败时的最后兜底
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={share}
        disabled={busy}
        className="mt-3 flex w-full items-center justify-between rounded-[28px] bg-surface px-4 py-3.5 text-[14px] font-medium text-ink shadow-[var(--shadow-control)] disabled:opacity-60"
      >
        <span>{busy ? "正在生成图片…" : "保存报告图片 · 发给家人朋友"}</span>
        <span className="text-ink-faint" aria-hidden="true">
          ↓
        </span>
      </button>

      {previewUrl && (
        <div
          className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/75 px-6"
          role="dialog"
          aria-modal="true"
          aria-label="保存报告图片"
        >
          <p className="mb-3 text-[14px] font-medium text-white">
            长按下面的图片,选「保存图片」
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="安心报告图片 —— 长按保存"
            className="max-h-[70vh] w-auto max-w-full rounded-[16px] shadow-2xl"
          />
          <button
            type="button"
            onClick={() => setPreviewUrl(null)}
            className="mt-4 rounded-full bg-white/15 px-6 py-2.5 text-[14px] font-medium text-white"
          >
            关闭
          </button>
        </div>
      )}
    </>
  );
}
