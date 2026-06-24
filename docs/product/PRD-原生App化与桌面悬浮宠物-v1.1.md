# 小猫怎么了 · 原生 App 化与桌面悬浮宠物 PRD(v1.1)

- **日期**:2026-06-24
- **状态**:已经 Claude + codex 双评审并修订,待写实施计划
- **关联文档**:[PWA/TWA 设计](../superpowers/specs/2026-06-22-android-app-pwa-twa-design.md);本轮 deep-research 报告(Capacitor / 国内推送 / 上架合规,带信源)
- **一句话**:把「小猫怎么了」(www.whatsupkitty.cn)从网页 + PWA/TWA 推进为原生 App(Capacitor),并以 **安卓「桌面悬浮宠物」** 作为差异化特色。

> **v1.1 修订要点(对 v1.0 的修正,来自 Claude+codex 评审)**:① 补「双构建/双部署」与 **API 绝对 base URL + CORS + 流式跨源**(v1.0 漏的地基级问题);② 补 **TWA→Capacitor 换存储源导致老用户数据迁移**;③ 修正静态导出改造方向(无动态段、是 `useSearchParams`+`<Suspense>`,非 `generateStaticParams`)+ `next/image` unoptimized + 关 next-pwa;④ 把「国内上架 / 个人主体」提为 **Phase 0 go/no-go**;⑤ iOS 4.2 明确先不上 App Store;⑥ 定包名/签名沿用;⑦ 悬浮窗权限 UX、FGS `specialUse` 类型、性能验收指标、CID 隐私、桌宠红黄收敛、可度量成功标准。

---

## 1. 背景

「小猫怎么了」是面向新手猫主的猫咪分诊 App(选症状 → 追问 → 红/黄/绿风险分级 + 护理建议 + 行为问答)。情绪轴:**怕 → 安心**。

- **现状**:Next.js 16 (App Router) + React 19 + TS + Tailwind v4;已部署上线;**PWA + TWA apk(`cn.whatsupkitty.app`)已发布**。
- **后端约束**:`/api/*` 服务端路由握 LLM 密钥(DeepSeek/通义),做分诊、行为问答、头像生成、匿名云同步。**密钥不进客户端,后端必须托管。**
- **数据**:localStorage + 匿名 deviceId 云同步;**无登录、无数据库**(产品红线)。
- **市场**:国内为主、兼顾国际;医疗相关;**个人开发者(无公司主体)**。

**为什么走原生**:TWA 仍依赖手机浏览器引擎 + 实时加载线上站,体感偏"快捷方式";想要自带前端、为原生能力(悬浮宠物、推送)铺路。**悬浮宠物只有原生壳能做。**

---

## 2. 目标 / 非目标

**目标**
1. **Capacitor 原生化**:前端打包进原生壳本地加载;后端 API 保持托管。
2. **安卓桌面悬浮宠物**(本期重点)。
3. **为后续铺路**:推送提醒、上架(优先 Google Play)。

**非目标(本期)**
- iOS 桌面悬浮(系统不允许,§5.8);
- **iOS App Store 上架**(纯壳过不了 4.2,见 §7,推迟到有原生能力);
- 立即上国内安卓商店(取决于是否注册主体,见 §7 Phase 0 门);
- 登录墙 / 数据库 / 电商;改动分诊医学内容。

> **澄清「真原生」**:Capacitor 仍是**系统 WebView + 本地资源 + 原生插件 + 原生分发**,**不**换成原生 UI 引擎,也不消除对 WebView 的依赖。它解决的是"自带前端能离线、能用原生能力、能出 apk/ipa",不是"重写成原生界面"。

---

## 3. 目标用户与场景

- **用户**:刚养猫、对猫异常会焦虑的新手猫主。
- **悬浮宠物场景**:陪伴感从 App 内延伸到桌面。**注意红线(§9)**:红/黄风险报告后用户应去就医,桌宠此时要收敛、不得把人拉回来玩或给"没事"的暗示。

