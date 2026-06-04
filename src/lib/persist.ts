// 韧性持久化 —— localStorage 主存,Cookie 兜底。
//
// 动机:微信 / QQ 等 App 内置浏览器(X5 / webview)经常不保 localStorage ——
// 重新打开链接就拿到一个空的 / 被清掉的 localStorage,导致猫档案、历史记录、
// 教程「看过」标记全丢(用户反馈:没有历史记录 + 使用说明每次都弹)。
// Cookie 在这类 webview 里明显更可靠,作为回退层。
//
// 读:先 localStorage,空了再读 Cookie(不回填 localStorage —— webview 里回填也会
//     被再次清掉,且回填会让 useSyncExternalStore 的快照抖动)。
// 写:两边都写。Cookie 有单条 ~4KB 上限,超了由调用方裁剪后通过 cookieValue 传入。

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 年
// 单 Cookie 上限约 4096 字节(含名字);留余量,编码后超过就不写 Cookie(localStorage 仍在)。
const COOKIE_BUDGET = 3900;

// Cookie 名是 token,不能带 ":" 等分隔符 —— 统一替换成下划线。
function cookieName(key: string): string {
  return key.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function readCookie(key: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${cookieName(key)}=`;
  const parts = document.cookie ? document.cookie.split("; ") : [];
  for (const p of parts) {
    if (p.startsWith(prefix)) {
      try {
        return decodeURIComponent(p.slice(prefix.length));
      } catch {
        return null;
      }
    }
  }
  return null;
}

function writeCookie(key: string, value: string): void {
  if (typeof document === "undefined") return;
  const encoded = encodeURIComponent(value);
  if (cookieName(key).length + encoded.length > COOKIE_BUDGET) return;
  // 同源部署:HTTP 时不能带 Secure(否则 Cookie 不写),HTTPS 时带上。
  const secure =
    typeof location !== "undefined" && location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${cookieName(key)}=${encoded}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

function removeCookie(key: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${cookieName(key)}=; path=/; max-age=0; SameSite=Lax`;
}

// 读:localStorage 优先,空了回退 Cookie。
export function readPersisted(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const ls = window.localStorage.getItem(key);
    if (ls != null) return ls;
  } catch {
    // localStorage 不可用(隐私模式等)—— 走 Cookie
  }
  return readCookie(key);
}

// 写:两边都写。cookieValue 用于「localStorage 存全量、Cookie 只存裁剪版」的场景
// (见 storage.ts 的 cookiePayload —— 去 avatar、限记录条数以塞进 Cookie 限额)。
export function writePersisted(key: string, value: string, cookieValue?: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // localStorage 配额满 / 隐私模式 —— 至少还有 Cookie 兜底
  }
  writeCookie(key, cookieValue ?? value);
}

export function removePersisted(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // 忽略
  }
  removeCookie(key);
}
