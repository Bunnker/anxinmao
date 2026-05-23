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

// 演示猫 —— 开发期便利。
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

// 首次使用且无档案时,用演示猫兜底,保证 App 可见可用。
// TODO(端口建档页后):首次使用应改为引导去 /onboarding,而非默认演示猫。
export function loadOrSeedStore(): Store {
  const existing = loadStore();
  if (existing) return existing;
  const seeded: Store = {
    cats: [DEMO_CAT],
    activeCatId: DEMO_CAT.id,
    records: [],
  };
  saveStore(seeded);
  return seeded;
}
