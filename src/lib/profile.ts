// 毛孩子档案页 / 编辑页共享的纯函数(派生展示文案)。零副作用、零依赖。

import type { Cat, CatRecord } from "@/types/cat";

// 记录 → 可点回的目标:分诊→重开报告卡(需 symptomKey+tier);问答→回到那次对话。
// 老记录缺字段则返回 null(不可点,优雅降级)。
export function recordHref(record: CatRecord): string | null {
  if (record.kind === "triage") {
    if (!record.symptomKey || !record.tier) return null;
    const params = new URLSearchParams({
      tier: record.tier,
      symptom: record.symptomKey,
    });
    if (record.claimIds && record.claimIds.length > 0) {
      params.set("claims", record.claimIds.join(","));
    }
    return `/report?${params.toString()}`;
  }
  if (record.kind === "behavior") {
    return `/behavior?c=${encodeURIComponent(record.id)}`;
  }
  return null;
}

// 相对日期:今天 / 昨天 / N 天前 / M 月 D 日。
export function relativeDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dayIndex = (x: Date) =>
    Math.floor(
      new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime() / 86400000,
    );
  const diff = dayIndex(new Date()) - dayIndex(d);
  if (diff <= 0) return "今天";
  if (diff === 1) return "昨天";
  if (diff < 7) return `${diff} 天前`;
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

// 月龄 → 「N 个月 / N 岁 / N 岁 M 个月」。
export function ageLabel(months: number): string {
  if (months < 12) return `${months} 个月`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m ? `${y} 岁 ${m} 个月` : `${y} 岁`;
}

// 生日 → 月龄(整数,最少 0)。非法日期返回 null,调用方用现有 ageMonths 兜底。
export function ageMonthsFromBirthday(birthday: string): number | null {
  if (!birthday) return null;
  const b = new Date(birthday);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let m = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) m -= 1; // 没满整月不算
  return Math.max(0, m);
}

// 陪伴天数:今天 − homeDate(无 / 非法日期返回 0)。
export function companionDays(homeDate: string): number {
  if (!homeDate) return 0;
  const d = new Date(homeDate);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
}

// 护理状态派生(疫苗 / 驱虫 / 绝育)。
// status 仅 done/due/no —— 渲染层用中性 / 陶土红表达,绝不映射风险三色(红线)。
export type CareStatus = "done" | "due" | "no";
export interface CareItem {
  sub: string;
  status: CareStatus;
  label: string;
}
export function careStatus(cat: Cat): {
  vaccine: CareItem;
  deworm: CareItem;
  neuter: CareItem;
} {
  const lastVac = cat.vaccines?.[cat.vaccines.length - 1];
  const vaccine: CareItem = lastVac
    ? {
        sub: `${cat.vaccines.length} 针 · 上次 ${lastVac.date}`,
        status: "done",
        label: "已完成",
      }
    : { sub: "还没有记录", status: "no", label: "未记录" };

  // 驱虫:有日期且距今 ≤35 天 = 已完成,否则 = 本月待做;无日期 = 未记录。
  const dwDays = cat.deworm
    ? Math.floor((Date.now() - new Date(cat.deworm).getTime()) / 86400000)
    : null;
  const deworm: CareItem =
    dwDays === null
      ? { sub: "还没有记录", status: "no", label: "未记录" }
      : dwDays <= 35
        ? { sub: `上次 ${cat.deworm}`, status: "done", label: "已完成" }
        : { sub: `上次 ${cat.deworm} · 该做了`, status: "due", label: "本月待做" };

  const neuter: CareItem =
    cat.neutered === "是"
      ? { sub: "已完成", status: "done", label: "已绝育" }
      : { sub: "6–8 月龄可咨询医生", status: "no", label: "未安排" };

  return { vaccine, deworm, neuter };
}
