import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

// PWA —— 让 web app 可以「添加到主屏」+ 离线打开。
// 仅生产构建启用。dev 模式完全不 wrap,因为 next-pwa 即使 disable:true
// 也会注入 webpack 配置,跟 Next.js 16 默认 Turbopack dev 冲突报错。
const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  /* config options here */
};

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
  },
});

export default isProd ? withPWA(nextConfig) : nextConfig;
