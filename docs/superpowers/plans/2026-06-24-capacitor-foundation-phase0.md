# Capacitor 地基(Phase 0)实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把「小猫怎么了」前端用 Capacitor 打包成可安装的原生壳(本地加载前端 + 远端托管 API),并通过一道硬 go/no-go 门:静态导出 0 报错、分诊/问答/头像/云同步经远端 API 全通(含流式)、安卓真机能装能开。

**Architecture:** 一套代码、两条构建线。Web 站维持现状(`next build` server 模式,含 API + PWA,部署在 `www.whatsupkitty.cn`);App 前端用 `BUILD_TARGET=app` 触发 `output:'export'` 静态导出到 `out/`,关掉 PWA/SW,所有 `/api/*` 调用经一个集中 `apiBase` 指向绝对后端 `https://www.whatsupkitty.cn`,后端逐个给暴露端点放行 Capacitor 源的 CORS(管理端点不放行)。`out/` 喂给 Capacitor `webDir` 出 apk,沿用 TWA 的包名 `cn.whatsupkitty.app` + 现有 keystore 做就地升级。

**Tech Stack:** Next.js 16.2.6 (App Router) + React 19.2.4 + TypeScript + Tailwind v4 + `@ducanh2912/next-pwa`(仅 Web)+ Capacitor 7(`@capacitor/core` / `@capacitor/cli` / `@capacitor/android`)。

**本仓库没有单元测试框架**(无 jest/vitest)。既有"测试"只有两类 `scripts/harness-*.mjs`:(1) 打本地 dev server 的 HTTP 集成校验,(2) 把 TS 源码当文本正则校验。**因此本计划的"测试"= 这仓库真能跑的最强验证**:`next build` / `npm run lint` / `grep` 断言 / `curl` 预检 / preview / 安卓真机。每个任务都给确切命令和期望输出。

---

## 前置条件与环境(开工前先确认)

- [ ] **Node + 仓库可构建**:在仓库根跑 `npm install` 成功;`npm run build`(现状 Web 构建)能过。这是基线,后面所有改动都不能让它退化。
- [ ] **确认 Next 16 导出行为**:本项目 CLAUDE.md / AGENTS.md 红线——写 Next 相关代码前先查 `node_modules/next/dist/docs/01-app/`。本计划用到 `output:'export'`、`images.unoptimized`,执行 Task 5/8 前先在该 docs 目录确认 Next 16 这两项的当前写法(本计划按 16.2.6 行为撰写,如官方文档有出入以文档为准)。
- [ ] **安卓构建链**(Task 9–12 需要,Task 1–8 不需要):Android Studio + Android SDK(API 35 / Android 15)+ JDK 17。Capacitor 用 Gradle 直接构建 `android/` 工程(不走旧 TWA 的 bubblewrap)。
- [ ] **签名 keystore 在手**(Task 10 需要):`~/anxinmao-twa/android.keystore`,口令见团队记忆(`WhatsUpKitty2026Apk`),alias 沿用现有 TWA alias。**绝不能换 keystore**,否则老 TWA 用户无法覆盖升级。
- [ ] **并发协调**:`src/app/page.tsx` 等大文件可能有多终端/codex 并发改动。每个 Task 开工前 `git status` 看一眼;本计划只改 Phase 0 涉及的文件,不碰桌宠渲染逻辑(那是 Phase 1)。
- [ ] **部署红线**:本计划全部为本地改码 + 本地验证 + commit。**不含任何让线上变化的操作**;Web 站构建/部署维持现状、不在本期动。

---

## 关键事实(来自代码侦察,执行时以真实代码为准)

- **全部 9 处客户端 `/api` 调用**(都是裸相对路径,需加 base):
  | 文件:行号 | 端点 | 方法 | 流式 |
  |---|---|---|---|
  | `src/app/behavior/page.tsx:1145` | `/api/summarize` | POST | 否 |
  | `src/app/behavior/page.tsx:1183` | `/api/behavior` | POST | **是(`res.body.getReader()`)** |
  | `src/app/behavior/page.tsx:1273` | `/api/followups` | POST | 否 |
  | `src/app/feedback/page.tsx:89` | `/api/feedback` | POST | 否 |
  | `src/app/onboarding/page.tsx:348` | `/api/avatar` | POST | 否 |
  | `src/components/AvatarPicker.tsx:108` | `/api/avatar` | POST | 否 |
  | `src/lib/history-sync.ts:24` | `/api/history` | POST | 否 |
  | `src/lib/history-sync.ts:43` | `/api/history?deviceId=` | GET | 否 |
  | `src/lib/memory-extract.ts:60` | `/api/memory/extract` | POST | 否 |
