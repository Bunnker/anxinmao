import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "prototype/**",
    "public/sw.js",
    "public/workbox-*.js",
    // Capacitor 原生工程:cap sync 把 out/ 拷进 android assets,别 lint 这些构建产物。
    "android/**",
  ]),
]);

export default eslintConfig;
