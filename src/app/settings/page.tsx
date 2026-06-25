"use client";

// 设置页(本期主要承载"桌面悬浮宠物"开关,仅安卓真悬浮)。
import { useEffect, useState } from "react";
import Link from "next/link";
import { FloatingPet, isFloatingPetSupported } from "@/lib/floating-pet-bridge";
import { readPersisted, writePersisted } from "@/lib/persist";

const PREF_ON = "floatingPet:on";
const PREF_TAP_BACK = "floatingPet:tapBack"; // 点猫切回 App,默认开
const PREF_BOOT = "floatingPet:boot"; // 开机自动出现,默认关

export default function SettingsPage() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [on, setOn] = useState(false);
  const [tapBack, setTapBack] = useState(true);
  const [boot, setBoot] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // 挂载后读 client-only 偏好(避免 SSR/导出期 hydration 不匹配)。
    /* eslint-disable react-hooks/set-state-in-effect */
    setSupported(isFloatingPetSupported());
    setOn(readPersisted(PREF_ON) === "1");
    setTapBack(readPersisted(PREF_TAP_BACK) !== "0");
    setBoot(readPersisted(PREF_BOOT) === "1");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  async function toggleMain(next: boolean) {
    if (busy) return;
    setBusy(true);
    setHint(null);
    try {
      if (next) {
        let granted = false;
        try {
          ({ granted } = await FloatingPet.requestPermission());
        } catch {
          setOn(false);
          setHint("没能请求权限,请重试。");
          return;
        }
        if (!granted) {
          setOn(false);
          setHint("需要「显示在其他应用上层」权限才能让桌宠出现。已为你保留在 App 院子里。");
          return;
        }
        try {
          await FloatingPet.show();
          writePersisted(PREF_ON, "1");
          setOn(true);
        } catch {
          setOn(false);
          setHint("没能放出桌宠,请重试。");
        }
      } else {
        await FloatingPet.hide().catch(() => {});
        writePersisted(PREF_ON, "0");
        setOn(false);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 430, margin: "0 auto", padding: "20px 16px 96px" }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>设置</h1>

      <section style={{ background: "var(--surface,#fff)", borderRadius: 16, padding: 16 }}>
        <Row
          label="让桌宠出现在桌面"
          sub={
            supported === false
              ? "仅安卓支持悬浮到桌面;iOS 桌宠留在 App 院子里"
              : "小猫会浮在桌面漫游,点它切回 App"
          }
          checked={on}
          disabled={busy || !supported}
          onChange={toggleMain}
        />
        {supported && (
          <>
            <Row
              label="点猫切回 App"
              sub="桌宠浮在桌面时,点它回到 App"
              checked={tapBack}
              onChange={(v) => {
                writePersisted(PREF_TAP_BACK, v ? "1" : "0");
                setTapBack(v);
              }}
            />
            <Row
              label="开机自动出现"
              sub="默认关"
              checked={boot}
              onChange={(v) => {
                writePersisted(PREF_BOOT, v ? "1" : "0");
                setBoot(v);
              }}
            />
          </>
        )}
        {hint && (
          <p style={{ marginTop: 12, fontSize: 13, color: "var(--amber,#b97900)" }}>{hint}</p>
        )}
      </section>

      <Link href="/pets" style={{ display: "block", marginTop: 20, fontSize: 14, opacity: 0.7 }}>
        ← 返回毛孩子
      </Link>
    </main>
  );
}

function Row({
  label, sub, checked, disabled, onChange,
}: {
  label: string; sub?: string; checked: boolean; disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, padding: "12px 0", opacity: disabled ? 0.5 : 1,
      }}
    >
      <span>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{label}</span>
        {sub && <span style={{ display: "block", fontSize: 12, opacity: 0.7, marginTop: 2 }}>{sub}</span>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 22, height: 22, flex: "0 0 auto" }}
      />
    </label>
  );
}
