#!/usr/bin/env node
// 回归护栏:客户端源码里不得再有裸 fetch("/api ... ) —— 必须经 apiUrl()。
// 否则 App(Capacitor)构建下该调用会打到本地壳、静默失效。
// 扫 src/app(排除 api 后端目录)、src/components、src/lib。
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const ROOTS = ["src/app", "src/components", "src/lib"];
// 后端 route handler 自身不算(它们就是 /api 的实现,不是调用方)。
const SKIP = path.join(ROOT, "src/app/api");
// 裸调用:fetch( 后面紧跟引号/反引号 + /api
const BARE = /fetch\(\s*[`"']\/api\b/;

async function walk(dir, out) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (p.startsWith(SKIP)) continue;
    if (e.isDirectory()) await walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
}

const files = [];
for (const r of ROOTS) await walk(path.join(ROOT, r), files);

const offenders = [];
for (const f of files) {
  const txt = await readFile(f, "utf8");
  txt.split("\n").forEach((line, i) => {
    if (BARE.test(line)) offenders.push(`${path.relative(ROOT, f)}:${i + 1}  ${line.trim()}`);
  });
}

if (offenders.length) {
  console.error(`❌ 发现 ${offenders.length} 处裸 fetch("/api"(须改用 apiUrl()):`);
  offenders.forEach((o) => console.error("  " + o));
  process.exit(1);
}
console.log('✅ 无裸 fetch("/api");全部经 apiUrl()。');
