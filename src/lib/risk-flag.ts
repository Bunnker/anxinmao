// 红黄风险标志 —— 桌宠收敛红线(PRD §5.10)的可验收落点。
// 写两处:① localStorage(persist,App 内用);② App 壳下经 FloatingPet 插件写进
//   原生 SharedPreferences(WebView 的 localStorage 原生服务读不到,必须经插件桥)。
import { readPersisted, writePersisted, removePersisted } from "@/lib/persist";
import { IS_APP_SHELL } from "@/lib/app-env";

const KEY = "riskFlag:v1";
// 收敛窗口:红黄报告后这段时间内桌宠保持安静(即便用户没回 App)。
// ⚠️ 原生 FloatingPetService 内有同一常量,改这里务必同步改 Kotlin(CONVERGE_WINDOW_MS)。
export const CONVERGE_WINDOW_MS = 6 * 60 * 60 * 1000; // 6h

export type RiskLevel = "red" | "yellow";
export interface RiskFlag {
  level: RiskLevel;
  ts: number; // 写入时刻 epoch ms
}

export function setRiskFlag(level: RiskLevel, nowMs: number): void {
  writePersisted(KEY, JSON.stringify({ level, ts: nowMs } satisfies RiskFlag));
  if (IS_APP_SHELL) {
    void import("@/lib/floating-pet-bridge").then(({ FloatingPet }) =>
      FloatingPet.setRiskFlag({ level, ts: nowMs }).catch(() => {}),
    );
  }
}

export function readRiskFlag(): RiskFlag | null {
  const raw = readPersisted(KEY);
  if (!raw) return null;
  try {
    const f = JSON.parse(raw) as RiskFlag;
    if (f && (f.level === "red" || f.level === "yellow") && typeof f.ts === "number") return f;
  } catch {
    /* 损坏 → 当无 */
  }
  return null;
}

export function clearRiskFlag(): void {
  removePersisted(KEY);
  if (IS_APP_SHELL) {
    void import("@/lib/floating-pet-bridge").then(({ FloatingPet }) =>
      FloatingPet.clearRiskFlag().catch(() => {}),
    );
  }
}

// 纯判定:给定标志与当前时刻,是否仍应收敛(N 小时内)。
export function isConverged(flag: RiskFlag | null, nowMs: number): boolean {
  if (!flag) return false;
  return nowMs - flag.ts < CONVERGE_WINDOW_MS;
}
