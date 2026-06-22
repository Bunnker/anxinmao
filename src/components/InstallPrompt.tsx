"use client";

// 应用内「装到桌面」浮动条 —— Android Chrome 捕获 beforeinstallprompt 后出现,
// 一键唤起系统安装弹窗。已安装 / 用户关掉则不出现。纯展示逻辑见 @/lib/install-prompt(有 harness 守护)。
// 注:目标平台 Android Chrome,beforeinstallprompt 必触发;非 Chromium(iOS Safari 等)不展示(本期非目标)。

import { useEffect, useState } from "react";
import {
  shouldShowInstall,
  INSTALL_DISMISS_KEY,
  type BeforeInstallPromptEvent,
} from "@/lib/install-prompt";

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  // 浏览器态用惰性初始化读(SSR 安全:服务端 window 守卫 → false;首屏 deferred 恒 null
  // → 渲染 null,客户端读到真实值也不产生 hydration 不一致)。避免在 effect 里同步 setState。
  const [dismissed, setDismissed] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(INSTALL_DISMISS_KEY) === "1",
  );
  const [standalone, setStandalone] = useState(detectStandalone);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setStandalone(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // 申请持久存储,降低系统回收 localStorage 概率(best-effort,失败无碍)。
    navigator.storage?.persist?.().catch(() => {});

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!shouldShowInstall({ standalone, dismissed, hasDeferredPrompt: deferred !== null })) {
    return null;
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === "accepted") setStandalone(true);
  }

  function close() {
    localStorage.setItem(INSTALL_DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <div
      className="fixed inset-x-0 z-50 flex justify-center px-4"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 72px)" }}
    >
      <div className="flex items-center gap-3 rounded-full bg-surface px-4 py-2.5 shadow-[var(--shadow-control)]">
        <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
        <span className="text-[13px] font-medium text-ink">装到桌面 · 像 App 一样打开</span>
        <button
          onClick={install}
          className="rounded-full bg-accent px-3 py-1 text-[12.5px] font-semibold text-white active:scale-[0.97]"
        >
          安装
        </button>
        <button onClick={close} aria-label="关闭" className="px-1 text-ink-soft active:scale-90">
          ✕
        </button>
      </div>
    </div>
  );
}