---

## 4. 技术方案:Capacitor(已按评审细化)

**选型**(依据 deep-research):个人开发者 + 已有 Next.js 前端 + 双市场下,Capacitor 复用度最高(UI 不重写、业务逻辑/API client/TS 类型直接迁移)、工作量**数周级**,远低于 RN/Flutter 重写(8–12 周级)。

### 4.1 双构建 / 双部署(关键边界)
`output:'export'` 是**全局**构建模式,会让 `src/app/api/*` 这批流式 Route Handler 不再在同一产物里。因此一套代码、**两条构建/部署线**:
- **Web 站**:继续 server build(`next start`,含 API 路由),部署在 `www.whatsupkitty.cn`(现状不变)。
- **App 前端**:**单独 `output:export` 静态构建** → `out/` → Capacitor `webDir`(不含 API)。
- **API**:固定走远端 `https://www.whatsupkitty.cn/api/*`。

### 4.2 API 接入改造(v1.0 漏的地基级,**Phase 0 必做**)
现客户端用**相对路径** `fetch("/api/behavior")` / `/api/history` / `/api/avatar` / `/api/memory/extract`。Capacitor 本地资源跑在 `capacitor://localhost`(或 `https://localhost`)源下,相对路径会**打到本地壳、不是线上后端**。必须:
- **统一 API base**:抽一个 `apiBase`,Web 构建用相对 `''`、App 构建用绝对 `https://www.whatsupkitty.cn`(按构建环境切换);所有 `fetch("/api/...")` 改为 `fetch(apiBase + "/api/...")`。
- **后端 CORS**:`/api/*` 放行 Capacitor 源(`capacitor://localhost` / `https://localhost`)+ 预检。
- **流式(SSE)跨源**:`/api/behavior` 是流式,确认跨源 + Capacitor WebView 下 `ReadableStream`/SSE 正常,给失败兜底。
- **环境与失败兜底**:无网/后端不可达时的 UI 兜底(分诊/问答本就需联网,见 §4.7 离线边界)。

### 4.3 静态导出实情(修正 v1.0 的方向错误)
实测代码:**没有任何 `[动态段]` 路由**,`/triage`、`/report`、`/behavior` 全是静态路径 + query 参数(`useSearchParams`,如 `?symptom=`/`?claims=`/`?tier=`/`?c=`)。所以:
- **不需要 `generateStaticParams()`**(v1.0 说要,错)。
- **真正的坑**:`useSearchParams` 在 `output:export` 下**必须包 `<Suspense>` 边界**,否则 build 报错——逐页加。
- **`next/image`**:`Welcome.tsx` 等用了 `next/image`,静态导出需 `images.unoptimized: true`(或自定义 loader)。
- `window/localStorage` 访问加 `typeof window`/`useEffect` 守卫(SSR/导出期不炸)。
- **入口门禁**:先在真实代码跑一次 `next build`(export)拿到**确切报错清单**,作为 Phase 0 的 go/no-go 依据(见 §8)。

### 4.4 next-pwa / Service Worker
现 `next.config.ts` 挂 `@ducanh2912/next-pwa`。**Capacitor 构建关掉 next-pwa**(本地资源不需要 SW,且 SW 缓存远端 API 会与 Capacitor 冲突 / 影响更新与错误恢复)。Web 站的 PWA 保持不变。

### 4.5 老用户数据迁移(v1.0 漏,**Phase 0 必做决策**)
TWA 用手机 Chrome 引擎、存储绑 `www.whatsupkitty.cn` 源;Capacitor 用本地 `capacitor://localhost` 源——**两者存储不互通**。现有 TWA/PWA 用户的 `localStorage`(猫档案/记录)与 `deviceId` **不会自然带过来**,匿名云同步也按旧 deviceId 存(`.data/history/<deviceId>.json`)→ 升级到 Capacitor 后**数据看着"丢了"**。方案(本期定调):
- **接受现有 TWA/PWA 安装"新装即新档"**(当前早期、真实用户少,可接受);
- **提供可选「恢复码」**:复用早先讨论的设备级思路——用户在旧入口复制 deviceId(恢复码),在新 App 输入即从 `/api/history` 拉回云端档案。不破"无登录"。

