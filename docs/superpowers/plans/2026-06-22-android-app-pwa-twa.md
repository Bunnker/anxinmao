# 安心猫 Android App 化(PWA 打磨 + Bubblewrap TWA)实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把现有 Next.js PWA 打磨成"装着像原生"的 Android App(A),并用 Bubblewrap 封成真 `.apk`(B,TWA),复用同一份代码、后端零改动。

**Architecture:** 纯客户端打包层。A = 修 manifest(颜色/图标/元数据)+ 新增应用内"装到桌面"浮动条 + 少量原生手感 CSS。B = Bubblewrap 读线上 manifest 生成签名 apk + 在域名放 `assetlinks.json` 验归属。所有 `src/app/api/*`、LLM 密钥、`/api/history` 云同步、localStorage 全不动。

**Tech Stack:** Next.js 16 / React 19 / TS、`@ducanh2912/next-pwa`(已装)、PIL(图标派生,已装 12.2)、Node 24(harness 原生 strip-types)、`@bubblewrap/cli`(TWA)。

**前置约定:**
- 设计依据:[docs/superpowers/specs/2026-06-22-android-app-pwa-twa-design.md](../specs/2026-06-22-android-app-pwa-twa-design.md)。
- prod 域名 `https://www.whatsupkitty.cn`(canonical = www)。包名 `cn.whatsupkitty.app`(分发后不可改)。
- **部署红线**:Task 10、Task 14 让 prod 变化,**必须先经用户批准再执行**;其余(改码 / 本地验证 / commit)自行进行。
- 每次 commit 按全局规约在 message 末尾加 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。
- 工作树里 `src/lib/behavior-intent.ts` 可能有他端并发改动,**只 `git add` 本计划涉及的文件,绝不 `git add -A`**。

---

## File Structure

**Part A(新增 / 修改)**
- `scripts/check-pwa-manifest.mjs`(新)— 纯 node 校验 manifest 颜色 / 图标 purpose / 必填字段 / 图标文件存在 + 尺寸。
- `scripts/gen-app-icons.py`(新)— PIL 从 `icon-source.png` 派生 any / maskable / apple 图标。
- `public/icons/{icon-192,icon-512,maskable-192,maskable-512,apple-touch-icon-180}.png`(生成)。
- `public/manifest.json`(改)— 颜色、图标拆 any/maskable、`id`/`scope`/`categories`/`screenshots`。
- `src/lib/install-prompt.ts`(新)— 纯逻辑 `shouldShowInstall` + 类型,供组件与 harness 共用。
- `scripts/harness-install-prompt.mjs`(新)— `shouldShowInstall` 真值表单测。
- `src/components/InstallPrompt.tsx`(新)— "装到桌面"浮动条客户端组件。
- `src/app/page.tsx`(改)— import + 挂载 `<InstallPrompt />`。
- `src/app/globals.css`(改)— `overscroll-behavior` + 拓宽 tap-highlight。
- `public/screenshots/{home,report}-narrow.png`(可选,生成)。
- `package.json`(改)— 加 `pwa:check`、`harness:install-prompt` 脚本。

**Part B(新增)**
- `twa/`(新,**.gitignore**)— Bubblewrap 工程 + 密钥。
- `public/.well-known/assetlinks.json`(新)— Digital Asset Links。
- `.gitignore`(改)— 排除 `/twa/`、`*.keystore`、`*.apk`、`*.aab`。
- `twa/README.md`(新)— 重建 / 密钥 / 更新说明。

---

# Part A — PWA 打磨

## Task 1: manifest 检查 harness(先写会失败的检查)

**Files:**
- Create: `scripts/check-pwa-manifest.mjs`
- Modify: `package.json`(scripts 段)

- [ ] **Step 1: 写检查脚本**