- **后端 Route Handler**:`behavior`(条件流式)、`summarize`、`followups`、`triage`、`feedback`、`history`(GET+POST)、`avatar`、`memory/extract` = **8 个 app-facing,要放行 CORS**;`admin/stats`(GET,`ADMIN_KEY` 鉴权)= **管理端点,绝不放行 CORS**。当前所有 handler **均无任何 CORS/OPTIONS**。
- **静态导出阻塞点极少**:4 个用 `useSearchParams` 的页面(triage/report/onboarding/behavior)**已全部带 `<Suspense>` 边界**(已逐一核验,无需再加);`next/image` 仅 `src/app/knowledge/page.tsx:1`、`src/components/Welcome.tsx:3` 两处**幽灵导入**(import 了但没用);**无动态路由段、无 middleware、无 `generateStaticParams`/`revalidate`/`force-dynamic`、无 `cookies()`/`headers()`**;所有 `window/document/localStorage` 访问都在 `useEffect`/事件回调内(导出期安全)。
- **PWA/SW 资产**:`next.config.ts` 用 `withPWAInit`(仅 `isProd` 包裹);生成物 `public/sw.js`(38KB)、`public/workbox-*.js`(23KB);手写 `public/manifest.json`;`src/components/SWRecovery.tsx` 在 `src/app/layout.tsx:66` 挂载,manifest 元数据在 `layout.tsx:38`。
- **持久化层**:`src/lib/persist.ts` 导出 `readPersisted/writePersisted/removePersisted`(localStorage 主 + Cookie 兜底);`src/lib/storage.ts` 的 `saveStore` → `saveStoreLocal` + `pushHistory`。

---

## 文件结构(本计划新建/修改)

**新建:**
- `src/lib/api-base.ts` —— 集中 apiBase + `apiUrl()`(Task 1)
- `src/lib/app-env.ts` —— `IS_APP_SHELL` 构建期标志(Task 1)
- `src/lib/cors.ts` —— CORS 头 + 预检 helper(Task 3)
- `scripts/clean-app-export.mjs` —— App 导出后清掉 `out/` 里的 SW/workbox(Task 4)
- `scripts/check-api-base.mjs` —— 文本断言:源码无裸 `fetch("/api`(Task 2 的回归护栏)
- `capacitor.config.ts` —— Capacitor 配置(Task 9)
- `src/components/AppShellNotice.tsx` —— App 首启"重置本地数据"提示(Task 11)

**修改:**
- `src/app/behavior/page.tsx`、`src/app/feedback/page.tsx`、`src/app/onboarding/page.tsx`、`src/components/AvatarPicker.tsx`、`src/lib/history-sync.ts`、`src/lib/memory-extract.ts` —— 9 处 fetch 加 `apiUrl()`(Task 2)
- `src/app/api/{behavior,summarize,followups,triage,feedback,history,avatar,memory/extract}/route.ts` —— 加 CORS + OPTIONS(Task 3)
- `next.config.ts` —— `BUILD_TARGET` 分支(Task 4)
- `package.json` —— 加 `build:app` 脚本(Task 4)
- `src/app/layout.tsx` —— App 壳跳过 SWRecovery + manifest(Task 5);挂 AppShellNotice(Task 11)
- `src/app/knowledge/page.tsx`、`src/components/Welcome.tsx` —— 删幽灵 `next/image` 导入(Task 5)

---

## Task 1: 集中 apiBase 抽象 + 构建期 App 壳标志

**Files:**
- Create: `src/lib/api-base.ts`
- Create: `src/lib/app-env.ts`

- [ ] **Step 1: 写 `src/lib/api-base.ts`**

```typescript
// API 基址解析 —— 一套代码、两条构建线的关键。
//
// Web 构建(同源):apiBase = ""(相对路径,打到自己的 /api/*,现状不变)。
// App 构建(Capacitor):前端跑在 capacitor://localhost / https://localhost,
//   相对 /api/* 会打到本地壳、拿不到后端。必须用绝对后端 base。
//
// NEXT_PUBLIC_* 在 `next build` 时被内联进客户端包(构建期定值,运行期不可改)。
// App 构建由 `npm run build:app` 注入 NEXT_PUBLIC_API_BASE=https://www.whatsupkitty.cn。
export const API_BASE: string = process.env.NEXT_PUBLIC_API_BASE ?? "";

// 拼接 API 路径。path 必须以 "/" 开头(如 "/api/behavior"、"/api/history?deviceId=x")。
export function apiUrl(path: string): string {
  return API_BASE + path;
}
```

- [ ] **Step 2: 写 `src/lib/app-env.ts`**

```typescript
// 是否运行在 App(Capacitor)壳内 —— 构建期常量。
// 由 `npm run build:app` 注入 NEXT_PUBLIC_APP_SHELL=1;Web 构建下为 false。
// 用途:App 壳不注册 Service Worker、不挂 PWA manifest、首启提示重置数据。
export const IS_APP_SHELL: boolean = process.env.NEXT_PUBLIC_APP_SHELL === "1";
```

- [ ] **Step 3: 类型检查通过(这就是这一步的"测试")**

Run: `npx tsc --noEmit`
Expected: 无新增报错(两个新文件是纯常量/函数,应直接通过)。

- [ ] **Step 4: Commit**

