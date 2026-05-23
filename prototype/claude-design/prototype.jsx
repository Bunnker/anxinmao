// 安心分诊器 — Direction B (温纸暖照) interactive prototype.
// One file, all four screens stateful, navigation wired up.

const { useState, useEffect, useRef } = React;

/* ============================================================
   Theme tokens — Direction B baseline, accent overrideable
   ============================================================ */
const BASE = {
  bg: "#EFE8DB",
  bgDeep: "#E5DCC9",
  surface: "#F7F1E6",
  surface2: "#EBE2D0",
  line: "rgba(60,40,20,0.14)",
  lineSoft: "rgba(60,40,20,0.07)",
  hairline: "rgba(60,40,20,0.22)",
  text: "#2B241B",
  text2: "#6B5A45",
  text3: "rgba(43,36,27,0.5)",
  text4: "rgba(43,36,27,0.32)",
  // ── Risk signal layer ─────────────────────────────────────
  // Independent of warm brand palette. More saturated so it's unambiguous
  // even under stress / colour-vision differences. Brand terracotta accent
  // (≈#9F5638) is orange-brown; risk red below is true warning red.
  yellow: "#C8930E",
  yellowBg: "#F3E0B4",
  yellowLine: "rgba(200,147,14,0.42)",
  yellowText: "#4A3608",
  red: "#C8362F",
  redBg: "#F4D7D2",
  redLine: "rgba(200,54,47,0.35)",
  redText: "#5A1812",
  redSoft: "rgba(200,54,47,0.10)",
  green: "#3F8050",
  greenBg: "#D4E2C9",
  greenLine: "rgba(63,128,80,0.34)",
  greenText: "#1F3F25",
  // ── Type ─────────────────────────────────────────────────
  // Display = 中文衬线 (情绪/标题). Functional = 中文黑体 (按钮/选项/正文).
  serif: "'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', ui-serif, Georgia, serif",
  sans:  "'PingFang SC', 'Noto Sans SC', 'Hiragino Sans GB', -apple-system, system-ui, sans-serif",
};

const ACCENT_PRESETS = {
  terracotta: { accent: "#9F5638", accentInk: "#FAF5EA", accentSoft: "#E8D0BD" },
  olive:      { accent: "#6B6B2C", accentInk: "#F8F5E4", accentSoft: "#D9D8B0" },
  ink:        { accent: "#34465A", accentInk: "#F2EEE3", accentSoft: "#CDD5DE" },
};

function useTheme(t) {
  return {
    ...BASE,
    ...(ACCENT_PRESETS[t.accent] || ACCENT_PRESETS.terracotta),
    density: t.density,
    letterFeel: t.letterFeel,
  };
}

/* ============================================================
   Phone shell — scales to fit viewport, paper bg around it
   ============================================================ */
const PHONE_W = 390;
const PHONE_H = 844;

// Extremely faint paper noise — feTurbulence baked into an inline SVG, low-alpha,
// tiled at 240px. Layered behind the surface→bg gradient so the phone reads as
// paper, not flat color. Per PRD: 极轻纸纹 / 暖色微渐变,不要纯色平涂.
const PAPER_NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.18  0 0 0 0 0.13  0 0 0 0 0.08  0 0 0 0.08 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