`scripts/check-pwa-manifest.mjs`:
```js
// PWA manifest 正确性检查 —— 纯 node,无依赖。读 public/manifest.json + 校验图标文件。
// 跑:npm run pwa:check  (回归守护:颜色 / 图标 purpose / 必填字段 / 图标文件存在 + 尺寸)
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const m = JSON.parse(readFileSync(join(root, "public", "manifest.json"), "utf8"));

const errors = [];
const warns = [];
const PAPER = "#f7f6f3";

if (m.background_color !== PAPER) errors.push(`background_color 应为 ${PAPER},实为 ${m.background_color}`);
if (m.theme_color !== PAPER) errors.push(`theme_color 应为 ${PAPER},实为 ${m.theme_color}`);

for (const k of ["name", "short_name", "start_url", "display", "id", "scope", "icons"]) {
  if (m[k] === undefined) errors.push(`缺字段 ${k}`);
}
if (m.display !== "standalone") errors.push(`display 应为 standalone,实为 ${m.display}`);

function pngSize(absPath) {
  const buf = readFileSync(absPath); // PNG IHDR:width=16-19,height=20-23(大端)
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

const purposes = new Set();
for (const ic of m.icons ?? []) {
  for (const p of (ic.purpose ?? "any").split(/\s+/)) purposes.add(p);
  const abs = join(root, "public", ic.src.replace(/^\//, ""));
  if (!existsSync(abs)) { errors.push(`图标文件不存在:${ic.src}`); continue; }
  const want = Number(ic.sizes.split("x")[0]);
  const got = pngSize(abs);
  if (got.w !== want || got.h !== want) errors.push(`${ic.src} 尺寸应 ${want}x${want},实为 ${got.w}x${got.h}`);
}
if (!purposes.has("any")) errors.push("icons 缺 purpose:any");
if (!purposes.has("maskable")) errors.push("icons 缺 purpose:maskable");

if (!m.screenshots?.length) warns.push("无 screenshots(可选,加上 Android 安装弹窗更丰富)");
else for (const s of m.screenshots) {
  if (!existsSync(join(root, "public", s.src.replace(/^\//, "")))) errors.push(`screenshot 不存在:${s.src}`);
}

for (const w of warns) console.warn("⚠️ ", w);
if (errors.length) {
  console.error("❌ manifest 检查未通过:");
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log("✅ PWA manifest 检查通过");
```

- [ ] **Step 2: 加 npm 脚本**

`package.json` 的 `"scripts"` 里,`"triage:check"` 行之后加一行:
```json
    "pwa:check": "node scripts/check-pwa-manifest.mjs",
```
(注意上一行补逗号。)

- [ ] **Step 3: 跑,确认失败(红)**

Run: `npm run pwa:check`
Expected: 退出码 1,报 `background_color 应为 #f7f6f3,实为 #f5e6cf`、`theme_color ... 实为 #a64a2f`、`缺字段 id`、`缺字段 scope`、`icons 缺 purpose:maskable`(当前是 `any maskable` 混在一条 → `any` 有、`maskable` 也算有?注:当前 `purpose:"any maskable"` 会让两者都判存在,但 `id`/`scope`/颜色仍失败)。至少颜色 + `id`/`scope` 三项 FAIL 即达预期。

- [ ] **Step 4: commit**
```bash
git add scripts/check-pwa-manifest.mjs package.json
git commit -m "test(pwa): 加 manifest 正确性检查 harness(npm run pwa:check)"
```

---

## Task 2: 派生 App 图标(PIL 脚本 + 资产)

**Files:**
- Create: `scripts/gen-app-icons.py`
- Create(生成): `public/icons/icon-192.png`、`icon-512.png`、`maskable-192.png`、`maskable-512.png`、`apple-touch-icon-180.png`

- [ ] **Step 1: 写图标派生脚本**