```bash
git add src/lib/api-base.ts src/lib/app-env.ts
git commit -m "feat(app): 集中 apiBase + App 壳构建标志(Capacitor 地基)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: 迁移全部客户端 `/api` 调用到 `apiUrl()`

**Files:**
- Modify: `src/lib/history-sync.ts:24`、`:43`
- Modify: `src/lib/memory-extract.ts:60`
- Modify: `src/app/behavior/page.tsx:1145`、`:1183`、`:1273`
- Modify: `src/app/feedback/page.tsx:89`
- Modify: `src/app/onboarding/page.tsx:348`
- Modify: `src/components/AvatarPicker.tsx:108`
- Create: `scripts/check-api-base.mjs`(回归护栏)

- [ ] **Step 1: 先写护栏脚本 `scripts/check-api-base.mjs`(失败的测试)**

```javascript
#!/usr/bin/env node
// 回归护栏:客户端源码里不得再有裸 fetch("/api ... ) —— 必须经 apiUrl()。
// 否则 App(Capacitor)构建下该调用会打到本地壳、静默失效。
// 扫 src/app(排除 api 后端目录)、src/components、src/lib。
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const ROOTS = ["src/app", "src/components", "src/lib"];
// 后端 route handler 自身不算(它们就是 /api 的实现,不是调用方)。
const SKIP = path.join(ROOT, "src/app/api");
// 裸调用:fetch( 后面紧跟引号/反引号 + /api
const BARE = /fetch\(\s*[`"']\/api\b/;

async function walk(dir, out) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (p.startsWith(SKIP)) continue;
    if (e.isDirectory()) await walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
}

const files = [];
for (const r of ROOTS) await walk(path.join(ROOT, r), files);

const offenders = [];
for (const f of files) {
  const txt = await readFile(f, "utf8");
  txt.split("\n").forEach((line, i) => {
    if (BARE.test(line)) offenders.push(`${path.relative(ROOT, f)}:${i + 1}  ${line.trim()}`);
  });
}

if (offenders.length) {
  console.error(`❌ 发现 ${offenders.length} 处裸 fetch("/api"(须改用 apiUrl()):`);
  offenders.forEach((o) => console.error("  " + o));
  process.exit(1);
}
console.log("✅ 无裸 fetch(\"/api\");全部经 apiUrl()。");
```

- [ ] **Step 2: 运行护栏,确认它现在报红(证明测试有效)**

Run: `node scripts/check-api-base.mjs`
Expected: FAIL,列出 9 处裸 `fetch("/api`(history-sync ×2、memory-extract ×1、behavior ×3、feedback ×1、onboarding ×1、AvatarPicker ×1)。

- [ ] **Step 3: 改 `src/lib/history-sync.ts`**

文件顶部 import 区(第 3–4 行附近)加:
```typescript
import { apiUrl } from "@/lib/api-base";
```
第 24 行:
```typescript
  fetch(apiUrl("/api/history"), {
```
第 43–45 行:
```typescript
    const res = await fetch(
      apiUrl(`/api/history?deviceId=${encodeURIComponent(deviceId)}`),
      { signal: ctrl.signal },
    );
```

- [ ] **Step 4: 改 `src/lib/memory-extract.ts`**

顶部加 `import { apiUrl } from "@/lib/api-base";`,第 60 行 `fetch("/api/memory/extract"` → `fetch(apiUrl("/api/memory/extract")`。

- [ ] **Step 5: 改 `src/app/behavior/page.tsx`(3 处)**

顶部 import 区加 `import { apiUrl } from "@/lib/api-base";`,然后:
- 第 1145 行 `fetch("/api/summarize"` → `fetch(apiUrl("/api/summarize")`
- 第 1183 行 `fetch("/api/behavior"` → `fetch(apiUrl("/api/behavior")`
- 第 1273 行 `fetch("/api/followups"` → `fetch(apiUrl("/api/followups")`

- [ ] **Step 6: 改 `src/app/feedback/page.tsx`、`src/app/onboarding/page.tsx`、`src/components/AvatarPicker.tsx`**

各自顶部加 `import { apiUrl } from "@/lib/api-base";`,然后:
- `feedback/page.tsx:89` `fetch("/api/feedback"` → `fetch(apiUrl("/api/feedback")`
- `onboarding/page.tsx:348` `fetch("/api/avatar"` → `fetch(apiUrl("/api/avatar")`
- `AvatarPicker.tsx:108` `fetch("/api/avatar"` → `fetch(apiUrl("/api/avatar")`

- [ ] **Step 7: 运行护栏,确认转绿**

Run: `node scripts/check-api-base.mjs`
Expected: PASS（`✅ 无裸 fetch("/api"`)。若仍报红,按列出的文件:行号补改(可能有侦察遗漏的调用,以脚本输出为准 —— 这正是护栏的价值)。

- [ ] **Step 8: 类型检查 + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: 0 报错。

- [ ] **Step 9: Web 构建未退化(同源 apiBase="" → 行为不变)**

Run: `npm run build`
Expected: 构建成功;`apiUrl("/api/x")` 在 Web 下 = `"" + "/api/x"` = `"/api/x"`,与改前等价。

- [ ] **Step 10: Commit**

```bash
git add src/lib/history-sync.ts src/lib/memory-extract.ts src/app/behavior/page.tsx \
  src/app/feedback/page.tsx src/app/onboarding/page.tsx src/components/AvatarPicker.tsx \
  scripts/check-api-base.mjs
git commit -m "feat(app): 全部客户端 /api 调用经 apiUrl() + 回归护栏

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: 后端 CORS —— 给 8 个 app-facing 端点放行 Capacitor 源(管理端点不放)

**Files:**
- Create: `src/lib/cors.ts`
- Modify: `src/app/api/behavior/route.ts`、`summarize/route.ts`、`followups/route.ts`、`triage/route.ts`、`feedback/route.ts`、`history/route.ts`、`avatar/route.ts`、`memory/extract/route.ts`
- **不动**:`src/app/api/admin/stats/route.ts`

- [ ] **Step 1: 写 `src/lib/cors.ts`**

```typescript
// 跨源放行 —— 只给 App(Capacitor)WebView 源。Web 站同源,不需要 CORS。
// 白名单:Capacitor 安卓默认 https://localhost(见 capacitor.config androidScheme),
// iOS 默认 capacitor://localhost;http://localhost 作开发兜底。
// ⚠️ 管理端点(/api/admin/*)绝不使用本 helper —— 不对 App 暴露统计/后台数据。
const ALLOWED_ORIGINS = new Set([
  "https://localhost",
  "capacitor://localhost",
  "http://localhost",
]);

export function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

// 把 CORS 头写到已构造好的响应上(对流式 Response 也安全 —— 发送前 headers 可改)。
export function withCors(res: Response, origin: string | null): Response {
  for (const [k, v] of Object.entries(corsHeaders(origin))) res.headers.set(k, v);
  return res;
}

// OPTIONS 预检响应。
export function preflight(req: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}
```

- [ ] **Step 2: 改 8 个 route.ts —— 统一套路**

对**每个** app-facing handler 做两件事:① 文件顶部 import;② 给每条已有 handler 的入参确保有 `req: Request`,在 return 处用 `withCors(..., origin)` 包一层,并新增 `OPTIONS` 导出。

顶部加(8 个文件都加):
```typescript
import { withCors, preflight } from "@/lib/cors";
```

**`src/app/api/behavior/route.ts`(流式,最关键)** —— 在 `export async function POST(req: ...)` 体内开头取 origin:
```typescript
  const origin = req.headers.get("origin");
```
把所有 `return <Response>`(含流式 `new Response(stream, ...)`、guardedResponse 的 text/plain、错误 JSON)改为 `return withCors(<Response>, origin);`。文件末尾加:
```typescript
export function OPTIONS(req: Request) {
  return preflight(req);
}
```
> ⚠️ **流式响应头不可变的坑**:若该 handler 某处**直接透传**了 `fetch()` 来的上游 `Response`(其 headers 是 immutable,`withCors` 的 `.set()` 会抛 `TypeError`),则先重建为可改头的响应再 withCors:
> ```typescript
> const fresh = new Response(upstream.body, {
>   status: upstream.status,
>   statusText: upstream.statusText,
>   headers: new Headers(upstream.headers),
> });
> return withCors(fresh, origin);
> ```
> 若 handler 本就是 `new Response(stream, { headers: {...} })` 自建响应(headers 可变),直接 `withCors` 即可。执行时看 `behavior/route.ts` 实际怎么返回的,二选一。

**其余 7 个**(`summarize`/`followups`/`triage`/`feedback`/`avatar`/`memory/extract` 的 POST,`history` 的 GET 和 POST)同法:handler 体开头 `const origin = req.headers.get("origin");`,每个 `return Response.json(...)` 改成 `return withCors(Response.json(...), origin);`,文件末尾各加一个 `export function OPTIONS(req: Request) { return preflight(req); }`。

> 注:若某 handler 当前签名没接 `req`(如个别 POST 写成 `export async function POST(request: Request)`),用它已有的参数名取 `.headers.get("origin")` 即可,不必强行改名。

- [ ] **Step 3: 确认 admin/stats 没动**

Run: `git diff --name-only src/app/api/admin/`
Expected: 空输出(`admin/stats/route.ts` 不在改动列表)。

- [ ] **Step 4: 起 dev server,curl 预检验证(失败→成功的对照)**

```bash
npm run dev   # 另开一个终端;等 "Ready" 后继续
```
验证 app-facing 端点放行 Capacitor 源:
```bash
curl -s -o /dev/null -D - -X OPTIONS \
  -H "Origin: https://localhost" \
  -H "Access-Control-Request-Method: POST" \
  http://localhost:3000/api/summarize | grep -i "access-control-allow-origin"
```
Expected: `access-control-allow-origin: https://localhost`(204)。
验证管理端点**不**放行:
```bash
curl -s -o /dev/null -D - -X OPTIONS \
  -H "Origin: https://localhost" \
  http://localhost:3000/api/admin/stats | grep -i "access-control-allow-origin" || echo "✅ admin 未放行(预期)"
```
Expected: `✅ admin 未放行(预期)`。
验证非白名单源被拒:
```bash
curl -s -o /dev/null -D - -X OPTIONS \
  -H "Origin: https://evil.example" \
  http://localhost:3000/api/summarize | grep -i "access-control-allow-origin" || echo "✅ 非白名单源未放行(预期)"
```
Expected: `✅ 非白名单源未放行(预期)`。

- [ ] **Step 5: lint + 类型检查 + Web 构建**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: 0 报错;Web 构建成功(同源请求不带 Origin 或带自身源 → `corsHeaders` 返回空 → 行为不变)。

- [ ] **Step 6: Commit**

```bash
git add src/lib/cors.ts src/app/api/behavior src/app/api/summarize src/app/api/followups \
  src/app/api/triage src/app/api/feedback src/app/api/history src/app/api/avatar \
  src/app/api/memory
git commit -m "feat(api): 给 8 个 app-facing 端点放行 Capacitor 源 CORS(admin 不放)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: 双构建分支 —— `next.config.ts` + `build:app` 脚本 + 导出清理

**Files:**
- Modify: `next.config.ts`
- Modify: `package.json`(scripts)
- Create: `scripts/clean-app-export.mjs`

- [ ] **Step 1: 改写 `next.config.ts` 为双分支**

整文件替换为:
```typescript
import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

// 两条构建线:
// - Web(默认):server build,含 API 路由;生产挂 PWA。部署 www.whatsupkitty.cn(现状不变)。
// - App(BUILD_TARGET=app):静态导出 out/ 喂 Capacitor;关 PWA;next/image 走 unoptimized。
const isProd = process.env.NODE_ENV === "production";
const isApp = process.env.BUILD_TARGET === "app";

const baseConfig: NextConfig = {
  /* config options here */
};

// App 构建专属:静态导出 + 关图片优化(静态导出不能跑优化服务)。
const appConfig: NextConfig = {
  ...baseConfig,
  output: "export",
  images: { unoptimized: true },
};

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
  },
});

