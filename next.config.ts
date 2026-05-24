import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

// PWA —— 让 web app 可以「添加到主屏」+ 离线打开。
// 仅生产构建生效(dev 时 disable,避免 service worker 缓存干扰本地开发)。
const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
  },
});

const nextConfig: NextConfig = {
  /* config options here */
};

export default withPWA(nextConfig);
