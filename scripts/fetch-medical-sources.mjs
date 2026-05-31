#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const ROOT = process.cwd();
const DEFAULT_MANIFEST = "docs/medical/source-manifest.json";
const DEFAULT_OUT = "docs/medical/raw";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const execFileAsync = promisify(execFile);

function argValue(name, fallback) {
  const at = process.argv.indexOf(name);
  if (at >= 0 && process.argv[at + 1]) return process.argv[at + 1];
  return fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function slug(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function decodeEntities(text) {
  const named = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    ndash: "-",
    mdash: "-",
    hellip: "...",
    rsquo: "'",
    lsquo: "'",
    rdquo: '"',
    ldquo: '"',
  };
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, key) => {
    if (key[0] === "#") {
      const isHex = key[1]?.toLowerCase() === "x";
      const n = Number.parseInt(key.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return named[key] ?? m;
  });
}

function extractTitle(html) {
  const m =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i) ||
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) ||
    html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return m ? decodeEntities(m[1].replace(/<[^>]+>/g, " ").trim()) : "";
}

function htmlFragmentToText(fragment) {
  const body = fragment
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(h[1-6]|p|li|br|tr|div|section|article|header|footer|blockquote)[^>]*>/gi, "\n")
    .replace(/<\/(h[1-6]|p|li|tr|div|section|article|header|footer|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  return decodeEntities(body)
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function htmlToText(html) {
  const primary =
    html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] ||
    html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1] ||
    html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ||
    html;
  const primaryText = htmlFragmentToText(primary);
  if (Buffer.byteLength(primaryText, "utf8") >= 1000) return primaryText;

  const fallback =
    html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ||
    html;
  const fallbackText = htmlFragmentToText(fallback);
  return Buffer.byteLength(fallbackText, "utf8") > Buffer.byteLength(primaryText, "utf8")
    ? fallbackText
    : primaryText;
}

function extFor(contentType, source) {
  if (source.kind === "pdf" || contentType.includes("application/pdf")) return "pdf";
  if (contentType.includes("html")) return "html";
  if (contentType.includes("json")) return "json";
  return "bin";
}

async function tryPdfToText(filePath) {
  try {
    const { stdout } = await execFileAsync("pdftotext", ["-layout", filePath, "-"], {
      maxBuffer: 20 * 1024 * 1024,
    });
    return stdout.trim();
  } catch {
    return "";
  }
}

async function writeTextFile(dir, textFile, source, meta, title, text) {
  const header = [
    `source_id: ${source.id}`,
    `source_name: ${source.source_name}`,
    `authority_level: ${source.authority_level}`,
    `url: ${source.url}`,
    `status: ${meta.status} ${meta.status_text}`,
    `content_type: ${meta.content_type}`,
    `fetched_at: ${meta.fetched_at}`,
    title ? `title: ${title}` : "",
    "",
    "---",
    "",
  ]
    .filter(Boolean)
    .join("\n");
  await writeFile(path.join(dir, textFile), header + text + "\n", "utf8");
  meta.title = title;
  meta.text_file = path.join(
    meta.out_root,
    meta.batch_id,
    meta.condition_dir,
    slug(source.id),
    textFile,
  );
  meta.text_bytes = Buffer.byteLength(text, "utf8");
}

async function fetchOne(batchId, source, outRoot) {
  const conditions = Array.isArray(source.condition_ids)
    ? source.condition_ids
    : ["unknown"];
  const conditionDir = conditions.length === 1 ? conditions[0] : "shared";
  const dir = path.join(ROOT, outRoot, batchId, slug(conditionDir), slug(source.id));
  await mkdir(dir, { recursive: true });

  const startedAt = new Date().toISOString();
  const meta = {
    id: source.id,
    batch_id: batchId,
    source_name: source.source_name,
    authority_level: source.authority_level,
    condition_ids: conditions,
    url: source.url,
    use: source.use ?? [],
    started_at: startedAt,
    fetched_at: null,
    ok: false,
    status: null,
    status_text: "",
    content_type: "",
    bytes: 0,
    text_bytes: 0,
    title: "",
    raw_file: "",
    text_file: "",
    error: "",
    out_root: outRoot,
    condition_dir: slug(conditionDir),
  };

  try {
    const res = await fetch(source.url, {
      headers: {
        "user-agent": USER_AGENT,
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf;q=0.8,*/*;q=0.7",
        "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
      },
      redirect: "follow",
    });
    const buf = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || "";
    const ext = extFor(contentType, source);
    const rawFile = `raw.${ext}`;
    await writeFile(path.join(dir, rawFile), buf);

    meta.fetched_at = new Date().toISOString();
    meta.ok = res.ok;
    meta.status = res.status;
    meta.status_text = res.statusText;
    meta.content_type = contentType;
    meta.bytes = buf.length;
    meta.raw_file = path.join(outRoot, batchId, slug(conditionDir), slug(source.id), rawFile);

    if (ext === "html" || ext === "json" || ext === "bin") {
      const html = buf.toString("utf8");
      const text = ext === "html" ? htmlToText(html) : html;
      const title = ext === "html" ? extractTitle(html) : "";
      const textFile = "text.txt";
      await writeTextFile(dir, textFile, source, meta, title, text);
    }

    if (ext === "pdf") {
      const rawPath = path.join(dir, rawFile);
      const text = await tryPdfToText(rawPath);
      if (text) {
        await writeTextFile(dir, "text.txt", source, meta, source.title || "", text);
      }
    }
  } catch (e) {
    meta.error = e instanceof Error ? e.message : String(e);
  }

  delete meta.out_root;
  delete meta.condition_dir;
  await writeFile(path.join(dir, "meta.json"), JSON.stringify(meta, null, 2) + "\n");
  return meta;
}

async function main() {
  const manifestPath = argValue("--manifest", DEFAULT_MANIFEST);
  const outRoot = argValue("--out", DEFAULT_OUT);
  const batchFilter = argValue("--batch", "");
  const onlySource = argValue("--source", "");
  const dryRun = hasFlag("--dry-run");

  const manifest = JSON.parse(await readFile(path.join(ROOT, manifestPath), "utf8"));
  const batches = (manifest.batches || []).filter(
    (b) => !batchFilter || b.id === batchFilter,
  );
  if (batches.length === 0) {
    throw new Error(`No batches matched ${batchFilter || "(all)"}`);
  }

  const results = [];
  for (const batch of batches) {
    const sources = (batch.sources || []).filter(
      (s) => !onlySource || s.id === onlySource,
    );
    for (const source of sources) {
      if (dryRun) {
        console.log(`[dry-run] ${batch.id}/${source.id} ${source.url}`);
        continue;
      }
      process.stdout.write(`fetch ${batch.id}/${source.id} ... `);
      const meta = await fetchOne(batch.id, source, outRoot);
      results.push(meta);
      console.log(meta.ok ? `ok ${meta.status} ${meta.bytes}b` : `fail ${meta.status || ""} ${meta.error}`);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  if (!dryRun) {
    await mkdir(path.join(ROOT, outRoot), { recursive: true });
    const summaryPath = path.join(
      ROOT,
      outRoot,
      `crawl-summary-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
    );
    await writeFile(summaryPath, JSON.stringify(results, null, 2) + "\n");
    const ok = results.filter((r) => r.ok).length;
    console.log(`done: ${ok}/${results.length} ok`);
    console.log(`summary: ${path.relative(ROOT, summaryPath)}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
