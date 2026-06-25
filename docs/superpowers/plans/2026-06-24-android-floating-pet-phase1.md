# 安卓桌面悬浮宠物(Phase 1)实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在安卓上做出"桌面悬浮宠物":一只小猫浮在桌面/其他 App 之上漫游、偶尔卖萌、可点可拖可收回;点猫切回 App;并落地 PRD §5.10 的红黄收敛红线(出红/黄报告后桌宠安静、不诱导回来玩)。

**Architecture:** 三层分工——**原生(Kotlin)管容器与运动**:Capacitor 插件 `FloatingPet` + `specialUse` 前台服务 + `TYPE_APPLICATION_OVERLAY` 小窗口,由 `WindowManager` 移动小窗口实现漫游(避免全屏遮挡),原生处理点/拖/长按与不可见暂停;**WebView 管那只猫**:透明 WebView 加载新页 `/floating-pet`,**复用现成的 `PetSprite` 雪碧图渲染器**画猫,原生经 `evaluateJavascript` 推步态/卖萌/收敛信号;**风险标志做收敛**:App 出红/黄报告时经插件写入原生 `SharedPreferences`,前台服务轮询、命中即让桌宠静默并改变点击导向。

> **关键设计决策(对 PRD §5.5 的正确解法,已据代码侦察收敛)**:`src/components/PetSprite.tsx` **本就是零院子耦合的可复用精灵渲染器**(吃 `state` prop 就画 idle/walk/groom/nap/…),桌宠漫游要的动作它全有。而 `src/app/page.tsx` 里 2409 行的 `PetNudge` 巨石,缠的是**院子专属**的家具/水碗/逗猫棒道具交互——桌面悬浮根本用不上。**所以不肢解那块巨石**:悬浮页直接复用 `PetSprite` + 一个极简漫游控制器(漫游决策放原生,因为是原生在移动窗口)。这既 DRY 又 YAGNI,且正是 §5.5 所说"悬浮页只带必要逻辑、剥离院子耦合"。

**Tech Stack:** 前端 Next.js 16 + React 19 + TS(复用 `PetSprite`);原生 Capacitor 7 Android 插件(Kotlin)+ `WindowManager` overlay + 前台服务(`foregroundServiceType=specialUse`)+ `androidx.webkit` 的 `WebViewAssetLoader`(本地资源以 `https://localhost` 源供给,与 Phase 0 CORS 白名单/Capacitor 源一致)。

**本仓库无单元测试框架**(无 jest/vitest)。本计划的"测试"= 真能跑的最强验证:`npx tsc --noEmit` / `npm run lint` / `npm run build:app` / **Claude preview 工具**(渲染 `/floating-pet`、注入 window 钩子断言收敛)/ Gradle 构建 / 安卓真机(对照 PRD §11 的可度量指标)。原生 Kotlin 不做 TDD —— 以真机行为为验收。

---

## 前置条件(开工前必须满足)

- [ ] **Phase 0 技术门已过**:[Capacitor 地基计划](2026-06-24-capacitor-foundation-phase0.md)全部完成 —— 已有 `build:app`、`out/` 静态导出、`capacitor.config.ts`、`android/` 工程、签名复用、`apiBase`/`IS_APP_SHELL`/`cors` 地基。本计划直接在其上加东西。
- [ ] **安卓真机**(模拟器画不出真实 OEM 杀后台/悬浮窗行为):至少 1 台日常机;§11 验收需 5 个国产 OEM(小米/华为/OPPO/vivo/荣耀)× Android 12–15。
- [ ] **Android Studio + SDK API 35 + JDK 17**;能 `./gradlew assembleRelease`(Phase 0 Task 8 已验)。
- [ ] **调试通道**:Chrome `chrome://inspect` 可连真机 WebView 看悬浮页控制台(排流式/渲染问题)。
- [ ] **部署红线**:本计划全为本地改码 + 本地验证 + commit,**不含上架/部署**(上架是 Phase 3)。
- [ ] **并发协调**:不改 `src/app/page.tsx` 的桌宠逻辑(本计划复用 `PetSprite`、不动院子);开工前 `git status` 看一眼是否有并发改动。

---

## 关键事实(来自代码侦察)

- **`PetSprite`**(`src/components/PetSprite.tsx`):`export default function PetSprite({state, width, fallbackSrc, className, playKey, idleFlourish})`;`state: PetSpriteState`(`idle | running-right | running-left | waving | jumping | … | groom | nap | stretch | yawn | …`);雪碧图 `/pet/spritesheet.webp` 模块级预载;切后台自动暂停;reduced-motion 静止。**可直接复用,无需改它。**
- **风险定级落点**:`src/app/triage/page.tsx` 的 `recordTriage(symptom, tier, claimIds)`(34–56 行),tier 来自 `decideTier`(`src/lib/triage.ts:1004`);`toReport(tier)`(97–111 行)在导航前调用 `recordTriage`。**报告定级完成、即将持久化的那一行 = `saveStore(...)`(triage/page.tsx:55)** —— §5.10 写风险标志的天然位置。
- **持久化**:`src/lib/persist.ts` 的 `readPersisted/writePersisted/removePersisted`(localStorage 主 + Cookie 兜底);`IS_APP_SHELL` 来自 `src/lib/app-env.ts`(Phase 0 建)。
- **设置 IA 现状**:`src/components/TabBar.tsx` 4 个 tab(`/`、`/symptoms`、`/behavior`、`/pets`),`SHOW_PATHS=["/","/symptoms","/behavior","/pets","/knowledge"]`;**无 `/settings` 路由、无 Switch/Toggle 组件**(用原生 checkbox)。
- **包名 / 包目录**:`cn.whatsupkitty.app` → Kotlin 源放 `android/app/src/main/java/cn/whatsupkitty/app/`。
- **桌宠资产**:`public/pet/spritesheet.webp`(主角 19 行状态)+ `public/pet/items/*.webp`(111 张院子道具帧,**本期悬浮宠不用**)+ `public/pet/welcome-hero.webp`(可作 fallback)。

---

## 文件结构(本计划新建/修改)

