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

// 静态资源绝对化 —— App 壳下指向远端(让 App 不必本地打包大体积图,如知识图解),
// Web 下相对不变。已是绝对 URL(http/https)则原样返回。<img> 跨源加载无需 CORS。
export function assetUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return API_BASE + path;
}
