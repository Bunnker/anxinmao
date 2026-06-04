// 匿名设备 ID —— 历史云同步的 key。无账号、无登录、无个人信息,只是个随机 UUID。
// 存 Cookie(微信 / QQ webview 里最耐清)+ localStorage(都经 persist 层)。
// 微信清掉 localStorage 后,只要这个 deviceId 的 Cookie 还在,就能按它从服务端拉回历史。
import { readPersisted, writePersisted } from "@/lib/persist";

const DEVICE_ID_KEY = "catTriage:deviceId:v1";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 纯函数,服务端路由也用它校验 —— 防止把任意字符串拼进文件名(路径穿越)。
export function isValidDeviceId(id: string | null | undefined): id is string {
  return typeof id === "string" && UUID_RE.test(id);
}

function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // 极老 webview 没有 crypto.randomUUID 时手搓一个 v4。
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// 取设备 ID;没有(或被清/损坏)就生成一个并持久化。仅客户端;SSR 返回 null。
export function getDeviceId(): string | null {
  if (typeof window === "undefined") return null;
  const existing = readPersisted(DEVICE_ID_KEY);
  if (isValidDeviceId(existing)) return existing;
  const id = randomId();
  writePersisted(DEVICE_ID_KEY, id);
  return id;
}