// App:静态导出、绝不挂 PWA(避免把 Web 的 SW 缓存/更新逻辑带进 Capacitor)。
// Web:维持原行为(生产挂 PWA,dev 不挂)。
export default isApp ? appConfig : isProd ? withPWA(baseConfig) : baseConfig;
```

- [ ] **Step 2: 写 `scripts/clean-app-export.mjs`(导出后清掉 SW/workbox)**

```javascript
#!/usr/bin/env node
// App 静态导出后:public/ 里现存的 sw.js / workbox-*.js 会被 next export 原样拷进 out/。
// App 壳不注册 SW,这些是死文件且违反 PRD §4.4(不携带旧 SW 预缓存)→ 删掉。
import { readdir, rm, stat } from "node:fs/promises";
import path from "node:path";

const OUT = path.join(process.cwd(), "out");

async function exists(p) {
  try { await stat(p); return true; } catch { return false; }
}

if (!(await exists(OUT))) {
  console.error("❌ 未找到 out/;先跑静态导出再清理。");
  process.exit(1);
}

const removed = [];
for (const name of await readdir(OUT)) {
  if (name === "sw.js" || /^workbox-.*\.js$/.test(name) || name === "sw.js.map") {
    await rm(path.join(OUT, name), { force: true });
    removed.push(name);
  }
}
console.log(removed.length ? `✅ 已清理 out/: ${removed.join(", ")}` : "✅ out/ 无 SW/workbox 残留。");
```

- [ ] **Step 3: 加 `build:app` 脚本到 `package.json`**

在 `scripts` 段把 `"build": "next build --webpack",` 之后加一行:
```json
    "build:app": "BUILD_TARGET=app NEXT_PUBLIC_API_BASE=https://www.whatsupkitty.cn NEXT_PUBLIC_APP_SHELL=1 next build --webpack && node scripts/clean-app-export.mjs",
