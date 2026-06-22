# 安心猫 Android App 化设计(PWA 打磨 + Bubblewrap TWA)

- **日期**:2026-06-22
- **状态**:已评审,待写实施计划
- **域名**:`https://www.whatsupkitty.cn`(canonical = www,见 `src/app/layout.tsx` `SITE_URL`)
- **一句话**:把现有 Next.js PWA 打磨成"装着像原生"的 Android App(A),并用 Bubblewrap 封成真 `.apk`(B,TWA)。复用同一份代码,后端不动。

## 背景 & 动机

安心猫是面向新手猫主的移动端 H5(Next.js 16 + React 19 + TS)。用户希望"做成 Android App",经两轮澄清明确:

- **核心目标** = 自己 / 朋友装着用 + 更像"真 App"的体验感;
- **平台** = Android 为主;
- **明确不要** = 上架商店、推送通知。

**关键约束**:9 个 `src/app/api/*` 路由握着 LLM 密钥 + 匿名云同步,`src/lib/llm.ts` 绝不可被前端 import → **后端必须保持托管**。native 端只能是"前端壳 + 远程后端",不存在纯离线 / 纯本地方案。

PWA 其实已搭好:`@ducanh2912/next-pwa` + `public/manifest.json` + `public/sw.js` + maskable 图标 + 全站 `env(safe-area-inset-*)` 刘海适配,约**八成就绪**。Android Chrome 又是 PWA 支持最好的平台。因此本方案 = **打磨现有 PWA(A)+ 用 TWA 封 apk(B)**,而非重写原生。

## 目标 / 非目标

**目标**

- Android 上安装后无浏览器痕迹;启动图 / 状态栏 / 图标与品牌一致;
- 应用内一键"装到桌面",朋友零门槛安装;
- 产出可侧载的真 `.apk`(TWA),全屏、零地址栏。

**非目标(本期不做)**

- iOS 启动图(`apple-touch-startup-image`)那一套;
- 上架 Google Play / App Store;
- 推送通知、原生插件(相机 / 小组件等);
- 任何后端 / 分诊流程 / 医学内容改动 —— **产品红线一律不碰**。

## 锁定决策

| 项 | 值 | 备注 |
|---|---|---|
| prod 域名 | `https://www.whatsupkitty.cn` | canonical = www(`layout.tsx` `SITE_URL`)。assetlinks + TWA host 都用 www |
| 包名 `applicationId` | `cn.whatsupkitty.app` | **分发后不可改**,先定死 |
| 桌面 / 启动名 | `小猫怎么了` | 沿用现有 `short_name` / `applicationName`;可在更新中随时改 |
| `theme_color` / `background_color` | `#f7f6f3`(暖奶白) | 与 `layout.tsx` `viewport.themeColor` 对齐;启动图走暖白底 |

## A · PWA 打磨(复用现有代码)

### A1 修 manifest 颜色(bug)

`public/manifest.json` 的 `background_color` / `theme_color` 现为旧"年鉴"米色 `#f5e6cf` / `#a64a2f`,与 2026-06 暖奶白重设计脱节 → 均改 `#f7f6f3`。`layout.tsx` `viewport.themeColor` 已是 `#f7f6f3`(**无需动**)。效果:Android 自动启动图 = 暖白底 + 图标,状态栏与 App 内一致。

> 备选:想要陶土红状态栏可把 `theme_color` 设 `#b05a50`;默认走暖白。

### A2 图标:拆分 any / maskable

现状:一张图复用 `purpose: "any maskable"`(192 / 512)。问题:maskable 需把重要内容落在内 80% safe zone,否则 Android 自适应图标边缘被裁。

做法:从 `public/icons/icon-source.png` **程序化派生**(缩放 / 合成,不重画,保持品牌一致):

- `icon-192.png` / `icon-512.png` → `purpose: "any"`(满幅清晰);
- `maskable-192.png` / `maskable-512.png` → `purpose: "maskable"`(logo 缩进内 80%,留白填 `#f7f6f3` 或品牌色);
- 补 `apple-touch-icon-180.png`(廉价完整性,iOS 用)。

