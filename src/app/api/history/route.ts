// 历史匿名云同步 —— 无数据库,按 deviceId 落服务器本地文件(沿用 feedback 的 .data 方案)。
//
// 设计取舍:
// - 每设备一份:.data/history/<deviceId>.json(整个 store:cats + records)。
// - deviceId 必须是合法 UUID 才进文件名 —— 防路径穿越(再 basename 一层防御)。
// - GET ?deviceId= 拉回;POST {deviceId, store} 覆盖写(单用户单猫,最后写赢)。
// - 目录用 HISTORY_DIR 覆盖,默认 <cwd>/.data/history;生产 Docker 挂卷持久化,
//   和 feedback 同一个:docker run -v /opt/anxinmao/data:/app/.data ...
//   （没挂卷的话容器重启就丢,云同步会失效。）
// - 防刷走 ratelimit 的 history 额度(写本地文件、无外部成本,给得宽松)。
import type { NextRequest } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { checkAndConsume, getClientIp, rateLimitMessage } from "@/lib/ratelimit";
import { isValidDeviceId } from "@/lib/device-id";

export const runtime = "nodejs";

const HISTORY_DIR =
  process.env.HISTORY_DIR || path.join(process.cwd(), ".data", "history");

// 单设备 store 上限(含头像 + 问答完整对话也够)。防止被塞爆磁盘。
const MAX_BYTES = 1024 * 1024;

function fileFor(deviceId: string): string {
  // deviceId 已校验为 UUID;basename 再兜一层,杜绝 ../ 之类。
  return path.join(HISTORY_DIR, `${path.basename(deviceId)}.json`);
}

export async function GET(req: NextRequest): Promise<Response> {
  const deviceId = req.nextUrl.searchParams.get("deviceId");
  if (!isValidDeviceId(deviceId)) {
    return Response.json({ error: "deviceId 不合法。" }, { status: 400 });
  }
  try {
    const raw = await fs.readFile(fileFor(deviceId), "utf8");
    return Response.json({ store: JSON.parse(raw) });
  } catch {
    // 该设备还没有历史(首次)或读取失败 —— 返回空,不当错误。
    return Response.json({ store: null });
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  let body: { deviceId?: string; store?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "请求体不是合法 JSON。" }, { status: 400 });
  }

  if (!isValidDeviceId(body.deviceId)) {
    return Response.json({ error: "deviceId 不合法。" }, { status: 400 });
  }

  const store = body.store;
  // 基本形状校验:必须是带 cats 数组的对象。
  if (
    !store ||
    typeof store !== "object" ||
    !Array.isArray((store as { cats?: unknown }).cats)
  ) {
    return Response.json({ error: "store 格式不对。" }, { status: 400 });
  }

  const json = JSON.stringify(store);
  if (json.length > MAX_BYTES) {
    return Response.json({ error: "数据过大。" }, { status: 413 });
  }

  // 防刷(仅生产环境生效)
  const ip = getClientIp(req);
  const rl = checkAndConsume(ip, "history");
  if (!rl.ok) {
    return Response.json(
      { error: rateLimitMessage("history", rl.scope) },
      { status: 429 },
    );
  }

  try {
    await fs.mkdir(HISTORY_DIR, { recursive: true });
    // 原子写:先写临时文件再 rename,避免并发 / 中断写出半个文件。
    const target = fileFor(body.deviceId);
    const tmp = `${target}.${process.pid}.tmp`;
    await fs.writeFile(tmp, json, "utf8");
    await fs.rename(tmp, target);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "保存失败。" }, { status: 500 });
  }
}