```
> 注:内联环境变量写法适用于 macOS/Linux(本机 darwin)。如需 Windows 兼容,改用 `cross-env`(本期不引入)。

- [ ] **Step 4: Web 构建仍正常(没被 App 分支影响)**

Run: `npm run build`
Expected: 成功;`isApp=false` → 走原 `isProd ? withPWA : base` 路径,`public/sw.js` 等照常生成。

- [ ] **Step 5: Commit**

```bash
git add next.config.ts package.json scripts/clean-app-export.mjs
git commit -m "feat(app): next.config 双构建分支 + build:app 脚本 + 导出 SW 清理

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: App 壳 gating —— layout 跳过 SWRecovery/manifest + 删幽灵 next/image 导入

**Files:**
- Modify: `src/app/layout.tsx`(import + metadata.manifest + body 内 SWRecovery)
- Modify: `src/app/knowledge/page.tsx:1`
- Modify: `src/components/Welcome.tsx:3`

- [ ] **Step 1: `src/app/layout.tsx` 顶部加 import**

在现有 `import { SWRecovery } from "@/components/SWRecovery";`(第 4 行附近)下加:
```typescript
import { IS_APP_SHELL } from "@/lib/app-env";
```

- [ ] **Step 2: manifest 在 App 壳下置空**

把 metadata 里的 `manifest: "/manifest.json",`(约第 38 行)改为:
```typescript
  // App 壳本地加载、不走 PWA;manifest 只服务 Web 站。
  manifest: IS_APP_SHELL ? undefined : "/manifest.json",
```

- [ ] **Step 3: App 壳下不挂 SWRecovery**

把 `<body>` 内的 `<SWRecovery />`(约第 66 行)改为:
```typescript
        {!IS_APP_SHELL && <SWRecovery />}
```

- [ ] **Step 4: 删两处幽灵 `next/image` 导入**

- `src/app/knowledge/page.tsx:1`:删掉 `import Image from "next/image";` 整行(侦察确认该文件未实际使用 `<Image>`)。
- `src/components/Welcome.tsx:3`:删掉 `import Image from "next/image";` 整行(同上)。
> 执行前各文件内 `grep -n "<Image"` 复核确实没用到;若意外用到了,则保留 import、不删(此时靠 Task 4 的 `images.unoptimized` 兜底)。

- [ ] **Step 5: lint + 类型检查 + Web 构建**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: 0 报错;Web 构建里 `IS_APP_SHELL=false` → SWRecovery 照常挂、manifest 照常引用。

- [ ] **Step 6: Commit**

