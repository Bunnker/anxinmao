// 安装提示纯逻辑 —— 与 React/DOM 解耦,便于 harness 单测(scripts/harness-install-prompt.mjs)。
// 仅用可擦除 TS 语法(interface + 纯函数 + const),Node 24 strip-types 可直接 import。

// Chrome 的 beforeinstallprompt(标准未收录,给最小类型)。
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export interface InstallState {
  standalone: boolean;        // 已安装(display-mode: standalone / navigator.standalone)
  dismissed: boolean;         // 用户此前关掉过安装条
  hasDeferredPrompt: boolean; // 已捕获 beforeinstallprompt(浏览器认为可安装)
}

/** 是否展示「装到桌面」:可安装、未安装、未被关掉。 */
export function shouldShowInstall(s: InstallState): boolean {
  return s.hasDeferredPrompt && !s.standalone && !s.dismissed;
}

export const INSTALL_DISMISS_KEY = "anxinmao.installPrompt.dismissed";
