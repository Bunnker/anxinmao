import Image from "next/image";
import Link from "next/link";
import { Disclaimer } from "@/components/Disclaimer";
import { ReviewedNotice } from "@/components/ReviewedNotice";

// 「看着吓人但不必慌」知识页 —— 依据 docs/product/证据-anicira-急诊10信号.md §三
// (Anicira 列出的非急症清单)+ Merck 行为文档(母猫发情属正常生理)。
// 目的:回应「怕→安心」情绪轴,降低新手家长的过度焦虑。
// 红线仍是「建议是否就医」 —— 不是「告诉你别去看」。每条都给明确的升级条件,
// 出现升级信号 → 重新评估或走分诊。

type Item = {
  id: string;
  title: string;
  why: string;
  escalate: string;
  // 「不必慌」的关键信号 —— 这几项都正常时通常可以白天再约门诊。
  // 由 HTML/SVG 渲染叠在图底部,不依赖 AI 嵌字(中文文字渲染不稳)。
  // 边界:见 docs/product/AI生成形象-实施说明.md §二 + §四
  checks: string[];
};

const ITEMS: Item[] = [
  {
    id: "fever",
    title: "猫发烧本身",
    why: "Anicira 明确:猫摸着热、有点不对劲,但能正常喝水、吃饭、牙龈粉红、呼吸平稳 —— 发烧本身通常不算急症,白天再预约兽医检查就可以。",
    escalate:
      "出现这些之一就升级:超过 24 小时不喝水、牙龈苍白或发紫、呼吸急促 / 张口喘、瘫软或叫不醒。",
    checks: ["会喝水", "会吃饭", "牙龈粉红", "呼吸平稳"],
  },
  {
    id: "bloodInStool",
    title: "粪便里少量血",
    why: "Anicira:粪便里少量血常见,通常不需急诊。多数是肠道短期受刺激引起。",
    escalate:
      "出现这些之一就升级:大量便血或柏油样黑便、伴萎靡 / 不吃 / 牙龈苍白、其它部位也出血。幼猫的便血一律建议尽早就诊。",
    checks: ["精神好", "能吃能喝", "血量少", "不是黑便"],
  },
  {
    id: "fightAbscess",
    title: "打架后局部小脓肿",
    why: "Anicira:打架后局部脓肿,如果猫精神还好、能吃能喝,通常可以等下个工作日做门诊处理,不必当夜冲急诊。",
    escalate:
      "出现这些之一就升级:脓肿迅速变大、红肿热痛、伴发热 / 萎靡 / 不吃、伤口在头脸 / 眼睛 / 关节附近。",
    checks: ["精神好", "能吃能喝", "脓肿不增大", "无发热"],
  },
  {
    id: "femaleHeat",
    title: "母猫发情期嚎叫、打滚",
    why: "Anicira:发情期的嚎叫、扭动、抬尾、地上打滚是正常生理行为,不是疼痛、不是病。Merck:绝育能消除大约 90% 的发情期行为(和公猫青春期喷尿)。",
    escalate:
      "出现这些之一就升级:伴随大量出血、严重萎靡、长时间不吃、阴部异常分泌物。",
    checks: ["嚎叫", "打滚扭动", "抬尾", "找异性"],
  },
  {
    id: "singleSeizure",
    title: "单次短暂抽搐 + 完全恢复",
    why: "Anicira 明确:猫单次抽搐持续不到几分钟、发作后行为完全恢复正常,本身不算急症。但即使是「不算急症」,首次发生仍建议这两天让兽医看一下,排查原因。",
    escalate:
      "出现这些之一就立刻急诊:单次抽搐超过 5 分钟、短时间内反复发作、发作之间不恢复、伴瘫软 / 不吃 / 呼吸异常。",
    checks: ["持续 < 几分钟", "单次发作", "之后行为正常"],
  },
  {
    id: "cough",
    title: "猫咳嗽",
    why: "Anicira:咳嗽不一定是急症。可以做三项家庭自检 —— 牙龈应呈粉红色;呼吸频率应平稳;提起后颈皮肤再松开,正常迅速回弹(回得慢 = 脱水)。三项都正常,可以预约门诊、不必当夜冲急诊。",
    escalate:
      "出现这些之一就升级:牙龈或舌头变青 / 紫、呼吸又快又费力或张口喘、咳嗽时身体明显前倾低头、咳出粉红色泡沫或血、伴严重萎靡。",
    checks: ["牙龈粉红", "呼吸平稳", "皮肤迅速回弹"],
  },
];

function CheckIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M5 13l4 4L19 7"
        stroke="var(--green)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ItemCard({ item }: { item: Item }) {
  return (
    <div className="overflow-hidden rounded-[28px] bg-surface shadow-[var(--shadow-card)]">
      {/* 顶部场景配图 + 「不必慌」信号 chips 叠在图底部 ——
          图传达「放松」氛围,chips 拎出 why 里的「这几项都正常 = 通常不必慌」标准,
          文字承担「升级条件」。三层递进,严格不画症状细节。
          边界:docs/product/AI生成形象-实施说明.md §二 + §四 */}
      <div className="relative aspect-[3/2] w-full bg-[var(--accent-soft)]">
        {/* unoptimized:静态资产直接发原图,不走 Next/Image 优化器缓存。
            否则换图后浏览器会一直拿 cached webp 版本(dev / 生产都遇到过)。
            代价:不做 webp 转换;1.5MB PNG × 6 在移动端可接受,知识页非首屏关键路径。 */}
        <Image
          src={`/knowledge/${item.id}.png`}
          alt={`${item.title} 场景示意`}
          fill
          unoptimized
          className="object-cover"
          sizes="(max-width: 430px) 100vw, 430px"
        />
        <div
          className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1.5 px-3 pb-2.5 pt-10"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 55%, transparent 100%)",
          }}
        >
          {item.checks.map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-medium text-ink shadow-sm"
            >
              <CheckIcon />
              {c}
            </span>
          ))}
        </div>
      </div>
      <div className="p-5">
        <h3 className="text-[15.5px] font-medium text-ink">{item.title}</h3>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
          {item.why}
        </p>
        <div className="mt-3 border-l-2 border-[var(--red)] pl-3">
          <p className="text-[12.5px] leading-relaxed text-[var(--red-ink)]">
            {item.escalate}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function KnowledgePage() {
  return (
    <main
      className="relative mx-auto flex min-h-dvh max-w-[430px] flex-col px-6 pb-24"
      style={{
        background: "var(--gradient-page)",
        paddingTop: "calc(0.75rem + env(safe-area-inset-top, 0px))",
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
      <header className="flex items-center">
        <Link
          href="/"
          aria-label="返回"
          className="grid size-9 place-items-center rounded-full text-ink"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
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
          看着吓人但不必慌
        </span>
        <span className="size-9" />
      </header>

      {/* 标题 + 说明 */}
      <section className="pt-6">
        <h1 className="font-serif text-[1.7rem] font-medium leading-snug tracking-tight text-ink">
          这些事新手容易吓到 —— 但通常不必冲急诊
        </h1>
        <p className="mt-2.5 text-[13px] leading-relaxed text-ink-soft">
          权威兽医资料(Anicira / Merck)明确指出的「常被当急症、其实可以白天再约门诊」的几种情况。图底部的 ✓ 信号 —— 这几项都正常,通常可以白天再约门诊;红色框里是「什么时候要升级」,出现立刻走分诊。
        </p>
      </section>

      <ReviewedNotice className="mt-6" />

      {/* 不必慌清单 */}
      <div className="mt-6 flex flex-col gap-3">
        {ITEMS.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>

      {/* 兜底:还是不放心 → 走分诊 */}
      <Link
        href="/symptoms"
        className="mt-7 flex items-center justify-between rounded-[28px] border border-dashed border-[var(--line)] bg-white/55 px-5 py-4 shadow-[var(--shadow-control)] transition-transform duration-500 active:scale-[0.985]"
      >
        <span>
          <span className="block text-[15px] text-ink">还是不放心?</span>
          <span className="mt-0.5 block text-[12.5px] text-ink-faint">
            去分诊看看,几个问题就有答案
          </span>
        </span>
        <span className="shrink-0 text-[13px] font-medium text-accent">
          去分诊 →
        </span>
      </Link>

      <div className="flex-1" />
      <Disclaimer />
    </main>
  );
}