```bash
git add src/app/layout.tsx src/app/knowledge/page.tsx src/components/Welcome.tsx
git commit -m "feat(app): App 壳跳过 SWRecovery/manifest + 删幽灵 next/image 导入

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: 静态导出门(go/no-go #1)—— 跑通 `npm run build:app`

**Files:** 无新增;本任务是 PRD §8 Phase 0 的硬门禁:导出 0 报错才进 Capacitor。

- [ ] **Step 1: 跑 App 静态导出**

Run: `npm run build:app`
Expected(基于侦察预判):成功,产出 `out/`。已知阻塞点都已在 Task 4/5 处理(Suspense 本就齐备、`images.unoptimized` 已开、SW 清理已挂)。

- [ ] **Step 2: 若报错 —— 按类别修(这是门禁的真实价值)**

导出报错只会是有限几类,逐条对应:
- **`useSearchParams() should be wrapped in a suspense boundary`**:某页缺 Suspense。按 `src/app/triage/page.tsx` 的写法(默认导出里用 `<Suspense fallback={...}><XxxContent /></Suspense>` 包裹)给报错那页补上。(侦察已确认 4 页齐备,理论上不该触发;若触发说明有新页面。)
- **`ReferenceError: window/document/localStorage is not defined`**:某处在模块顶层/渲染期访问了浏览器 API。给那处包 `if (typeof window !== "undefined")` 或挪进 `useEffect`。
- **`Image Optimization using the default loader is not compatible with export`**:还有用到 `<Image>` 的地方 —— `images.unoptimized:true` 已在 appConfig,确认 Task 4 改动生效;或把该 `<Image>` 换成 `<img>`。
- **其它**:照报错信息处理,并对照 `node_modules/next/dist/docs/01-app/` 的 Next 16 导出文档。

每修一类,重跑 `npm run build:app` 直到 0 报错。

- [ ] **Step 3: 校验导出产物正确性**

```bash
test -f out/index.html && echo "✅ out/index.html 存在"
test ! -f out/sw.js && echo "✅ out/ 无 sw.js(已清理)"
ls out/workbox-*.js 2>/dev/null && echo "❌ 仍有 workbox 残留" || echo "✅ out/ 无 workbox 残留"
grep -rl "https://www.whatsupkitty.cn/api" out/ >/dev/null && echo "✅ 绝对 apiBase 已内联进产物" || echo "❌ 未发现绝对 apiBase,检查 build:app 环境变量"
```
Expected: 四行全 ✅。最后一条证明 `NEXT_PUBLIC_API_BASE` 真的内联进了 App 包(apiBase 改造在导出产物里生效)。

- [ ] **Step 4: Commit(若 Step 2 有改文件)**

```bash
git add -A
git commit -m "fix(app): 静态导出门修复(go/no-go #1 通过,build:app 0 报错)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```
> 若 Step 2 无改动(导出一次过),跳过本步。

---

## Task 7: 接入 Capacitor + 加 Android 平台

**Files:**
- Modify: `package.json`(deps)
- Create: `capacitor.config.ts`
- Create(由 CLI 生成): `android/`(整个原生工程)
- Modify: `.gitignore`

- [ ] **Step 1: 装 Capacitor 依赖**

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/app
```
> `@capacitor/app` 用于 Phase 1 的 App 生命周期/返回键;现在一起装。

- [ ] **Step 2: 写 `capacitor.config.ts`**

```typescript
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "cn.whatsupkitty.app", // 沿用 TWA 包名 → 就地升级替换(同包名同签名)
  appName: "小猫怎么了",
  webDir: "out", // App 静态导出产物
  android: {
    // 安卓 WebView 用 https://localhost 源(与 CORS 白名单一致)
  },
  server: {
    androidScheme: "https",
  },
};

