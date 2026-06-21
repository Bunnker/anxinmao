// Tier B 记忆蒸馏的客户端调度器(批3)—— 在「会话沉淀点」后台 fire-and-forget 调
// /api/memory/extract,把蒸馏出的稳定事实并入当前猫记忆(mergeCatMemory)。
//
// 设计(对齐 history-sync 的成熟范式):模块级单飞 + 防抖 + 会话级 min-new 闸门。
// - 不每轮调:每轮蒸馏=每轮一次 LLM 调用,短问答纯浪费,且单轮信息量小易把短命症状误升格。
// - 防抖 4s(比 pushHistory 长,记忆不急、等一轮稳定下来再蒸馏更省、更准)。
// - 单飞锁:在途不重发。min-new 闸:某会话自上次提取后新增消息 < MIN_NEW 直接跳过。
// - 失败一律静默,绝不阻塞 / 影响问答主流程。

import { mergeCatMemory } from "@/lib/storage";

type ExtractMsg = { role: "user" | "assistant"; content: string };
export type ExtractArgs = {
  catId: string;
  conversationId: string;
  messages: ExtractMsg[];
  existingItems: { kind: string; text: string }[];
  catProfile?: unknown;
};

const DEBOUNCE_MS = 4000;
const MIN_NEW_MSGS = 4; // 至少约 2 个完整回合的新消息才值得蒸馏一次
const LASTCOUNT_CAP = 50; // lastCount 软上限,防久驻不刷新页面时无限增长

let timer: ReturnType<typeof setTimeout> | null = null;
let pending: ExtractArgs | null = null;
let inflight = false;
let pendingKeepalive = false; // 在途期间被 flush 抢占 → 收尾时按 keepalive 续发
const lastCount = new Map<string, number>(); // conversationId → 上次提取时的消息数

export function scheduleMemoryExtract(args: ExtractArgs): void {
  pending = args;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void run(false), DEBOUNCE_MS);
}

// 离开 / 切会话 / 卸载时立即 flush(带 keepalive,pagehide 也发得出去)。
// 若有请求在途,记下 keepalive 意图,由 run 收尾时把待蒸馏的 pending 续发出去(不丢)。
export function flushMemoryExtract(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (inflight) {
    pendingKeepalive = true;
    return;
  }
  void run(true);
}

async function run(keepalive: boolean): Promise<void> {
  if (inflight || !pending) return;
  const job = pending;
  pending = null;
  // 会话级 min-new 闸:新增不够就跳过,省一次调用;也防离开→回来→再离开重复蒸馏。
  const prev = lastCount.get(job.conversationId) ?? 0;
  if (job.messages.length - prev < MIN_NEW_MSGS) return;
  inflight = true;
  try {
    const res = await fetch("/api/memory/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive,
      body: JSON.stringify({
        catId: job.catId,
        messages: job.messages,
        items: job.existingItems,
        cat: job.catProfile,
      }),
    });
    if (res.ok) {
      const data = (await res.json().catch(() => ({}))) as { items?: unknown };
      if (Array.isArray(data.items) && data.items.length > 0) {
        // mergeCatMemory 内部还会再过一遍 filterMemoryText(不信端点产物)。
        mergeCatMemory(
          job.catId,
          data.items as Array<{ kind: unknown; text: unknown }>,
        );
      }
      if (lastCount.size >= LASTCOUNT_CAP) {
        const oldest = lastCount.keys().next().value;
        if (oldest !== undefined) lastCount.delete(oldest);
      }
      lastCount.set(job.conversationId, job.messages.length);
    }
  } catch {
    // 后台增强,失败静默
  } finally {
    inflight = false;
    // 在途期间新排的 pending(或 flush 抢占)收尾后续发,避免最后一轮记忆被静默丢弃。
    if (pending) {
      const ka = pendingKeepalive;
      pendingKeepalive = false;
      void run(ka);
    } else {
      pendingKeepalive = false;
    }
  }
}
