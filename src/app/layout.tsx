import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "小猫怎么了 · 猫咪安心分诊器",
  description:
    "猫不对劲时,5 步分诊 + 红黄绿风险报告 + 带出处的多轮追问。AI 整理,不能替代兽医。",
  // PWA —— Web App Manifest 路径(public/manifest.json)
  manifest: "/manifest.json",
  // iOS Safari「添加到主屏」专用元数据
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "小猫怎么了",
  },
  // iOS 主屏图标(Safari 优先用 apple-touch-icon,Android 用 manifest 里的)
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#a64a2f",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