`scripts/gen-app-icons.py`:
```python
#!/usr/bin/env python3
# 从 public/icons/icon-source.png(1024² RGB)派生 App 图标:
#   any:      icon-192 / icon-512(满幅)
#   maskable: maskable-192 / maskable-512(内 80% safe zone + 角落取色填边,自适应图标不裁主体)
#   apple:    apple-touch-icon-180(满幅,iOS 不做遮罩)
# 跑:python3 scripts/gen-app-icons.py
from PIL import Image
from pathlib import Path

ICONS = Path(__file__).resolve().parent.parent / "public" / "icons"
src = Image.open(ICONS / "icon-source.png").convert("RGB")

for size in (192, 512):
    src.resize((size, size), Image.LANCZOS).save(ICONS / f"icon-{size}.png")
src.resize((180, 180), Image.LANCZOS).save(ICONS / "apple-touch-icon-180.png")

pad = src.getpixel((0, 0))  # 角落像素填边,与原图背景无缝
for size in (192, 512):
    inner = round(size * 0.8)
    canvas = Image.new("RGB", (size, size), pad)
    canvas.paste(src.resize((inner, inner), Image.LANCZOS),
                 ((size - inner) // 2, (size - inner) // 2))
    canvas.save(ICONS / f"maskable-{size}.png")

print("✅ 图标已生成:icon-{192,512} / maskable-{192,512} / apple-touch-icon-180")
```

- [ ] **Step 2: 跑,生成图标**

Run: `python3 scripts/gen-app-icons.py`
Expected: 打印 `✅ 图标已生成…`;`public/icons/` 下新增 5 个 PNG。

- [ ] **Step 3: 校验尺寸 + 肉眼看 maskable 不裁主体**

Run: `python3 -c "from PIL import Image; import glob; [print(f, Image.open(f).size) for f in sorted(glob.glob('public/icons/*.png'))]"`
Expected: `icon-192 (192,192)`、`icon-512 (512,512)`、`maskable-192 (192,192)`、`maskable-512 (512,512)`、`apple-touch-icon-180 (180,180)`。
肉眼打开 `maskable-512.png`:猫脸主体落在中间,四周有一圈填色 → 圆形/方形遮罩都不会切到脸。

- [ ] **Step 4: commit**
```bash
git add scripts/gen-app-icons.py public/icons/icon-192.png public/icons/icon-512.png public/icons/maskable-192.png public/icons/maskable-512.png public/icons/apple-touch-icon-180.png
git commit -m "feat(pwa): PIL 派生 any/maskable/apple 图标(maskable 留 80% safe zone)"
```

---

## Task 3: 更新 manifest.json(让 Task 1 检查转绿)

**Files:**
- Modify: `public/manifest.json`(整体替换)

- [ ] **Step 1: 重写 manifest(暂不含 screenshots,Task 7 再加)**

`public/manifest.json` 全文替换为:
```json
{
  "name": "小猫怎么了 · 猫咪安心分诊器",
  "short_name": "小猫怎么了",
  "description": "猫不对劲时,5 步分诊 + 红黄绿风险报告 + 带出处的多轮追问",
  "id": "/?app",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#f7f6f3",
  "theme_color": "#f7f6f3",
  "lang": "zh-CN",
  "categories": ["medical", "lifestyle"],
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icons/maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

- [ ] **Step 2: 跑检查,确认转绿(忽略 screenshots 警告)**

Run: `npm run pwa:check`
Expected: 退出码 0,打印 `⚠️ 无 screenshots…` + `✅ PWA manifest 检查通过`。

- [ ] **Step 3: commit**
```bash
git add public/manifest.json
git commit -m "fix(pwa): manifest 颜色对齐暖奶白 #f7f6f3 + 拆 any/maskable 图标 + 补 id/scope/categories"
```

---

## Task 4: 安装提示纯逻辑 + 单测 harness(TDD)

**Files:**
- Create: `src/lib/install-prompt.ts`
- Create: `scripts/harness-install-prompt.mjs`
- Modify: `package.json`(scripts 段)

- [ ] **Step 1: 写逻辑模块(先用会失败的桩)**

`src/lib/install-prompt.ts`:
```ts
// 安装提示纯逻辑 —— 与 React/DOM 解耦,便于 harness 单测(scripts/harness-install-prompt.mjs)。
// 仅用可擦除 TS 语法(interface + 纯函数 + const),Node 24 strip-types 可直接 import。

// Chrome 的 beforeinstallprompt(标准未收录,给最小类型)。
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export interface InstallState {
  standalone: boolean;        // 已安装(display-mode: standalone / navigator.standalone)
  dismissed: boolean;         // 用户此前关掉过安装条
  hasDeferredPrompt: boolean; // 已捕获 beforeinstallprompt(浏览器认为可安装)
}

