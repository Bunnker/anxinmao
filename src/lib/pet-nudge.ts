// 首页桌宠的「会说话」层 —— 闲时坐下冒一个气泡。
//
// 设计(2026-06-17,用户拍板):桌宠是只会卖萌闲聊的猫,不是推销员。
// 大多数冒泡是【纯闲聊】(不可点、不用理、12s 自己飘走);只有约 1/5 是【提一嘴】可点小气泡
// (护理提醒优先,否则偶尔分诊/问答邀请)。CTA 从「每次必现」降到「偶发」,推销感就没了。
// 红线:文案不焦虑、不诊断、不碰风险三色;闲聊纯陪伴。
//
// 内容 + 挑选逻辑放这个独立 lib(不进 page.tsx),减小与并行改动的冲突面;
// page.tsx 只负责把 idleNudge 的产物渲染成气泡。

import type { Cat } from "@/types/cat";
import type { PetSpriteState } from "@/components/PetSprite";
import { careStatus } from "@/lib/profile";
import { isReminderSnoozed, type ReminderKind } from "@/lib/reminder-snooze";

// 一个气泡:闲聊只有 text/sprite;提一嘴额外带 cta+href(可点),护理还带 snoozeKey。
export type Nudge = {
  text: string;
  sprite: PetSpriteState;
  cta?: string; // 有 = 可点(渲染猫爪按钮 + Link);无 = 纯闲聊文字,不可点
  href?: string;
  snoozeKey?: ReminderKind;
};

// 纯闲聊词库(卖萌 / 软陪伴喵语 + 颜文字)—— 不可点、不用理。
const CHATTER: string[] = [
  "喵~(晒着太阳,尾巴尖都暖暖的 ´ω`)",
  "咕噜咕噜……(先眯一会儿,你忙你的 ˘ω˘)",
  "喵呜?(你在看什么呀,我也要看 ·ω·)",
  "(舔舔爪子)喵~(梳理一下,要好看的 ฅ•ﻌ•ฅ)",
  "喵喵~(刚才那只小虫子,被我盯了好久 =^‥^=)",
  "咕噜~(在你旁边趴着,最安心了 ´ ▽ ` )",
  "喵?(是不是快到饭点了…我猜的,嘿嘿 ฅ^•ﻌ•^ฅ)",
  "(伸了个大大的懒腰)喵呜~(舒服)",
  "喵~(我把那个小球滚到沙发底下了,嘘 →ω←)",
  "咕噜咕噜~(发呆中,勿扰…才怪,快看我呀 ≧ω≦)",
  "喵~(今天也要乖乖陪着你哦 =´∇`=)",
  "(歪着头)喵呜?(你刚刚…是不是叫我了)",
  "喵~(尾巴自己在晃,我也管不住它 ~(=^‥^)ノ)",
  "咕噜~(打了个小哈欠…你可别学我打哈欠呀)",
];

// 闲时搭话引导(分诊 / 问答)—— 低频的「提一嘴」,可点。
const CHAT_INVITES: Nudge[] = [
  {
    text: "喵~(拿不准的事,都能问我哦 ·ω·)",
    cta: "去问问",
    href: "/behavior",
    sprite: "waving",
  },
  {
    text: "喵呜?(哪儿不对劲,就带我去分诊呀 ฅ•ﻌ•ฅ)",
    cta: "去分诊",
    href: "/symptoms",
    sprite: "waving",
  },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 据日期派生的护理提醒(可点「提一嘴」):称重 >14 天 / 驱虫超期 / 没记疫苗。
// 点过「去记一笔」的(snooze 期内)跳过 → 落到下一条或 null。
function careNudge(cat: Cat): Nudge | null {
  const edit = `/onboarding?pet=${cat.id}`;
  const wl = cat.weightLog ?? [];
  const last = wl[wl.length - 1];
  const weighDays = last
    ? (Date.now() - new Date(last.date).getTime()) / 86400000
    : Infinity;
  if (weighDays > 14 && !isReminderSnoozed(cat.id, "weigh"))
    return {
      text: "喵呜~(好久没量体重啦,帮我记一笔嘛 ｡•ᴗ•｡)",
      cta: "去记一笔",
      href: edit,
      sprite: "review",
      snoozeKey: "weigh",
    };
  const care = careStatus(cat);
  if (care.deworm.status === "due" && !isReminderSnoozed(cat.id, "deworm"))
    return {
      text: "喵喵~(该做驱虫啦,别忘了我哦 =^‥^=)",
      cta: "去记一笔",
      href: edit,
      sprite: "review",
      snoozeKey: "deworm",
    };
  if (care.vaccine.status === "no" && !isReminderSnoozed(cat.id, "vaccine"))
    return {
      text: "喵~(还没记我的疫苗呢,补一下嘛 ˘ω˘)",
      cta: "去记一笔",
      href: edit,
      sprite: "review",
      snoozeKey: "vaccine",
    };
  return null;
}

// 闲时冒泡主入口 —— 约 80% 纯闲聊,约 20% 提一嘴(护理优先,否则偶尔分诊/问答邀请)。
// 每次访问坐下时在 effect 里调一次(非 render)。永远返回一个气泡(至少一句闲聊)。
const ACTIONABLE_CHANCE = 0.2;
export function idleNudge(cat: Cat): Nudge {
  if (Math.random() < ACTIONABLE_CHANCE) {
    const care = careNudge(cat); // 有该提醒的正事就提它
    if (care) return care;
    if (Math.random() < 0.5) return pick(CHAT_INVITES); // 否则偶尔来个分诊/问答邀请
    // 否则掉到闲聊
  }
  return { text: pick(CHATTER), sprite: "review" };
}
