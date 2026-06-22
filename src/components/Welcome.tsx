"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Disclaimer } from "@/components/Disclaimer";
import { AvatarPicker } from "@/components/AvatarPicker";
import { addCat } from "@/lib/storage";
import type { Cat, Store } from "@/types/cat";

// 新用户首屏:温暖迎接 + 极低门槛建第一只猫(只有名字必填,其余进去再补)。
// 设计稿:docs/design/new-user-welcome-20260622/welcome-first-cat-profile.html(codex/gpt-image-2)。
// 建完用 addCat(追加+设 active+落本地+推云)→ onCreated 让首页就地渲染院子,不跳转闪屏。
// 头像走 AvatarPicker(上传/AI 生成,可选)。性别不预选,未选 = 「不确定」(不替用户瞎猜)。
const SEX_OPTIONS = ["雌", "雄", "还不确定"] as const;
const sexValue = (opt: (typeof SEX_OPTIONS)[number]): Cat["sex"] =>
  opt === "还不确定" ? "不确定" : opt;

export function Welcome({ onCreated }: { onCreated: (store: Store) => void }) {
  const [name, setName] = useState("");
  const [sex, setSex] = useState<Cat["sex"] | null>(null);
  const [avatar, setAvatar] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  // 重入守卫:移动端快速双击会派发两次 click,且都发生在父组件 setCat 重渲染卸载本屏之前 ——
  // 不挡住会建出两只同名猫。用 ref 同步挡(不依赖异步 state)。
  const submitting = useRef(false);

  const ready = name.trim().length > 0;
  const segRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const sexIdx = sex
    ? SEX_OPTIONS.findIndex((o) => sexValue(o) === sex)
    : -1;

  function onSegKey(e: React.KeyboardEvent) {
    const dir =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? 1
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? -1
          : 0;
    if (!dir) return;
    e.preventDefault();
    const base = sexIdx < 0 ? 0 : sexIdx;
    const ni = (base + dir + SEX_OPTIONS.length) % SEX_OPTIONS.length;
    setSex(sexValue(SEX_OPTIONS[ni]));
    segRefs.current[ni]?.focus();
  }

  function start() {
    if (!ready || submitting.current) return;
    submitting.current = true;
    setError(null);
    try {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : "cat-" + Math.random().toString(36).slice(2, 10);
      const today = new Date().toISOString().slice(0, 10);
      const cat: Cat = {
        id,
        name: name.trim(),
        ageMonths: 6,
        sex: sex ?? "不确定",
        coat: "",
        weight: 3,
        neutered: "否",
        homeDate: "",
        vaccines: [],
        deworm: "",
        notes: "",
        weightLog: [{ date: today, kg: 3 }],
        ...(avatar ? { avatar } : {}),
      };
      const next = addCat(cat);
      if (next) {
        onCreated(next); // 成功:父组件重渲染会卸载本屏
        return;
      }
      throw new Error("addCat returned null");
    } catch {
      submitting.current = false; // 允许重试
      setError(
        "没能保存档案 —— 可能浏览器禁用了存储(无痕/隐私模式?),换个浏览器或关掉无痕再试。",
      );
    }
  }

  return (
    <main
      className="relative mx-auto min-h-[100dvh] w-full max-w-[430px] overflow-x-hidden pb-[calc(28px+env(safe-area-inset-bottom,0px))]"
      style={{
        background:
          "radial-gradient(circle at 50% -20%, rgba(176,90,80,0.08), transparent 36%), var(--paper)",
      }}
    >
      {/* 头图(图与淡出装饰,品牌文字保留给读屏) */}
      <section
        className="relative h-[250px] overflow-hidden"
        style={{ background: "var(--warm-cream)" }}
      >
        <div
          className="absolute inset-x-0 z-[2] text-center text-[12px] font-semibold"
          style={{
            top: "calc(18px + env(safe-area-inset-top,0px))",
            color: "rgba(26,26,24,0.66)",
          }}
        >
          小猫怎么了 · 安心猫
        </div>
        <Image
          src="/pet/welcome-hero.webp"
          alt=""
          fill
          priority
          sizes="(max-width: 430px) 100vw, 430px"
          style={{ objectFit: "cover", objectPosition: "51% 45%" }}
        />
        {/* 底部淡出,把头图融进页面底色 */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-[72px]"
          style={{
            background:
              "linear-gradient(180deg, rgba(247,246,243,0), var(--paper))",
          }}
        />
      </section>

      {/* 卡片 */}
      <section
        className="relative z-[1] mx-4 -mt-7 rounded-[28px] bg-surface px-5 pb-[18px] pt-[25px]"
        style={{
          border: "1px solid rgba(255,255,255,0.76)",
          boxShadow:
            "0 26px 62px rgba(54,43,35,0.1), 0 1px 0 rgba(255,255,255,0.9) inset",
        }}
      >
        <h1 className="m-0 font-serif text-[29px] font-bold leading-[1.18] text-ink">
          先给它建个小档案
        </h1>
        <p className="mb-5 mt-3 text-body leading-[1.58] text-ink-soft">
          它不对劲时，我陪你 30 秒看红黄绿就医建议 —— 建了档案，分诊更懂它
        </p>

        {/* 头像行 */}
        <div className="mb-5 grid grid-cols-[82px_1fr] items-center gap-[14px]">
          <AvatarPicker avatar={avatar} name={name} onChange={setAvatar} />
          <div className="grid gap-1">
            <strong className="text-[15px] font-bold text-ink">
              {avatar ? "头像已添加" : "加张照片"}
            </strong>
            <span className="text-caption leading-[1.45] text-ink-soft">
              {avatar ? "点头像可更换或重新生成" : "可选，也能 AI 生成卡通头像"}
            </span>
          </div>
        </div>

        {/* 名字(唯一必填) */}
        <div className="mb-[15px]">
          <div className="mb-2 flex items-center justify-between text-[14px] font-bold text-ink">
            <label htmlFor="cat-name">它叫什么？</label>
            <span className="text-[12px] font-bold text-[var(--accent)]">
              唯一必填
            </span>
          </div>
          <input
            id="cat-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="输入猫咪名字"
            maxLength={12}
            autoComplete="off"
            className="h-[54px] w-full rounded-[18px] px-4 text-[17px] font-semibold text-ink outline-none placeholder:text-[rgba(26,26,24,0.38)]"
            style={{
              border: "1px solid rgba(176,90,80,0.26)",
              background: "var(--warm-white)",
              boxShadow: "0 1px 0 rgba(255,255,255,0.8) inset",
            }}
          />
        </div>

        {/* 性别快选(可选,未选 = 不确定) */}
        <div
          className="grid grid-cols-3 gap-1 rounded-2xl p-1"
          style={{ border: "1px solid var(--line)", background: "var(--paper)" }}
          role="radiogroup"
          aria-label="性别快选"
          onKeyDown={onSegKey}
        >
          {SEX_OPTIONS.map((opt, i) => {
            const active = sex === sexValue(opt);
            return (
              <button
                key={opt}
                ref={(el) => {
                  segRefs.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={active}
                tabIndex={sexIdx < 0 ? (i === 0 ? 0 : -1) : active ? 0 : -1}
                onClick={() => setSex(sexValue(opt))}
                className="grid h-9 place-items-center rounded-xl text-[13px] font-semibold transition-colors"
                style={
                  active
                    ? {
                        background: "#fff",
                        color: "var(--accent-deep)",
                        boxShadow:
                          "0 7px 18px rgba(54,43,35,0.08), 0 0 0 1px rgba(176,90,80,0.1)",
                      }
                    : { color: "var(--ink-soft)" }
                }
              >
                {opt}
              </button>
            );
          })}
        </div>

        {/* 隐私安心条 */}
        <div
          className="mt-4 flex min-h-[43px] items-center gap-[9px] rounded-2xl px-[13px] text-[13px] font-semibold"
          style={{
            border: "1px solid rgba(176,90,80,0.12)",
            background: "var(--warm-white)",
            color: "#5c5049",
          }}
        >
          <span
            className="relative grid h-5 w-5 shrink-0 place-items-center rounded-full"
            style={{ background: "rgba(176,90,80,0.12)" }}
            aria-hidden="true"
          >
            <svg width="11" height="12" viewBox="0 0 11 12" fill="none">
              <path
                d="M2.4 5.2V3.7a3.1 3.1 0 0 1 6.2 0v1.5"
                stroke="var(--accent-deep)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <rect x="1.4" y="5" width="8.2" height="6.4" rx="1.8" fill="var(--accent-deep)" />
            </svg>
          </span>
          <span>不用登录 · 资料只存在你手机里</span>
        </div>

        {/* 保存失败提示(存储被禁用等) */}
        {error && (
          <p
            role="alert"
            className="mt-3 text-[13px] leading-relaxed text-[var(--red)]"
          >
            {error}
          </p>
        )}

        {/* CTA */}
        <button
          type="button"
          onClick={start}
          disabled={!ready}
          className="mt-[14px] grid h-14 w-full place-items-center rounded-full text-[17px] font-extrabold text-white transition-transform duration-300 active:scale-[0.985] disabled:cursor-not-allowed"
          style={{
            background: ready
              ? "linear-gradient(180deg, var(--accent-light), var(--accent))"
              : "var(--surface-2)",
            color: ready ? "#fff" : "var(--ink-faint)",
            boxShadow: ready
              ? "0 18px 36px rgba(176,90,80,0.27), 0 1px 0 rgba(255,255,255,0.2) inset"
              : "none",
          }}
        >
          开始照顾它
        </button>

        <p className="mx-auto mt-[14px] max-w-[300px] text-center text-[12px] leading-[1.55] text-[rgba(107,104,101,0.82)]">
          品种 · 生日 · 体重 · 疫苗病史 —— 进去之后随时补
        </p>
      </section>

      {/* 红线:每屏固定「不能替代兽医」 */}
      <div className="mt-5 flex justify-center px-6">
        <Disclaimer />
      </div>
    </main>
  );
}
