// 历史云同步(客户端)—— 推(防抖)/ 拉。失败一律静默,绝不挡主流程。
// 服务端是 /api/history,按匿名 deviceId 落服务器本地文件。
import type { Store } from "@/types/cat";
import { getDeviceId } from "@/lib/device-id";

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pending: Store | null = null;

// 防抖推送整个 store(连续保存只发最后一次,省请求)。fire-and-forget。
export function pushHistory(store: Store): void {
  if (typeof window === "undefined") return;
  pending = store;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(flush, 1500);
}

function flush(): void {
  pushTimer = null;
  const store = pending;
  pending = null;
  if (!store) return;
  const deviceId = getDeviceId();
  if (!deviceId) return;
  fetch("/api/history", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId, store }),
    // 页面切走 / 关闭时也尽量把最后一次同步发出去。
    keepalive: true,
  }).catch(() => {
    // 同步失败不影响本地使用;下次保存会再推。
  });
}

// 从云端拉该设备的历史。带超时,失败 / 超时 / 无数据都返回 null。
export async function pullHistory(timeoutMs = 4000): Promise<Store | null> {
  if (typeof window === "undefined") return null;
  const deviceId = getDeviceId();
  if (!deviceId) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(
      `/api/history?deviceId=${encodeURIComponent(deviceId)}`,
      { signal: ctrl.signal },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { store?: Store | null };
    const store = data.store;
    if (
      store &&
      typeof store === "object" &&
      Array.isArray(store.cats) &&
      store.cats.length > 0
    ) {
      if (!Array.isArray(store.records)) store.records = [];
      return store;
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
