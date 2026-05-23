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
- **大模型(DeepSeek / 通义,待定)** —— 经 `src/app/api/` 服务端路由调用,密钥不进浏览器
- **部署:Vercel**
- 移动端 H5,竖屏,中文。日后可用 PWA / Capacitor 打包成 App(复用同一份代码)

## 目录

    src/
      app/          路由 + 页面(前端);app/api/ 是后端 API 路由
      components/   复用 UI 组件
      lib/          逻辑:分诊引擎、localStorage、LLM 客户端
      types/        TypeScript 类型
    docs/           产品 / 设计 / 调研文档(入口看 docs/README.md)
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
- **不做**:登录墙、电商 / 导流(含医院推荐 —— 用地图 deep link 代替)、AI 生成宠物
  形象、社区、多猫切换 UI(数据结构留接口)。
- 中文不用斜体;衬线只用于标题 / 情绪文字,功能文字用黑体。

## 设计方向

"温暖的纸质年鉴" —— 暖米纸色、陶土红点缀、衬线标题、克制留白。
完整规格见 `docs/product/前端设计PRD-v0.1.md`。

## 当前进度

工程脚手架 + 标准化目录已就绪(`src/app` 各屏为占位页)。
**下一步:** 把 `prototype/claude-design/` 的原型端口成真实页面 —— 端口时补上原型缺的:
红旗症状急停、各症状独立分诊流、空 / 加载 / 错误状态。
