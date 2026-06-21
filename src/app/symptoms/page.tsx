import type { ReactNode } from "react";
import Link from "next/link";
import { Disclaimer } from "@/components/Disclaimer";
import { ReviewedNotice } from "@/components/ReviewedNotice";
import { SymptomIcon } from "@/lib/triage-icons";

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
  { id: "urine", label: "小便不对劲", sub: "尿频 / 尿血 / 乱尿 / 尿痛", tier: "common" },
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
      className="relative flex items-center gap-3 rounded-[22px] bg-surface px-4 py-3.5 shadow-[var(--shadow-card)] transition-transform duration-500 active:scale-[0.985]"
    >
      {urgent && (
        <span
          className="absolute right-3 top-3 size-1.5 rounded-full bg-[var(--red)]"
          aria-hidden="true"
        />
      )}
      <SymptomIcon
        id={s.id}
        size={26}
        className={urgent ? "shrink-0 text-[var(--red)]/70" : "shrink-0 text-ink/45"}
      />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[15px] font-medium leading-snug text-ink">
          {s.label}
        </span>
        <span className="text-[11.5px] leading-snug text-ink-faint">{s.sub}</span>
      </span>
    </Link>
  );
}

function Group({
  eyebrow,
  urgent,
  guideTarget,
  children,
}: {
  eyebrow: string;
  urgent?: boolean;
  guideTarget?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-7" data-guide-target={guideTarget}>
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
    <main
      className="relative mx-auto flex min-h-dvh max-w-[430px] flex-col px-6 pb-24"
      style={{
        background: "var(--gradient-page)",
        paddingTop: "calc(1.25rem + env(safe-area-inset-top, 0px))",
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-56"
        style={{
          background:
            "radial-gradient(ellipse 85% 60% at 50% 0%, rgba(176,90,80,0.11) 0%, transparent 100%)",
        }}
        aria-hidden="true"
      />
      {/* 顶栏 */}
      <header className="flex items-center py-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-medium tracking-[0.06em]"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M18 18l3.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          选一个最贴近的
        </span>
      </header>

      {/* 顶部主卡 */}
      <section className="pt-7">
        <div className="rounded-[28px] bg-surface p-5 shadow-[var(--shadow-card)]">
          <h1 className="font-serif text-[1.7rem] font-medium leading-snug tracking-tight text-ink">
            它现在最让你担心的是?
          </h1>
          <p className="mt-2.5 text-[13px] leading-relaxed text-ink-soft">
            挑最像的一项 —— 后面我会再追问几个问题。
          </p>
          <ReviewedNotice className="mt-4" />
        </div>
      </section>

      <Group eyebrow="可能要急的" urgent guideTarget="guide-symptom-picker">
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
        className="mt-7 flex items-center justify-between rounded-[28px] border border-dashed border-[var(--line)] bg-white/55 px-5 py-4 shadow-[var(--shadow-control)] transition-transform duration-500 active:scale-[0.985]"
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
