#!/usr/bin/env node
// App 静态导出后:public/ 里现存的 sw.js / workbox-*.js 会被 next export 原样拷进 out/。
// App 壳不注册 SW,这些是死文件且违反 PRD §4.4(不携带旧 SW 预缓存)→ 删掉。
import { readdir, rm, stat } from "node:fs/promises";
import path from "node:path";

const OUT = path.join(process.cwd(), "out");

async function exists(p) {
  try { await stat(p); return true; } catch { return false; }
}

if (!(await exists(OUT))) {
  console.error("❌ 未找到 out/;先跑静态导出再清理。");
  process.exit(1);
}

const removed = [];
for (const name of await readdir(OUT)) {
  if (name === "sw.js" || /^workbox-.*\.js$/.test(name) || name === "sw.js.map") {
    await rm(path.join(OUT, name), { force: true });
    removed.push(name);
  }
}
console.log(removed.length ? `✅ 已清理 out/: ${removed.join(", ")}` : "✅ out/ 无 SW/workbox 残留。");
