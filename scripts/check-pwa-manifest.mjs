// PWA manifest 正确性检查 —— 纯 node,无依赖。读 public/manifest.json + 校验图标文件。
// 跑:npm run pwa:check  (回归守护:颜色 / 图标 purpose / 必填字段 / 图标文件存在 + 尺寸)
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const m = JSON.parse(readFileSync(join(root, "public", "manifest.json"), "utf8"));

const errors = [];
const warns = [];
const PAPER = "#f7f6f3";

if (m.background_color !== PAPER) errors.push(`background_color 应为 ${PAPER},实为 ${m.background_color}`);
if (m.theme_color !== PAPER) errors.push(`theme_color 应为 ${PAPER},实为 ${m.theme_color}`);

for (const k of ["name", "short_name", "start_url", "display", "id", "scope", "icons"]) {
  if (m[k] === undefined) errors.push(`缺字段 ${k}`);
}
if (m.display !== "standalone") errors.push(`display 应为 standalone,实为 ${m.display}`);

function pngSize(absPath) {
  const buf = readFileSync(absPath); // PNG IHDR:width=16-19,height=20-23(大端)
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

const purposes = new Set();
for (const ic of m.icons ?? []) {
  for (const p of (ic.purpose ?? "any").split(/\s+/)) purposes.add(p);
  const abs = join(root, "public", ic.src.replace(/^\//, ""));
  if (!existsSync(abs)) { errors.push(`图标文件不存在:${ic.src}`); continue; }
  const want = Number(ic.sizes.split("x")[0]);
  const got = pngSize(abs);
  if (got.w !== want || got.h !== want) errors.push(`${ic.src} 尺寸应 ${want}x${want},实为 ${got.w}x${got.h}`);
}
if (!purposes.has("any")) errors.push("icons 缺 purpose:any");
if (!purposes.has("maskable")) errors.push("icons 缺 purpose:maskable");

if (!m.screenshots?.length) warns.push("无 screenshots(可选,加上 Android 安装弹窗更丰富)");
else for (const s of m.screenshots) {
  if (!existsSync(join(root, "public", s.src.replace(/^\//, "")))) errors.push(`screenshot 不存在:${s.src}`);
}

for (const w of warns) console.warn("⚠️ ", w);
if (errors.length) {
  console.error("❌ manifest 检查未通过:");
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log("✅ PWA manifest 检查通过");