function PhoneStage({ children, theme }) {
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function fit() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // Reserve a bit of breathing room
      const maxW = vw - 40;
      const maxH = vh - 40;
      const s = Math.min(maxW / PHONE_W, maxH / PHONE_H, 1.05);
      setScale(s);
    }
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  return (
    <div
      ref={wrapRef}
      style={{
        position: "fixed",
        inset: 0,
        background: `radial-gradient(80% 60% at 50% 50%, ${theme.bgDeep} 0%, #D9CFBC 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        fontFamily: theme.sans,
      }}
    >
      {/* Optional ambient hairline above phone */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          right: 0,
          height: 1,
          background: "rgba(60,40,20,0.05)",
          transform: `translateY(${(PHONE_H * scale) / 2 + 26}px)`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          width: PHONE_W,
          height: PHONE_H,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          borderRadius: 44,
          backgroundImage: `${PAPER_NOISE}, radial-gradient(120% 80% at 50% 0%, ${theme.surface} 0%, ${theme.bg} 60%, ${theme.bg} 100%)`,
          backgroundSize: "240px 240px, auto",
          backgroundRepeat: "repeat, no-repeat",
          boxShadow:
            "0 30px 60px -20px rgba(60,40,20,0.30), 0 8px 20px -10px rgba(60,40,20,0.18), 0 0 0 1px rgba(60,40,20,0.10) inset",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ============================================================
   Status bar + screen frame helpers
   ============================================================ */
function Screen({ children, theme, scrollable }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        color: theme.text,
        fontFamily: theme.sans,
      }}
    >
      <StatusBar theme={theme} />
      <div
        style={{
          flex: "1 1 auto",
          display: "flex",
          flexDirection: "column",
          overflow: scrollable ? "auto" : "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function StatusBar({ theme }) {
  return (
    <div
      style={{
        height: 50,
        flex: "0 0 50px",
        padding: "14px 28px 0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: 14,
        fontWeight: 600,
        color: theme.text,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <span>9:41</span>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <svg width="17" height="11" viewBox="0 0 17 11" fill="none">
          {[3, 5, 7, 9].map((h, i) => (
            <rect key={i} x={i * 4} y={11 - h} width="3" height={h} rx="0.5" fill={theme.text} />
          ))}
        </svg>
        <svg width="15" height="11" viewBox="0 0 15 11" fill="none">
          <path
            d="M7.5 10.5l2-2a2.83 2.83 0 00-4 0l2 2zM3 6a6.36 6.36 0 019 0l1-1a7.78 7.78 0 00-11 0l1 1zm-2-2a9.19 9.19 0 0113 0l1-1a10.61 10.61 0 00-15 0l1 1z"
            fill={theme.text}
          />
        </svg>
        <svg width="26" height="12" viewBox="0 0 26 12" fill="none">
          <rect x="0.5" y="0.5" width="22" height="11" rx="2.5" stroke={theme.text} opacity="0.4" />
          <rect x="2" y="2" width="19" height="8" rx="1.5" fill={theme.text} />
          <rect x="23.5" y="4" width="1.5" height="4" rx="0.75" fill={theme.text} opacity="0.4" />
        </svg>
      </div>
    </div>
  );
}

function Disclaimer({ theme }) {
  return (
    <div
      style={{
        flex: "0 0 auto",
        padding: "12px 28px 26px",
        textAlign: "center",
        fontSize: 11,
        letterSpacing: 1,
        color: theme.text3,
        fontFamily: theme.sans,
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 14, height: 1, background: theme.hairline }} />
        AI 整理 · 不能替代兽医
        <span style={{ width: 14, height: 1, background: theme.hairline }} />
      </span>
    </div>
  );
}

function TopBar({ theme, title, right, onBack }) {
  return (
    <div
      style={{
        flex: "0 0 auto",
        padding: "4px 18px 16px",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <IconButton theme={theme} onClick={onBack} ariaLabel="返回">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </IconButton>
      <div
        style={{
          flex: "1 1 auto",
          textAlign: "center",
          fontSize: 13,
          color: theme.text2,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        {title}
      </div>
      <div style={{ minWidth: 36, display: "flex", justifyContent: "flex-end", color: theme.text2, fontSize: 13 }}>
        {right}
      </div>
    </div>
  );
}

function IconButton({ children, theme, onClick, ariaLabel }) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        border: "none",
        background: "transparent",
        color: theme.text,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        padding: 0,
        flex: "0 0 36px",
      }}
    >
      {children}
    </button>
  );
}

function Eyebrow({ theme, color, children }) {
  return (
    <div
      style={{
        fontSize: 11,
        letterSpacing: 2,
        color: color || theme.text3,
        fontWeight: 600,
        fontFamily: theme.sans,
      }}
    >
      {children}
    </div>
  );
}

/* ============================================================
   1. HOME
   ============================================================ */
function HomeScreen({ theme, profile, onGo }) {
  const dense = theme.density === "cozy";
  const metaParts = [
    `${profile.ageMonths} 个月`,
    profile.sex,
    profile.coat,
    `${profile.weight} kg`,
  ].filter(Boolean);
  return (
    <Screen theme={theme}>
      {/* Header row */}
      <div style={{ padding: "8px 28px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Eyebrow theme={theme}>晚上好</Eyebrow>
        <IconButton theme={theme} ariaLabel="个人" onClick={() => onGo("onboarding")}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M5.5 19.5c1.2-3.4 3.8-5 6.5-5s5.3 1.6 6.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </IconButton>
      </div>

      {/* Cat profile */}
      <div style={{ padding: dense ? "16px 28px 22px" : "22px 28px 30px" }}>
        {theme.letterFeel && (
          <div
            style={{
              fontSize: 13,
              color: theme.text2,
              marginBottom: 10,
              letterSpacing: 0.2,
              lineHeight: 1.5,
            }}
          >
            ——别担心,先告诉我,
          </div>
        )}
        <div
          style={{
            fontFamily: theme.serif,
            fontSize: 44,
            lineHeight: 1.05,
            fontWeight: 500,
            letterSpacing: -0.5,
          }}
        >
          {profile.name} <span style={{ color: theme.text2, fontWeight: 400, fontSize: "0.78em" }}>怎么了</span>?
        </div>
        <div style={{ marginTop: 10, fontSize: 13, color: theme.text2, letterSpacing: 0.4 }}>
          {metaParts.join(" · ")}
        </div>
      </div>

      {/* CTAs */}
      <div
        style={{
          padding: "0 28px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          flex: "1 1 auto",
        }}
      >
        <button
          onClick={() => onGo("triage")}
          style={{
            width: "100%",
            background: theme.accent,
            color: theme.accentInk,
            border: "none",
            borderRadius: 16,
            padding: "22px 22px",
            textAlign: "left",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontFamily: theme.sans,
            boxShadow: "0 4px 16px -8px rgba(60,40,20,0.40)",
          }}
        >
          <div style={{ flex: "1 1 auto" }}>
            <div style={{ fontSize: 22, fontWeight: 500, lineHeight: 1.2, letterSpacing: -0.3 }}>
              我家猫不太对劲
            </div>
            <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 6, letterSpacing: 0.3 }}>
              吐了 · 不吃饭 · 精神差 · 误食
            </div>
          </div>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ flex: "0 0 22px" }}>
            <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <button
          onClick={() => onGo("behavior")}
          style={{
            width: "100%",
            background: theme.surface,
            color: theme.text,
            border: `1px solid ${theme.line}`,
            borderRadius: 16,
            padding: "20px 22px",
            textAlign: "left",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontFamily: theme.sans,
          }}
        >
          <div style={{ flex: "1 1 auto" }}>
            <div style={{ fontSize: 19, fontWeight: 500, lineHeight: 1.2, letterSpacing: -0.3 }}>
              我想问点什么
            </div>
            <div style={{ fontSize: 12.5, color: theme.text2, marginTop: 6, letterSpacing: 0.3 }}>
              喂养 · 训练 · 行为习惯
            </div>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ color: theme.text2, flex: "0 0 20px" }}>
            <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Recent */}
        <div style={{ marginTop: dense ? 16 : 22 }}>
          <Eyebrow theme={theme}>最近</Eyebrow>
          <div style={{ marginTop: 10 }}>
            <RecentRow
              theme={theme}
              dot={theme.yellow}
              title="呕吐 2 次"
              meta="昨天 · 黄档 · 在家观察"
              onClick={() => onGo("report:yellow")}
            />
            <RecentRow
              theme={theme}
              dot={theme.text4}
              title="多大可以洗澡?"
              meta="3 天前 · 问答"
              last
            />
          </div>
        </div>
      </div>

      <Disclaimer theme={theme} />
    </Screen>
  );
}

function RecentRow({ theme, dot, title, meta, last, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "13px 0",
        borderBottom: last ? "none" : `1px solid ${theme.lineSoft}`,
        width: "100%",
        textAlign: "left",
        background: "transparent",
        border: "none",
        borderBottomStyle: last ? "none" : "solid",
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: theme.lineSoft,
        cursor: onClick ? "pointer" : "default",
        fontFamily: theme.sans,
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: 4, background: dot, flex: "0 0 7px" }} />
      <div style={{ flex: "1 1 auto", minWidth: 0 }}>
        <div style={{ fontSize: 15, color: theme.text, fontWeight: 500 }}>{title}</div>
        <div style={{ fontSize: 12, color: theme.text3, marginTop: 2, letterSpacing: 0.3 }}>{meta}</div>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: theme.text3 }}>
        <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

/* ============================================================
   2. TRIAGE — multi-step
   ============================================================ */
const TRIAGE = [
  {
    chip: "症状 · 呕吐",
    q: "今天吐了几次?",
    sub: "从早上算到现在,看到一次算一次。",
    options: ["1 次", "2–3 次", "4 次或更多", "我没数清楚"],
    suggested: 1,
  },
  {
    chip: "样子",
    q: "吐出来的是什么样子?",
    sub: "可以多选——只挑你看到的。",
    options: ["没消化的猫粮", "黄水 / 透明泡沫", "毛球(管状)", "看到血丝"],
    suggested: 0,
    multi: true,
  },
  {
    chip: "状态",
    q: "豆豆现在精神和食欲如何?",
    sub: "看它现在(不是早上),和平时比。",
    options: ["和平时差不多", "有点蔫,但还会动", "明显发蔫 / 躲起来"],
    suggested: 0,
  },
  {
    chip: "环境",
    q: "今天有没有可能误食?",
    sub: "百合、巧克力、绳子、塑料、植物叶子——这类。",
    options: ["没有,在家盯着", "不太确定", "可能吃了 / 看到吃了"],
    suggested: 0,
  },
];

// Soft follow-up after step 0 if user picks "我没数清楚" (index 3).
// Doesn't add to the visible counter — it's a gentler re-ask, not a new question.
const NO_COUNT_FOLLOWUP = {
  chip: "再想一下",
  q: "没关系——大概是?",
  sub: "回想一下今天看到吐的画面,模糊一点也行。",
  options: [
    "感觉就 1–2 次",
    "好像有好几次",
    "印象里挺多次",
    "真的完全没印象",
  ],
  soft: true,
};

function TriageScreen({ theme, step, answers, onAnswer, onNext, onBack, branch, branchAnswer, onBranchAnswer }) {
  const inBranch = branch === "noCount";
  const node = inBranch ? NO_COUNT_FOLLOWUP : TRIAGE[step];
  const selected = inBranch ? branchAnswer : answers[step];
  const ready = node.multi ? Array.isArray(selected) && selected.length > 0 : selected != null;
  const isLast = !inBranch && step === TRIAGE.length - 1;
  const progressFrac = inBranch ? (step + 0.5) / TRIAGE.length : (step + 1) / TRIAGE.length;

  return (
    <Screen theme={theme}>
      <TopBar
        theme={theme}
        title={inBranch ? "再确认一下" : `分诊中 · ${step + 1} / ${TRIAGE.length}`}
        right={<button style={btnText(theme)}>暂停</button>}
        onBack={onBack}
      />

      {/* Hairline progress */}
      <div style={{ padding: "0 28px 24px" }}>
        <div style={{ height: 2, background: theme.lineSoft, borderRadius: 1, overflow: "hidden" }}>
          <div
            style={{
              width: `${progressFrac * 100}%`,
              height: "100%",
              background: inBranch ? theme.text3 : theme.accent,
              transition: "width 350ms ease",
            }}
          />
        </div>
        {inBranch && (
          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              color: theme.text3,
              letterSpacing: 0.3,
            }}
          >
            ——这一题不算正式问题,只是帮你回忆。
          </div>
        )}
      </div>

      {/* Chip */}
      <div style={{ padding: "0 28px 16px" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 12px",
            borderRadius: 999,
            background: theme.surface,
            border: `1px solid ${theme.line}`,
            fontSize: 12,
            color: theme.text2,
            letterSpacing: 0.4,
            }}
        >
          <span style={{ width: 6, height: 6, borderRadius: 3, background: inBranch ? theme.text3 : theme.accent }} />
          {node.chip}
        </span>
      </div>

      {/* Question */}
      <div style={{ padding: "6px 28px 22px" }}>
        <div
          style={{
            fontFamily: theme.serif,
            fontSize: 30,
            lineHeight: 1.2,
            fontWeight: 500,
            letterSpacing: -0.4,
          }}
        >
          {node.q}
        </div>
        <div
          style={{
            marginTop: 10,
            fontSize: 13.5,
            color: theme.text2,
            lineHeight: 1.6,
            letterSpacing: 0.2,
          }}
        >
          {node.sub}
        </div>
      </div>

      {/* Options */}
      <div style={{ padding: "0 28px", display: "flex", flexDirection: "column", gap: 10, flex: "1 1 auto" }}>
        {node.options.map((label, i) => {
          const sel = node.multi
            ? Array.isArray(selected) && selected.includes(i)
            : selected === i;
          return (
            <TriageOption
              key={i}
              theme={theme}
              label={label}
              selected={sel}
              multi={node.multi}
              muted={!node.multi && i === node.options.length - 1 && label.startsWith("我")}
              soft={inBranch}
              onClick={() => (inBranch ? onBranchAnswer(i) : onAnswer(step, i, node.multi))}
            />
          );
        })}
      </div>

      {/* Continue */}
      <div style={{ padding: "16px 28px 14px" }}>
        <button
          disabled={!ready}
          onClick={onNext}
          style={{
            width: "100%",
            padding: "16px 0",
            borderRadius: 14,
            background: ready ? theme.accent : theme.surface2,
            color: ready ? theme.accentInk : theme.text3,
            border: "none",
            fontSize: 16,
            fontFamily: theme.sans,
            fontWeight: 500,
            letterSpacing: 0.5,
            cursor: ready ? "pointer" : "not-allowed",
            transition: "background 180ms",
          }}
        >
          {isLast ? "看安心报告 →" : "下一题 →"}
        </button>
      </div>

      <Disclaimer theme={theme} />
    </Screen>
  );
}

function TriageOption({ theme, label, selected, muted, multi, onClick, soft }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: "17px 18px",
        borderRadius: 12,
        background: selected ? (soft ? theme.surface2 : theme.accentSoft) : theme.surface,
        border: `1px solid ${selected ? (soft ? theme.hairline : theme.accent) : theme.line}`,
        color: muted ? theme.text2 : theme.text,
        fontSize: 16.5,
        fontFamily: theme.sans,
        fontWeight: 500,
        textAlign: "left",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        letterSpacing: 0.1,
        transition: "background 140ms, border-color 140ms",
      }}
    >
      <span style={muted ? {} : {}}>{label}</span>
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: multi ? 5 : 11,
          border: `1.5px solid ${selected ? (soft ? theme.hairline : theme.accent) : theme.line}`,
          background: selected ? (soft ? theme.text2 : theme.accent) : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "0 0 22px",
          color: theme.accentInk,
        }}
      >
        {selected && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
    </button>
  );
}

function btnText(theme) {
  return {
    background: "transparent",
    border: "none",
    color: theme.text2,
    fontSize: 13,
    fontFamily: theme.sans,
    cursor: "pointer",
    };
}

/* ============================================================
   3. REPORT — tier-aware (red / yellow / green)
   ============================================================ */
function tierTokens(theme, tier) {
  return {
    red:    { color: theme.red,    bg: theme.redBg,    line: theme.redLine,    text: theme.redText,    label: "红档 · 立刻送医" },
    yellow: { color: theme.yellow, bg: theme.yellowBg, line: theme.yellowLine, text: theme.yellowText, label: "黄档 · 在家观察" },
    green:  { color: theme.green,  bg: theme.greenBg,  line: theme.greenLine,  text: theme.greenText,  label: "绿档 · 低风险" },
  }[tier];
}

function TierIcon({ tier, color, size = 18 }) {
  if (tier === "red") {
    // Cross / hospital symbol — unambiguous danger
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="3" stroke={color} strokeWidth="1.8" />
        <path d="M12 7v10M7 12h10" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (tier === "yellow") {
    // Eye — "watching"
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M2.5 12C5 7 8.5 5 12 5s7 2 9.5 7c-2.5 5-6 7-9.5 7s-7-2-9.5-7z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="2.6" stroke={color} strokeWidth="1.8" />
      </svg>
    );
  }
  // green — leaf
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 19c0-8 6-14 14-14 0 8-6 14-14 14z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M5 19l8-8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function reportContent(tier, profile, theme) {
  if (tier === "red") return {
    headline: <>立刻去急诊,<br /><span style={{ fontWeight: 400, opacity: 0.72 }}>别在家观察。</span></>,
    summary: `${profile.name} 出现了 3 个红色信号:吐了 5 次以上、看到血丝、明显发蔫——这种组合不能在家等。`,
    primaryCta: { label: "拨打附近 24h 急诊", sub: "上海·宠仁动物医院 · 1.4 km", urgent: true },
    sections: [
      {
        eyebrow: "去急诊的路上",
        title: "三件能做的事",
        kind: "steps",
        items: [
          "先打电话告诉急诊正在路上,简单说症状——他们能提前备物资。",
          `用毛毯把 ${profile.name} 包住放进航空箱;保温,但别强喂水。`,
          "拍下今天每次呕吐的样子和时间——到了直接给医生看。",
        ],
      },
      {
        eyebrow: "为什么这么判断",
        kind: "paragraphs",
        items: [
          <>呕吐带血丝 + 多次呕吐 + 精神发蔫,通常意味着 <strong style={{ fontWeight: 600, color: theme.text }}>脱水</strong> 或 <strong style={{ fontWeight: 600, color: theme.text }}>内部出血</strong>。在 3 个月的小猫身上,这两件事进展都很快。</>,
          <span style={{ color: theme.text2 }}>不是吓你——是这种组合,在家的任何处理都帮不上忙。</span>,
        ],
      },
      {
        eyebrow: "路上如果再变化",
        title: "立刻告诉司机或医生",
        kind: "warn-bullets",
        items: [
          "开始抽搐 / 口吐白沫",
          "瘫倒、叫不出声",
          "牙龈或舌头变青紫",
          "停止呼吸 / 失去意识",
        ],
      },
    ],
  };

  if (tier === "yellow") return {
    headline: <>先观察 24 小时,<br /><span style={{ fontWeight: 400, opacity: 0.72 }}>暂时不用送医。</span></>,
    summary: `${profile.name} 今天吐了 2–3 次,看起来是没消化的猫粮,精神和食欲都还正常。多数情况会自己好——按下面来,做得到。`,
    primaryCta: null,
    sections: [
      {
        eyebrow: "现在做什么",
        title: "按顺序来,别跳步",
        kind: "steps",
        items: [
          "接下来 4 小时禁食,可以让它舔少量水。",
          "4 小时后,先喂 1 茶匙温水,等 30 分钟看是否再吐。",
          "不吐的话,喂一小撮易消化的食物(嫩鸡肉 / 处方肠胃粮)。",
          "每次呕吐拍一张照、记下时间——升级时给医生看。",
        ],
      },
      {
        eyebrow: "为什么这么判断",
        kind: "paragraphs",
        items: [
          <>幼猫一天吐 1–2 次没消化的猫粮、其它都正常,通常是 <strong style={{ fontWeight: 600, color: theme.text }}>吃太快</strong> 或 <strong style={{ fontWeight: 600, color: theme.text }}>毛球</strong>——多数会自愈。</>,
          <span style={{ color: theme.text2 }}>但 3 个月大的猫脱水很快,所以要观察,不是不管。</span>,
        ],
      },
      {
        eyebrow: "出现以下情况",
        title: "建议立刻就医",
        kind: "warn-bullets",
        bordered: true,
        items: [
          "再吐 3 次以上,或开始吐黄水 / 带血",
          "超过 12 小时不喝水、不进食",
          "精神萎靡、躲起来、叫声异常",
          "牙龈发白,或皮肤捏起来回弹很慢",
        ],
        action: { label: "找附近 24h 急诊" },
      },
    ],
  };

  // green
  return {
    headline: <>在家就能搞定,<br /><span style={{ fontWeight: 400, opacity: 0.72 }}>应该是吃太快了。</span></>,
    summary: `${profile.name} 今天吐了 1 次没消化的猫粮,其它一切都正常——新手最常碰到的情况。`,
    primaryCta: null,
    sections: [
      {
        eyebrow: "这样处理就够了",
        title: "两件小事",
        kind: "steps",
        items: [
          "下一顿换慢食碗,或把猫粮分成 3–4 小份多次喂。",
          "今天剩下时间留意是否再吐——一次为限,多了再来分诊一次。",
        ],
      },
      {
        eyebrow: "为什么这么判断",
        kind: "paragraphs",
        items: [
          <>幼猫一顿吃太快,胃来不及处理就会吐出来——你看到的 <strong style={{ fontWeight: 600, color: theme.text }}>没消化的颗粒</strong> 就是这个意思。</>,
          <span style={{ color: theme.text2 }}>跟人喝水呛到差不多——身体在自我保护,不是生病。</span>,
        ],
      },
      {
        eyebrow: "万一变化了",
        title: "出现以下任一,重新分诊一次",
        kind: "soft-bullets",
        items: [
          "24 小时内再吐 2 次以上",
          "开始不吃东西、不喝水",
          "看起来发蔫、不像平时",
        ],
      },
    ],
    footerNote: "把这次记到档案 →",
  };
}

function ReportScreen({ theme, tier = "yellow", profile, onBack, onHome }) {
  const tt = tierTokens(theme, tier);
  const data = reportContent(tier, profile, theme);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [reminderSet, setReminderSet] = useState(false);

  return (
    <Screen theme={theme} scrollable>
      <TopBar
        theme={theme}
        title="安心报告"
        right={<button style={btnText(theme)} onClick={onHome}>完成</button>}
        onBack={onBack}
      />

      {/* Tier banner */}
      <div style={{ padding: "0 24px 4px" }}>
        <div
          style={{
            borderRadius: 18,
            background: tt.bg,
            border: `1px solid ${tt.line}`,
            padding: "22px 22px 24px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {tier === "red" && (
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: tt.color }} />
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <TierIcon tier={tier} color={tt.color} size={20} />
            <span
              style={{
                fontSize: 12,
                letterSpacing: 1.2,
                color: tt.text,
                fontWeight: 600,
                }}
            >
              {tt.label}
            </span>
          </div>

          <div
            style={{
              fontFamily: theme.serif,
              fontSize: 28,
              lineHeight: 1.2,
              color: tt.text,
              fontWeight: 500,
              letterSpacing: -0.4,
            }}
          >
            {data.headline}
          </div>

          <div
            style={{
              marginTop: 14,
              fontSize: 13.5,
              color: tt.text,
              opacity: 0.85,
              lineHeight: 1.65,
            }}
          >
            {data.summary}
          </div>
        </div>
      </div>

      {/* Red: phone CTA placed RIGHT under the banner — the loudest action */}
      {data.primaryCta && (
        <div style={{ padding: "16px 24px 4px" }}>
          <button
            style={{
              width: "100%",
              padding: "18px 22px",
              borderRadius: 14,
              background: tt.color,
              color: "#FAF5EA",
              border: "none",
              fontFamily: theme.sans,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 14,
              textAlign: "left",
              boxShadow: "0 4px 16px -8px rgba(159,61,51,0.55)",
            }}
          >
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                background: "rgba(255,255,255,0.16)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flex: "0 0 36px",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M5 4h3l2 5-2.5 1.5a11 11 0 005 5L14 13l5 2v3a2 2 0 01-2 2A14 14 0 013 6a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
            </span>
            <div style={{ flex: "1 1 auto" }}>
              <div style={{ fontSize: 17, fontWeight: 500, letterSpacing: 0.2 }}>{data.primaryCta.label}</div>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4, letterSpacing: 0.3 }}>
                {data.primaryCta.sub}
              </div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flex: "0 0 18px" }}>
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}

      {/* Red — emergency fallback: "万一现在送不去" */}
      {tier === "red" && (
        <div style={{ padding: "8px 24px 0" }}>
          <button
            onClick={() => setEmergencyOpen((v) => !v)}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 12,
              background: "transparent",
              border: `1px solid ${theme.line}`,
              color: theme.text,
              fontFamily: theme.sans,
              fontSize: 13.5,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
            aria-expanded={emergencyOpen}
          >
            <span>万一现在没法马上送?</span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              style={{
                transform: emergencyOpen ? "rotate(180deg)" : "none",
                transition: "transform 180ms ease",
              }}
            >
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {emergencyOpen && (
            <div
              style={{
                marginTop: 8,
                padding: "16px 18px",
                borderRadius: 12,
                background: theme.surface,
                border: `1px solid ${theme.line}`,
                animation: "fadeUp 220ms ease both",
              }}
            >
              <EmergencyTip theme={theme} k="A" title="深夜 / 没车">
                先打急诊电话(上面那个按钮)简单说症状,让医生在线指导。多数急诊会先帮你判断"路上要不要先做什么"。
              </EmergencyTip>
              <EmergencyTip theme={theme} k="B" title="距离远 / 路上 1h+">
                用毛巾铺底放进航空箱,保暖但留缝呼吸。<strong style={{ fontWeight: 600 }}>别强喂水或药</strong>——可能呛到。每 15 分钟看一次它的呼吸。
              </EmergencyTip>
              <EmergencyTip theme={theme} k="C" title="你自己也慌" last>
                把上面"去急诊的路上"那三件事念出声——做第一件,再想第二件。{profile.name} 现在最需要的是你做完事,不是想完。
              </EmergencyTip>
            </div>
          )}
        </div>
      )}

      {/* Sections */}
      {data.sections.map((sec, i) => (
        <ReportSectionRender key={i} theme={theme} tt={tt} sec={sec} />
      ))}

      {/* Yellow — 24h follow-up reminder */}
      {tier === "yellow" && (
        <div style={{ padding: "10px 24px 0" }}>
          <button
            onClick={() => setReminderSet(true)}
            disabled={reminderSet}
            style={{
              width: "100%",
              padding: "16px 18px",
              borderRadius: 14,
              background: reminderSet ? theme.surface : theme.surface,
              border: `1px solid ${reminderSet ? theme.greenLine : theme.line}`,
              color: theme.text,
              fontFamily: theme.sans,
              fontSize: 14.5,
              cursor: reminderSet ? "default" : "pointer",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: 14,
              transition: "background 180ms, border-color 180ms",
            }}
          >
            <span
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                background: reminderSet ? theme.green : theme.bg,
                color: reminderSet ? "#FAF5EA" : theme.text2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flex: "0 0 38px",
              }}
            >
              {reminderSet ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="13" r="7" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M12 9v4l2.5 1.5M9 3h6M12 6v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              )}
            </span>
            <div style={{ flex: "1 1 auto" }}>
              <div style={{ fontWeight: 500, color: reminderSet ? theme.greenText : theme.text }}>
                {reminderSet ? "已定 · 明天 9:41 提醒复查" : "24 小时后提醒我复查"}
              </div>
              <div style={{ fontSize: 12.5, color: theme.text3, marginTop: 4, lineHeight: 1.5 }}>
                {reminderSet
                  ? "到时间会问一句:豆豆现在怎么样了?"
                  : "到时间问你一句,确认是否好转——好转就归档,没好就升级。"}
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Footer action / link */}
      <div style={{ padding: "16px 24px 6px" }}>
        {data.footerNote && (
          <div style={{ textAlign: "center", fontSize: 13, color: theme.text2, padding: "10px 0" }}>
            <span style={{ textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer" }}>{data.footerNote}</span>
          </div>
        )}
        {tier === "yellow" && (
          <div style={{ textAlign: "center", fontSize: 12.5, color: theme.text3, marginTop: 6 }}>
            已经看过医生了? <span style={{ textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer" }}>标记为已就医</span>
          </div>
        )}
      </div>

      <Disclaimer theme={theme} />
    </Screen>
  );
}

function EmergencyTip({ theme, k, title, children, last }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "12px 0",
        borderBottom: last ? "none" : `1px solid ${theme.lineSoft}`,
        alignItems: "flex-start",
      }}
    >
      <span
        style={{
          fontFamily: theme.sans,
          fontSize: 13,
          fontWeight: 600,
          color: theme.text2,
          width: 18,
          flex: "0 0 18px",
          marginTop: 1,
          letterSpacing: 0.5,
        }}
      >
        {k}
      </span>
      <div style={{ flex: "1 1 auto" }}>
        <div style={{ fontSize: 14, color: theme.text, fontWeight: 500, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 13.5, color: theme.text2, lineHeight: 1.65 }}>{children}</div>
      </div>
    </div>
  );
}

function ReportSectionRender({ theme, tt, sec }) {
  const isWarn = sec.kind === "warn-bullets";
  const bordered = sec.bordered;
  return (
    <div style={{ padding: "22px 24px 4px" }}>
      <div
        style={
          bordered
            ? {
                background: theme.surface,
                border: `1px solid ${theme.line}`,
                borderLeft: `3px solid ${theme.red}`,
                borderRadius: 14,
                padding: "18px 18px 16px",
              }
            : {}
        }
      >
        <Eyebrow theme={theme} color={isWarn ? theme.red : theme.text3}>{sec.eyebrow}</Eyebrow>
        {sec.title && (
          <div
            style={{
              fontSize: 18,
              color: isWarn ? theme.red : theme.text,
              fontWeight: 500,
              letterSpacing: -0.2,
              marginTop: 6,
              marginBottom: 12,
            }}
          >
            {sec.title}
          </div>
        )}
        <div style={{ marginTop: sec.title ? 0 : 10 }}>
          {sec.kind === "steps" &&
            sec.items.map((text, i) => (
              <Step key={i} theme={theme} n={i + 1} text={text} last={i === sec.items.length - 1} />
            ))}
          {sec.kind === "paragraphs" &&
            sec.items.map((para, i) => (
              <p
                key={i}
                style={{
                  margin: i === 0 ? 0 : "12px 0 0",
                  fontSize: i === 0 ? 14.5 : 14,
                  color: i === 0 ? theme.text : theme.text2,
                  lineHeight: i === 0 ? 1.75 : 1.7,
                  letterSpacing: 0.1,
                }}
              >
                {para}
              </p>
            ))}
          {sec.kind === "warn-bullets" &&
            sec.items.map((text, i) => (
              <Bullet key={i} theme={theme} text={text} color={theme.red} last={i === sec.items.length - 1} />
            ))}
          {sec.kind === "soft-bullets" &&
            sec.items.map((text, i) => (
              <Bullet key={i} theme={theme} text={text} color={theme.text3} last={i === sec.items.length - 1} />
            ))}
        </div>
        {sec.action && (
          <button
            style={{
              marginTop: 14,
              width: "100%",
              padding: "13px 0",
              borderRadius: 10,
              background: "transparent",
              color: theme.text,
              border: `1px solid ${theme.line}`,
              fontSize: 14,
              fontFamily: theme.sans,
              fontWeight: 500,
              cursor: "pointer",
              letterSpacing: 0.3,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {sec.action.label}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

function Step({ theme, n, text, last }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        padding: "12px 0",
        borderBottom: last ? "none" : `1px solid ${theme.lineSoft}`,
        alignItems: "flex-start",
      }}
    >
      <span
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          border: `1px solid ${theme.hairline}`,
          color: theme.text2,
          fontSize: 12.5,
          fontFamily: theme.sans,
          fontWeight: 500,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "0 0 24px",
          marginTop: 1,
          }}
      >
        {n}
      </span>
      <div style={{ flex: "1 1 auto", fontSize: 14.5, color: theme.text, lineHeight: 1.65 }}>{text}</div>
    </div>
  );
}

function Bullet({ theme, text, last, color }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "10px 0",
        borderBottom: last ? "none" : `1px solid ${theme.lineSoft}`,
        alignItems: "flex-start",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          background: color || theme.red,
          marginTop: 9,
          flex: "0 0 6px",
        }}
      />
      <div style={{ flex: "1 1 auto", fontSize: 14, color: theme.text, lineHeight: 1.6 }}>{text}</div>
    </div>
  );
}

/* ============================================================
   4. BEHAVIOR Q&A
   ============================================================ */
function BehaviorScreen({ theme, profile, onBack }) {
  const [showFollow, setShowFollow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowFollow(true), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <Screen theme={theme} scrollable>
      <TopBar
        theme={theme}
        title="问点什么"
        right={
          <button style={btnText(theme)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke={theme.text2} strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        }
        onBack={onBack}
      />

      <div style={{ padding: "0 22px", display: "flex", flexDirection: "column", flex: "1 1 auto" }}>
        {/* User question */}
        <div
          style={{
            alignSelf: "flex-end",
            maxWidth: "82%",
            background: theme.text,
            color: theme.bg,
            padding: "12px 16px",
            borderRadius: 18,
            borderBottomRightRadius: 6,
            fontSize: 15,
            lineHeight: 1.5,
            margin: "4px 0 16px",
            fontFamily: theme.sans,
          }}
        >
          小猫总咬我手,怎么训它不咬?
        </div>

        {/* App answer */}
        <div style={{ alignSelf: "flex-start", maxWidth: "94%", margin: "0 0 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                background: theme.accent,
                color: theme.accentInk,
                fontSize: 11,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                }}
            >
              N
            </span>
            <Eyebrow theme={theme}>一位懂猫的朋友</Eyebrow>
          </div>

          <div
            style={{
              background: theme.surface,
              border: `1px solid ${theme.line}`,
              borderRadius: 16,
              padding: "18px 20px",
              fontSize: 14.5,
              lineHeight: 1.7,
              color: theme.text,
              fontFamily: theme.sans,
            }}
          >
            <p style={{ margin: "0 0 8px" }}>
              3 个月的小猫咬人,<strong style={{ fontWeight: 600, color: theme.text }}>大多不是凶</strong>——
            </p>
            <p style={{ margin: 0 }}>
              它在用嘴探索世界、消耗精力。所以方向是 <strong style={{ color: theme.accent, fontWeight: 600 }}>转移</strong>,不是惩罚。
            </p>

            <div style={{ height: 1, background: theme.lineSoft, margin: "18px 0 14px" }} />
            <div style={{ marginBottom: 10 }}>
              <Eyebrow theme={theme}>试试这样</Eyebrow>
            </div>
            <TipRow theme={theme} k="A" text={<><strong style={{ fontWeight: 600 }}>变成木头。</strong>它一咬,你停止动作,手别甩——慢慢抽走。</>} />
            <TipRow theme={theme} k="B" text={<><strong style={{ fontWeight: 600 }}>给它"对的东西咬"。</strong>同时把咬咬玩具塞到它嘴边。</>} />
            <TipRow theme={theme} k="C" text={<><strong style={{ fontWeight: 600 }}>每天玩到喘。</strong>2 次 × 10 分钟逗猫棒,精力够,咬人会少一半。</>} last />

            <div
              style={{
                marginTop: 16,
                padding: "13px 14px",
                background: theme.bg,
                borderRadius: 12,
                border: `1px solid ${theme.lineSoft}`,
                fontSize: 13,
                color: theme.text2,
                lineHeight: 1.65,
              }}
            >
              <strong style={{ color: theme.red, fontWeight: 600 }}>别这样做:</strong>
              {" "}拍鼻子、大声吼、用手当玩具——会让它把手当成猎物,越咬越凶。
            </div>
          </div>

          {/* Follow-ups */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 14,
              opacity: showFollow ? 1 : 0,
              transform: showFollow ? "translateY(0)" : "translateY(6px)",
              transition: "opacity 280ms ease, transform 280ms ease",
            }}
          >
            <FollowUp theme={theme} text="几个月开始效果最好?" />
            <FollowUp theme={theme} text="推荐什么咬咬玩具?" />
            <FollowUp theme={theme} text="为什么不能拍鼻子?" />
          </div>
        </div>
      </div>

      {/* Input */}
      <div style={{ padding: "8px 20px 12px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderRadius: 999,
            background: theme.surface,
            border: `1px solid ${theme.line}`,
          }}
        >
          <span style={{ flex: "1 1 auto", fontSize: 14, color: theme.text3 }}>
            继续问 {profile.name} 的事…
          </span>
          <button
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              border: "none",
              background: theme.accent,
              color: theme.accentInk,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <Disclaimer theme={theme} />
    </Screen>
  );
}

function TipRow({ theme, k, text, last }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "10px 0",
        borderBottom: last ? "none" : `1px solid ${theme.lineSoft}`,
        alignItems: "flex-start",
      }}
    >
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: theme.accent,
          width: 18,
          flex: "0 0 18px",
          marginTop: 1,
          letterSpacing: 0.5,
          }}
      >
        {k}
      </span>
      <div style={{ flex: "1 1 auto", fontSize: 14, color: theme.text, lineHeight: 1.65 }}>{text}</div>
    </div>
  );
}

function FollowUp({ theme, text }) {
  return (
    <button
      style={{
        padding: "9px 14px",
        borderRadius: 999,
        background: "transparent",
        border: `1px solid ${theme.line}`,
        color: theme.text2,
        fontSize: 13,
        fontFamily: theme.sans,
        cursor: "pointer",
        letterSpacing: 0.2,
        }}
    >
      {text}  →
    </button>
  );
}

/* ============================================================
   1.5 SYMPTOM PICKER — home CTA → grid → triage
   ============================================================ */
const SYMPTOMS = [
  { id: "vomit",    label: "呕吐",        sub: "吐了 / 干呕",       tier: "common" },
  { id: "diarrhea", label: "腹泻",        sub: "拉稀 / 软便",       tier: "common" },
  { id: "noeat",    label: "不吃东西",    sub: "≥ 8 小时没碰食",     tier: "common" },
  { id: "lethargy", label: "精神差",      sub: "蔫 / 躲起来 / 不动", tier: "common" },
  { id: "eat",      label: "可能误食",    sub: "线 / 植物 / 不该吃的", tier: "urgent" },
  { id: "breath",   label: "呼吸怪",      sub: "急促 / 张嘴喘",     tier: "urgent" },
  { id: "blood",    label: "看到血",      sub: "便 / 尿 / 口鼻",    tier: "urgent" },
  { id: "pee",      label: "尿不出",      sub: "频繁蹲砂、没尿",     tier: "urgent" },
  { id: "other",    label: "其它情况",    sub: "说不清也没关系",     tier: "soft"   },
];

function SymptomPicker({ theme, onPick, onBack }) {
  return (
    <Screen theme={theme} scrollable>
      <TopBar theme={theme} title="选一个最贴近的" onBack={onBack} />

      <div style={{ padding: "4px 24px 18px" }}>
        <div
          style={{
            fontFamily: theme.serif,
            fontSize: 26,
            lineHeight: 1.25,
            fontWeight: 500,
            letterSpacing: -0.3,
          }}
        >
          它现在最让你担心的是?
        </div>
        <div style={{ marginTop: 8, fontSize: 13, color: theme.text2, lineHeight: 1.6 }}>
          挑最像的一项。后面我会再追问几个问题。
        </div>
      </div>

      {/* 紧急一栏 */}
      <SymptomGroup theme={theme} eyebrow="可能要急的">
        {SYMPTOMS.filter((s) => s.tier === "urgent").map((s) => (
          <SymptomCard key={s.id} theme={theme} sym={s} urgent onClick={() => onPick(s.id)} />
        ))}
      </SymptomGroup>

      {/* 常见一栏 */}
      <SymptomGroup theme={theme} eyebrow="常见">
        {SYMPTOMS.filter((s) => s.tier === "common").map((s) => (
          <SymptomCard key={s.id} theme={theme} sym={s} onClick={() => onPick(s.id)} />
        ))}
      </SymptomGroup>

      {/* 其它 */}
      <div style={{ padding: "10px 24px 6px" }}>
        {SYMPTOMS.filter((s) => s.tier === "soft").map((s) => (
          <button
            key={s.id}
            onClick={() => onPick(s.id)}
            style={{
              width: "100%",
              padding: "16px 18px",
              borderRadius: 12,
              background: "transparent",
              border: `1px dashed ${theme.line}`,
              color: theme.text2,
              fontFamily: theme.sans,
              fontSize: 15,
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>
              <span style={{ color: theme.text }}>{s.label}</span>
              <span style={{ marginLeft: 10, fontSize: 12, color: theme.text3 }}>{s.sub}</span>
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        ))}
      </div>

      <Disclaimer theme={theme} />
    </Screen>
  );
}

function SymptomGroup({ theme, eyebrow, children }) {
  return (
    <div style={{ padding: "10px 24px 0" }}>
      <div style={{ marginBottom: 10 }}>
        <Eyebrow theme={theme}>{eyebrow}</Eyebrow>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>{children}</div>
    </div>
  );
}

function SymptomCard({ theme, sym, urgent, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "16px 14px",
        borderRadius: 14,
        background: theme.surface,
        border: `1px solid ${urgent ? theme.redLine : theme.line}`,
        color: theme.text,
        fontFamily: theme.sans,
        cursor: "pointer",
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        position: "relative",
        minHeight: 84,
      }}
    >
      {urgent && (
        <span
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 6,
            height: 6,
            borderRadius: 4,
            background: theme.red,
          }}
          aria-label="urgent"
        />
      )}
      <span style={{ fontSize: 16, fontWeight: 500, letterSpacing: 0 }}>{sym.label}</span>
      <span style={{ fontSize: 12, color: theme.text2, lineHeight: 1.5 }}>{sym.sub}</span>
    </button>
  );
}

/* ============================================================
   0. ONBOARDING / 建档
   ============================================================ */
function OnboardingScreen({ theme, profile, onCommit, onBack, isEdit }) {
  const [draft, setDraft] = useState(profile);
  const set = (k) => (v) => setDraft((p) => ({ ...p, [k]: v }));
  const ready = draft.name && draft.name.trim().length > 0;

  return (
    <Screen theme={theme} scrollable>
      <TopBar
        theme={theme}
        title={isEdit ? "档案" : "新建档案"}
        right={isEdit ? <button style={btnText(theme)} onClick={() => onCommit(draft)}>保存</button> : null}
        onBack={onBack}
      />

      {/* Greeting */}
      <div style={{ padding: "4px 28px 24px" }}>
        <div
          style={{
            fontSize: 13,
            color: theme.text2,
            letterSpacing: 0.2,
            marginBottom: 12,
          }}
        >
          ——你好,先认识一下你家的小家伙。
        </div>
        <div
          style={{
            fontFamily: theme.serif,
            fontSize: 32,
            lineHeight: 1.2,
            fontWeight: 500,
            letterSpacing: -0.4,
          }}
        >
          {isEdit ? "档案" : "新加一只猫"}
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 13,
            color: theme.text2,
            letterSpacing: 0.2,
            lineHeight: 1.6,
          }}
        >
          这些信息帮我判断它的情况。{isEdit ? "" : "之后随时能改。"}
        </div>
      </div>

      <div style={{ padding: "0 28px", display: "flex", flexDirection: "column", gap: 22, flex: "1 1 auto" }}>
        {/* Name */}
        <Field theme={theme} label="叫它什么">
          <input
            value={draft.name}
            onChange={(e) => set("name")(e.target.value)}
            placeholder="豆豆 / 咪咪 / 团子…"
            style={{
              ...inputStyle(theme),
              fontFamily: theme.sans,
              fontSize: 20,
              fontWeight: 500,
              letterSpacing: -0.2,
            }}
          />
        </Field>

        {/* Age (months) */}
        <Field theme={theme} label="多大了" sub={`${draft.ageMonths} 个月`}>
          <input
            type="range"
            min={1}
            max={24}
            value={draft.ageMonths}
            onChange={(e) => set("ageMonths")(Number(e.target.value))}
            style={{ width: "100%", accentColor: theme.accent }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11, color: theme.text3 }}>
            <span>新生 1m</span>
            <span>成年 12m</span>
            <span>2y+</span>
          </div>
        </Field>

        {/* Sex */}
        <Field theme={theme} label="性别">
          <SegRow
            theme={theme}
            value={draft.sex}
            onChange={set("sex")}
            options={["雌", "雄", "不确定"]}
          />
        </Field>

        {/* Coat */}
        <Field theme={theme} label="毛色 · 长短(可选)">
          <SegRow
            theme={theme}
            value={draft.coat}
            onChange={set("coat")}
            options={["短毛", "长毛", "无毛"]}
          />
        </Field>

        {/* Weight */}
        <Field theme={theme} label="体重(估个数就行)" sub={`${draft.weight} kg`}>
          <input
            type="range"
            min={0.3}
            max={8}
            step={0.1}
            value={draft.weight}
            onChange={(e) => set("weight")(Number(e.target.value))}
            style={{ width: "100%", accentColor: theme.accent }}
          />
        </Field>

        {/* 绝育 */}
        <Field theme={theme} label="是否绝育">
          <SegRow
            theme={theme}
            value={draft.neutered}
            onChange={set("neutered")}
            options={["是", "否", "暂未"]}
          />
        </Field>

        {/* 到家日期 */}
        <Field theme={theme} label="到家日期">
          <input
            type="date"
            value={draft.homeDate}
            onChange={(e) => set("homeDate")(e.target.value)}
            style={{
              ...inputStyle(theme),
              fontFamily: theme.sans,
              fontSize: 15,
              fontWeight: 500,
              colorScheme: "light",
            }}
          />
        </Field>

        {/* 疫苗 */}
        <Field theme={theme} label="疫苗记录" sub={draft.vaccines.length ? `${draft.vaccines.length} 针` : "未记录"}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {draft.vaccines.map((v, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 14px",
                  background: theme.surface,
                  border: `1px solid ${theme.line}`,
                  borderRadius: 10,
                }}
              >
                <input
                  value={v.name}
                  onChange={(e) => {
                    const next = [...draft.vaccines];
                    next[i] = { ...next[i], name: e.target.value };
                    set("vaccines")(next);
                  }}
                  placeholder="疫苗名"
                  style={{
                    flex: "1 1 auto",
                    border: "none",
                    background: "transparent",
                    fontFamily: theme.sans,
                    fontSize: 14,
                    color: theme.text,
                    outline: "none",
                  }}
                />
                <input
                  type="date"
                  value={v.date}
                  onChange={(e) => {
                    const next = [...draft.vaccines];
                    next[i] = { ...next[i], date: e.target.value };
                    set("vaccines")(next);
                  }}
                  style={{
                    border: "none",
                    background: "transparent",
                    fontFamily: theme.sans,
                    fontSize: 13,
                    color: theme.text2,
                    outline: "none",
                    width: 120,
                    textAlign: "right",
                  }}
                />
                <button
                  onClick={() => {
                    const next = draft.vaccines.filter((_, k) => k !== i);
                    set("vaccines")(next);
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: theme.text3,
                    cursor: "pointer",
                    padding: 4,
                  }}
                  aria-label="删除"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ))}
            <button
              onClick={() =>
                set("vaccines")([
                  ...draft.vaccines,
                  { name: "", date: "" },
                ])
              }
              style={{
                padding: "11px 14px",
                background: "transparent",
                border: `1px dashed ${theme.line}`,
                borderRadius: 10,
                color: theme.text2,
                fontFamily: theme.sans,
                fontSize: 13,
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              加一针
            </button>
          </div>
        </Field>

        {/* 驱虫 */}
        <Field theme={theme} label="上次驱虫">
          <input
            type="date"
            value={draft.deworm}
            onChange={(e) => set("deworm")(e.target.value)}
            style={{
              ...inputStyle(theme),
              fontFamily: theme.sans,
              fontSize: 15,
              fontWeight: 500,
              colorScheme: "light",
            }}
          />
        </Field>

        {/* 过敏 / 慢性病 */}
        <Field theme={theme} label="过敏或慢性病(可选)">
          <textarea
            value={draft.notes}
            onChange={(e) => set("notes")(e.target.value)}
            placeholder="比如:对鸡肉过敏 / 有先天性心脏病 / 在吃 XX 药"
            rows={3}
            style={{
              ...inputStyle(theme),
              fontFamily: theme.sans,
              fontSize: 14,
              borderBottom: `1px solid ${theme.hairline}`,
              padding: "10px 0",
              resize: "none",
              lineHeight: 1.6,
            }}
          />
        </Field>

        <div style={{ height: 8 }} />
      </div>

      {/* CTA */}
      {!isEdit && (
        <div style={{ padding: "10px 28px 12px" }}>
          <button
            disabled={!ready}
            onClick={() => onCommit(draft)}
            style={{
              width: "100%",
              padding: "16px 0",
              borderRadius: 14,
              background: ready ? theme.accent : theme.surface2,
              color: ready ? theme.accentInk : theme.text3,
              border: "none",
              fontSize: 16,
              fontFamily: theme.sans,
              fontWeight: 500,
              letterSpacing: 0.5,
              cursor: ready ? "pointer" : "not-allowed",
            }}
          >
            建档,开始 →
          </button>
          <div style={{ textAlign: "center", marginTop: 10, fontSize: 12, color: theme.text3 }}>
            还没准备好? <span style={{ textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer" }}>跳过</span>
          </div>
        </div>
      )}

      <Disclaimer theme={theme} />
    </Screen>
  );
}

function Field({ theme, label, sub, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span
          style={{
            fontSize: 11,
            letterSpacing: 1.8,
            textTransform: "uppercase",
            color: theme.text3,
            fontWeight: 600,
            }}
        >
          {label}
        </span>
        {sub && (
          <span style={{ fontSize: 13, color: theme.text2, fontFamily: theme.sans, fontVariantNumeric: "tabular-nums" }}>
            {sub}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function inputStyle(theme) {
  return {
    width: "100%",
    padding: "12px 0",
    border: "none",
    borderBottom: `1px solid ${theme.hairline}`,
    background: "transparent",
    color: theme.text,
    outline: "none",
  };
}

function SegRow({ theme, value, onChange, options }) {
  return (
    <div
      style={{
        display: "flex",
        background: theme.surface,
        border: `1px solid ${theme.line}`,
        borderRadius: 12,
        padding: 4,
        gap: 4,
      }}
    >
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: 9,
              background: active ? theme.bg : "transparent",
              color: active ? theme.text : theme.text2,
              border: active ? `1px solid ${theme.line}` : "1px solid transparent",
              fontSize: 14,
              fontFamily: theme.sans,
              fontWeight: 500,
              cursor: "pointer",
              transition: "background 140ms",
              fontStyle: opt === "不确定" ? "italic" : "normal",
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/* ============================================================
   Demo nav (floating screen jumper)
   ============================================================ */
function ScreenJumper({ route, onJump, theme }) {
  const items = [
    { id: "onboarding", label: "建档" },
    { id: "home", label: "首页" },
    { id: "symptoms", label: "选症状" },
    { id: "triage", label: "分诊" },
    { id: "report:red", label: "红档", dot: "#C97468" },
    { id: "report:yellow", label: "黄档", dot: "#D4A641" },
    { id: "report:green", label: "绿档", dot: "#8FAE5E" },
    { id: "behavior", label: "问答" },
  ];
  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        left: 16,
        zIndex: 20,
        background: "rgba(43,36,27,0.92)",
        color: "#F7F1E6",
        padding: "6px 8px",
        borderRadius: 12,
        display: "flex",
        gap: 2,
        fontFamily: BASE.serif,
        fontSize: 12,
        boxShadow: "0 6px 16px rgba(0,0,0,0.18)",
        backdropFilter: "blur(8px)",
        flexWrap: "wrap",
        maxWidth: 460,
      }}
    >
      <span
        style={{
          fontSize: 10,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color: "rgba(247,241,230,0.55)",
          alignSelf: "center",
          padding: "0 8px",
          }}
      >
        Demo
      </span>
      {items.map((it) => {
        const active = route === it.id || (!it.id.includes(":") && route.startsWith(it.id));
        return (
          <button
            key={it.id}
            onClick={() => onJump(it.id)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              background: active ? "rgba(247,241,230,0.18)" : "transparent",
              color: active ? "#F7F1E6" : "rgba(247,241,230,0.65)",
              border: "none",
              fontSize: 12,
              fontFamily: "inherit",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {it.dot && (
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  background: it.dot,
                  display: "inline-block",
                }}
              />
            )}
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

/* ============================================================
   App root
   ============================================================ */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "terracotta",
  "density": "loose",
  "letterFeel": true
}/*EDITMODE-END*/;

/* ============================================================
   Data layer — multi-cat ready (UI is single-cat per MVP)
   ============================================================ */
const STORAGE_KEY = "catTriage:v1";

const DEFAULT_CAT = {
  name: "豆豆",
  ageMonths: 3,
  sex: "雌",
  coat: "短毛",
  weight: 2.1,
  neutered: "暂未",
  homeDate: "2026-04-18",
  vaccines: [{ name: "三联第 1 针", date: "2026-04-30" }],
  deworm: "2026-05-05",
  notes: "",
};

function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.cats) || parsed.cats.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {}
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const theme = useTheme(t);

  const [route, setRoute] = useState("home");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState([1, [0], 0, 0]);
  const [branch, setBranch] = useState(null);
  const [branchAnswer, setBranchAnswer] = useState(null);

  // Store: { cats: Cat[], activeCatId: string }
  // UI is single-cat for MVP; multi-cat path stays clean for later.
  const [store, setStore] = useState(() => {
    const loaded = loadStore();
    if (loaded) return loaded;
    return {
      cats: [{ id: "c-" + Math.random().toString(36).slice(2, 8), ...DEFAULT_CAT }],
      activeCatId: null,
    };
  });
  useEffect(() => {
    saveStore(store);
  }, [store]);

  const activeCatId = store.activeCatId || store.cats[0]?.id;
  const profile = store.cats.find((c) => c.id === activeCatId) || store.cats[0];

  function setProfile(patch) {
    setStore((prev) => ({
      ...prev,
      cats: prev.cats.map((c) => (c.id === profile.id ? { ...c, ...patch } : c)),
    }));
  }

  function answer(idx, value, multi) {
    setAnswers((prev) => {
      const next = [...prev];
      if (multi) {
        const cur = Array.isArray(next[idx]) ? [...next[idx]] : [];
        const i = cur.indexOf(value);
        if (i >= 0) cur.splice(i, 1);
        else cur.push(value);
        next[idx] = cur;
      } else {
        next[idx] = value;
      }
      return next;
    });
    // Auto-branch into NO_COUNT_FOLLOWUP when "我没数清楚" is picked on Q1.
    if (idx === 0 && !multi && value === 3) {
      setBranch("noCount");
      setBranchAnswer(null);
    } else if (idx === 0 && !multi && branch === "noCount") {
      // user changed mind, drop the branch
      setBranch(null);
    }
  }

  function nextStep() {
    if (branch === "noCount") {
      // Branch resolves into step 1 of the main flow.
      // Map branch answer back into Q1's main answer so report logic can read it.
      const mapped = [1, 2, 2, 1][branchAnswer ?? 0]; // soft → 2-3, more → 4+, idk → fall back to 2-3
      setAnswers((prev) => {
        const next = [...prev];
        next[0] = mapped;
        return next;
      });
      setBranch(null);
      setStep(1);
      return;
    }
    if (step < TRIAGE.length - 1) setStep(step + 1);
    else setRoute(decideTier(answers));
  }

  function decideTier(a) {
    // Heuristic for demo: blood/严重精神 → red; everything ok → green; default yellow
    const sample = Array.isArray(a[1]) ? a[1] : [];
    if (sample.includes(3) || a[2] === 2 || a[3] === 2 || a[0] === 2) return "report:red";
    if (a[0] === 0 && a[2] === 0 && a[3] === 0 && !sample.includes(1) && !sample.includes(3)) return "report:green";
    return "report:yellow";
  }

  function jump(id) {
    if (id === "triage") {
      setStep(0);
      setBranch(null);
      setBranchAnswer(null);
    }
    setRoute(id);
  }

  let screen;
  if (route === "onboarding") {
    screen = (
      <OnboardingScreen
        theme={theme}
        profile={profile}
        isEdit={true}
        onCommit={(p) => { setProfile(p); setRoute("home"); }}
        onBack={() => setRoute("home")}
      />
    );
  } else if (route === "home") {
    screen = <HomeScreen theme={theme} profile={profile} onGo={(id) => jump(id === "triage" ? "symptoms" : id)} />;
  } else if (route === "symptoms") {
    screen = (
      <SymptomPicker
        theme={theme}
        onPick={(id) => {
          setStep(0);
          setBranch(null);
          setBranchAnswer(null);
          setRoute("triage");
        }}
        onBack={() => setRoute("home")}
      />
    );
  } else if (route === "triage") {
    screen = (
      <TriageScreen
        theme={theme}
        step={step}
        answers={answers}
        onAnswer={answer}
        onNext={nextStep}
        onBack={() => {
          if (branch === "noCount") setBranch(null);
          else if (step > 0) setStep(step - 1);
          else setRoute("symptoms");
        }}
        branch={branch}
        branchAnswer={branchAnswer}
        onBranchAnswer={setBranchAnswer}
      />
    );
  } else if (route.startsWith("report:")) {
    const tier = route.split(":")[1];
    screen = (
      <ReportScreen
        theme={theme}
        tier={tier}
        profile={profile}
        onBack={() => { setStep(TRIAGE.length - 1); setRoute("triage"); }}
        onHome={() => { setRoute("home"); setStep(0); }}
      />
    );
  } else if (route === "behavior") {
    screen = <BehaviorScreen theme={theme} profile={profile} onBack={() => setRoute("home")} />;
  }

  return (
    <>
      <ScreenJumper route={route} onJump={jump} theme={theme} />
      <PhoneStage theme={theme}>
        <div
          key={
            route +
            (route === "triage" ? `:${step}:${branch || ""}` : "")
          }
          style={{ position: "absolute", inset: 0, animation: "fadeUp 280ms ease both" }}
        >
          {screen}
        </div>
      </PhoneStage>

      <TweaksPanel title="Tweaks">
        <TweakSection label="风格">
          <TweakRadio
            label="点缀色"
            value={t.accent}
            onChange={(v) => setTweak("accent", v)}
            options={[
              { value: "terracotta", label: "陶土" },
              { value: "olive", label: "橄榄" },
              { value: "ink", label: "墨蓝" },
            ]}
          />
          <TweakRadio
            label="密度"
            value={t.density}
            onChange={(v) => setTweak("density", v)}
            options={[
              { value: "loose", label: "宽松" },
              { value: "cozy", label: "紧凑" },
            ]}
          />
          <TweakToggle
            label="信件感"
            value={t.letterFeel}
            onChange={(v) => setTweak("letterFeel", v)}
          />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
