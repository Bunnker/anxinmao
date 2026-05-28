// localStorage 持久化 —— MVP 不做数据库、不做登录,猫档案与历史存本地。
import type { Cat, Store } from "@/types/cat";

const STORAGE_KEY = "catTriage:v1";

export function loadStore(): Store | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Store;
    if (!Array.isArray(parsed.cats) || parsed.cats.length === 0) return null;
    if (!Array.isArray(parsed.records)) parsed.records = [];
    return parsed;
  } catch {
    return null;
  }
}

export function saveStore(store: Store): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // localStorage 不可用(隐私模式 / 配额满)时静默降级。
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

// 显式 seed 演示猫 —— 仅在「开发期方便测试」或「用户主动选择先看 demo」时调用。
// ⚠️ 不再像旧的 loadOrSeedStore 那样对所有新用户无脑 seed ——
// 新用户首次进入应被引导去 /onboarding 建自己的档案(localStorage 本身按设备隔离,
// 每台设备 = 一个独立用户,不需要登录系统)。
export function seedDemoStore(): Store {
  const seeded: Store = {
    cats: [DEMO_CAT],
    activeCatId: DEMO_CAT.id,
    records: [],
  };
  saveStore(seeded);
  return seeded;
}
