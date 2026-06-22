import type { Metadata, Viewport } from "next";
import "./globals.css";
import { TabBar } from "@/components/TabBar";
import { SWRecovery } from "@/components/SWRecovery";
import { GuideHost } from "@/components/GuideHost";
import { StableTitle } from "@/components/StableTitle";

const SITE_URL = "https://www.whatsupkitty.cn";
const SITE_TITLE = "小猫怎么了 · whatsupkitty.cn";
const SITE_DESCRIPTION =
  "猫不对劲时,5 步分诊 + 红黄绿风险报告 + 带出处的多轮追问。AI 整理,不能替代兽医。";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "小猫怎么了",
  title: {
    default: SITE_TITLE,
    template: "%s · 小猫怎么了",
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "小猫怎么了",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: "zh_CN",
  },
  twitter: {
    card: "summary",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
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
    apple: "/icons/apple-touch-icon-180.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f6f3",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full">
        <SWRecovery />
        <StableTitle title={SITE_TITLE} />
        {children}
        <GuideHost />
        <TabBar />
      </body>
    </html>
  );
}
