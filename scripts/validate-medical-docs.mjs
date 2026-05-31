#!/usr/bin/env node
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE_DIR = path.join(ROOT, "docs/medical/source");
const CARD_DIR = path.join(ROOT, "docs/medical/ai-cards");
const RAW_DIR = path.join(ROOT, "docs/medical/raw");

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function listFiles(dir, suffix) {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(suffix))
    .map((entry) => path.join(dir, entry.name))
    .sort();
}

async function walk(dir, suffix) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(filePath, suffix)));
    } else if (entry.isFile() && entry.name.endsWith(suffix)) {
      files.push(filePath);
    }
  }
  return files.sort();
}

function claimIds(text) {
  return new Set(text.match(/\b[a-z]+_\d{3}\b/g) || []);
}

async function validateClaims(errors) {
  const sourceFiles = await listFiles(SOURCE_DIR, ".source.md");
  const cardFiles = await listFiles(CARD_DIR, ".ai-card.md");
  const knownClaims = new Set();

  for (const sourceFile of sourceFiles) {
    const text = await readFile(sourceFile, "utf8");
    for (const id of claimIds(text)) knownClaims.add(id);
  }

  for (const cardFile of cardFiles) {
    const text = await readFile(cardFile, "utf8");
    const sourceDocument = text.match(/^source_document:\s*(.+)$/m)?.[1]?.trim();
    if (!sourceDocument) {
      errors.push(`${path.relative(ROOT, cardFile)} missing source_document`);
    } else if (!(await exists(path.join(ROOT, sourceDocument)))) {
      errors.push(`${path.relative(ROOT, cardFile)} source_document not found: ${sourceDocument}`);
    }

    for (const id of claimIds(text)) {
      if (!knownClaims.has(id)) {
        errors.push(`${path.relative(ROOT, cardFile)} references unknown claim ${id}`);
      }
    }
  }

  return { sourceCount: sourceFiles.length, cardCount: cardFiles.length, claimCount: knownClaims.size };
}

async function validateRawBatch(errors) {
  if (!(await exists(RAW_DIR))) return { rawCount: 0 };

  const metaFiles = await walk(RAW_DIR, "meta.json");
  for (const metaFile of metaFiles) {
    const meta = JSON.parse(await readFile(metaFile, "utf8"));
    if (!meta.ok) {
      errors.push(`${path.relative(ROOT, metaFile)} fetch failed: ${meta.error || meta.status}`);
    }
    if ((meta.text_bytes ?? 0) < 1000) {
      errors.push(`${path.relative(ROOT, metaFile)} has low text_bytes: ${meta.text_bytes ?? 0}`);
    }
    if (meta.text_file && !(await exists(path.join(ROOT, meta.text_file)))) {
      errors.push(`${path.relative(ROOT, metaFile)} text_file not found: ${meta.text_file}`);
    }
  }
  return { rawCount: metaFiles.length };
}

async function main() {
  const errors = [];
  const claimStats = await validateClaims(errors);
  const rawStats = await validateRawBatch(errors);

  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }

  console.log(
    `medical docs validation passed: ${claimStats.sourceCount} source docs, ` +
      `${claimStats.cardCount} ai cards, ${claimStats.claimCount} claims, ` +
      `${rawStats.rawCount} raw sources`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
