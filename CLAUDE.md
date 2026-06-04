# 猫咪安心分诊器

面向"刚养猫的新手"的移动端网页应用。猫不对劲时,用户选症状 → App 追问几个问题
→ 输出红 / 黄 / 绿风险分级 + 护理建议;另有行为 / 养育类轻量问答。情绪轴:**怕 → 安心**。

> **Next.js 16:** 这版 Next 有 breaking changes。写 Next 相关代码(路由、API、配置、
> 元数据等)前,先查 `node_modules/next/dist/docs/01-app/`,并以脚手架生成的文件为准。
> 详见 `AGENTS.md`。

## 技术栈

- **Next.js 16 (App Router) + React 19 + TypeScript** —— 前端页面 + 后端 API 一体
- **Tailwind CSS v4** —— 样式;设计令牌在 `src/app/globals.css`(`:root` + `@theme`)
- **localStorage** —— MVP 数据持久化。**不做数据库、不做登录**
- **大模型(DeepSeek 或 通义,二选一)** —— provider 无关,按 `.env.local` 里填的 key
  自动选用;经 `src/app/api/` 服务端路由调用,密钥不进浏览器。SSE 流式输出 +
  对话摘要压缩(20 轮以上自动 compact)。客户端见 `src/lib/llm.ts`
- **部署:Vercel**
- 移动端 H5,竖屏,中文。日后可用 PWA / Capacitor 打包成 App(复用同一份代码)

## 目录

    src/
      app/          路由 + 页面(前端);app/api/ 是后端 API 路由
      components/   复用 UI 组件
      lib/          逻辑:分诊引擎、localStorage、LLM 客户端
      types/        TypeScript 类型
    docs/           产品 / 设计 / 调研文档(入口看 docs/README.md)
    scripts/        utility 脚本 —— harness 测试、知识页配图生成
    public/         静态资产(含 public/knowledge/ 的 6 张知识页配图)
    prototype/      设计原型(home.html + claude.ai 导出的 claude-design/)

## 跑起来

    npm run dev      # → http://localhost:3000,用浏览器设备模式看手机尺寸
    npm run build    # 生产构建 + 类型检查

## 产品红线 —— 不可妥协(来自 office-hours 审核)

- 医疗措辞一律"**建议是否就医**",**绝不出现"诊断"**。每屏底部固定"AI 整理 · 不能替代兽医"。
- **红旗症状**(呼吸困难、抽搐、大量出血、尿闭、误食等)→ 分诊中途即可急停、直跳红档,
  不把流程问完。
- **风险三色(红 / 黄 / 绿)是独立信号层** —— 不从暖色品牌盘里调;颜色 + 图标 + 文字
  三重传达,不靠颜色单扛。令牌见 globals.css 的 `--red / --amber / --green`。
- **不做**:登录墙、电商 / 导流(含医院推荐 —— 用地图 deep link 代替)、社区、
  多猫切换 UI(数据结构留接口)。
- **AI 生成宠物形象** 仅用于头像 / 伴侣角色(greeting、报告卡片角落等),**不进入
  医学示意图**(分诊页症状描述、报告页病征示意、知识页关键信号示意)。
  理由:用户家猫的卡通形象不应该和「严重脱水」「牙龈苍白」「呼吸困难」等关键诊断
  信号绑定,可能给出错误信号。详见 `docs/product/AI生成形象-实施说明.md`。
- 中文不用斜体;衬线只用于标题 / 情绪文字,功能文字用黑体。

## 设计方向

"温暖的纸质年鉴" —— 暖米纸色、陶土红点缀、衬线标题、克制留白。
完整规格见 `docs/product/前端设计PRD-v0.1.md`。

## 当前进度

仓库:[github.com/Bunnker/anxinmao](https://github.com/Bunnker/anxinmao)(产品名「安心猫」)。

### 已经上线的页面

- **`/`** —— 首页:greeting + 猫资料 + 两个主入口(分诊 / 行为问答)+ 安心知识入口
  + 最近记录
- **`/onboarding`** —— 猫咪档案首次录入(姓名、月龄、性别、毛色、体重)
- **`/symptoms`** —— 16 张症状卡(吐 / 拉 / 不吃 / 萎靡 / 打喷嚏 / 耳朵 / 皮肤 / 眼 /
  口腔 / 行为 / 跛行 / 误食 / 呼吸困难 / 大量出血 / 尿闭 / 其它)
- **`/triage`** —— 症状分诊流程,15 个症状专属轨道(`src/lib/triage.ts` 的 `FLOWS`)
- **`/report`** —— 红 / 黄 / 绿三色风险报告,11 个 group 各有专属文案;5 个红线急停
  group(digest / breath / blood / urethra / ingest)对应权威源(VCA / Anicira /
  iCatCare 尿道阻塞 / Cornell / Merck)
- **`/behavior`** —— 行为问答:DeepSeek/通义流式回复 + 对话摘要压缩(20 轮以上)
- **`/knowledge`** —— 「看着吓人但不必慌」Anicira 非急症清单(6 张 gpt-image-2 配图 +
  ✓ chips overlay + 升级条件)

### 后端 API(`src/app/api/`)

- `triage` —— 分诊结果生成(LLM)
- `behavior` —— 行为问答 SSE 流式
- `summarize` —— 对话摘要压缩

### 证据底稿

15+ 份 `docs/product/证据-*.md`,每个症状轨道 / 急症 entity 都对接到具体权威源
(Cornell / Merck / VCA / Anicira / iCatCare / AVMA / ASPCA)。

### 测试 harness

`scripts/harness-behavior.mjs` —— 行为问答压缩 + 上下文连贯性测试。

### 下一步候选(按当前优先级排序)

1. **用户家猫卡通头像** —— `/onboarding` 加一步(文字描述 + 可选拍照),codex/gpt-image-2
   出图,Vercel Blob 存储。边界严格按 [docs/product/AI生成形象-实施说明.md](docs/product/AI生成形象-实施说明.md) §二
2. ~~**行为问答 Q&A 持久化**~~ —— 已完成:`saveConversation` 落 `kind:"behavior"`
   记录(带完整对话),首页「最近」可点回 `/behavior?c=<id>` 还原,且搭上匿名云同步
3. **Vercel 部署** —— 让产品真正 demo 起来
4. **逐条经兽医审核 → 更强标签** —— 现已用 `ReviewedNotice`「经执业兽医审阅 ·
   权威来源核对」(对应兽医审阅认可大方向 + 权威源逐条 claim;不声称逐条严审)。若要
   升级到「逐条经执业兽医审核」标签,需走 per-condition 审核 pipeline 逐条过
   `docs/product/证据-*.md`(design doc 见 `~/.gstack/projects/Bunnker-anxinmao/`)
