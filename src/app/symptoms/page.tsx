import type { ReactNode } from "react";
import Link from "next/link";
import { Disclaimer } from "@/components/Disclaimer";
import { ReviewedNotice } from "@/components/ReviewedNotice";

type Symptom = {
  id: string;
  label: string;
  sub: string;
  tier: "urgent" | "common" | "soft";
};

// 选中的症状 id 会带进 /triage?symptom=<id>,分诊流按症状分支。
const SYMPTOMS: Symptom[] = [
  { id: "vomit", label: "呕吐", sub: "吐了 / 干呕", tier: "common" },
  { id: "diarrhea", label: "腹泻", sub: "拉稀 / 软便", tier: "common" },
  { id: "noeat", label: "不吃东西", sub: "≥ 8 小时没碰食", tier: "common" },
  { id: "lethargy", label: "精神差", sub: "蔫 / 躲起来 / 不动", tier: "common" },
  { id: "sneeze", label: "打喷嚏 / 流鼻涕", sub: "眼鼻分泌物 / 一直喷嚏", tier: "common" },
  { id: "ear", label: "耳朵问题", sub: "挠耳 / 甩头 / 有分泌物", tier: "common" },
  { id: "skin", label: "皮肤痒 / 掉毛", sub: "脱毛 / 皮屑 / 一直挠", tier: "common" },
  { id: "eye", label: "眼睛问题", sub: "红肿 / 流泪 / 分泌物", tier: "common" },
  { id: "mouth", label: "口腔问题", sub: "流口水 / 口臭 / 单边吃", tier: "common" },
  { id: "behavior", label: "行为突变", sub: "躲 / 凶 / 乱尿 / 不玩", tier: "common" },
  { id: "limp", label: "跛行 / 走路异常", sub: "一瘸一拐 / 跳不动", tier: "common" },
  { id: "eat", label: "可能误食", sub: "线 / 植物 / 不该吃的", tier: "urgent" },
  { id: "breath", label: "呼吸怪", sub: "急促 / 张嘴喘", tier: "urgent" },
  { id: "blood", label: "看到血", sub: "便 / 尿 / 口鼻", tier: "urgent" },
  { id: "pee", label: "尿不出", sub: "频繁蹲砂、没尿", tier: "urgent" },
  { id: "other", label: "其它情况", sub: "说不清也没关系", tier: "soft" },
];

function SymptomCard({ s }: { s: Symptom }) {
  const urgent = s.tier === "urgent";
  return (
    <Link
      href={`/triage?symptom=${s.id}`}
      className="relative flex min-h-[88px] flex-col gap-1.5 rounded-2xl border border-[var(--line)] bg-surface px-4 py-4 transition-transform active:translate-y-px"
    >
      {urgent && (
        <span
          className="absolute right-3 top-3 size-1.5 rounded-full bg-[var(--red)]"
          aria-hidden="true"
        />
      )}
      <span className="text-[16px] font-medium text-ink">{s.label}</span>
      <span className="text-[12px] leading-snug text-ink-soft">{s.sub}</span>
    </Link>
  );
}

function Group({
  eyebrow,
  urgent,
  children,
}: {
  eyebrow: string;
  urgent?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="mt-7">
      <p
        className={
          "mb-2.5 text-[11px] font-semibold tracking-[0.2em] " +
          (urgent ? "text-[var(--red)]" : "text-ink-faint")
        }
      >
        {eyebrow}
      </p>
      <div className="grid grid-cols-2 gap-2.5">{children}</div>
    </section>
  );
}

export default function SymptomsPage() {
  const urgent = SYMPTOMS.filter((s) => s.tier === "urgent");
  const common = SYMPTOMS.filter((s) => s.tier === "common");
  const soft = SYMPTOMS.find((s) => s.tier === "soft")!;

  return (
    <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col bg-paper px-7 pb-8 pt-3">
      {/* 顶栏 */}
      <header className="flex items-center">
        <Link
          href="/"
          aria-label="返回"
          className="grid size-9 place-items-center rounded-full text-ink"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <span className="flex-1 text-center text-[12px] font-medium uppercase tracking-[0.18em] text-ink-soft">
          选一个最贴近的
        </span>
        <span className="size-9" />
      </header>

      {/* 标题 */}
      <section className="pt-6">
        <h1 className="font-serif text-[1.7rem] font-medium leading-snug tracking-tight text-ink">
          它现在最让你担心的是?
        </h1>
        <p className="mt-2.5 text-[13px] leading-relaxed text-ink-soft">
          挑最像的一项 —— 后面我会再追问几个问题。
        </p>
      </section>

      <ReviewedNotice className="mt-6" />

      <Group eyebrow="可能要急的" urgent>
        {urgent.map((s) => (
          <SymptomCard key={s.id} s={s} />
        ))}
      </Group>

      <Group eyebrow="常见">
        {common.map((s) => (
          <SymptomCard key={s.id} s={s} />
        ))}
      </Group>

      {/* 其它 */}
      <Link
        href={`/triage?symptom=${soft.id}`}
        className="mt-7 flex items-center justify-between rounded-2xl border border-dashed border-[var(--line)] px-5 py-4 transition-transform active:translate-y-px"
      >
        <span>
          <span className="text-[15px] text-ink">{soft.label}</span>
          <span className="ml-2.5 text-[12px] text-ink-faint">{soft.sub}</span>
        </span>
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          className="shrink-0 text-ink-faint"
          aria-hidden="true"
        >
          <path
            d="M9 6l6 6-6 6"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>

      <div className="flex-1" />
      <Disclaimer />
    </main>
  );
}