`manifest.json` `icons[]` 两类分别列出。实施时用 maskable 预览 / 真机验证不被裁。

### A3 应用内"装到桌面"

新增 `src/components/InstallPrompt.tsx`(client component),挂首页 greeting 下方,克制白卡 + 陶土红点,贴合暖奶白设计:

- 监听 `beforeinstallprompt`,`preventDefault` 后暂存 event,显示按钮"装到桌面 · 像 App 一样打开";
- 点击 → `deferredPrompt.prompt()` → `await userChoice`,接受后隐藏;
- 已安装检测(`matchMedia('(display-mode: standalone)')`)或用户关闭(localStorage flag,走现有 `persist` 模式)→ 不再出现;
- 不支持 `beforeinstallprompt` 的浏览器 → 回退静态提示"浏览器菜单 → 添加到主屏"。

朋友首访即见此 CTA,一键安装,无需口头教学。

### A4 manifest 增强(更丰富安装弹窗)

`public/manifest.json` 补:

- `id`: `"/?app"`(稳定 app id);
- `scope`: `"/"`;
- `categories`: `["medical", "lifestyle"]`(仅商店元数据,不改内容);
- `screenshots`: 1–3 张竖屏截图(`form_factor: "narrow"`)→ Android 触发带预览图的安装弹窗。

截图从真机 / 预览抓首页 + 报告页。

### A5 原生手感 CSS(`src/app/globals.css`)

- `-webkit-tap-highlight-color: transparent`(去点击灰闪);
- 根容器 `-webkit-touch-callout: none; user-select: none`,**但聊天 / 报告正文区域 opt-in 回 `user-select: text`**(保留复制);
- 主滚动容器 `overscroll-behavior: contain`(去 webby 回弹辉光)。

低风险、手感提升明显。与既有"院子改 `background-image` 防长按存图"互补。

## B · Bubblewrap → TWA `.apk`

### 前提

A 完成(有效可安装 PWA)+ prod 站点在线(`www.whatsupkitty.cn` HTTPS)+ 本机 JDK / Android SDK(Bubblewrap 可引导安装)。

### 步骤

1. `npx @bubblewrap/cli init --manifest https://www.whatsupkitty.cn/manifest.json`;
2. 配置:`applicationId` = `cn.whatsupkitty.app`、name = `小猫怎么了`、orientation = portrait、复用 A2 图标、主题色 `#f7f6f3`;
3. `bubblewrap build` → 出 `app-release-signed.apk` + `.aab` + 自动生成 keystore;
4. **备份 keystore + 口令到固定安全位置**(丢失 = 无法发布同一身份的更新)。

### 域名归属验证(Digital Asset Links)

- 取 Bubblewrap 输出的签名 SHA-256 指纹;
- 写入 `public/.well-known/assetlinks.json`(Next 16 经 `public/` 原样托管,根路径可达,非 Next API);
- 部署后访问 `https://www.whatsupkitty.cn/.well-known/assetlinks.json` 确认可达 → Android 校验通过 → **apk 全屏、无地址栏**。

### 分发 & 更新

- apk 发给朋友 → 系统"允许未知来源"→ 安装;
- **UI / 内容更新随网页部署自动生效**(TWA 实时加载线上站),apk 仅在改图标 / 包名 / 启动配置时才需重新 build + 重发。

## 架构影响:零后端改动

纯客户端打包层。9 个 API 路由、LLM 密钥、`/api/history` 云同步、localStorage / Cookie 兜底 / deviceId 同步全不动。standalone / TWA 与网页**同源**,存储与同步继续生效并与浏览器标签共享状态。**分诊 / 报告 / 知识 / 医学内容零改动,红线不触碰。**

涉及文件一览(预期):`public/manifest.json`、`public/icons/*`、`public/.well-known/assetlinks.json`(新增)、`src/components/InstallPrompt.tsx`(新增)、`src/app/page.tsx`(挂载 InstallPrompt)、`src/app/globals.css`。`layout.tsx` 预期不动(themeColor 已正确)。如确需动 `layout.tsx` metadata,先查 `node_modules/next/dist/docs/01-app/` 按 `AGENTS.md`。

