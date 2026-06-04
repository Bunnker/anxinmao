// localStorage 持久化 —— MVP 不做数据库、不做登录,猫档案与历史存本地。
// 微信 / QQ 内置浏览器不保 localStorage,故经 persist 层加 Cookie 兜底,
// 避免「重新打开链接就丢档案 / 丢历史」。
import type { Cat, CatRecord, ChatMessage, Store } from "@/types/cat";
import { readPersisted, writePersisted } from "@/lib/persist";
import { pushHistory } from "@/lib/history-sync";

export const STORAGE_KEY = "catTriage:v1";

// Cookie 兜底版最多保留多少条历史(localStorage 仍存全量)。实际还会按字节再收。
const COOKIE_MAX_RECORDS = 12;
// 给 cookiePayload 的编码字节目标,留在 persist 的 Cookie 限额之内。
const COOKIE_PAYLOAD_BUDGET = 3600;
// 记录总条数上限 —— 问答记录带完整对话,防 localStorage / 云同步无限膨胀。
const MAX_RECORDS = 60;

export function loadStore(): Store | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = readPersisted(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Store;
    if (!Array.isArray(parsed.cats) || parsed.cats.length === 0) return null;
    if (!Array.isArray(parsed.records)) parsed.records = [];
    return parsed;
  } catch {
    return null;
  }
}

// Cookie 兜底版:去掉可能很大的 avatar(base64 照片会撑爆 Cookie),
// 记录只留最近若干条,并按编码字节逐步收到限额内 —— 保证 Cookie 一定塞得下。
function cookiePayload(store: Store): string {
  const slimCats = store.cats.map((c) => {
    const copy = { ...c };
    delete copy.avatar;
    return copy;
  });
  // 问答记录的完整对话(messages/memo)太大,Cookie 版剔除 —— 只留摘要行能显示,
  // 完整对话仍在 localStorage / 云端。
  const slimRecords = store.records.map((r) => {
    if (r.kind !== "behavior") return r;
    const copy = { ...r };
    delete copy.messages;
    delete copy.memo;
    return copy;
  });
  let n = Math.min(slimRecords.length, COOKIE_MAX_RECORDS);
  // 逐步减少记录条数,直到编码后塞得进 Cookie(最坏只剩档案、不带历史)。
  for (;;) {
    const slim: Store = {
      cats: slimCats,
      activeCatId: store.activeCatId,
      records: slimRecords.slice(0, n),
    };
    const json = JSON.stringify(slim);
    if (n === 0 || encodeURIComponent(json).length <= COOKIE_PAYLOAD_BUDGET) {
      return json;
    }
    n = Math.max(0, n - 2);
  }
}

// 只写本地(localStorage + Cookie),不推云。
// 从云端拉回回填时用这个 —— 避免「拉回 → 又推回」的回声请求。
export function saveStoreLocal(store: Store): void {
  if (typeof window === "undefined") return;
  try {
    writePersisted(STORAGE_KEY, JSON.stringify(store), cookiePayload(store));
  } catch {
    // localStorage / Cookie 都不可用时静默降级,不影响主流程。
  }
}

export function saveStore(store: Store): void {
  saveStoreLocal(store);
  // 防抖推到云端(匿名 deviceId);失败静默,不影响本地。
  pushHistory(store);
}

// 存 / 更新一次问答会话 —— 同 id 记录覆盖,放最前(最近优先)。
// 在「最近」里以 kind:"behavior" 行出现,点回 /behavior?c=<id> 还原对话。
export function saveConversation(args: {
  id: string;
  catId: string;
  messages: ChatMessage[];
  memo?: string;
  memoCount?: number;
}): void {
  if (typeof window === "undefined") return;
  const store = loadStore();
  if (!store) return;
  const firstQ = args.messages.find((m) => m.role === "user")?.content.trim();
  if (!firstQ) return; // 没有用户提问就不建记录
  const summary = firstQ.length > 40 ? `${firstQ.slice(0, 40)}…` : firstQ;
  const rec: CatRecord = {
    id: args.id,
    catId: args.catId,
    date: new Date().toISOString(),
    kind: "behavior",
    conversationId: args.id,
    question: firstQ.slice(0, 200),
    summary,
    messages: args.messages,
    memo: args.memo || undefined,
    memoCount: args.memoCount,
  };
  const others = store.records.filter((r) => r.id !== args.id);
  saveStore({ ...store, records: [rec, ...others].slice(0, MAX_RECORDS) });
}

// 演示猫 —— 仅开发期 / 用户主动「先看看 demo」时使用,不再自动塞给新用户。
export const DEMO_CAT: Cat = {
  id: "demo-cat",
  name: "豆豆",
  ageMonths: 3,
  sex: "雌",
  coat: "短毛",
  weight: 2.1,
  neutered: "暂未",
  homeDate: "2026-04-18",
  vaccines: [{ name: "三联第 1 针", date: "2026-04-30" }],
  deworm: "2026-05-05",
  notes: "",
};

// 显式 seed 演示猫 —— 仅开发期想要 rich 数据(疫苗记录等)时手动用。默认不调用。
export function seedDemoStore(): Store {
  const seeded: Store = {
    cats: [DEMO_CAT],
    activeCatId: DEMO_CAT.id,
    records: [],
  };
  saveStore(seeded);
  return seeded;
}

// 默认模版猫 —— 填好的示例起点,让用户一眼看懂每个字段该填什么。
// 用户在欢迎页选「使用系统默认模版」时 seed;
// 进入首页后点头像可随时进 onboarding 改成自己家猫的真实信息。
export const TEMPLATE_CAT: Cat = {
  id: "my-cat",
  name: "哈基米",
  ageMonths: 6,
  sex: "雌",
  coat: "短毛",
  weight: 3.5,
  neutered: "暂未",
  homeDate: "2026-02-01",
  vaccines: [
    { name: "猫三联第1针", date: "2026-02-10" },
    { name: "猫三联第2针", date: "2026-03-10" },
    { name: "猫三联第3针", date: "2026-04-10" },
  ],
  deworm: "2026-05-01",
  notes: "",
};

export function seedTemplateStore(): Store {
  const seeded: Store = {
    cats: [{ ...TEMPLATE_CAT }],
    activeCatId: TEMPLATE_CAT.id,
    records: [],
  };
  saveStore(seeded);
  return seeded;
}
