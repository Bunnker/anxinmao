import { promises as fs } from "node:fs";
import path from "node:path";
import { checkAndConsume, getClientIp, rateLimitMessage } from "@/lib/ratelimit";

export const runtime = "nodejs";

const DATA_DIR = process.env.CASE_SUMMARY_EVENT_DIR || path.join(process.cwd(), ".data");
const LOG_FILE = path.join(DATA_DIR, "case-summary-events.jsonl");

const ALLOWED_EVENTS = new Set([
  "case_summary_opened",
  "case_summary_generated",
  "case_summary_copied",
  "case_summary_regenerated",
  "case_summary_from_report",
  "case_summary_from_chat",
]);

type JsonRecord = Record<string, unknown>;

function record(raw: unknown): JsonRecord {
  return raw !== null && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as JsonRecord)
    : {};
}

function text(raw: unknown, max = 80): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim().slice(0, max);
  return value || null;
}

function bool(raw: unknown): boolean | null {
  return typeof raw === "boolean" ? raw : null;
}

function num(raw: unknown): number | null {
  return typeof raw === "number" &&
    Number.isFinite(raw) &&
    Number.isInteger(raw) &&
    raw >= 0
    ? raw
    : null;
}

export async function POST(req: Request): Promise<Response> {
  let body: JsonRecord;
  try {
    body = record(await req.json());
  } catch {
    return Response.json({ error: "请求格式不对。" }, { status: 400 });
  }

  const name = text(body.name);
  if (!name || !ALLOWED_EVENTS.has(name)) {
    return Response.json({ error: "事件名不支持。" }, { status: 400 });
  }

  const rl = checkAndConsume(getClientIp(req), "feedback");
  if (!rl.ok) {
    return Response.json(
      { error: rateLimitMessage(rl.kind, rl.scope), code: "RATE_LIMITED" },
      { status: 429 },
    );
  }

  const meta = record(body.meta);
  const entry = {
    at: new Date().toISOString(),
    name,
    source: text(meta.source, 20),
    symptom: text(meta.symptom, 60),
    tier: text(meta.tier, 20),
    hasCatProfile: bool(meta.hasCatProfile),
    hasTriageContext: bool(meta.hasTriageContext),
    contentLength: num(meta.contentLength),
    includesUnknown: bool(meta.includesUnknown),
  };

  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.appendFile(LOG_FILE, JSON.stringify(entry) + "\n", "utf8");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: `保存失败 —— ${msg}` }, { status: 500 });
  }

  return Response.json({ ok: true });
}
