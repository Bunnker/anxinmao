import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";
import path from "path";
import webpack from "webpack";

// 两条构建线:
// - Web(默认):server build,含 API 路由;生产挂 PWA。部署 www.whatsupkitty.cn(现状不变)。
// - App(BUILD_TARGET=app):静态导出 out/ 喂 Capacitor;关 PWA;next/image 走 unoptimized。
const isProd = process.env.NODE_ENV === "production";
const isApp = process.env.BUILD_TARGET === "app";

const baseConfig: NextConfig = {
  /* config options here */
};

// App 构建专属:静态导出 + 关图片优化(静态导出不能跑优化服务)。
// API 路由在 App 壳里无需存在(App 通过 NEXT_PUBLIC_API_BASE 直连 Web 服务端 API)。
// 用 NormalModuleReplacementPlugin 将所有 api/**/route.ts 替换为静态 stub,
// 避免 output:'export' 对动态 Route Handlers 报错。
const appConfig: NextConfig = {
  ...baseConfig,
  output: "export",
  images: { unoptimized: true },
  webpack(config) {
    const stubPath = path.resolve(
      __dirname,
      "src/app/api/_stub-for-app-build.ts"
    );
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /src[\\/]app[\\/]api[\\/](?!_stub).+[\\/]route\.ts$/,
        stubPath
      )
    );
    return config;
  },
};

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
  },
});

// App:静态导出、绝不挂 PWA(避免把 Web 的 SW 缓存/更新逻辑带进 Capacitor)。
// Web:维持原行为(生产挂 PWA,dev 不挂)。
export default isApp ? appConfig : isProd ? withPWA(baseConfig) : baseConfig;
