// 用户意见反馈收集 —— 无数据库,直接落服务器本地文件,作者 SSH 上去看。
//
// 设计取舍:
// - 文字反馈追加到 .data/feedback.jsonl(一行一条,好 grep / tail)。
// - 可选配图写到 .data/uploads/<id>.<ext>,jsonl 里只存文件名。
// - 目录用 FEEDBACK_DIR 覆盖,默认 <cwd>/.data。生产 Docker 里挂卷持久化:
//     docker run -v /opt/anxinmao/data:/app/.data ...
// - 防刷走 ratelimit 的 feedback 额度(dev 不限)。

import type { NextRequest } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { checkAndConsume, getClientIp, rateLimitMessage } from "@/lib/ratelimit";

export const runtime = "nodejs";

const DATA_DIR = process.env.FEEDBACK_DIR || path.join(process.cwd(), ".data");
const LOG_FILE = path.join(DATA_DIR, "feedback.jsonl");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

const MAX_TEXT = 2000;
const MAX_CONTACT = 120;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3MB(解码后)

type ReqBody = {
  text?: string;
  contact?: string;
  imageDataUrl?: string;
  ua?: string;
  path?: string;
};

// data URL → { ext, buf };不合法或超限返回 null(调用方降级为只存文字)。
function parseImage(dataUrl: string): { ext: string; buf: Buffer } | null {
  const m = /^data:image\/(png|jpe?g|webp|gif);base64,([A-Za-z0-9+/=\s]+)$/.exec(
    dataUrl,
  );
  if (!m) return null;
  const ext = m[1] === "jpeg" ? "jpg" : m[1];
  const buf = Buffer.from(m[2].replace(/\s/g, ""), "base64");
  if (buf.length === 0 || buf.length > MAX_IMAGE_BYTES) return null;
  return { ext, buf };
}

export async function POST(req: NextRequest): Promise<Response> {
  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return Response.json({ error: "请求体不是合法 JSON。" }, { status: 400 });
  }

  const text = (body.text ?? "").trim().slice(0, MAX_TEXT);
  if (!text) {
    return Response.json({ error: "写点什么再提交吧。" }, { status: 400 });
  }

  // 防刷:每 IP 每天有限次(dev 不限)
  const ip = getClientIp(req);
  const rl = checkAndConsume(ip, "feedback");
  if (!rl.ok) {
    return Response.json(
      { error: rateLimitMessage(rl.kind, rl.scope), code: "RATE_LIMITED" },
      { status: 429 },
    );
  }

  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : "fb-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  try {
    await fs.mkdir(DATA_DIR, { recursive: true });

    let imageFile: string | null = null;
    if (body.imageDataUrl) {
      const img = parseImage(body.imageDataUrl.trim());
      if (img) {
        await fs.mkdir(UPLOAD_DIR, { recursive: true });
        imageFile = `${id}.${img.ext}`;
        await fs.writeFile(path.join(UPLOAD_DIR, imageFile), img.buf);
      }
      // 图片不合法 / 超限就忽略,仍然保存文字反馈
    }

    // 不持久化 IP —— 反馈页向用户承诺「不收集身份信息」。IP 只在上面
    // 给限流(checkAndConsume)临时用,不落盘。
    const entry = {
      id,
      at: new Date().toISOString(),
      text,
      contact: (body.contact ?? "").trim().slice(0, MAX_CONTACT) || null,
      image: imageFile,
      ua: (body.ua ?? req.headers.get("user-agent") ?? "").slice(0, 300),
      from: (body.path ?? "").slice(0, 200) || null,
    };
    await fs.appendFile(LOG_FILE, JSON.stringify(entry) + "\n", "utf8");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: `保存失败 —— ${msg}` }, { status: 500 });
  }

  return Response.json({ ok: true });
}