/** 是否展示「装到桌面」:可安装、未安装、未被关掉。先给桩 false,Step 3 实现。 */
export function shouldShowInstall(_s: InstallState): boolean {
  return false;
}

export const INSTALL_DISMISS_KEY = "anxinmao.installPrompt.dismissed";
```

- [ ] **Step 2: 写 harness**

`scripts/harness-install-prompt.mjs`:
```js
// 单测 shouldShowInstall 真值表 —— Node ≥23.6 原生 strip-types,直接 import .ts(本机 Node 24)。
// 跑:npm run harness:install-prompt
import { shouldShowInstall } from "../src/lib/install-prompt.ts";

const F = false, T = true;
const cases = [
  // [standalone, dismissed, hasDeferredPrompt, expected]
  [F, F, T, T], // 可安装、未装、未关 → 显示
  [T, F, T, F], // 已装 → 不显示
  [F, T, T, F], // 用户关掉 → 不显示
  [F, F, F, F], // 浏览器没给可安装信号 → 不显示
  [T, T, T, F], // 已装 + 关 → 不显示
];

let fail = 0;
for (const [standalone, dismissed, hasDeferredPrompt, expected] of cases) {
  const got = shouldShowInstall({ standalone, dismissed, hasDeferredPrompt });
  const ok = got === expected;
  if (!ok) fail++;
  console.log(`${ok ? "✅" : "❌"} standalone=${standalone} dismissed=${dismissed} prompt=${hasDeferredPrompt} → ${got}(期望 ${expected})`);
}
if (fail) { console.error(`\n${fail} 个用例失败`); process.exit(1); }
console.log("\n✅ shouldShowInstall 全部通过");
```

- [ ] **Step 3: 加 npm 脚本**

`package.json` 的 `"scripts"` 里 `"pwa:check"` 行之后加:
```json
    "harness:install-prompt": "node scripts/harness-install-prompt.mjs",
```

- [ ] **Step 4: 跑,确认失败(红)**

Run: `npm run harness:install-prompt`
Expected: 退出码 1,第 1 个用例 `❌ … → false(期望 true)`(桩恒 false)。

- [ ] **Step 5: 实现逻辑**

把 `src/lib/install-prompt.ts` 的 `shouldShowInstall` 改为:
```ts
export function shouldShowInstall(s: InstallState): boolean {
  return s.hasDeferredPrompt && !s.standalone && !s.dismissed;
}
```
(顺手把参数名 `_s` 改回 `s`。)

- [ ] **Step 6: 跑,确认通过(绿)**

Run: `npm run harness:install-prompt`
Expected: 退出码 0,5 个 `✅` + `✅ shouldShowInstall 全部通过`。

- [ ] **Step 7: commit**
```bash
git add src/lib/install-prompt.ts scripts/harness-install-prompt.mjs package.json
git commit -m "feat(pwa): 安装提示纯逻辑 shouldShowInstall + 真值表 harness"
```

---

## Task 5: InstallPrompt 组件

**Files:**
- Create: `src/components/InstallPrompt.tsx`

- [ ] **Step 1: 写组件**

`src/components/InstallPrompt.tsx`:
```tsx
"use client";

// 应用内「装到桌面」浮动条 —— Android Chrome 捕获 beforeinstallprompt 后出现,
// 一键唤起系统安装弹窗。已安装 / 用户关掉则不出现。纯展示逻辑见 @/lib/install-prompt(有 harness 守护)。
// 注:目标平台 Android Chrome,beforeinstallprompt 必触发;非 Chromium(iOS Safari 等)不展示(本期非目标)。

