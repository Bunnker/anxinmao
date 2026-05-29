// 简单的内存限流 —— 试用期保护 API 额度(对话便宜,生图 ~¥0.3/张是大头)。
//
// 设计取舍:
// - 内存存储,容器重启清零。试用阶段够用;上规模再换 Redis / Vercel KV。
// - 双层:per-IP 日额度 + 全局日额度兜底。XFF 拿不到 IP 时(裸 IP 直连无反代)
//   退化为只看全局额度,仍然护住总花费。
// - 按服务器本地日期滚动归零。

type Kind = "chat" | "image" | "feedback";

// 中等档(用户选定):per-IP 对话 30 / 生图 5;全局 对话 300 / 生图 40。
// feedback 纯防刷(写本地文件、无外部成本),给得宽松些。
const PER_IP: Record<Kind, number> = { chat: 30, image: 5, feedback: 8 };
const GLOBAL: Record<Kind, number> = { chat: 300, image: 40, feedback: 200 };

type Bucket = { chat: number; image: number; feedback: number };

function emptyBucket(): Bucket {
  return { chat: 0, image: 0, feedback: 0 };
}

let dayKey = todayKey();
const perIp = new Map<string, Bucket>();
const globalBucket: Bucket = emptyBucket();

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function rollIfNewDay(): void {
  const k = todayKey();
  if (k !== dayKey) {
    dayKey = k;
    perIp.clear();
    globalBucket.chat = 0;
    globalBucket.image = 0;
    globalBucket.feedback = 0;
  }
}

// 从请求头取客户端 IP。Caddy / nginx 反代会设 X-Forwarded-For。
// 裸 IP 直连(无反代)时可能取不到 → 返回 "unknown",此时只走全局额度。
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export type RateResult =
  | { ok: true }
  | { ok: false; scope: "ip" | "global"; kind: Kind };

// 检查并扣减一次额度。返回 ok:false 时调用方应返回 429。
export function checkAndConsume(ip: string, kind: Kind): RateResult {
  // 仅生产环境限流。dev 本地反复测试不被额度挡。
  if (process.env.NODE_ENV !== "production") {
    return { ok: true };
  }
  rollIfNewDay();

  // 全局兜底先查
  if (globalBucket[kind] >= GLOBAL[kind]) {
    return { ok: false, scope: "global", kind };
  }
  // per-IP(拿得到 IP 时)
  if (ip !== "unknown") {
    const b = perIp.get(ip) ?? emptyBucket();
    if (b[kind] >= PER_IP[kind]) {
      return { ok: false, scope: "ip", kind };
    }
    b[kind] += 1;
    perIp.set(ip, b);
  }
  globalBucket[kind] += 1;
  return { ok: true };
}

// 友好提示文案
export function rateLimitMessage(kind: Kind, scope: "ip" | "global"): string {
  const what =
    kind === "image" ? "头像生成" : kind === "feedback" ? "反馈" : "问答";
  if (scope === "global") {
    return `今天大家把${what}额度用得有点多,服务器歇会儿,明天再来 🐱`;
  }
  return `你今天的${what}额度用完啦,明天再来 🐱`;
}
