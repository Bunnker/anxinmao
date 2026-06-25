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