import { useEffect, useState } from "react";
import {
  shouldShowInstall,
  INSTALL_DISMISS_KEY,
  type BeforeInstallPromptEvent,
} from "@/lib/install-prompt";

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true); // 默认 true,挂载后读真实值,避免闪现
  const [standalone, setStandalone] = useState(true);

  useEffect(() => {
    setStandalone(detectStandalone());
    setDismissed(localStorage.getItem(INSTALL_DISMISS_KEY) === "1");

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setStandalone(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // 申请持久存储,降低系统回收 localStorage 概率(best-effort,失败无碍)。
    navigator.storage?.persist?.().catch(() => {});

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!shouldShowInstall({ standalone, dismissed, hasDeferredPrompt: deferred !== null })) {
    return null;
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === "accepted") setStandalone(true);
  }

  function close() {
    localStorage.setItem(INSTALL_DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <div
      className="fixed inset-x-0 z-50 flex justify-center px-4"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 72px)" }}
    >
      <div className="flex items-center gap-3 rounded-full bg-surface px-4 py-2.5 shadow-[var(--shadow-control)]">
        <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
        <span className="text-[13px] font-medium text-ink">装到桌面 · 像 App 一样打开</span>
        <button
          onClick={install}
          className="rounded-full bg-accent px-3 py-1 text-[12.5px] font-semibold text-white active:scale-[0.97]"
        >
          安装
        </button>
        <button onClick={close} aria-label="关闭" className="px-1 text-ink-soft active:scale-90">
          ✕
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 类型检查通过**

Run: `npm run build`
Expected: 构建成功,无 TS 报错。(`bg-surface`/`bg-accent`/`text-ink`/`text-ink-soft`/`--shadow-control` 均为既有令牌,见 `globals.css` / `page.tsx`。)

- [ ] **Step 3: commit**
```bash
git add src/components/InstallPrompt.tsx
git commit -m "feat(pwa): 应用内「装到桌面」浮动条组件(beforeinstallprompt + 持久存储申请)"
```

---

## Task 6: 在首页挂载 InstallPrompt

**Files:**
- Modify: `src/app/page.tsx`(import 段 + 返回 JSX 末尾)

- [ ] **Step 1: 加 import**

`src/app/page.tsx` 顶部,把:
```tsx
"use client";
```
改为:
```tsx
"use client";

import { InstallPrompt } from "@/components/InstallPrompt";
```

- [ ] **Step 2: 挂载到 HomePage 返回的 fragment 末尾**

文件最末尾,把:
```tsx
      </main>
    </>
  );
}
```
改为:
```tsx
      </main>
      <InstallPrompt />
    </>
  );
}
```
(InstallPrompt 自身 `position: fixed`,与院子布局无耦合。)

- [ ] **Step 3: 类型检查 + 构建**

Run: `npm run build`
Expected: 构建成功,无报错。

- [ ] **Step 4: commit**
```bash
git add src/app/page.tsx
git commit -m "feat(pwa): 首页挂载「装到桌面」浮动条"
```

---

## Task 7:(可选)截图 + manifest screenshots

> 价值:Android 安装弹窗带预览图,更"真 App"。非阻塞 —— 不做也能装,只是弹窗朴素。

**Files:**
- Create: `public/screenshots/home-narrow.png`、`public/screenshots/report-narrow.png`
- Modify: `public/manifest.json`

- [ ] **Step 1: 起 dev,手机视口截两张竖图**

Run: `npm run dev`,Chrome 开 `http://localhost:3000`,DevTools 切手机视口(如 1080×2340)。
首页截一张存 `public/screenshots/home-narrow.png`;走一遍分诊到报告页,报告页截一张存 `public/screenshots/report-narrow.png`。

- [ ] **Step 2: 读真实尺寸**

Run: `python3 -c "from PIL import Image; [print(f, Image.open('public/screenshots/'+f).size) for f in ('home-narrow.png','report-narrow.png')]"`
Expected: 打印两张图的实际 `(宽, 高)`,记下。

- [ ] **Step 3: manifest 加 screenshots(sizes 用上一步实际值)**

`public/manifest.json` 末尾 `icons` 数组之后加(注意 `icons` 那行补逗号),把 `WxH` 换成实际尺寸:
```json
  "screenshots": [
    { "src": "/screenshots/home-narrow.png", "sizes": "WxH", "type": "image/png", "form_factor": "narrow" },
    { "src": "/screenshots/report-narrow.png", "sizes": "WxH", "type": "image/png", "form_factor": "narrow" }
  ]
```

- [ ] **Step 4: 检查通过(无 screenshots 警告)**

Run: `npm run pwa:check`
Expected: 退出码 0,不再有 `⚠️ 无 screenshots`,`✅ 通过`。

- [ ] **Step 5: commit**
```bash
git add public/screenshots/home-narrow.png public/screenshots/report-narrow.png public/manifest.json
git commit -m "feat(pwa): 加 manifest screenshots(Android 安装弹窗带预览图)"
```

---

## Task 8: 原生手感 CSS

**Files:**
- Modify: `src/app/globals.css`(`html, body` 块,约 L112-115)

- [ ] **Step 1: 给 html,body 加 overscroll-behavior + 拓宽 tap-highlight**

把:
```css
html,
body {
  height: 100%;
}
```
改为:
```css
html,
body {
  height: 100%;
  overscroll-behavior: none; /* 去 PWA/TWA 里的橡皮筋回弹辉光,更像原生 */
  -webkit-tap-highlight-color: transparent; /* 全局去点击灰闪(原仅 a/button/input) */
}
```
> 不动既有 `::selection` 与 `.pet-yard-no-callout` —— 报告 / 聊天正文保持可选中复制,长按抑制仍只在院子。

- [ ] **Step 2: 构建 + 自查正文仍可选中**

Run: `npm run build`
Expected: 构建成功。`npm run dev` 手机视口下:页面到顶/底不再有蓝色橡皮筋辉光;报告页正文长按仍能选中复制(未被误伤)。

- [ ] **Step 3: commit**
```bash
git add src/app/globals.css
git commit -m "feat(pwa): overscroll-behavior 去回弹辉光 + 全局 tap-highlight 透明"
```

---

## Task 9: 本地 prod 构建 + PWA / Lighthouse 验证(部署前关口)

**Files:** 无改动,验证 only。

- [ ] **Step 1: prod 构建 + 起服务(prod 才启用 next-pwa)**

Run: `npm run build && npm run start`
Expected: 构建产出含 `public/sw.js`/`workbox-*.js`;`http://localhost:3000` 可访问。

- [ ] **Step 2: DevTools Manifest 无错**

Chrome → DevTools → Application → Manifest:名称/颜色 `#f7f6f3`、4 个图标、`id`/`scope` 显示正常,无红色报错;"Installability" 无警告。

- [ ] **Step 3: Lighthouse PWA 审计**

DevTools → Lighthouse → 勾 PWA → 跑。
Expected: "Installable" 通过;maskable 图标项通过;无致命 PWA 报错。

- [ ] **Step 4: 桌面安装冒烟**

地址栏安装图标 → 安装 → 独立窗口打开,标题 / 图标正确,启动底色暖白。
> 这是部署前最后关口;真机 Android 验证在 Task 10 部署后做。

---

## Task 10: ⚠️ 部署 A 到 prod(审批关口)

> **红线:本步让线上变化,先取得用户明确批准再执行。** B 必须在 A 部署后做(Bubblewrap 读线上 manifest)。

**Files:** 无新增。

- [ ] **Step 1: 请求批准**

向用户说明:A 已本地验证通过,请求部署到 `www.whatsupkitty.cn`。等待明确"可以部署"。

- [ ] **Step 2: 部署(按现有 Docker 流程,用户执行或授权后执行)**

按既有发布流程(`Dockerfile`,prod 挂 `.data` 卷)构建并发布。

- [ ] **Step 3: 线上校验**

Run:
```bash
curl -s https://www.whatsupkitty.cn/manifest.json | python3 -m json.tool | grep -E "background_color|theme_color|maskable"
```
Expected: 颜色为 `#f7f6f3`,有 `maskable` 图标项。
浏览器开 `https://www.whatsupkitty.cn/icons/maskable-512.png` 能加载。

- [ ] **Step 4: 真机 Android 验证**

Android Chrome 开 `https://www.whatsupkitty.cn`:
- 应用内"装到桌面"浮动条出现 → 点"安装" → 系统弹窗 → 装到桌面;
- 桌面图标遮罩正确(不裁脸)、启动图暖白(非旧米色)、全屏无地址栏、进应用抽屉/最近任务;
- 重开 App,浮动条不再出现(standalone 检测生效)。

---

# Part B — Bubblewrap TWA → 真 .apk

## Task 11: Bubblewrap 初始化 TWA 工程 + .gitignore

**Files:**
- Create: `twa/`(Bubblewrap 工程,后续 gitignore)
- Modify: `.gitignore`

- [ ] **Step 1: 先把 twa 产物与密钥加入 .gitignore**

`.gitignore` 末尾追加:
```gitignore
# TWA / Bubblewrap(Android 封装产物 + 签名密钥,绝不入库)
/twa/
*.keystore
*.jks
*.apk
*.aab
```

- [ ] **Step 2: 检查环境(Bubblewrap 会按需引导装 JDK/Android SDK)**

Run: `npx @bubblewrap/cli doctor`
Expected: 报告 JDK / Android SDK 状态;缺则按提示让 Bubblewrap 下载到 `~/.bubblewrap`(交互确认)。

- [ ] **Step 3: init(读线上 manifest)**

Run:
```bash
mkdir -p twa && cd twa && npx @bubblewrap/cli init --manifest https://www.whatsupkitty.cn/manifest.json
```
关键交互回答:
- Domain: `www.whatsupkitty.cn`
- Application ID / package: `cn.whatsupkitty.app`
- App name: `小猫怎么了`;Launcher name 同
- Display mode: `standalone`;Orientation: `portrait`
- Theme/Background color: `#f7f6f3`(已从 manifest 带入,确认即可)
- 图标:用 manifest 的 512 图(确认)
Expected: 生成 `twa/twa-manifest.json` + Android 工程骨架。

- [ ] **Step 4: commit(只提交 .gitignore)**
```bash
git add .gitignore
git commit -m "chore(twa): gitignore Bubblewrap 工程与签名密钥"
```

---

## Task 12: 构建 apk + 保管 keystore + 取指纹

**Files:** 仅 `twa/`(不入库)。

- [ ] **Step 1: 构建(首次会生成签名 keystore,记住设的口令)**

Run: `cd twa && npx @bubblewrap/cli build`
Expected: 产出 `twa/app-release-signed.apk` + `twa/app-release-bundle.aab` + `twa/android.keystore`;终端打印 SHA-256 指纹。

- [ ] **Step 2: 备份 keystore + 口令(脱离仓库)**

把 `twa/android.keystore` 与口令复制到仓库外的安全位置(如密码管理器 / 私有备份),并记录路径。
> **丢失 = 无法发布同一身份的更新。** 这是不可逆资产。

- [ ] **Step 3: 取 SHA-256 指纹(若 Step 1 没记下)**

Run: `cd twa && npx @bubblewrap/cli fingerprint list`
或读 `twa/twa-manifest.json` 的 `signingKey` → 用 keytool 查。记下形如 `AB:CD:...:90` 的 SHA-256。

---

## Task 13: assetlinks.json(填入指纹)

**Files:**
- Create: `public/.well-known/assetlinks.json`

- [ ] **Step 1: 写 assetlinks(把指纹换成 Task 12 的实际值)**

`public/.well-known/assetlinks.json`:
```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "cn.whatsupkitty.app",
      "sha256_cert_fingerprints": ["把 Task 12 的 SHA-256 指纹粘到这里"]
    }
  }
]
```

- [ ] **Step 2: 本地校验 JSON 合法 + 静态可达**

Run: `python3 -m json.tool public/.well-known/assetlinks.json`
Expected: 打印格式化 JSON 无报错。
> Next 16 经 `public/` 原样托管(含 `.well-known/`),非 Next API,无需路由代码。

- [ ] **Step 3: commit(指纹是公开信息,可入库)**
```bash
git add public/.well-known/assetlinks.json
git commit -m "feat(twa): Digital Asset Links 绑定 cn.whatsupkitty.app"
```

---

## Task 14: ⚠️ 部署 assetlinks + 真机验证 apk(审批关口)

> **红线:本步让线上变化,先取得用户批准再执行。**

**Files:** 无新增。

- [ ] **Step 1: 请求批准并部署 assetlinks 到 prod**

同 Task 10 流程,把含 `.well-known/assetlinks.json` 的版本发布到线上。

- [ ] **Step 2: 校验线上可达 + 内容正确**

Run:
```bash
curl -s -H "Accept: application/json" https://www.whatsupkitty.cn/.well-known/assetlinks.json
```
Expected: 返回上面的 JSON,`package_name` = `cn.whatsupkitty.app`,指纹与 apk 一致。

- [ ] **Step 3: 真机装 apk 验证(头号坑:有无地址栏)**

把 `twa/app-release-signed.apk` 传到 Android 手机 → "允许未知来源" → 安装 → 打开:
- **确认无地址栏 / 无浏览器 UI**(= assetlinks 校验通过、指纹匹配);若顶部出现 URL 条,则指纹或域名不匹配,回查 Task 12/13;
- 图标 / 名称正确;系统返回键在站内导航;站内链接不跳浏览器;
- 启动图暖白、全屏。

- [ ] **Step 4: 记录验证结果**

把"无地址栏 + 安装成功"结论回报用户。

---

## Task 15: TWA 文档

**Files:**
- Create: `twa/README.md`(`/twa/` 已 gitignore,此 README 仅本地留存说明;如需入库可单独 `git add -f`)

- [ ] **Step 1: 写说明**

`twa/README.md`:
```markdown
# 小猫怎么了 · TWA(Android apk)

- 包名:cn.whatsupkitty.app(分发后不可改)
- 加载:https://www.whatsupkitty.cn(实时加载线上站)
- 归属验证:https://www.whatsupkitty.cn/.well-known/assetlinks.json(指纹须与本工程 keystore 一致)

## 重新构建
    cd twa && npx @bubblewrap/cli build

## 更新策略
- **改 UI / 内容** → 只发网页,apk 不用重发(TWA 实时加载线上)。
- **改图标 / 包名 / 启动配置** → 重新 build + 重发 apk;若换签名 key,须同步更新线上 assetlinks 指纹。

## keystore(不可逆资产)
- 文件:twa/android.keystore —— 已 gitignore。
- 备份位置:<填你的安全备份路径>
- 丢失 = 无法发布同一身份更新。

## 上架(本期不做,门留着)
- 同一个 app-release-bundle.aab 可上 Google Play($25 一次性开发者账号)。
```

- [ ] **Step 2: 完成**

无需 commit(`/twa/` 已 gitignore)。如要入库:`git add -f twa/README.md`。

---

## Self-Review

**1. Spec 覆盖**
- A1 颜色 → Task 1(检查)/ Task 3(修)✓
- A2 图标 any/maskable → Task 2(派生)/ Task 3(manifest 条目)✓
- A3 应用内安装 → Task 4(逻辑+harness)/ Task 5(组件)/ Task 6(挂载)✓
- A4 manifest 增强 id/scope/categories/screenshots → Task 3(前三)/ Task 7(screenshots)✓
- A5 原生手感 CSS → Task 8(overscroll + tap-highlight;callout/selection 经核实已就位,不动)✓
- B init / build / keystore / assetlinks / 分发更新 → Task 11 / 12 / 13–14 / 15 ✓
- 数据存储 / 登录小节 = 澄清边界,无需任务 ✓
- 验证 → Task 9(本地)/ Task 10 Step3-4(线上+真机)/ Task 14(apk)✓
- 部署红线 → Task 10 / Task 14 审批关口 ✓

**2. 占位符扫描**:assetlinks 指纹、screenshots 的 `WxH`、keystore 备份路径 = 构建/拍摄后才产生的真实值,已在步骤里明确"从何获取/替换",非计划级占位。其余步骤均含完整代码与命令。

**3. 类型/命名一致**:`shouldShowInstall(InstallState)→boolean`、`INSTALL_DISMISS_KEY`、`BeforeInstallPromptEvent` 在 `src/lib/install-prompt.ts` 定义,被 `harness-install-prompt.mjs`(相对路径 `../src/lib/install-prompt.ts`)与 `InstallPrompt.tsx`(别名 `@/lib/install-prompt`)一致引用。包名 `cn.whatsupkitty.app`、颜色 `#f7f6f3`、域名 `www.whatsupkitty.cn` 全计划一致。
