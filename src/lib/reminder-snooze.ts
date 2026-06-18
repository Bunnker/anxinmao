// 首页桌宠护理提醒(称重 / 驱虫 / 疫苗)的「已处理」记忆。
//
// bug 背景:careNudge 纯按日期派生提醒,唯一去重 nudgeShownRef 是 React ref、每次挂载重置。
// 点「去记一笔」用 <Link> 跳 /onboarding 会卸载首页,切回来重新挂载 → ref 复位 → 同一条仍超期的
// 提醒又冒出来,反复唠叨。
//
// 修法:点了就按「猫 + 提醒类型」snooze 一段时间,期内不再提;过期若仍没做,温柔再提一次。
// 纯本机(localStorage,不进 Store、不云同步)—— snooze 是设备级 UX 体验,不是用户数据,
// 在别的设备上没点过就该照常提醒。失败静默,最坏多冒一次,绝不影响主流程。

const KEY = "catTriage:reminderSnooze:v1";
const SNOOZE_DAYS = 7;

export type ReminderKind = "weigh" | "deworm" | "vaccine";

type SnoozeMap = Record<string, number>; // `${catId}|${kind}` → snooze 设定时的毫秒时间戳

function read(): SnoozeMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return parsed && typeof parsed === "object" ? (parsed as SnoozeMap) : {};
  } catch {
    return {};
  }
}

// 该提醒是否还在 snooze 期内(点过「去记一笔」且未满 SNOOZE_DAYS)。
export function isReminderSnoozed(catId: string, kind: ReminderKind): boolean {
  const ts = read()[`${catId}|${kind}`];
  if (typeof ts !== "number") return false;
  return Date.now() - ts < SNOOZE_DAYS * 86400000;
}

// 点「去记一笔」时调用 —— 记下「这条提醒我已经去处理了」,切回首页一周内不再唠叨。
export function snoozeReminder(catId: string, kind: ReminderKind): void {
  if (typeof window === "undefined") return;
  try {
    const map = read();
    map[`${catId}|${kind}`] = Date.now();
    window.localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // localStorage 不可用就算了
  }
}
