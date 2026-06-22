// 单测 shouldShowInstall 真值表 —— Node ≥23.6 原生 strip-types,直接 import .ts(本机 Node 24)。
// 跑:npm run harness:install-prompt
import { shouldShowInstall } from "../src/lib/install-prompt.ts";

const F = false, T = true;
const cases = [
  // [standalone, dismissed, hasDeferredPrompt, expected]
  [F, F, T, T], // 可安装、未装、未关 → 显示
  [T, F, T, F], // 已装 → 不显示
  [F, T, T, F], // 用户关掉 → 不显示
  [F, F, F, F], // 浏览器没给可安装信号 → 不显示
  [T, T, T, F], // 已装 + 关 → 不显示
];

let fail = 0;
for (const [standalone, dismissed, hasDeferredPrompt, expected] of cases) {
  const got = shouldShowInstall({ standalone, dismissed, hasDeferredPrompt });
  const ok = got === expected;
  if (!ok) fail++;
  console.log(`${ok ? "✅" : "❌"} standalone=${standalone} dismissed=${dismissed} prompt=${hasDeferredPrompt} → ${got}(期望 ${expected})`);
}
if (fail) { console.error(`\n${fail} 个用例失败`); process.exit(1); }
console.log("\n✅ shouldShowInstall 全部通过");