### 4.6 包名与签名
**沿用 `cn.whatsupkitty.app` + 现有 TWA keystore**(`~/anxinmao-twa/android.keystore`,密码已备份)→ Capacitor apk 作为 TWA 的**就地升级替换**(同包名同签名,用户自动升级,不出现两个 App)。**keystore 绝不能丢/换**,否则用户无法覆盖升级。

### 4.7 离线边界(如实降级,非卖点)
界面/静态资源**离线可打开**;但**分诊/问答/头像全要联网调后端 LLM**——对分诊 App,"离线"仅是壳可开,核心功能仍需网络。不把"离线"当成产品卖点。

---

## 5. 核心特性:安卓桌面悬浮宠物(本期重点)

### 5.1 范围
**仅安卓做真悬浮;iOS 保持院子内桌宠不变。**

### 5.2 行为
浮在桌面/其他 app 上 → 漫游 + 偶尔播现有逐帧动作(洗脸/逗猫棒/walk,`public/pet/items/*.webp`)+ 点击互动。**最大化复用已画好的帧。**

### 5.3 渲染架构(WebView 复用动作)
- **原生(Kotlin)= 容器与运动**:悬浮窗(`TYPE_APPLICATION_OVERLAY`)+ **前台服务保活** + **漫游**(`WindowManager` 移动小窗口)+ 触摸。**小窗口跟随移动**避免全屏遮挡。
- **WebView = 那只猫**:透明 WebView 复用现有逐帧动画渲染猫。
- **不可见即暂停(强制要求)**:屏幕关 / App 切前台遮住 / 猫不在可见区时,**暂停动画与漫游循环**,降耗电。

### 5.4 组件拆分
| 单元 | 职责 |
|---|---|
| `FloatingPet` Capacitor 插件(Kotlin) | `requestPermission / show / hide / isShown / isSupported`;管悬浮窗 + 服务 |
| 前台服务(`specialUse` 类型) | 保活 + 常驻通知 + 漫游循环(可见时) |
| 悬浮 View(原生) | 承载透明 WebView;点/拖/边缘吸附 |
| `floating-pet` web(复用) | 极简页面,复用共享猫组件,只画猫 + 动作 |
| App 内设置(新增 IA,见 §5.7) | 「桌面悬浮宠物」开关 + 权限说明 |

### 5.5 共享猫组件抽取(真实范围,别低估)
现桌宠逻辑**深嵌 `src/app/page.tsx`** 的院子、物件、定时器、visibility/calm 状态、拖拽里。抽出"渲染猫 + 逐帧动作"的共享组件需:**先界定状态机与最小依赖**(剥离院子坐标/物件耦合)、资源预加载、悬浮页只带必要逻辑。这是 Phase 1 的主要工程量之一,不是简单"抽个组件"。

### 5.6 交互流程
- 设置开启 → 查权限 → 未授权跳系统授权页(带说明)→ `show()` → 起前台服务 → 漫游(可见时)。
- **点猫 = 切回 App**(顺带卖萌反应);**拖动 = 挪位置**;**长按 = 收回**。
- 关设置开关 / 长按收回 → `hide()` → 停服务 → 移除悬浮窗。

### 5.7 设置项:「桌面悬浮宠物」(仅安卓,**新增信息架构**)
现 `src/app` **没有独立 settings 路由**——本期要**新增设置入口与页面**(放「我的」下或新建 `/settings`),不是改个文案。设置项:
- **主开关:让桌宠出现在桌面**。首次开启 → 说明 → 请求悬浮窗权限 → 授权后浮现;**拒绝则开关弹回 off + 提示,核心 App 不受影响**。
- **记住偏好**:持久化;下次打开 App 若仍是 on,自动放回桌面。
- **子项**:「点猫切回 App」默认开;「开机自动出现」默认**关**。

