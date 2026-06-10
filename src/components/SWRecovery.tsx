"use client";

// PWA 缓存自愈 —— 解决「部署后老用户缓存对不上,页面点不开」:
//
// A) 新 Service Worker 接管(controllerchange)→ 自动刷新一次,让当前页直接用上
//    新版本(sw 配了 skipWaiting + clientsClaim,部署后新 SW 很快接管)。
//    跳过首次安装(从无 controller → 有 controller 不刷,避免新用户首访被白刷)。
// B) 旧 HTML 引用的 chunk 已被新构建删除 → 加载报错(ChunkLoadError / 资源 404)
//    → 注销 SW + 清空 caches + 刷新,强制拿全新版本。
//
// 防死循环:两条路径共用 sessionStorage 时间戳,60 秒内最多自动刷新一次;
// 若刷新后仍失败,不再重试(把错误留给用户可感知,而不是无限转圈)。
import { useEffect } from "react";

const RELOAD_AT_KEY = "swRecovery:reloadedAt";
const RELOAD_MIN_INTERVAL = 60_000;

function canAutoReload(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_AT_KEY) || 0);
    if (Date.now() - last < RELOAD_MIN_INTERVAL) return false;
    sessionStorage.setItem(RELOAD_AT_KEY, String(Date.now()));
    return true;
  } catch {
    return false; // sessionStorage 不可用(隐私模式等)→ 宁可不自动刷,避免循环
  }
}

function isChunkLoadMessage(msg: string): boolean {
  return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
    msg,
  );
}

// 硬恢复:注销 SW + 清缓存 + 刷新。
async function hardRecover(): Promise<void> {
  if (!canAutoReload()) return;
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    // 清不掉也照样刷新 —— 刷新本身常常已足够
  }
  location.reload();
}

export function SWRecovery() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // A) 新 SW 接管 → 软刷新一次
    let hadController = false;
    let onControllerChange: (() => void) | null = null;
    if ("serviceWorker" in navigator) {
      hadController = !!navigator.serviceWorker.controller;
      onControllerChange = () => {
        if (!hadController) {
          // 首次安装(新用户首访),不刷
          hadController = true;
          return;
        }
        if (!canAutoReload()) return;
        location.reload();
      };
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        onControllerChange,
      );
    }

    // B) chunk / 静态资源加载失败 → 硬恢复
    const onError = (e: ErrorEvent) => {
      // 资源加载错误:message 为空,target 是 script/link 元素(capture 阶段才收得到)
      const t = e.target as (HTMLScriptElement & HTMLLinkElement) | null;
      const url = (t && (t.src || t.href)) || "";
      if (typeof url === "string" && url.includes("/_next/")) {
        void hardRecover();
        return;
      }
      if (e.message && isChunkLoadMessage(e.message)) void hardRecover();
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const reason = e.reason as { message?: unknown } | string | undefined;
      const msg =
        typeof reason === "string"
          ? reason
          : String((reason && reason.message) ?? "");
      if (isChunkLoadMessage(msg)) void hardRecover();
    };
    window.addEventListener("error", onError, true);
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      if (onControllerChange && "serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener(
          "controllerchange",
          onControllerChange,
        );
      }
      window.removeEventListener("error", onError, true);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
