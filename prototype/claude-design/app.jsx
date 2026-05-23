// Mount the design canvas with three theme sections, each with 4 phone artboards.

const { useEffect } = React;

function ArtboardWrap({ children }) {
  // The phone is 375x812. The artboard is sized exactly to it (no inner padding).
  return <div style={{ width: PHONE_W, height: PHONE_H }}>{children}</div>;
}

function ThemeSwatch({ theme }) {
  const swatches = [theme.bg, theme.text, theme.accent, theme.yellow, theme.red];
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      {swatches.map((c, i) => (
        <span
          key={i}
          style={{
            width: 14,
            height: 14,
            borderRadius: 7,
            background: c,
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.08)",
            display: "inline-block",
          }}
        />
      ))}
    </div>
  );
}

function ThemeSection({ theme }) {
  return (
    <DCSection
      id={`section-${theme.name}`}
      title={theme.name}
      subtitle={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
          <ThemeSwatch theme={theme} />
          <span>{theme.blurb}</span>
        </span>
      }
    >
      <DCArtboard id={`${theme.name}-home`} label="01 · 首页" width={PHONE_W} height={PHONE_H}>
        <ArtboardWrap><HomeScreen theme={theme} /></ArtboardWrap>
      </DCArtboard>
      <DCArtboard id={`${theme.name}-triage`} label="02 · 分诊追问" width={PHONE_W} height={PHONE_H}>
        <ArtboardWrap><TriageScreen theme={theme} /></ArtboardWrap>
      </DCArtboard>
      <DCArtboard id={`${theme.name}-report`} label="03 · 黄档安心报告" width={PHONE_W} height={PHONE_H}>
        <ArtboardWrap><ReportScreen theme={theme} /></ArtboardWrap>
      </DCArtboard>
      <DCArtboard id={`${theme.name}-behavior`} label="04 · 行为问答" width={PHONE_W} height={PHONE_H}>
        <ArtboardWrap><BehaviorScreen theme={theme} /></ArtboardWrap>
      </DCArtboard>
    </DCSection>
  );
}

function App() {
  return (
    <DesignCanvas
      title="安心分诊器  ·  视觉方向探索"
      subtitle="3 个方向 × 4 屏 · 首页 / 分诊追问 / 黄档安心报告 / 行为问答"
    >
      {window.THEMES.map((t) => (
        <ThemeSection key={t.name} theme={t} />
      ))}
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
