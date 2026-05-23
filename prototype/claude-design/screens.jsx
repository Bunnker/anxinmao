// Four screens for the cat-triage app, parameterized by a theme prop.
// Each screen renders inside a 375x812 phone artboard.

const PHONE_W = 375;
const PHONE_H = 812;

// ---------- Shared atoms ----------
function Phone({ theme, children, statusbarTint = "dark" }) {
  return (
    <div
      style={{
        width: PHONE_W,
        height: PHONE_H,
        background: theme.bg,
        color: theme.text,
        fontFamily: theme.fontBody,
        fontSize: 15,
        lineHeight: 1.5,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        WebkitFontSmoothing: "antialiased",
        letterSpacing: theme.bodyTracking || 0,
      }}
    >
      <StatusBar tint={statusbarTint} theme={theme} />
      {children}
    </div>
  );
}

function StatusBar({ tint = "dark", theme }) {
  const c = tint === "dark" ? theme.text : "#fff";
  return (
    <div
      style={{
        height: 44,
        flex: "0 0 44px",
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: 14,
        fontWeight: 600,
        color: c,
        fontFamily: theme.fontBody,
        letterSpacing: 0,
      }}
    >
      <span>9:41</span>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        {/* signal */}
        <svg width="17" height="11" viewBox="0 0 17 11" fill="none">
          {[3, 5, 7, 9].map((h, i) => (
            <rect key={i} x={i * 4} y={11 - h} width="3" height={h} rx="0.5" fill={c} />
          ))}
        </svg>
        {/* wifi */}
        <svg width="15" height="11" viewBox="0 0 15 11" fill="none">
          <path
            d="M7.5 10.5l2-2a2.83 2.83 0 00-4 0l2 2zM3 6a6.36 6.36 0 019 0l1-1a7.78 7.78 0 00-11 0l1 1zm-2-2a9.19 9.19 0 0113 0l1-1a10.61 10.61 0 00-15 0l1 1z"
            fill={c}
          />
        </svg>
        {/* battery */}
        <svg width="26" height="12" viewBox="0 0 26 12" fill="none">
          <rect x="0.5" y="0.5" width="22" height="11" rx="2.5" stroke={c} opacity="0.4" />
          <rect x="2" y="2" width="19" height="8" rx="1.5" fill={c} />
          <rect x="23.5" y="4" width="1.5" height="4" rx="0.75" fill={c} opacity="0.4" />
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
        padding: "10px 24px 18px",
        textAlign: "center",
        fontSize: 11,
        letterSpacing: 0.5,
        color: theme.text3,
        background: theme.bg,
        borderTop: `1px solid ${theme.lineSoft}`,
        fontFamily: theme.fontBody,
      }}
    >
      AI 整理 · 不能替代兽医
    </div>
  );
}

