"use client";

// 在悬浮桌宠页(/floating-pet,透明 WebView 只画猫)不渲染 App 全局挂件
//(标题/首启提示/引导/TabBar/自启动),避免它们画在透明浮层上或重复触发。
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function ChromeGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/floating-pet") return null;
  return <>{children}</>;
}
