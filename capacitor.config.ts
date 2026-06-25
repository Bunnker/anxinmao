import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "cn.whatsupkitty.app", // 沿用 TWA 包名 → 就地升级替换(同包名同签名)
  appName: "小猫怎么了",
  webDir: "out", // App 静态导出产物
  android: {
    // 安卓 WebView 用 https://localhost 源(与 CORS 白名单一致)
  },
  server: {
    androidScheme: "https",
  },
};

export default config;
