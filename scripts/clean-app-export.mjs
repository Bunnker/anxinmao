#!/usr/bin/env node
// App 静态导出后:public/ 里现存的 sw.js / workbox-*.js / manifest.json 会被 next export
// 原样拷进 out/。App 壳不注册 SW、不挂 PWA manifest,这些是死文件且违反 PRD §4.4
//(不携带旧 SW 预缓存 / PWA 残留)→ 删掉。
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
  if (name === "sw.js" || /^workbox-.*\.js$/.test(name) || name === "sw.js.map" || name === "manifest.json") {
    await rm(path.join(OUT, name), { force: true });
    removed.push(name);
  }
}
console.log(removed.length ? `✅ 已清理 out/: ${removed.join(", ")}` : "✅ out/ 无 SW/workbox 残留。");

// App 壳不本地打包知识图解(generated-style 127MB + detailed 17MB);改从远端 <img> 加载
//(behavior 页 posterFromHeader 用 assetUrl 前缀)。整目录删掉,apk 大幅瘦身。
await rm(path.join(OUT, "knowledge-posters"), { recursive: true, force: true });
console.log("✅ 已从 App 产物移除 out/knowledge-posters(改远端加载)。");
