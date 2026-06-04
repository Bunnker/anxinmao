// localStorage 持久化 —— MVP 不做数据库、不做登录,猫档案与历史存本地。
// 微信 / QQ 内置浏览器不保 localStorage,故经 persist 层加 Cookie 兜底,
// 避免「重新打开链接就丢档案 / 丢历史」。
import type { Cat, Store } from "@/types/cat";
import { readPersisted, writePersisted } from "@/lib/persist";

export const STORAGE_KEY = "catTriage:v1";

// Cookie 兜底版最多保留多少条历史(localStorage 仍存全量)。实际还会按字节再收。
const COOKIE_MAX_RECORDS = 12;
// 给 cookiePayload 的编码字节目标,留在 persist 的 Cookie 限额之内。
const COOKIE_PAYLOAD_BUDGET = 3600;

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
  let n = Math.min(store.records.length, COOKIE_MAX_RECORDS);
  // 逐步减少记录条数,直到编码后塞得进 Cookie(最坏只剩档案、不带历史)。
  for (;;) {
    const slim: Store = {
      cats: slimCats,
      activeCatId: store.activeCatId,
      records: store.records.slice(0, n),
    };
    const json = JSON.stringify(slim);
    if (n === 0 || encodeURIComponent(json).length <= COOKIE_PAYLOAD_BUDGET) {
      return json;
    }
    n = Math.max(0, n - 2);
  }
}

export function saveStore(store: Store): void {
  if (typeof window === "undefined") return;
  try {
    writePersisted(STORAGE_KEY, JSON.stringify(store), cookiePayload(store));
  } catch {
    // localStorage / Cookie 都不可用时静默降级,不影响主流程。
  }
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

// 默认模版猫 —— 中性空白起点「我的猫」,不是豆豆那种「别人填好的猫」。
// 用户在欢迎页选「先用默认模版逛逛」时 seed;之后可随时点头像进 onboarding 编辑成真实信息。
// 关键:无疫苗 / 驱虫 / notes / avatar —— 让用户感觉「这是我的猫,还没填」而不是「这是谁的猫」。
export const TEMPLATE_CAT: Cat = {
  id: "my-cat",
  name: "我的猫",
  ageMonths: 6,
  sex: "不确定",
  coat: "",
  weight: 3,
  neutered: "暂未",
  homeDate: "",
  vaccines: [],
  deworm: "",
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