## 数据存储 / 登录(澄清 —— 不改设计,只钉边界)

**封装后数据存哪?不变。** PWA(WebAPK)/ TWA 都是同源 WebView,与 Chrome 共享 `www.whatsupkitty.cn` 的存储:

- localStorage 存整份 store(`cats[]` 含 base64 `avatar` + `photos`、`records`、`activeCatId`),见 `src/lib/storage.ts` / `src/types/cat.ts`;
- 三层兜底照旧:Cookie 瘦身版(剥掉 `avatar`/`photos` 防撑爆,`storage.ts:45`)+ 匿名 `deviceId` 云同步 → 服务端 `.data/history/<deviceId>.json`(prod Docker 挂卷);
- 封装不改这套。可选硬化:首次写入时 `navigator.storage.persist()` 申请持久存储,降低系统回收概率;
- 注意:TWA/WebAPK 与 Chrome 共享同源存储 → 用户清 Chrome 数据会一并清掉,云同步是兜底。

**文件管理中间件?本期不做(与封装无关的既有话题)。** 头像 / 相册现为 base64 内联在 localStorage。localStorage 约 5–10MB/源,大量手机照片可能触顶(`QuotaExceededError`)。对"自己 + 少量朋友"的体量大概率够用;真到照片堆多,再把图挪到对象存储(Vercel Blob,CLAUDE.md 下一步候选 #1)或 IndexedDB。**明确不进本次 App 化范围。**

**登录?不做,且是红线(不做登录墙)。** 现以匿名 `deviceId` 云同步替代:同设备清缓存 / 重装可恢复;跨设备不同步、彻底清数据 / 换机会丢(deviceId 变)。日后若需跨设备或保证换机恢复,**不上登录墙**,改做轻量「备份码 / 恢复码」(复制一串码,新设备输入即拉回 `/api/history` 数据)即可。封装本身不依赖登录。

## 验证

- **PWA**:Chrome DevTools → Application → Manifest 无报错;Lighthouse PWA 审计(installable + maskable 通过)。真机:Chrome 开 prod → 安装按钮出现 → 装 → 验图标遮罩、启动图色(暖白 ≠ 旧米)、全屏、应用抽屉、状态栏色。
- **安装按钮**:已装 / 已关 → 不出现;不支持浏览器 → 回退提示。
- **CSS**:报告 / 聊天正文仍可选中复制;UI chrome 无长按菜单、无点击灰闪。
- **TWA**:装 apk → **确认无地址栏**(assetlinks 生效)、图标 / 名称、系统返回键、deep link 站内打开;assetlinks.json 线上可达。
- **回归**:`npm run build`(prod 构建才启用 next-pwa)通过类型检查 + 构建;不碰分诊 / 医学逻辑,相关 harness 不受影响。

## 风险 & 缓解

- **assetlinks 指纹 ≠ 签名 key → TWA 露地址栏**(头号坑):直接抄 Bubblewrap 输出指纹,真机验证。
- **keystore 丢失 → 无法更新**:备份到固定位置并记录。
- **包名分发后不可改**:已锁 `cn.whatsupkitty.app`。
- **`beforeinstallprompt` 不触发**(已装 / 条件不满足 / 非 Chromium):回退静态提示兜底。
- **选中抑制误伤正文复制**:按区域白名单,正文 opt-in `user-select: text`。
- **canonical host 一致性**:assetlinks / TWA host / manifest 同源都用 `www.whatsupkitty.cn`;apex `whatsupkitty.cn` 若重定向到 www,确保 TWA 配 www(已确认 canonical = www)。
- **部署红线**:改 manifest / 上 assetlinks 让 prod 变化前,**先经用户批准再部署**;改码 + 本地验证 + commit 自行进行。

## 不做 / 未来(门留着)

- 上 Play Store:同一个 `.aab` 随时可上($25 一次性开发者账号);
- iOS PWA 打磨(启动图 / 状态栏)及未来 iOS 方案;
- 推送通知(若日后要疫苗 / 喂药提醒,再评估 web push vs 原生)。