function TopBar({ theme, title, right, onlyBack = false }) {
  return (
    <div
      style={{
        flex: "0 0 auto",
        padding: "4px 16px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <button
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
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {!onlyBack && (
        <div
          style={{
            flex: "1 1 auto",
            textAlign: "center",
            fontSize: 14,
            color: theme.text2,
            letterSpacing: theme.barTracking || 0.5,
            fontFamily: theme.fontBody,
          }}
        >
          {title}
        </div>
      )}
      <div style={{ width: 36, display: "flex", justifyContent: "flex-end", color: theme.text2 }}>{right}</div>
    </div>
  );
}

// ---------- 1. Home ----------
function HomeScreen({ theme }) {
  return (
    <Phone theme={theme}>
      <div style={{ padding: "8px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, color: theme.text3, letterSpacing: 0.5 }}>晚上好</span>
        <button
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            border: `1px solid ${theme.lineSoft}`,
            background: "transparent",
            color: theme.text2,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.6" />
            <path d="M5.5 19.5c1.2-3.4 3.8-5 6.5-5s5.3 1.6 6.5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Cat profile */}
      <div style={{ padding: "18px 24px 28px" }}>
        <div
          style={{
            fontFamily: theme.fontDisplay,
            fontSize: 34,
            lineHeight: 1.1,
            color: theme.text,
            fontWeight: theme.displayWeight,
            letterSpacing: theme.displayTracking || -0.2,
          }}
        >
          豆豆
        </div>
        <div style={{ marginTop: 8, fontSize: 13, color: theme.text2, letterSpacing: 0.4 }}>
          3 个月 · 雌 · 短毛 · 2.1 kg
        </div>
      </div>

      {/* Primary CTA */}
      <div style={{ padding: "0 24px", display: "flex", flexDirection: "column", gap: 12, flex: "1 1 auto" }}>
        <button
          style={{
            width: "100%",
            background: theme.ctaBg,
            color: theme.ctaText,
            border: "none",
            borderRadius: theme.radiusLg,
            padding: "22px 22px",
            textAlign: "left",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            fontFamily: theme.fontBody,
            boxShadow: theme.ctaShadow || "none",
          }}
        >
          <span
            style={{
              fontSize: 22,
              fontWeight: theme.displayWeight,
              fontFamily: theme.fontDisplay,
              letterSpacing: -0.2,
              lineHeight: 1.2,
            }}
          >
            我家猫不太对劲
          </span>
          <span style={{ fontSize: 13, opacity: 0.78, letterSpacing: 0.3 }}>
            吐了 / 不吃饭 / 精神差 / 误食…
          </span>
        </button>

        <button
          style={{
            width: "100%",
            background: theme.surface,
            color: theme.text,
            border: `1px solid ${theme.line}`,
            borderRadius: theme.radiusLg,
            padding: "20px 22px",
            textAlign: "left",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            fontFamily: theme.fontBody,
          }}
        >
          <span
            style={{
              fontSize: 19,
              fontWeight: theme.displayWeight,
              fontFamily: theme.fontDisplay,
              letterSpacing: -0.2,
            }}
          >
            我想问点什么
          </span>
          <span style={{ fontSize: 13, color: theme.text2, letterSpacing: 0.3 }}>
            喂养 · 训练 · 行为习惯
          </span>
        </button>

        {/* Recent */}
        <div style={{ marginTop: 18 }}>
          <div
            style={{
              fontSize: 11,
              color: theme.text3,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              marginBottom: 10,
              fontFamily: theme.fontBody,
            }}
          >
            最近
          </div>
          <RecentRow theme={theme} dot={theme.yellow} title="呕吐 2 次" meta="昨天 · 黄档·24h 观察" />
          <RecentRow theme={theme} dot={theme.text3} title="多大可以洗澡?" meta="3 天前 · 问答" last />
        </div>
      </div>

      <Disclaimer theme={theme} />
    </Phone>
  );
}

function RecentRow({ theme, dot, title, meta, last }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "12px 0",
        borderBottom: last ? "none" : `1px solid ${theme.lineSoft}`,
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 4, background: dot, flex: "0 0 8px" }} />
      <div style={{ flex: "1 1 auto", minWidth: 0 }}>
        <div style={{ fontSize: 15, color: theme.text, fontWeight: 500 }}>{title}</div>
        <div style={{ fontSize: 12, color: theme.text3, marginTop: 2, letterSpacing: 0.3 }}>{meta}</div>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: theme.text3 }}>
        <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ---------- 2. Triage in progress ----------
function TriageScreen({ theme }) {
  return (
    <Phone theme={theme}>
      <TopBar theme={theme} title="分诊中  ·  3 / 5" right={<span style={{ fontSize: 13 }}>暂停</span>} />

      {/* Progress */}
      <div style={{ padding: "0 24px 22px" }}>
        <div style={{ height: 3, background: theme.lineSoft, borderRadius: 2, overflow: "hidden" }}>
          <div style={{ width: "60%", height: "100%", background: theme.text }} />
        </div>
      </div>

      {/* Context chip */}
      <div style={{ padding: "0 24px 16px" }}>
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
          <span style={{ width: 6, height: 6, borderRadius: 3, background: theme.accent }} />
          症状 · 呕吐
        </span>
      </div>

      {/* Question */}
      <div style={{ padding: "8px 24px 24px" }}>
        <div
          style={{
            fontFamily: theme.fontDisplay,
            fontSize: 28,
            lineHeight: 1.25,
            color: theme.text,
            fontWeight: theme.displayWeight,
            letterSpacing: -0.2,
          }}
        >
          今天吐了几次?
        </div>
        <div style={{ marginTop: 10, fontSize: 13, color: theme.text2, letterSpacing: 0.3, lineHeight: 1.55 }}>
          算从你早上起床到现在的次数,看到一次算一次。
        </div>
      </div>

      {/* Options */}
      <div style={{ padding: "0 24px", display: "flex", flexDirection: "column", gap: 10, flex: "1 1 auto" }}>
        <TriageOption theme={theme} label="1 次" />
        <TriageOption theme={theme} label="2–3 次" selected />
        <TriageOption theme={theme} label="4 次以上" />
        <TriageOption theme={theme} label="我没数清楚" muted />
      </div>

      {/* Continue */}
      <div style={{ padding: "16px 24px 18px" }}>
        <button
          style={{
            width: "100%",
            padding: "16px 0",
            borderRadius: theme.radiusMd,
            background: theme.text,
            color: theme.bg,
            border: "none",
            fontSize: 16,
            fontFamily: theme.fontBody,
            fontWeight: 500,
            letterSpacing: 0.5,
            cursor: "pointer",
          }}
        >
          下一题
        </button>
      </div>

      <Disclaimer theme={theme} />
    </Phone>
  );
}

function TriageOption({ theme, label, selected, muted }) {
  return (
    <button
      style={{
        width: "100%",
        padding: "18px 20px",
        borderRadius: theme.radiusMd,
        background: selected ? theme.selectBg : theme.surface,
        border: `1px solid ${selected ? theme.selectLine : theme.line}`,
        color: muted ? theme.text2 : theme.text,
        fontSize: 17,
        fontFamily: theme.fontBody,
        fontWeight: 500,
        textAlign: "left",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        letterSpacing: 0.1,
      }}
    >
      <span>{label}</span>
      {selected && (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ color: theme.accent }}>
          <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

// ---------- 3. Yellow safety report ----------
function ReportScreen({ theme }) {
  return (
    <Phone theme={theme}>
      <TopBar theme={theme} title="安心报告" right={<span style={{ fontSize: 13 }}>分享</span>} />

      <div style={{ flex: "1 1 auto", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* Yellow tier banner */}
        <div style={{ padding: "0 24px 4px" }}>
          <div
            style={{
              borderRadius: theme.radiusLg,
              background: theme.yellowBg,
              border: `1px solid ${theme.yellowLine}`,
              padding: "18px 20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  background: theme.yellow,
                  flex: "0 0 10px",
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  color: theme.yellowText,
                  fontWeight: 600,
                }}
              >
                Yellow · 中度
              </span>
            </div>
            <div
              style={{
                marginTop: 10,
                fontFamily: theme.fontDisplay,
                fontSize: 24,
                lineHeight: 1.25,
                color: theme.yellowText,
                fontWeight: theme.displayWeight,
                letterSpacing: -0.2,
              }}
            >
              在家观察 24 小时
            </div>
            <div style={{ marginTop: 8, fontSize: 13.5, color: theme.yellowText, opacity: 0.85, lineHeight: 1.55 }}>
              豆豆今天吐了 2 次,精神和食欲还正常。先按下面做,留意是否变化。
            </div>
          </div>
        </div>

        {/* Now do this */}
        <Section theme={theme} eyebrow="现在做什么" title="按顺序来,别跳步">
          <Step theme={theme} n={1} text="接下来 4 小时禁食,可以让它舔少量水。" />
          <Step theme={theme} n={2} text="4 小时后,先喂 1 茶匙温水,等 30 分钟看是否再吐。" />
          <Step theme={theme} n={3} text="不吐的话,喂少量易消化的食物(嫩鸡肉 / 处方粮)。" />
          <Step theme={theme} n={4} text="每次呕吐拍一张照、记下时间——升级时给医生看。" last />
        </Section>

        {/* Why */}
        <Section theme={theme} eyebrow="为什么这么判断" title="">
          <p style={{ margin: 0, fontSize: 14, color: theme.text2, lineHeight: 1.65 }}>
            幼猫一天吐 1–2 次、其它都正常,通常是吃太快或毛球——多数会自愈。但 3 个月大的猫脱水很快,所以要观察,不是不管。
          </p>
        </Section>

        {/* Escalate */}
        <Section theme={theme} eyebrow="出现以下情况" title="建议立刻就医" tone="warn">
          <Bullet theme={theme} text="再吐 3 次以上,或开始吐黄水 / 带血" />
          <Bullet theme={theme} text="超过 12 小时不喝水、不进食" />
          <Bullet theme={theme} text="精神萎靡、躲起来、叫声异常" />
          <Bullet theme={theme} text="牙龈发白,或皮肤捏起来回弹很慢" last />
        </Section>

        {/* CTA */}
        <div style={{ padding: "8px 24px 20px" }}>
          <button
            style={{
              width: "100%",
              padding: "15px 0",
              borderRadius: theme.radiusMd,
              background: "transparent",
              color: theme.text,
              border: `1px solid ${theme.line}`,
              fontSize: 14.5,
              fontFamily: theme.fontBody,
              fontWeight: 500,
              cursor: "pointer",
              letterSpacing: 0.4,
            }}
          >
            找附近 24h 急诊  →
          </button>
          <div style={{ textAlign: "center", marginTop: 12, fontSize: 12, color: theme.text3 }}>
            已经看过医生了?<span style={{ textDecoration: "underline" }}>标记为已就医</span>
          </div>
        </div>
      </div>

      <Disclaimer theme={theme} />
    </Phone>
  );
}

function Section({ theme, eyebrow, title, tone, children }) {
  return (
    <div style={{ padding: "22px 24px 4px" }}>
      <div
        style={{
          fontSize: 11,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color: tone === "warn" ? theme.red : theme.text3,
          fontWeight: 600,
          marginBottom: 6,
        }}
      >
        {eyebrow}
      </div>
      {title && (
        <div
          style={{
            fontFamily: theme.fontDisplay,
            fontSize: 18,
            color: theme.text,
            fontWeight: theme.displayWeight,
            letterSpacing: -0.1,
            marginBottom: 12,
          }}
        >
          {title}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}

function Step({ theme, n, text, last }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        padding: "10px 0",
        borderBottom: last ? "none" : `1px solid ${theme.lineSoft}`,
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          border: `1px solid ${theme.line}`,
          color: theme.text2,
          fontSize: 12,
          fontFamily: theme.fontBody,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "0 0 22px",
          marginTop: 1,
        }}
      >
        {n}
      </span>
      <div style={{ flex: "1 1 auto", fontSize: 14.5, color: theme.text, lineHeight: 1.6 }}>{text}</div>
    </div>
  );
}

function Bullet({ theme, text, last }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "9px 0",
        borderBottom: last ? "none" : `1px solid ${theme.lineSoft}`,
        alignItems: "flex-start",
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: 3,
          background: theme.red,
          marginTop: 9,
          flex: "0 0 5px",
        }}
      />
      <div style={{ flex: "1 1 auto", fontSize: 14, color: theme.text, lineHeight: 1.55 }}>{text}</div>
    </div>
  );
}

// ---------- 4. Behavior Q&A ----------
function BehaviorScreen({ theme }) {
  return (
    <Phone theme={theme}>
      <TopBar theme={theme} title="问点什么" right={<span style={{ fontSize: 18, fontWeight: 300 }}>＋</span>} />

      <div style={{ flex: "1 1 auto", overflow: "hidden", display: "flex", flexDirection: "column", padding: "0 20px" }}>
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
          }}
        >
          小猫总咬我手,怎么训它不咬?
        </div>

        {/* App answer */}
        <div style={{ alignSelf: "flex-start", maxWidth: "92%", margin: "0 0 14px" }}>
          <div style={{ fontSize: 11, color: theme.text3, letterSpacing: 1.2, marginBottom: 8, textTransform: "uppercase" }}>
            一位懂猫的朋友
          </div>

          <div
            style={{
              background: theme.surface,
              border: `1px solid ${theme.line}`,
              borderRadius: theme.radiusLg,
              padding: "16px 18px",
              fontSize: 14.5,
              lineHeight: 1.65,
              color: theme.text,
            }}
          >
            <p style={{ margin: "0 0 14px" }}>
              3 个月的小猫咬人 <em style={{ fontStyle: "normal", color: theme.text2 }}>大多不是凶</em>——
              它在用嘴探索世界、消耗精力。所以方向是 <em style={{ fontStyle: "normal", color: theme.text }}>转移</em>,不是惩罚。
            </p>

            <div
              style={{
                marginTop: 12,
                paddingTop: 14,
                borderTop: `1px solid ${theme.lineSoft}`,
                fontSize: 12,
                color: theme.text3,
                letterSpacing: 1,
                textTransform: "uppercase",
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              试试这样
            </div>
            <TipRow theme={theme} k="A" text="它咬你的瞬间——停止动作,手变成"一块无聊的木头",然后慢慢抽走。" />
            <TipRow theme={theme} k="B" text="同时塞一个咬咬玩具到它嘴边,让它知道"该咬这个"。" />
            <TipRow theme={theme} k="C" text="每天 2 次、每次 10 分钟用逗猫棒陪它玩到喘——精力够,咬人会少一半。" last />

            <div
              style={{
                marginTop: 14,
                padding: "12px 14px",
                background: theme.bg,
                borderRadius: theme.radiusMd,
                fontSize: 13,
                color: theme.text2,
                lineHeight: 1.6,
              }}
            >
              <strong style={{ color: theme.text, fontWeight: 600 }}>别这样做</strong>
              :拍它鼻子 / 大声吼 / 用手当玩具——会让它把手当成猎物,越来越凶。
            </div>
          </div>

          {/* Follow-ups */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
            <FollowUp theme={theme} text="几个月开始效果最好?" />
            <FollowUp theme={theme} text="推荐什么咬咬玩具?" />
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
          <span style={{ flex: "1 1 auto", fontSize: 14, color: theme.text3 }}>继续问 豆豆的事…</span>
          <button
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              border: "none",
              background: theme.text,
              color: theme.bg,
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
    </Phone>
  );
}

function TipRow({ theme, k, text, last }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "9px 0",
        borderBottom: last ? "none" : `1px solid ${theme.lineSoft}`,
        alignItems: "flex-start",
      }}
    >
      <span
        style={{
          fontFamily: theme.fontDisplay,
          fontSize: 13,
          fontWeight: 600,
          color: theme.accent,
          width: 16,
          flex: "0 0 16px",
          marginTop: 1,
          letterSpacing: 0.5,
        }}
      >
        {k}
      </span>
      <div style={{ flex: "1 1 auto", fontSize: 14, color: theme.text, lineHeight: 1.6 }}>{text}</div>
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
        fontFamily: theme.fontBody,
        cursor: "pointer",
        letterSpacing: 0.2,
      }}
    >
      {text}  →
    </button>
  );
}

// Expose to other Babel scripts
Object.assign(window, {
  HomeScreen,
  TriageScreen,
  ReportScreen,
  BehaviorScreen,
  PHONE_W,
  PHONE_H,
});