### 5.8 iOS 处理
iOS 系统禁止画在其他 app/桌面上面。插件 iOS `isSupported=false`、`show` 为 no-op;设置项在 iOS **隐藏/置灰标「仅安卓」**;iOS 院子内桌宠不变。

### 5.9 权限 / FGS / 错误处理
- **悬浮窗权限**是系统级、需用户在权限管理页显式授权(`SYSTEM_ALERT_WINDOW`)。要做:清晰的**为什么需要**说明、**授权转化**引导、**商店审核解释材料**、**拒绝后兜底**(猫留院子里)。
- **Android 14+ 前台服务**:漫游桌宠大概率走 **`specialUse` 类型**,需 `FOREGROUND_SERVICE_SPECIAL_USE` 权限 + manifest `subtype` 说明,**且会被 Google Play 审核**(准备说明材料)。
- **OEM 杀后台**(小米/华为等)激进,常驻通知 + 正确 FGS 缓解但不根治,如实告知用户。
- WebView 悬浮层:透明、无滚动条、**本地加载**;点/拖区分(touch slop);`show/hide` 幂等。

---

## 6. 原生能力路线图(后续)

- **推送提醒(疫苗/喂药)** —— FCM 国内不可用 → 接 **个推/极光**(在线走自建通道、离线走小米/华为/OPPO/vivo 厂商通道);iOS APNs。
  - **设备级 CID 不需账号,但仍是个人信息**:CID + deviceId 映射是长期设备标识 + 可触达通道,**需隐私政策、撤回、删除、Data Safety/隐私标签**(不是"匿名就没事")。
  - **与「无数据库」红线的张力(须正视)**:Phase 2 要持久化 `deviceId↔CID 映射表` + 定时提醒任务 + 退订状态 + 失败重试 + 换机/卸载重装策略——这是服务端持久状态。决策:把它当作**独立的推送状态存储**(非"用户账号数据库"),或用推送服务商自带定时;Phase 2 单独定。
  - **"可靠"还需**:本地通知 + 精确闹钟权限(`SCHEDULE_EXACT_ALARM`)+ 时区 + 免打扰 + 误提醒责任边界,不能只靠推送厂商。
- **相机深度**:Capacitor `@capacitor/camera` 官方插件。
- **桌面小组件**:成熟度待评估(§12),后续可选。

---

## 7. 上架与合规(重排:国内主体提为 Phase 0 门)

| 商店 | 难度 | 关键 |
|---|---|---|
| **Google Play(国际)** | 🟢 最易、优先 | $25 账号、隐私政策、Data safety、内容分级、target API、(TWA→Capacitor 仍可)。**悬浮窗/FGS `specialUse` 会被审,备材料。** |
| **国内安卓商店** | 🔴 **项目级阻塞,Phase 0 go/no-go** | 主流商店基本要**企业主体(营业执照)** + ICP + **软著** + **工信部 App 备案** + 医疗/宠物健康类**可能额外资质**。**个人无主体 → 上不了。** 必须 Phase 0 决策:要么注册主体,要么"国内上架"移出目标、继续 apk 直链分发。 |
| **Apple App Store** | 🟠 **本期不上** | iOS 是 Capacitor 壳 + 远端 API、**没有悬浮宠物这个原生抓手** → 仍是"薄网页壳",**4.2「最低功能」大概率被拒**。推迟到有真原生能力(如推送)且定义清"app-like 抓手"后再上。 |

> 通用:隐私政策、个人信息保护(PIPL)合规、应用截图/文案、年龄分级、医疗免责。

---

## 8. 分阶段路线(Phase 0 加硬门禁)