**前端(TS/TSX):**
- Create `src/lib/floating-pet-bridge.ts` —— Capacitor 插件 JS 接口(Task 1)
- Create `src/lib/risk-flag.ts` —— 红黄风险标志读写 + 纯收敛判定(Task 2)
- Modify `src/app/triage/page.tsx` —— 定级后写风险标志(Task 2)
- Create `src/components/RiskAcknowledge.tsx` + Modify `src/app/report/page.tsx` —— 报告"我知道了"解除收敛(Task 2)
- Create `src/app/floating-pet/page.tsx` —— 悬浮页,复用 PetSprite(Task 3)
- Create `src/app/settings/page.tsx` + Modify `src/components/TabBar.tsx` + `src/app/pets/page.tsx` —— 设置 IA(Task 4)
- Create `src/components/FloatingPetAutostart.tsx` + Modify `src/app/layout.tsx` —— 重开 App 自动放回(Task 4)

**原生(Kotlin/XML/Gradle):**
- Modify `android/app/build.gradle`、`android/build.gradle` —— 启用 Kotlin + 加 `androidx.webkit`(Task 5)
- Create `android/app/src/main/java/cn/whatsupkitty/app/FloatingPetPlugin.kt`(Task 5)
- Create `android/app/src/main/java/cn/whatsupkitty/app/FloatingPetService.kt`(Task 6)
- Modify `android/app/src/main/java/cn/whatsupkitty/app/MainActivity`(注册插件)(Task 7)
- Modify `android/app/src/main/AndroidManifest.xml` —— 权限 + 服务声明(Task 7)
- Modify `capacitor.config.ts` / build flavor —— Google Play 降级(Task 10)

---

## Task 1: Capacitor 插件 JS 接口 `FloatingPet`

**Files:**
- Create: `src/lib/floating-pet-bridge.ts`

- [ ] **Step 1: 写 `src/lib/floating-pet-bridge.ts`**

```typescript
// 悬浮桌宠原生插件的 JS 接口。Web(非 Capacitor)下 registerPlugin 返回的代理
// 调用会抛 "not implemented" —— 调用方一律先用 isFloatingPetSupported() 守门。
import { Capacitor, registerPlugin } from "@capacitor/core";

export interface FloatingPetPlugin {
  /** 当前平台是否支持真悬浮(安卓 = true;iOS / Web = false) */
  isSupported(): Promise<{ supported: boolean }>;
  /** 请求"显示在其他应用上层"权限;返回是否已授权 */
  requestPermission(): Promise<{ granted: boolean }>;
  /** 显示悬浮桌宠(需已授权,否则 reject NO_OVERLAY_PERMISSION) */
  show(): Promise<void>;
  /** 收回悬浮桌宠 */
  hide(): Promise<void>;
  /** 当前是否在显示 */
  isShown(): Promise<{ shown: boolean }>;
  /** 写红黄风险标志(供前台服务收敛);ts 为 epoch ms */
  setRiskFlag(opts: { level: "red" | "yellow"; ts: number }): Promise<void>;
  /** 清除风险标志(解除收敛) */
  clearRiskFlag(): Promise<void>;
}

export const FloatingPet = registerPlugin<FloatingPetPlugin>("FloatingPet");

// 只有安卓原生壳才有真悬浮。Web / iOS 一律 false。
export function isFloatingPetSupported(): boolean {
  return Capacitor.getPlatform() === "android" && Capacitor.isNativePlatform();
}
```

- [ ] **Step 2: 装 `@capacitor/core`(Phase 0 已装则跳过)**

Run: `node -e "require('@capacitor/core')" 2>/dev/null && echo present || npm install @capacitor/core`
Expected: `present` 或安装成功。

- [ ] **Step 3: 类型检查**

Run: `npx tsc --noEmit`
Expected: 0 报错。

- [ ] **Step 4: Commit**

```bash
git add src/lib/floating-pet-bridge.ts package.json package-lock.json
git commit -m "feat(deskpet): FloatingPet 插件 JS 接口 + 平台守门

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: 红黄风险标志 —— 写入(triage)+ 解除(report)(PRD §5.10)

**Files:**
- Create: `src/lib/risk-flag.ts`
- Modify: `src/app/triage/page.tsx`(import + `recordTriage` 末尾)
- Create: `src/components/RiskAcknowledge.tsx`
- Modify: `src/app/report/page.tsx`(挂 RiskAcknowledge)

> **§5.10 解除条件的实现取舍(请用户过目可否)**:PRD 列了"查看/确认报告、点就医、或超 N 小时"。本计划取**显式确认 + N 小时(默认 6h)**,而**不**用"报告页一加载就清除"——因为分诊后用户几乎立刻就看到报告,若一挂载就清,桌面收敛窗口几乎为零、红线形同虚设。所以:出红/黄即置标志;用户在报告里点"我知道了/会尽快处理"或满 6h 才解除。**6h 这个数可改。** 若用户更想要 PRD 字面的"看一眼即解除",把 RiskAcknowledge 换成报告页 mount 时清除即可。

- [ ] **Step 1: 写 `src/lib/risk-flag.ts`**

```typescript
// 红黄风险标志 —— 桌宠收敛红线(PRD §5.10)的可验收落点。
// 写两处:① localStorage(persist,App 内用);② App 壳下经 FloatingPet 插件写进
//   原生 SharedPreferences(WebView 的 localStorage 原生服务读不到,必须经插件桥)。
import { readPersisted, writePersisted, removePersisted } from "@/lib/persist";
import { IS_APP_SHELL } from "@/lib/app-env";

const KEY = "riskFlag:v1";
// 收敛窗口:红黄报告后这段时间内桌宠保持安静(即便用户没回 App)。
// ⚠️ 原生 FloatingPetService 内有同一常量,改这里务必同步改 Kotlin(CONVERGE_WINDOW_MS)。
export const CONVERGE_WINDOW_MS = 6 * 60 * 60 * 1000; // 6h

export type RiskLevel = "red" | "yellow";
export interface RiskFlag {
  level: RiskLevel;
  ts: number; // 写入时刻 epoch ms
}

export function setRiskFlag(level: RiskLevel, nowMs: number): void {
  writePersisted(KEY, JSON.stringify({ level, ts: nowMs } satisfies RiskFlag));
  if (IS_APP_SHELL) {
    void import("@/lib/floating-pet-bridge").then(({ FloatingPet }) =>
      FloatingPet.setRiskFlag({ level, ts: nowMs }).catch(() => {}),
    );
  }
}

export function readRiskFlag(): RiskFlag | null {
  const raw = readPersisted(KEY);
  if (!raw) return null;
  try {
    const f = JSON.parse(raw) as RiskFlag;
    if (f && (f.level === "red" || f.level === "yellow") && typeof f.ts === "number") return f;
  } catch {
    /* 损坏 → 当无 */
  }
  return null;
}

