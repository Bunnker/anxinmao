// 是否运行在 App(Capacitor)壳内 —— 构建期常量。
// 由 `npm run build:app` 注入 NEXT_PUBLIC_APP_SHELL=1;Web 构建下为 false。
// 用途:App 壳不注册 Service Worker、不挂 PWA manifest、首启提示重置数据。
export const IS_APP_SHELL: boolean = process.env.NEXT_PUBLIC_APP_SHELL === "1";