- **Phase 0 · 地基 + 决策门(go/no-go)**——**全过才进 Phase 1**:
  1. 真实代码跑 `next build`(`output:export`)→ 拿到确切报错清单 → 修(Suspense / next/image unoptimized / window 守卫)。
  2. **API 绝对 base + CORS + 流式跨源**改造并在 Capacitor 真机验证分诊/问答/头像/同步通。
  3. 接 Capacitor、安卓 + iOS 双端跑通(界面离线开、API 联网正常)。
  4. **老用户数据迁移决策**(接受新装即新档 + 恢复码)落地。
  5. **国内上架主体决策**(注册主体 or 移出目标)——这决定后续整个上架路线。
  6. 包名/签名沿用 `cn.whatsupkitty.app` + 现有 keystore 验证可覆盖升级。
- **Phase 1 · 安卓悬浮桌宠(本期重点)**:抽共享猫组件(§5.5)→ `FloatingPet` 插件(悬浮窗 + `specialUse` 前台服务 + 漫游 + 触摸 + 不可见暂停)→ 复用 WebView → 新增设置 IA → 安卓真机 + 多 OEM 验。
- **Phase 2 · 推送提醒**:个推/极光 + 后端推送状态存储 + 本地通知/精确闹钟 + 隐私合规。
- **Phase 3 · 上架**:Google Play 先行;国内视主体决策;iOS 视原生能力补足后再评估。

---

## 9. 产品红线(不可妥协)

- 医疗:一律"建议是否就医",**绝不"诊断"**;红旗急停直跳红档;**风险三色独立信号层**。
- **桌宠红黄收敛(新增)**:出现红/黄风险报告后,悬浮桌宠**不得卖萌打断、不得把用户拉回来玩、不得给"没事/替代就医"的暗示**;此时引导是"尽快就医"而非陪伴交互。
- 不做:登录墙、数据库(推送状态存储须界定边界,§6)、电商。
- AI 形象不进医学示意图。
- 悬浮宠物文案不焦虑、不诊断、不碰风险三色。

---

## 10. 风险

- **桌宠**:OEM 杀后台 / 耗电 / 悬浮窗授予率 / Google Play 对 `specialUse` FGS 的审核 / 悬浮窗政策收紧 / WebView overlay 性能与发热。
- **迁移**:老用户数据不带过来(已定 fresh start + 恢复码,仍可能流失)。
- **上架**:个人无主体上不了国内主流商店;iOS 4.2;医疗资质。
- **静态导出**:`next build export` 真实报错未跑,Phase 0 门可能比预期重。
- **API 跨源/流式**:Capacitor WebView 下 SSE / CORS 行为需实测。

---

## 11. 成功标准(可度量)

- **Phase 0**:`next build export` 0 报错;Capacitor 安卓/iOS 真机能装能开;分诊/问答/头像/云同步经远端 API 全通(流式问答可用);冷启动到首屏 ≤ 设定阈值(实测定);恢复码能拉回云端档案。
- **Phase 1(安卓悬浮桌宠)**:5 个国产 OEM(小米/华为/OPPO/vivo/荣耀)× Android 12–15 上:能放出来/漫游/点击切回/设置控制;**后台存活 ≥ 30–60 分钟**;**耗电 ≤ 阈值**(实测定);崩溃率 / ANR / 帧率 / 触摸延迟达标;授权转化率可观测。
- **Phase 2/3**:推送到达率、商店过审 —— 各阶段单列。

---

## 12. 待解问题

1. **`next build`(export)真实报错清单**:Phase 0 入口门禁,需在真实代码跑(只读环境无法跑会写 `.next/out` 的 build,留待执行时)。
2. **Capacitor WebView 下 SSE/CORS** 的真实行为(流式问答能否稳定跨源)。
3. **桌面小组件**在 Capacitor 下的成熟度。
4. **个推 vs 极光**选型(个人主体门槛、免费额度、iOS APNs、鸿蒙通道)。
5. **国内商店对宠物/医疗类 + 个人主体**的硬性资质(是否绝对要企业)。
6. **悬浮 WebView 性能**在低端机/不同 OEM WebView 版本上的实测表现。
