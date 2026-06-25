// 悬浮桌宠原生插件的 JS 接口。Web(非 Capacitor)下 registerPlugin 返回的代理
// 调用会抛 "not implemented" —— 调用方一律先用 isFloatingPetSupported() 守门。
import { Capacitor, registerPlugin } from "@capacitor/core";

export interface FloatingPetPlugin {
  /** 当前平台是否支持真悬浮(安卓 = true;iOS / Web = false) */
  isSupported(): Promise<{ supported: boolean }>;
  /** 请求"显示在其他应用上层"权限;返回是否已授权 */
  requestPermission(): Promise<{ granted: boolean }>;
  /** 显示悬浮桌宠(需已授权,否则 reject NO_OVERLAY_PERMISSION) */
  show(): Promise<void>;
  /** 收回悬浮桌宠 */
  hide(): Promise<void>;
  /** 当前是否在显示 */
  isShown(): Promise<{ shown: boolean }>;
  /** 写红黄风险标志(供前台服务收敛);ts 为 epoch ms */
  setRiskFlag(opts: { level: "red" | "yellow"; ts: number }): Promise<void>;
  /** 清除风险标志(解除收敛) */
  clearRiskFlag(): Promise<void>;
}

export const FloatingPet = registerPlugin<FloatingPetPlugin>("FloatingPet");

// 只有安卓原生壳才有真悬浮。Web / iOS 一律 false。
export function isFloatingPetSupported(): boolean {
  return Capacitor.getPlatform() === "android" && Capacitor.isNativePlatform();
}
