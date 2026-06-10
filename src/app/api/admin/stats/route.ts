// 运营统计(只读)—— 给开发者自己看的极简面板,返回 JSON,手机浏览器直接看:
//   GET /api/admin/stats?key=<ADMIN_KEY>
//
// 鉴权:环境变量 ADMIN_KEY;未配置或 key 不对一律 404(不暴露端点存在)。
// 数据源与 /api/feedback、/api/history 同一目录约定:<cwd>/.data(Docker 挂卷持久化)。
// 仅聚合计数,不返回任何用户对话 / 档案内容。
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = process.env.FEEDBACK_DIR || path.join(process.cwd(), ".data");

type AnyRec = { kind?: unknown; tier?: unknown };

export async function GET(req: Request): Promise<Response> {
  const adminKey = process.env.ADMIN_KEY;
  const url = new URL(req.url);
  if (!adminKey || url.searchParams.get("key") !== adminKey) {
    return new Response("Not Found", { status: 404 });
  }

  const histDir = path.join(DATA_DIR, "history");
  let files: string[] = [];
  try {
    files = (await readdir(histDir)).filter((f) => f.endsWith(".json"));
  } catch {
    // history 目录还不存在 → 全 0
  }

  const byDay: Record<string, number> = {};
  let triage = 0;
  let behavior = 0;
  let withCat = 0;
  let noRecords = 0;
  let withTriage = 0;
  let withBehavior = 0;
  const tierCount: Record<string, number> = {};

  for (const f of files) {
    const p = path.join(histDir, f);
    try {
      const st = await stat(p);
      // 设备「首次出现」近似:birthtime(Linux ext4 有);拿不到再退 mtime。
      const t =
        st.birthtimeMs && st.birthtimeMs > 0 ? st.birthtimeMs : st.mtimeMs;
      const day = new Date(t).toISOString().slice(0, 10);
      byDay[day] = (byDay[day] ?? 0) + 1;

      const data = JSON.parse(await readFile(p, "utf8")) as {
        cats?: unknown[];
        records?: AnyRec[];
      };
      const recs = Array.isArray(data.records) ? data.records : [];
      if (Array.isArray(data.cats) && data.cats.length > 0) withCat += 1;

      const tCount = recs.filter((r) => r?.kind === "triage").length;
      const bCount = recs.filter((r) => r?.kind === "behavior").length;
      triage += tCount;
      behavior += bCount;
      for (const r of recs) {
        if (r?.kind === "triage" && typeof r.tier === "string") {
          tierCount[r.tier] = (tierCount[r.tier] ?? 0) + 1;
        }
      }
      if (recs.length === 0) noRecords += 1;
      if (tCount > 0) withTriage += 1;
      if (bCount > 0) withBehavior += 1;
    } catch {
      // 单个文件坏了不影响整体
    }
  }

  let feedback = 0;
  try {
    const txt = await readFile(path.join(DATA_DIR, "feedback.jsonl"), "utf8");
    feedback = txt.split("\n").filter(Boolean).length;
  } catch {
    // 还没有反馈文件
  }

  return Response.json(
    {
      generatedAt: new Date().toISOString(),
      devices: {
        total: files.length,
        withCat,
        noRecords, // 领了档案/模版但一条记录没有 —— 激活漏斗的洞
        withTriage,
        withBehavior,
        byDay: Object.fromEntries(
          Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)),
        ),
      },
      records: { triage, behavior, tier: tierCount },
      feedback,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