export function clearRiskFlag(): void {
  removePersisted(KEY);
  if (IS_APP_SHELL) {
    void import("@/lib/floating-pet-bridge").then(({ FloatingPet }) =>
      FloatingPet.clearRiskFlag().catch(() => {}),
    );
  }
}

// 纯判定:给定标志与当前时刻,是否仍应收敛(N 小时内)。
export function isConverged(flag: RiskFlag | null, nowMs: number): boolean {
  if (!flag) return false;
  return nowMs - flag.ts < CONVERGE_WINDOW_MS;
}
```

- [ ] **Step 2: triage 定级后写标志**

`src/app/triage/page.tsx` 顶部 import 区(第 16–17 行附近)加:
```typescript
import { setRiskFlag } from "@/lib/risk-flag";
```
在 `recordTriage` 函数体末尾(第 55 行 `saveStore(...)` 之后、函数 `}` 之前)加:
```typescript
  // 红黄报告 → 置风险标志,供桌面悬浮宠收敛(PRD §5.10)。绿档不置、也不清(不影响既有窗口)。
  if (tier === "red" || tier === "yellow") setRiskFlag(tier, Date.now());
```

- [ ] **Step 3: 写 `src/components/RiskAcknowledge.tsx`**

```typescript
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
```

- [ ] **Step 4: 在报告页挂 RiskAcknowledge**

`src/app/report/page.tsx` 顶部 import 区加:
```typescript
import { RiskAcknowledge } from "@/components/RiskAcknowledge";
```
在 `ReportContent` 渲染里 `shownTier`(约第 1500 行定义)在作用域内、首个 `<TierIcon tier={shownTier} />`(约第 1587 行)所在的报告头区块之后,插一行:
```typescript
        <RiskAcknowledge tier={shownTier} />
```
> `shownTier` 是报告最终档位(已含绿档强制升黄等防御);RiskAcknowledge 内部对绿档返回 null,放哪个 tier 区块都安全。

- [ ] **Step 5: 类型检查 + lint + Web 构建**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: 0 报错。Web 下 `IS_APP_SHELL=false` → 只写 localStorage、不碰插件。

- [ ] **Step 6: preview 验证标志读写闭环(这就是 risk-flag 的测试)**

```
preview_start(若未起)→ 打开 http://localhost:3000/triage?symptom=breath(呼吸困难=红线轨道)
走完到报告 → preview_eval: localStorage.getItem("riskFlag:v1")
```
Expected: 返回形如 `{"level":"red","ts":<数字>}`。再在报告点"我知道了" → `preview_eval: localStorage.getItem("riskFlag:v1")` → `null`。
> 这条 preview 闭环验证了 setRiskFlag/readRiskFlag/clearRiskFlag 与 triage/report 接线;`isConverged` 的 N 小时边界由原生服务在 Task 9 真机验收(其逻辑就两行,被此集成路径覆盖)。

- [ ] **Step 7: Commit**

```bash
git add src/lib/risk-flag.ts src/app/triage/page.tsx src/components/RiskAcknowledge.tsx src/app/report/page.tsx
git commit -m "feat(deskpet): 红黄风险标志写入(triage)+ 显式解除(report)— §5.10

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: 悬浮页 `/floating-pet` —— 复用 PetSprite 的纯渲染页

**Files:**
- Create: `src/app/floating-pet/page.tsx`

> 这页跑在原生悬浮窗的透明 WebView 里。**位置/漫游由原生移动小窗口驱动**,本页只画猫 + 按原生经 `evaluateJavascript` 推来的钩子切动作。透明背景是关键。

- [ ] **Step 1: 写 `src/app/floating-pet/page.tsx`**

```typescript
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
```

- [ ] **Step 2: 确认 TabBar 不会在悬浮页冒出来**

`src/components/TabBar.tsx` 的 `SHOW_PATHS` **不包含** `/floating-pet`(它不在列表里 → TabBar 自动隐藏)。无需改动,但执行时确认一眼。

- [ ] **Step 3: preview 验证渲染 + 钩子(这就是悬浮页的测试)**

```
打开 http://localhost:3000/floating-pet
preview_screenshot  → 应见一只猫在底部居中、背景透明(preview 里可能显白底,但无 TabBar/无暖白卡片)
preview_eval: window.__fpGait("running-left")   → 猫切跑动
preview_eval: window.__fpConverged(true)        → 猫趴下(nap)、不再卖萌
preview_eval: window.__fpReact()                → 收敛态下应无反应(被无视)
preview_eval: window.__fpConverged(false); window.__fpReact()  → 猫挥手
preview_console_logs → 无报错
```
Expected: 各钩子如注释生效,无控制台错误。

- [ ] **Step 4: App 静态导出含该页**

Run: `npm run build:app && ls out/floating-pet* 2>/dev/null; ls out/floating-pet/ 2>/dev/null`
Expected: 出现 `out/floating-pet.html` **或** `out/floating-pet/index.html`(取决于 Next 导出形态)。**记下确切路径** —— Task 6 的原生 `loadUrl` 要用它。

- [ ] **Step 5: Commit**