export default config;
```

- [ ] **Step 3: 先产出 `out/` 再加平台**

```bash
npm run build:app
npx cap add android
```
Expected: 生成 `android/` 工程;CLI 末尾提示 `cap sync` 完成、webDir 已复制。
> Capacitor 要求 `webDir`(out/)在 `cap add` 前已存在,故先 build:app。

- [ ] **Step 4: 同步一次确认管线**

Run: `npx cap sync android`
Expected: `✔ Copying web assets from out to android/app/src/main/assets/public`、`✔ Sync finished`。

- [ ] **Step 5: 更新 `.gitignore`**

在 `.gitignore` 末尾追加(Capacitor 生成物/构建产物不入库,但 `android/` 工程源入库):
```
# Capacitor / 静态导出产物
/out/
/android/app/src/main/assets/public/
/android/.gradle/
/android/build/
/android/app/build/
/android/local.properties
/android/capacitor-cordova-android-plugins/
```
> `android/` 其余文件(gradle 配置、AndroidManifest、MainActivity 等)**要入库** —— Phase 1 的 Kotlin 插件就写在里面。

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json capacitor.config.ts android .gitignore
git commit -m "feat(app): 接入 Capacitor 7 + 加 Android 平台(包名 cn.whatsupkitty.app)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Android 签名 —— 复用现有 keystore(保就地升级)

**Files:**
- Create: `android/keystore.properties`(**不入库**,放敏感口令)
- Modify: `.gitignore`
- Modify: `android/app/build.gradle`(signingConfigs + release)

- [ ] **Step 1: 把 keystore 口令写进 `android/keystore.properties`(本地、不入库)**

```properties
storeFile=/Users/mantou/anxinmao-twa/android.keystore
storePassword=WhatsUpKitty2026Apk
keyAlias=<沿用现有 TWA alias>
keyPassword=WhatsUpKitty2026Apk
```
> alias 用现有 TWA keystore 里的那个;查看:`keytool -list -keystore ~/anxinmao-twa/android.keystore`(输入 store 口令),把列出的 Alias name 填进去。storePassword/keyPassword 以团队记忆为准。

- [ ] **Step 2: `.gitignore` 加一行**

```
/android/keystore.properties
```

- [ ] **Step 3: 改 `android/app/build.gradle` 加签名配置**

在 `android {` 块顶部(`compileSdk` 之前)加读取:
```gradle
    def keystorePropsFile = rootProject.file("keystore.properties")
    def keystoreProps = new Properties()
    if (keystorePropsFile.exists()) {
        keystoreProps.load(new FileInputStream(keystorePropsFile))
    }
```
在 `android {` 块内加 `signingConfigs` 并让 `buildTypes.release` 用它:
```gradle
    signingConfigs {
        release {
            if (keystorePropsFile.exists()) {
                storeFile file(keystoreProps['storeFile'])
                storePassword keystoreProps['storePassword']
                keyAlias keystoreProps['keyAlias']
                keyPassword keystoreProps['keyPassword']
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
```
> 确认 `applicationId "cn.whatsupkitty.app"` 与现有 TWA 一致(`cap add` 会按 capacitor.config 的 appId 生成,核对即可)。

- [ ] **Step 4: 验签名包能出 + 包名/签名与老 TWA 一致**

```bash
cd android && ./gradlew assembleRelease && cd ..
# 验包名与签名指纹
$ANDROID_HOME/build-tools/35.0.0/aapt dump badging android/app/build/outputs/apk/release/app-release.apk | grep package
keytool -printcert -jarfile android/app/build/outputs/apk/release/app-release.apk | grep SHA256
```
Expected: `package: name='cn.whatsupkitty.app'`;SHA256 指纹与现有 TWA apk 一致(对照 `keytool -printcert -jarfile <老TWA.apk>`)。**指纹一致 = 用户能覆盖升级,不会出现两个 App。**

- [ ] **Step 5: Commit**

```bash
git add .gitignore android/app/build.gradle
git commit -m "feat(app): Android release 复用现有 TWA keystore(保就地升级)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: App 首启提示"重置本地数据"(PRD §4.5)

**Files:**
- Create: `src/components/AppShellNotice.tsx`
- Modify: `src/app/layout.tsx`(挂载,App 壳限定)

> 背景:TWA(`www.whatsupkitty.cn` 源)与 Capacitor(`https://localhost` 源)存储不互通,覆盖升级后旧本地数据读不到。本期定调"接受数据丢失、不做恢复码",但**须如实告知**。

- [ ] **Step 1: 写 `src/components/AppShellNotice.tsx`**

```typescript
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
```

- [ ] **Step 2: 在 `src/app/layout.tsx` 挂载(App 壳限定)**

import 区加:
```typescript
import { AppShellNotice } from "@/components/AppShellNotice";
```
`<body>` 内,在 `{children}` 之后加:
```typescript
        {IS_APP_SHELL && <AppShellNotice />}
```
（`IS_APP_SHELL` 已在 Task 5 import。）

- [ ] **Step 3: 校验**

Run: `npx tsc --noEmit && npm run lint && npm run build:app`
Expected: 0 报错;App 导出成功。Web 构建下 `IS_APP_SHELL=false` → 不挂提示。

- [ ] **Step 4: Commit**

```bash
git add src/components/AppShellNotice.tsx src/app/layout.tsx
git commit -m "feat(app): App 首启提示「升级会重置本地数据」(PRD §4.5)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 10: 安卓真机冒烟门(go/no-go)—— API/流式/冷启动

**Files:** 无;本任务是 PRD §8 Phase 0 的真机验收(§11 成功标准)。

- [ ] **Step 1: 装到真机**

```bash
npm run build:app && npx cap sync android
npx cap run android   # 选已连接的真机/模拟器;或 Android Studio 里 Run
```
Expected: App 安装并启动,显示首启"重置数据"提示 → 进入建档流程。

- [ ] **Step 2: 逐项验核心功能经远端 API 全通**(对照 §11)

| 功能 | 操作 | 期望 |
|---|---|---|
| 建档 + 头像 | 走 onboarding,生成 AI 头像 | `/api/avatar` 返回成功,头像出图 |
| 分诊 | 选症状走完一轨道到报告 | 报告页正常出红/黄/绿(分诊定级是本地 `triage.ts`,不依赖网络;此步确认页面流转无碍) |
| 行为问答(**流式**) | 在 `/behavior` 问一句 | **回复逐字流式出现**(`/api/behavior` 跨源 SSE 正常) |
| 追问 | 问答后看是否出追问 chip | `/api/followups` 正常 |
| 云同步 | 建档后杀进程重开 | `/api/history` 拉回档案(pull 成功) |

- [ ] **Step 3: 重点盯流式(PRD 待解问题 #2)**

若 `/behavior` 回复**不流式/一次性蹦出/报错**:说明 Capacitor WebView 下跨源 `ReadableStream` 有问题。排查顺序:① Chrome `chrome://inspect` 看 WebView 控制台的 CORS/网络报错;② 确认 `/api/behavior` 的 OPTIONS 与流式响应都带了 `Access-Control-Allow-Origin: https://localhost`(Task 3);③ 若确为 WebView 流式限制,**降级方案**:给 `/api/behavior` 加一个非流式整包返回的兜底分支(App 壳请求头标记 `x-app-shell: 1`,服务端走整包),客户端 App 壳下不读 stream 而等完整 JSON。**此降级单独评估再做,不阻塞本门** —— 但必须记录现象。

- [ ] **Step 4: 冷启动 ≤ 3s(中端机)**

杀进程,秒表测点击图标到首屏可交互。Expected: ≤ 3s(中端机如骁龙 6 系)。若超,记录数值留 Phase 1 优化(本地资源已离线,通常达标)。

- [ ] **Step 5: 记录门禁结论**

把本任务结果(各项 ✅/❌ + 流式现象 + 冷启动秒数)追加到本计划文件末尾的"执行记录"或新建 `docs/superpowers/plans/2026-06-24-capacitor-foundation-phase0-results.md`。**全绿 = Phase 0 技术门通过,可进 Phase 1。**

---

## Task 11: iOS 壳(可选,本机有 Xcode 时做)

**Files:** Create(CLI 生成): `ios/`

> PRD §7:iOS App Store 本期不上(纯壳过不了 4.2);但 PRD §8 Phase 0 提到"双端跑通"。本机是 macOS,可加 iOS 壳本地验证前端能跑(不提交商店)。无 Xcode 则跳过,不阻塞 Phase 0 门。

- [ ] **Step 1: 加 iOS 平台**

```bash
npm install @capacitor/ios
npm run build:app && npx cap add ios && npx cap sync ios
```

- [ ] **Step 2: 真机/模拟器跑一次**

Run: `npx cap run ios`
Expected: App 启动,分诊/问答/同步同 Android 验证(iOS WebView 源是 `capacitor://localhost`,已在 CORS 白名单)。

- [ ] **Step 3: `.gitignore` + Commit**

`.gitignore` 加 `/ios/App/Pods/`、`/ios/App/App/public/`;然后:
```bash
git add package.json package-lock.json ios .gitignore
git commit -m "feat(app): 加 iOS 平台(本地验证用,本期不上 App Store)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 12: 国内上架主体决策(非代码门 · PRD §7 / §8 Phase 0 步骤 5)

> 这是业务决策,不是代码任务,但 PRD 把它列为 Phase 0 硬门——它决定整个上架路线。**不需要在 Phase 1 前完成,但要在本期结束前有结论。**

- [ ] **Step 1: 决策并记录**

二选一,写进 `docs/product/PRD-原生App化与桌面悬浮宠物-v1.2.md` 的对应位置或新建决策记录:
- **A. 注册企业主体**:走 ICP + 软著 + 工信部备案 + 医疗/宠物资质 → 可上国内安卓商店。
- **B. 不注册**:把"国内上架"移出目标,继续 apk 直链分发(Caddy `/dl/*`),Google Play 走国际。

- [ ] **Step 2: 据结论调整 Phase 3 上架计划**(Phase 3 单独成计划,本步只记录方向)。

---

## 自查清单(Self-Review,对照 PRD v1.2)

- **§4.1 双构建/双部署**:✅ Task 4(`build:app` + next.config 分支 + 导出清理)。
- **§4.2 API 枚举 + apiBase + CORS + 流式**:✅ Task 1/2(9 处全迁 + 护栏)、Task 3(8 端点 CORS、admin 不放、OPTIONS、流式 withCors)、Task 10 Step 3(流式真机验 + 降级预案)。
- **§4.3 静态导出修正**:✅ 已核验 4 页 Suspense 齐备(无需加)、`images.unoptimized`(Task 4)、幽灵 import 删除(Task 5)、`window` 守卫已安全;Task 6 真实跑门。
- **§4.4 SW 彻底清理**:✅ Task 4(导出清 sw.js/workbox)+ Task 5(App 壳不挂 SWRecovery、不引 manifest、不挂 next-pwa)。
- **§4.5 数据迁移定调**:✅ Task 9(首启提示,接受丢失、无恢复码)。
- **§4.6 包名/签名沿用**:✅ Task 7(appId)、Task 8(复用 keystore + 指纹一致性验证)。
- **§4.7 离线边界**:✅ 设计层面(壳离线可开、核心功能联网);Task 10 验证。
- **§8 Phase 0 六步门**:✅ 导出门(Task 6)、API 真机(Task 10)、双端(Task 10/11)、迁移(Task 9)、主体(Task 12)、包名签名(Task 8)。
- **§11 可度量**:✅ Task 10(导出 0 报错、能装能开、API 全通、冷启动 ≤3s)。

**Placeholder 扫描**:本计划所有代码步骤均给出完整代码或确切 before/after + 行号;无 "TBD/类似上文/适当处理"。
**类型一致性**:`apiUrl`/`API_BASE`(api-base.ts)、`IS_APP_SHELL`(app-env.ts)、`withCors`/`preflight`/`corsHeaders`(cors.ts)在各引用任务中命名一致。

---

## 执行交接

完成全部任务后,Phase 0 技术门通过即可进 [Phase 1 安卓悬浮桌宠](2026-06-24-android-floating-pet-phase1.md)。两份计划共用 `apiBase`/`IS_APP_SHELL`/`persist`/Capacitor `android/` 工程等地基。
