"use client";

import Image from "next/image";
import Link from "next/link";
import { Disclaimer } from "@/components/Disclaimer";

// 新用户首屏欢迎页 —— 不把人直接甩进表单,先给品牌 + 一句话定位 + 明确两个选择。
// 边界 / 决策:~/.gstack/projects/project/mantou-unknown-design-20260529-*.md
export function Welcome({ onUseTemplate }: { onUseTemplate: () => void }) {
  return (
    <main
      className="mx-auto flex min-h-dvh max-w-[430px] flex-col items-center px-7"
      style={{
        background: "var(--gradient-page)",
        paddingTop: "calc(4rem + env(safe-area-inset-top, 0px))",
        paddingBottom: "calc(2.25rem + env(safe-area-inset-bottom, 0px))",
      }}
    >
      {/* logo */}
      <span className="overflow-hidden rounded-[34px] border border-[var(--line)] bg-surface shadow-[var(--shadow-card)]">
        <Image
          src="/icons/icon-512.png"
          alt="小猫怎么了"
          width={104}
          height={104}
          priority
        />
      </span>

      {/* 品牌 + 定位 */}
      <h1 className="mt-7 font-serif text-[2.6rem] font-medium leading-none tracking-tight text-ink">
        小猫怎么了
      </h1>
      <p className="mt-4 text-center text-[15px] leading-relaxed text-ink-soft">
        猫不对劲时,帮你做可信判断 —— 别慌
      </p>
      <p className="mt-2 text-center text-[12.5px] leading-relaxed tracking-wide text-ink-faint">
        5 步分诊 · 红黄绿风险报告 · 带出处的护理建议
      </p>

      <div className="flex-1" />

      {/* 两个选择 */}
      <Link
        href="/onboarding"
        className="flex w-full items-center justify-center gap-2 rounded-[28px] bg-accent py-4 text-[16px] font-medium tracking-wide text-accent-fg shadow-[var(--shadow-accent)] transition-transform duration-500 active:scale-[0.985]"
      >
        建立我家猫的档案 →
      </Link>
      <button
        type="button"
        onClick={onUseTemplate}
        className="mt-3 w-full rounded-[28px] bg-surface py-4 text-[15px] font-medium tracking-wide text-ink-soft shadow-[var(--shadow-control)] transition-transform duration-500 active:scale-[0.985]"
      >
        使用系统默认模版
      </button>
      <p className="mt-3 text-center text-[12px] leading-relaxed text-ink-faint">
        会先给你一只空白小猫,随时能改成自己家猫的信息。
      </p>

      <div className="mt-6">
        <Disclaimer />
      </div>
    </main>
  );
}