```bash
git add src/app/floating-pet/page.tsx
git commit -m "feat(deskpet): /floating-pet 悬浮页(复用 PetSprite,透明底,原生钩子)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: 设置 IA —— `/settings` 页 + 入口 + 重开自动放回

**Files:**
- Create: `src/app/settings/page.tsx`
- Modify: `src/components/TabBar.tsx`(`SHOW_PATHS` 加 `/settings`)
- Modify: `src/app/pets/page.tsx`(加"设置"入口)
- Create: `src/components/FloatingPetAutostart.tsx`
- Modify: `src/app/layout.tsx`(挂 autostart,App 壳限定)

- [ ] **Step 1: 写 `src/app/settings/page.tsx`**

```typescript
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

  useEffect(() => {
    setSupported(isFloatingPetSupported());
    setOn(readPersisted(PREF_ON) === "1");
    setTapBack(readPersisted(PREF_TAP_BACK) !== "0");
    setBoot(readPersisted(PREF_BOOT) === "1");
  }, []);

  async function toggleMain(next: boolean) {
    setHint(null);
    if (next) {
      const { granted } = await FloatingPet.requestPermission();
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
          disabled={!supported}
          onChange={toggleMain}
        />
        {supported && (
          <>
            <Row
              label="点猫切回 App"
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
```

- [ ] **Step 2: TabBar 在 `/settings` 仍显示**

`src/components/TabBar.tsx` 把 `SHOW_PATHS` 加上 `/settings`:
```typescript
const SHOW_PATHS = ["/", "/symptoms", "/behavior", "/pets", "/knowledge", "/settings"];
```
（不新增第 5 个 tab —— 设置是二级页,从 `/pets` 进。)

- [ ] **Step 3: `/pets` 页加"设置"入口**

`src/app/pets/page.tsx` 顶部确保 `import Link from "next/link";`(没有则加),在页面标题/头部区合适处加一个入口:
```tsx
<Link href="/settings" aria-label="设置" style={{ fontSize: 14, opacity: 0.8 }}>
  设置
</Link>
```
> 放在 pets 页 hero 顶栏右侧(与现有"编辑"等入口同排)。位置以现有头部布局为准,只需是该页可点到的入口。

- [ ] **Step 4: 写 `src/components/FloatingPetAutostart.tsx`(重开 App 自动放回)**

```typescript
"use client";

// 重开 App 时,若用户上次开着桌宠且权限仍在 → 自动放回桌面(PRD §5.7「记住偏好」)。
// 仅 App 壳 + 安卓;静默失败。
import { useEffect } from "react";
import { FloatingPet, isFloatingPetSupported } from "@/lib/floating-pet-bridge";
import { readPersisted } from "@/lib/persist";

export function FloatingPetAutostart() {
  useEffect(() => {
    if (!isFloatingPetSupported()) return;
    if (readPersisted("floatingPet:on") !== "1") return;
    void (async () => {
      try {
        const { granted } = await FloatingPet.requestPermission();
        if (granted) await FloatingPet.show();
      } catch {
        /* 静默 */
      }
    })();
  }, []);
  return null;
}
```

- [ ] **Step 5: layout 挂 autostart(App 壳限定)**

`src/app/layout.tsx` import 区加:
```typescript
import { FloatingPetAutostart } from "@/components/FloatingPetAutostart";
```
`<body>` 内(`IS_APP_SHELL` 已在 Phase 0 import)加:
```typescript
        {IS_APP_SHELL && <FloatingPetAutostart />}
```

- [ ] **Step 6: 校验 + preview**

Run: `npx tsc --noEmit && npm run lint && npm run build:app`
然后 preview 打开 `http://localhost:3000/settings`:Web 下 `isFloatingPetSupported()=false` → 主开关置灰、标"仅安卓"。`preview_screenshot` 确认。
Expected: 0 报错;设置页渲染、Web 下主开关 disabled。

- [ ] **Step 7: Commit**

```bash
git add src/app/settings/page.tsx src/components/TabBar.tsx src/app/pets/page.tsx \
  src/components/FloatingPetAutostart.tsx src/app/layout.tsx
git commit -m "feat(deskpet): 设置页 + 入口 + 重开自动放回(§5.7)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: 原生 Kotlin 插件 `FloatingPetPlugin` + 启用 Kotlin/webkit

**Files:**
- Modify: `android/build.gradle`、`android/app/build.gradle`(Kotlin + androidx.webkit)
- Create: `android/app/src/main/java/cn/whatsupkitty/app/FloatingPetPlugin.kt`

- [ ] **Step 1: 在 `android/build.gradle` 加 Kotlin gradle 插件 classpath(若无)**

`buildscript { dependencies { ... } }` 里加(版本对齐项目 AGP,Capacitor 7 一般用 Kotlin 1.9+):
```gradle
        classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.25'
```

- [ ] **Step 2: 在 `android/app/build.gradle` 启用 Kotlin + 加依赖**

文件顶部 `apply plugin` 区(`com.android.application` 之后)加:
```gradle
apply plugin: 'kotlin-android'
```
`dependencies { }` 里加:
```gradle
    implementation "org.jetbrains.kotlin:kotlin-stdlib:1.9.25"
    implementation "androidx.webkit:webkit:1.11.0"
    implementation "androidx.core:core-ktx:1.13.1"
```

- [ ] **Step 3: 写 `FloatingPetPlugin.kt`**

```kotlin
package cn.whatsupkitty.app

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.activity.result.ActivityResult
import androidx.core.content.ContextCompat
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "FloatingPet")
class FloatingPetPlugin : Plugin() {

    @PluginMethod
    fun isSupported(call: PluginCall) {
        val ret = JSObject()
        ret.put("supported", Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
        call.resolve(ret)
    }

    @PluginMethod
    fun requestPermission(call: PluginCall) {
        if (Settings.canDrawOverlays(context)) {
            val ret = JSObject(); ret.put("granted", true); call.resolve(ret); return
        }
        val intent = Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:" + context.packageName),
        )
        startActivityForResult(call, intent, "overlayPermResult")
    }

    @ActivityCallback
    private fun overlayPermResult(call: PluginCall, result: ActivityResult) {
        val ret = JSObject()
        ret.put("granted", Settings.canDrawOverlays(context))
        call.resolve(ret)
    }

    @PluginMethod
    fun show(call: PluginCall) {
        if (!Settings.canDrawOverlays(context)) {
            call.reject("NO_OVERLAY_PERMISSION"); return
        }
        val i = Intent(context, FloatingPetService::class.java).apply { action = FloatingPetService.ACTION_SHOW }
        ContextCompat.startForegroundService(context, i)
        call.resolve()
    }

    @PluginMethod
    fun hide(call: PluginCall) {
        val i = Intent(context, FloatingPetService::class.java).apply { action = FloatingPetService.ACTION_HIDE }
        context.startService(i)
        call.resolve()
    }

    @PluginMethod
    fun isShown(call: PluginCall) {
        val ret = JSObject(); ret.put("shown", FloatingPetService.isRunning); call.resolve(ret)
    }

    @PluginMethod
    fun setRiskFlag(call: PluginCall) {
        val level = call.getString("level") ?: run { call.reject("level required"); return }
        val ts = (call.getDouble("ts") ?: System.currentTimeMillis().toDouble()).toLong()
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString("risk_level", level).putLong("risk_ts", ts).apply()
        call.resolve()
    }

    @PluginMethod
    fun clearRiskFlag(call: PluginCall) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .remove("risk_level").remove("risk_ts").apply()
        call.resolve()
    }

    companion object {
        const val PREFS = "floating_pet"
    }
}
```

- [ ] **Step 4: Gradle 能识别 Kotlin(编译占位通过)**

此时 `FloatingPetService` 还没建,先不整体编译。仅确认 Kotlin 工具链就绪:
```bash
cd android && ./gradlew :app:compileDebugKotlin 2>&1 | tail -20 ; cd ..
```
Expected: 报错应仅是"找不到 FloatingPetService 符号"(说明 Kotlin 在编译、就差 Task 6 的类),**不应**是"未知 'kotlin-android' 插件"之类工具链错。若是工具链错,回 Step 1/2 修。

- [ ] **Step 5: Commit**

```bash
git add android/build.gradle android/app/build.gradle \
  android/app/src/main/java/cn/whatsupkitty/app/FloatingPetPlugin.kt
git commit -m "feat(deskpet): FloatingPetPlugin(Kotlin)+ 启用 kotlin/androidx.webkit

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: 前台服务 + 悬浮窗 + 漫游/触摸/收敛 `FloatingPetService`

**Files:**
- Create: `android/app/src/main/java/cn/whatsupkitty/app/FloatingPetService.kt`

> 本任务是 Phase 1 的核心原生件:`specialUse` 前台服务承载透明 WebView 悬浮窗,`WindowManager` 移动小窗口做漫游,原生处理触摸,轮询风险标志做收敛,屏幕关时暂停省电。

- [ ] **Step 1: 写 `FloatingPetService.kt`**

```kotlin
package cn.whatsupkitty.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.WebViewAssetLoader
import kotlin.math.abs
import kotlin.random.Random

class FloatingPetService : Service() {

    private lateinit var wm: WindowManager
    private var webView: WebView? = null
    private lateinit var params: WindowManager.LayoutParams
    private val handler = Handler(Looper.getMainLooper())
    private var added = false
    private var paused = false

    // 漫游状态
    private enum class Phase { IDLE, WALK_L, WALK_R, GROOM }
    private var phase = Phase.IDLE
    private var phaseTicksLeft = 0
    private var screenW = 0

    // 收敛
    private var lastConverged = false
    private var riskCheckAccumMs = 0

    // 触摸
    private var downX = 0f; private var downY = 0f
    private var startWinX = 0; private var startWinY = 0
    private var dragging = false
    private var downAt = 0L
    private val longPress = Runnable { hideAndStop() }

    private val screenReceiver = object : BroadcastReceiver() {
        override fun onReceive(c: Context?, i: Intent?) {
            when (i?.action) {
                Intent.ACTION_SCREEN_OFF -> { paused = true; webView?.onPause(); evalGait("nap") }
                Intent.ACTION_SCREEN_ON -> { paused = false; webView?.onResume() }
            }
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        wm = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        screenW = resources.displayMetrics.widthPixels
        registerReceiver(screenReceiver, IntentFilter().apply {
            addAction(Intent.ACTION_SCREEN_OFF); addAction(Intent.ACTION_SCREEN_ON)
        })
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_HIDE -> { hideAndStop(); return START_NOT_STICKY }
            else -> showOverlay() // ACTION_SHOW 或被系统重启(intent=null)
        }
        return START_STICKY
    }

    private fun startForegroundNotif() {
        val chId = "floating_pet"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = getSystemService(NotificationManager::class.java)
            if (nm.getNotificationChannel(chId) == null) {
                nm.createNotificationChannel(
                    NotificationChannel(chId, "桌面桌宠", NotificationManager.IMPORTANCE_MIN),
                )
            }
        }
        val notif: Notification = Notification.Builder(this, chId)
            .setContentTitle("小猫在桌面陪着你")
            .setContentText("点设置可收回")
            .setSmallIcon(applicationInfo.icon)
            .setOngoing(true)
            .build()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIF_ID, notif, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else {
            startForeground(NOTIF_ID, notif)
        }
    }

    private fun showOverlay() {
        startForegroundNotif()
        if (added) return
        isRunning = true

        val assetLoader = WebViewAssetLoader.Builder()
            .setDomain("localhost")
            .setHttpAllowed(false)
            .addPathHandler("/", PublicAssetsHandler(this))
            .build()

        val wv = WebView(this).apply {
            setBackgroundColor(Color.TRANSPARENT)
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                    assetLoader.shouldInterceptRequest(request.url)
            }
            setOnTouchListener { _, e -> onTouch(e) }
            // ⚠️ Task 3 Step 4 记下的确切路径:floating-pet/ 或 floating-pet.html
            loadUrl("https://localhost/floating-pet/")
        }
        webView = wv

        val type =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE
        params = WindowManager.LayoutParams(
            dp(120), dp(150), type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = dp(40); y = dp(320)
        }
        wm.addView(wv, params)
        added = true
        handler.postDelayed(roam, ROAM_INTERVAL_MS)
    }

    // ---- 漫游循环:移动小窗口 + 推步态给 WebView ----
    private val roam = object : Runnable {
        override fun run() {
            if (added && !paused) {
                checkRisk()
                if (!lastConverged) stepRoam()
            }
            handler.postDelayed(this, ROAM_INTERVAL_MS)
        }
    }

    private fun stepRoam() {
        if (phaseTicksLeft <= 0) pickPhase()
        phaseTicksLeft--
        when (phase) {
            Phase.WALK_L -> moveWindow(-WALK_STEP_PX)
            Phase.WALK_R -> moveWindow(WALK_STEP_PX)
            else -> {}
        }
    }

    private fun pickPhase() {
        // 简单随机:idle / 左走 / 右走 / 洗脸。靠边则回头。
        val atLeft = params.x <= dp(8)
        val atRight = params.x >= screenW - dp(128)
        phase = when (Random.nextInt(100)) {
            in 0..44 -> Phase.IDLE
            in 45..69 -> if (atRight) Phase.WALK_L else Phase.WALK_R
            in 70..94 -> if (atLeft) Phase.WALK_R else Phase.WALK_L
            else -> Phase.GROOM
        }
        phaseTicksLeft = when (phase) {
            Phase.IDLE -> 60 + Random.nextInt(60)   // ~2.4–4.8s
            Phase.GROOM -> 80
            else -> 40 + Random.nextInt(40)         // 走一段
        }
        evalGait(
            when (phase) {
                Phase.IDLE -> "idle"
                Phase.GROOM -> "groom"
                Phase.WALK_L -> "running-left"
                Phase.WALK_R -> "running-right"
            },
        )
    }

    private fun moveWindow(dx: Int) {
        if (!added) return
        params.x = (params.x + dx).coerceIn(dp(4), screenW - dp(124))
        wm.updateViewLayout(webView, params)
    }

    // ---- 风险收敛:轮询 SharedPreferences ----
    private fun checkRisk() {
        riskCheckAccumMs += ROAM_INTERVAL_MS
        if (riskCheckAccumMs < RISK_POLL_MS) return
        riskCheckAccumMs = 0
        val sp = getSharedPreferences(FloatingPetPlugin.PREFS, Context.MODE_PRIVATE)
        val level = sp.getString("risk_level", null)
        val ts = sp.getLong("risk_ts", 0L)
        val converged = level != null && (System.currentTimeMillis() - ts) < CONVERGE_WINDOW_MS
        if (converged != lastConverged) {
            lastConverged = converged
            evalConverged(converged)
            if (converged) { phase = Phase.IDLE; phaseTicksLeft = Int.MAX_VALUE }
            else { phaseTicksLeft = 0 }
        }
    }

    // ---- 触摸:点(切回/导向就医)/ 拖 / 长按收回 ----
    private fun onTouch(e: MotionEvent): Boolean {
        when (e.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                downX = e.rawX; downY = e.rawY
                startWinX = params.x; startWinY = params.y
                dragging = false; downAt = System.currentTimeMillis()
                handler.postDelayed(longPress, LONG_PRESS_MS)
                return true
            }
            MotionEvent.ACTION_MOVE -> {
                val dx = e.rawX - downX; val dy = e.rawY - downY
                if (!dragging && (abs(dx) > TOUCH_SLOP || abs(dy) > TOUCH_SLOP)) {
                    dragging = true; handler.removeCallbacks(longPress)
                }
                if (dragging) {
                    params.x = (startWinX + dx.toInt()).coerceIn(0, screenW - dp(120))
                    params.y = (startWinY + dy.toInt()).coerceAtLeast(0)
                    wm.updateViewLayout(webView, params)
                }
                return true
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                handler.removeCallbacks(longPress)
                val quick = System.currentTimeMillis() - downAt < LONG_PRESS_MS
                if (!dragging && quick) onTap()
                return true
            }
        }
        return false
    }

    private fun onTap() {
        if (lastConverged) {
            // 收敛态:不诱导玩,直接打开 App(用户去看红黄报告/就医引导)。
            openApp()
        } else {
            evalReact()        // 卖萌挥手
            openApp()          // 点猫切回 App
        }
    }

    private fun openApp() {
        val launch = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
        }
        if (launch != null) startActivity(launch)
    }

    // ---- JS 桥 ----
    private fun evalGait(s: String) = eval("window.__fpGait && window.__fpGait('$s')")
    private fun evalReact() = eval("window.__fpReact && window.__fpReact()")
    private fun evalConverged(c: Boolean) = eval("window.__fpConverged && window.__fpConverged($c)")
    private fun eval(js: String) {
        val wv = webView ?: return
        wv.post { wv.evaluateJavascript(js, null) }
    }

    private fun hideAndStop() {
        handler.removeCallbacks(roam)
        if (added) { runCatching { wm.removeView(webView) }; added = false }
        webView?.destroy(); webView = null
        isRunning = false
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        super.onDestroy()
        runCatching { unregisterReceiver(screenReceiver) }
        if (added) runCatching { wm.removeView(webView) }
        webView?.destroy(); webView = null
        isRunning = false
    }

    private fun dp(v: Int): Int = (v * resources.displayMetrics.density).toInt()

    // 把导出的静态站(assets/public)以 https://localhost 供给悬浮 WebView。
    private class PublicAssetsHandler(private val ctx: Context) : WebViewAssetLoader.PathHandler {
        override fun handle(path: String): WebResourceResponse? {
            val clean = path.trim('/')
            val candidates = listOf("public/$clean", "public/$clean/index.html", "public/$clean.html")
            for (cand in candidates) {
                try {
                    val stream = ctx.assets.open(cand)
                    return WebResourceResponse(mime(cand), null, stream)
                } catch (_: Exception) { /* 试下一个 */ }
            }
            return null
        }
        private fun mime(p: String): String = when {
            p.endsWith(".html") -> "text/html"
            p.endsWith(".js") -> "application/javascript"
            p.endsWith(".css") -> "text/css"
            p.endsWith(".webp") -> "image/webp"
            p.endsWith(".png") -> "image/png"
            p.endsWith(".jpg") || p.endsWith(".jpeg") -> "image/jpeg"
            p.endsWith(".svg") -> "image/svg+xml"
            p.endsWith(".json") -> "application/json"
            p.endsWith(".woff2") -> "font/woff2"
            else -> "application/octet-stream"
        }
    }

    companion object {
        const val ACTION_SHOW = "cn.whatsupkitty.app.SHOW_PET"
        const val ACTION_HIDE = "cn.whatsupkitty.app.HIDE_PET"
        private const val NOTIF_ID = 4711
        private const val ROAM_INTERVAL_MS = 40L
        private const val RISK_POLL_MS = 1000
        private const val WALK_STEP_PX = 3
        private const val LONG_PRESS_MS = 600L
        private const val TOUCH_SLOP = 24f
        // ⚠️ 与 src/lib/risk-flag.ts 的 CONVERGE_WINDOW_MS 必须一致(6h)。
        private const val CONVERGE_WINDOW_MS = 6L * 60 * 60 * 1000
        @Volatile var isRunning = false
    }
}
```

- [ ] **Step 2: 编译(单元级验证 = Gradle 编过)**

```bash
cd android && ./gradlew :app:compileDebugKotlin 2>&1 | tail -25 ; cd ..
```
Expected: BUILD SUCCESSFUL(或仅剩"MainActivity 未注册插件/manifest 未声明服务"之类——那是 Task 7,代码本身应编过)。报错按提示修(常见:import 缺失、API level 常量名)。

- [ ] **Step 3: Commit**

```bash
git add android/app/src/main/java/cn/whatsupkitty/app/FloatingPetService.kt
git commit -m "feat(deskpet): 前台服务+悬浮窗+漫游/触摸/收敛/省电(specialUse)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: 注册插件 + AndroidManifest 权限与服务声明

**Files:**
- Modify: `android/app/src/main/java/cn/whatsupkitty/app/MainActivity`(`.java` 或 `.kt`)
- Modify: `android/app/src/main/AndroidManifest.xml`

- [ ] **Step 1: MainActivity 注册插件**

`cap add android` 生成的是 `MainActivity.java`。打开它,改成在 `onCreate` 注册:
```java
package cn.whatsupkitty.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(FloatingPetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
```
> 若项目把 MainActivity 换成 Kotlin,则 `override fun onCreate(savedInstanceState: Bundle?) { registerPlugin(FloatingPetPlugin::class.java); super.onCreate(savedInstanceState) }`。

- [ ] **Step 2: AndroidManifest 加权限**

`android/app/src/main/AndroidManifest.xml` 的 `<manifest>` 下、`<application>` 前加:
```xml
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_SPECIAL_USE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

- [ ] **Step 3: AndroidManifest 声明服务(specialUse + 子类型说明)**

`<application>` 内加:
```xml
        <service
            android:name=".FloatingPetService"
            android:exported="false"
            android:foregroundServiceType="specialUse">
            <property
                android:name="android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE"
                android:value="User-enabled desktop companion pet that floats over the home screen and must keep its overlay animation alive while shown." />
        </service>
```
> 这段说明会被 Google Play 审(PRD §5.9);Task 10 备审材料时引用它。

- [ ] **Step 4: 整体 Debug 构建**

```bash
npm run build:app && npx cap sync android
cd android && ./gradlew assembleDebug 2>&1 | tail -25 ; cd ..
```
Expected: BUILD SUCCESSFUL,产出 `android/app/build/outputs/apk/debug/app-debug.apk`。

- [ ] **Step 5: Commit**

```bash
git add android/app/src/main/java/cn/whatsupkitty/app/MainActivity* android/app/src/main/AndroidManifest.xml
git commit -m "feat(deskpet): 注册 FloatingPet 插件 + 悬浮窗/FGS specialUse 权限声明

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: 单机真机冒烟 —— 跑通悬浮全链路

**Files:** 无;真机验证。

- [ ] **Step 1: 装到真机并打开桌宠**

```bash
npx cap run android   # 选真机
```
进 App →（首启重置提示）→ 建档 → `/pets` → 设置 → 开"让桌宠出现在桌面" → 系统跳授权页授权 → 返回。
Expected: 桌宠浮现;按 Home 回桌面,小猫在桌面漫游、偶尔洗脸;常驻一条最低优先级通知。

- [ ] **Step 2: 逐项验交互**

| 行为 | 操作 | 期望 |
|---|---|---|
| 漫游 | 看一会儿 | 小猫左右走 + 停下 + 偶尔 groom,不卡死、不全屏挡 |
| 点猫切回 | 点小猫 | 挥手一下 + App 切到前台 |
| 拖动 | 按住拖 | 跟手移动,松手停在原地 |
| 长按收回 | 长按 ≥0.6s | 桌宠消失、通知消失 |
| 设置关 | 设置里关主开关 | 桌宠消失 |
| 重开自动放回 | 杀 App 再开 | 桌宠自动浮现(权限仍在 + 上次为 on) |
| 不可见暂停 | 锁屏再解锁 | 锁屏时不动(省电),解锁恢复 |

- [ ] **Step 3: 验红黄收敛(§5.10 验收)**

桌宠开着 → 进 App 走"呼吸困难"红线轨道到红档报告 → 回桌面观察。
Expected:**≤2s 内**小猫进入收敛态(趴下/安静、不再卖萌);此时**点它不再挥手玩,而是直接打开 App**。再进报告点"我知道了" → 回桌面,小猫恢复常态(走动/卖萌)。
> 若收敛不生效:`chrome://inspect` 看悬浮 WebView 是否收到 `__fpConverged`;确认 `setRiskFlag` 经插件写进了 SharedPreferences(`adb shell run-as cn.whatsupkitty.app cat /data/data/cn.whatsupkitty.app/shared_prefs/floating_pet.xml`)。

- [ ] **Step 4: 记录问题、修、复验**

发现问题(渲染/触摸/收敛/暂停)→ 改对应文件(web 改 `/floating-pet`、原生改 service)→ `npm run build:app && npx cap sync android && npx cap run android` 复验。每修一类 commit 一次。

---

## Task 9: 多 OEM 验收(对照 PRD §11 可度量指标)

**Files:** Create `docs/superpowers/plans/2026-06-24-android-floating-pet-phase1-results.md`(验收记录)。

- [ ] **Step 1: 出 release 包**

```bash
npm run build:app && npx cap sync android
cd android && ./gradlew assembleRelease ; cd ..
```
（签名复用 Phase 0 Task 8 的 keystore。)

- [ ] **Step 2: 5 个国产 OEM × Android 12–15 矩阵验收**

每台机记录(写进 results.md):
- **基础**:能放出来 / 漫游 / 点击切回 / 设置控制 —— ✅/❌。
- **后台存活 ≥ 60 分钟**(关电池优化、亮屏):✅/❌ + 实际存活时长。
- **悬浮态增量耗电 ≤ 5%/小时**:同机空闲为 baseline,前后各采样 30 分钟取差。
- **可见态帧率 ≥ 30fps、点击响应 ≤ 200ms**:目测顺滑 + 点击到挥手/切回的延迟。
- **红黄收敛 ≤ 2s 生效**:Task 8 Step 3 在每台复测。
- **崩溃率 < 1%、无 ANR**:操作 10 分钟无崩溃/无"应用无响应"。
- **授权转化**:记录授权页是否清晰、是否一次成功。

- [ ] **Step 3: OEM 杀后台缓解(如实记录,不强求根治)**

小米/华为等会激进杀后台。常驻通知 + 正确 FGS 已缓解;若某 OEM 仍秒杀,记录现象 + 是否需引导用户"允许自启动/后台运行"。**这是已知风险(PRD §10),如实告知用户、不假装解决。**

- [ ] **Step 4: 写验收结论**

results.md 给出矩阵表 + 是否达 §11 各阈值 + 未达项的原因与后续。**多数机型达标 = Phase 1 验收通过。**

---

## Task 10: Google Play 降级路线(PRD §5.9,防单点卡上架)

**Files:**
- Modify: `src/lib/floating-pet-bridge.ts`(或新增构建标志)
- Modify: `src/app/settings/page.tsx`、`AndroidManifest.xml`(Play 变体去悬浮)

> 目的:若 Google Play 拒 `specialUse` FGS / 悬浮窗,**Play 版移除悬浮桌宠、退回 App 内院子桌宠**,悬浮作为"仅直链 APK 渠道"特性,不阻塞 Play 上架。

- [ ] **Step 1: 引入构建期开关 `NEXT_PUBLIC_FLOATING_PET`**

`src/lib/floating-pet-bridge.ts` 的 `isFloatingPetSupported()` 改为同时看构建开关:
```typescript
export function isFloatingPetSupported(): boolean {
  if (process.env.NEXT_PUBLIC_FLOATING_PET === "0") return false; // Play 版关闭
  return Capacitor.getPlatform() === "android" && Capacitor.isNativePlatform();
}
```
设置页与 autostart 已统一走 `isFloatingPetSupported()` → 一处关、全链路退回(开关置灰/隐藏、不自启)。

- [ ] **Step 2: 两条 App 构建命令**

`package.json` 的 `build:app` 保持直链渠道(含悬浮);另加 Play 渠道:
```json
    "build:app:play": "BUILD_TARGET=app NEXT_PUBLIC_API_BASE=https://www.whatsupkitty.cn NEXT_PUBLIC_APP_SHELL=1 NEXT_PUBLIC_FLOATING_PET=0 next build --webpack && node scripts/clean-app-export.mjs",
```

- [ ] **Step 3: Play 变体去掉悬浮窗权限 / FGS(可选,先决定再做)**

Play 版若要彻底干净,用 Gradle product flavor(`direct` / `play`)让 `play` flavor 的 manifest 不含 `SYSTEM_ALERT_WINDOW` / `FOREGROUND_SERVICE_SPECIAL_USE` 与 service 声明。**这步工作量不小,且取决于 Play 是否真拒**——**先按 PRD §5.9 决策:是否现在就做 Play 变体,还是先提交带说明材料试审,被拒再降级。** 默认:先备审材料(引用 Task 7 Step 3 的子类型说明)试审,被拒再做 flavor。

- [ ] **Step 4: 记录决策 + Commit(若改了 1/2 步)**

```bash
git add src/lib/floating-pet-bridge.ts package.json
git commit -m "feat(deskpet): Google Play 降级开关(NEXT_PUBLIC_FLOATING_PET=0 退回院子桌宠)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## 自查清单(Self-Review,对照 PRD v1.2 §5/§9/§11)

- **§5.1 仅安卓真悬浮**:✅ `isFloatingPetSupported()`(android+native)、iOS `isSupported=false`、设置页置灰(Task 1/4)。
- **§5.2 漫游 + 复用帧 + 点击**:✅ 复用 `PetSprite`(Task 3)、原生漫游(Task 6)、点击(Task 6 onTap)。
- **§5.3 渲染架构(原生容器+WebView 猫+不可见暂停)**:✅ Task 6(overlay/WindowManager 移动小窗口/screen off 暂停 + webView.onPause)。
- **§5.4 组件拆分**:✅ 插件(Task 5)/前台服务(Task 6)/悬浮 View(Task 6)/floating-pet web(Task 3)/设置(Task 4)。
- **§5.5 共享猫组件**:✅ 复用 PetSprite(剥离院子耦合的正确解法,见架构决策)。
- **§5.6 交互流程**:✅ 设置开 → 查权限 → 授权 → show → 漫游;点=切回(+卖萌)、拖=挪、长按=收回(Task 4/6)。
- **§5.7 设置项(新 IA)**:✅ `/settings` + 入口 + 主开关/拒绝回弹/记住偏好/点猫切回/开机出现(Task 4)。
- **§5.8 iOS**:✅ 插件 isSupported=false、设置隐藏/置灰(Task 1/4);院子桌宠不动(不改 page.tsx)。
- **§5.9 权限/FGS/降级**:✅ 悬浮窗授权 UX + 拒绝兜底(Task 4)、specialUse 声明+子类型(Task 7)、Play 降级(Task 10);OEM 杀后台如实记录(Task 9)。
- **§5.10 红黄收敛(可验收)**:✅ 持久标志(Task 2 risk-flag + 插件 SharedPreferences)、原生轮询(Task 6 checkRisk)、收敛行为(静默 + 点击导向 App 而非玩)、解除(显式确认/6h)、≤2s 验收(Task 8/9)。
- **§9 红线**:✅ 桌宠收敛不诱导回玩;不碰风险三色;不改医学内容;无账号。
- **§11 可度量**:✅ Task 9 矩阵(60min 存活 / ≤5%耗电 / ≥30fps / ≤200ms / ≤2s 收敛 / 崩溃<1%)。

**Placeholder 扫描**:所有代码步骤给出完整代码或确切 before/after + 行号;原生 Kotlin 为可编译完整类;`loadUrl` 路径在 Task 3 Step 4 明确"记下确切路径"。
**类型/符号一致性**:JS 钩子 `__fpGait/__fpReact/__fpConverged`(floating-pet 页 ↔ service eval)一致;`FloatingPet` 插件方法名(bridge.ts ↔ FloatingPetPlugin.kt:isSupported/requestPermission/show/hide/isShown/setRiskFlag/clearRiskFlag)一致;`PREFS="floating_pet"` 与 `risk_level/risk_ts` 键(plugin ↔ service)一致;`CONVERGE_WINDOW_MS=6h`(risk-flag.ts ↔ service)需手动保持一致(两处均有 ⚠️ 注释)。

---

## 已知风险与后续(承 PRD §10/§12)

- **OEM 杀后台**:缓解非根治(Task 9 记录);后续可加"自启动引导"。
- **悬浮 WebView 性能**:低端机/老 WebView 实测(Task 9);必要时降帧/简化。
- **深链到具体报告**:本期收敛态点击 = 打开 App 首页(红记录在"最近"可点回);"直接打开该报告"为后续细化(需给 MainActivity 传 route 并在壳内导航)。
- **开机自启**(`floatingPet:boot`=on):本期只持久化偏好 + 重开 App 自动放回;**设备开机即自启**需 `RECEIVE_BOOT_COMPLETED` + 开机广播接收器,为后续增量(默认关,影响面小)。
- **流式跨源**:依赖 Phase 0 Task 10 的结论;若降级为非流式,问答在 App 内仍可用。

---

## 执行交接

Phase 1 验收通过后,本期(原生化 + 安卓悬浮桌宠)即完成。后续 Phase 2(推送)/ Phase 3(上架)按 PRD §6/§7 单独成计划。
