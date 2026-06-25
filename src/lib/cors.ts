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
    // 暴露自定义响应头给跨源(App)客户端读取 —— 否则浏览器/WebView 默认隐藏,
    // /api/behavior 的 X-Knowledge-Poster(相关图解,含红档急症图)会静默丢失。
    "Access-Control-Expose-Headers": "X-Knowledge-Poster",
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
