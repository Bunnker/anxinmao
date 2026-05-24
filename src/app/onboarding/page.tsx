"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { loadStore, saveStore } from "@/lib/storage";
import { Disclaimer } from "@/components/Disclaimer";
import { CatAvatar } from "@/components/CatAvatar";
import type { Cat, Store, Vaccine } from "@/types/cat";

function newCat(): Cat {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : "cat-" + Math.random().toString(36).slice(2, 10);
  return {
    id,
    name: "",
    ageMonths: 6,
    sex: "不确定",
    coat: "",
    weight: 3,
    neutered: "暂未",
    homeDate: "",
    vaccines: [],
    deworm: "",
    notes: "",
  };
}

/* ---------- 小组件 ---------- */

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
          {label}
        </span>
        {hint && (
          <span className="text-[13px] tabular-nums text-ink-soft">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function SegRow({
  value,
  options,
  onChange,
}: {
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1 rounded-xl border border-[var(--line)] bg-surface p-1">
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={
              "flex-1 rounded-lg py-2.5 text-[14px] font-medium transition-colors " +
              (active
                ? "bg-paper text-ink shadow-[0_1px_2px_rgba(60,40,20,0.09)]"
                : "text-ink-soft")
            }
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

const inputCls =
  "w-full border-b border-[var(--hairline)] bg-transparent py-2.5 text-ink outline-none placeholder:text-ink-faint";

/* ---------- 页面 ---------- */

export default function OnboardingPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<Cat | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [isEdit, setIsEdit] = useState(false);
  // 头像生成 —— 仅 UI 状态,生成结果落到 draft.avatar
  const [avatarDesc, setAvatarDesc] = useState("");
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  useEffect(() => {
    const s = loadStore();
    if (s && s.cats.length > 0) {
      const active = s.cats.find((c) => c.id === s.activeCatId) ?? s.cats[0];
      setStore(s);
      setDraft({ ...active });
      setIsEdit(true);
    } else {
      setDraft(newCat());
      setIsEdit(false);
    }
  }, []);

  if (!draft) return <main className="min-h-dvh" aria-hidden="true" />;

  function set<K extends keyof Cat>(k: K, v: Cat[K]) {
    setDraft((d) => (d ? { ...d, [k]: v } : d));
  }
  function setVaccine(i: number, patch: Partial<Vaccine>) {
    setDraft((d) =>
      d
        ? {
            ...d,
            vaccines: d.vaccines.map((v, k) =>
              k === i ? { ...v, ...patch } : v,
            ),
          }
        : d,
    );
  }

  const ready = draft.name.trim().length > 0;

  async function generateAvatar() {
    if (!avatarDesc.trim() || avatarLoading || !draft) return;
    setAvatarLoading(true);
    setAvatarError(null);
    try {
      const res = await fetch("/api/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: avatarDesc.trim(),
          name: draft.name || undefined,
        }),
      });
      const data = (await res.json()) as { dataUrl?: string; error?: string };
      if (!res.ok || !data.dataUrl) {
        throw new Error(data.error ?? `生成失败 (${res.status})`);
      }
      set("avatar", data.dataUrl);
    } catch (e) {
      setAvatarError(e instanceof Error ? e.message : String(e));
    } finally {
      setAvatarLoading(false);
    }
  }

  function commit() {
    if (!ready || !draft) return;
    const next: Store =
      isEdit && store
        ? {
            ...store,
            cats: store.cats.map((c) => (c.id === draft.id ? draft : c)),
          }
        : { cats: [draft], activeCatId: draft.id, records: [] };
    saveStore(next);
    router.push("/");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col bg-paper px-7 pb-10 pt-3">
      {/* 顶栏 */}
      <header className="flex items-center">
        <button
          type="button"
          onClick={() => router.push("/")}
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
        </button>
        <span className="flex-1 text-center text-[12px] font-medium uppercase tracking-[0.18em] text-ink-soft">
          {isEdit ? "档案" : "新建档案"}
        </span>
        <span className="size-9" />
      </header>

      {/* 引导 */}
      <section className="pb-7 pt-6">
        <p className="mb-3 text-[13px] leading-relaxed text-ink-soft">
          {isEdit ? "——改完点最下面保存。" : "——你好,先认识一下你家的小家伙。"}
        </p>
        <h1 className="font-serif text-[2rem] font-medium leading-tight tracking-tight text-ink">
          {isEdit ? `${draft.name || "这只猫"}的档案` : "新加一只猫"}
        </h1>
        <p className="mt-2.5 text-[13px] leading-relaxed text-ink-soft">
          这些帮我判断它的情况。
          {isEdit ? "" : "只有名字是必填,其它随时能补。"}
        </p>
      </section>

      {/* 核心字段 */}
      <div className="flex flex-col gap-7">
        <Field label="叫它什么">
          <input
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="豆豆 / 咪咪 / 团子…"
            className={inputCls + " font-serif text-[20px] font-medium"}
          />
        </Field>

        <Field label="多大了" hint={`${draft.ageMonths} 个月`}>
          <input
            type="range"
            min={1}
            max={24}
            value={draft.ageMonths}
            onChange={(e) => set("ageMonths", Number(e.target.value))}
            className="w-full accent-[var(--accent)]"
          />
          <div className="mt-1 flex justify-between text-[11px] text-ink-faint">
            <span>幼猫 1m</span>
            <span>成年 12m</span>
            <span>2 岁+</span>
          </div>
        </Field>

        <Field label="体重 · 估个数就行" hint={`${draft.weight} kg`}>
          <input
            type="range"
            min={0.3}
            max={9}
            step={0.1}
            value={draft.weight}
            onChange={(e) => set("weight", Number(e.target.value))}
            className="w-full accent-[var(--accent)]"
          />
        </Field>

        <Field label="性别">
          <SegRow
            value={draft.sex}
            options={["雌", "雄", "不确定"]}
            onChange={(v) => set("sex", v as Cat["sex"])}
          />
        </Field>

        <Field label="毛发 · 可选">
          <SegRow
            value={draft.coat}
            options={["短毛", "长毛", "无毛"]}
            onChange={(v) => set("coat", v as Cat["coat"])}
          />
        </Field>

        <Field label="是否绝育">
          <SegRow
            value={draft.neutered}
            options={["是", "否", "暂未"]}
            onChange={(v) => set("neutered", v as Cat["neutered"])}
          />
        </Field>

        {/* 卡通形象 —— 一次性生成,作为身份/伴侣角色出现在 greeting / 报告卡角落
            生成时机:用户主动点击。边界:docs/product/AI生成形象-实施说明.md §二 */}
        <Field
          label="卡通形象 · 可选"
          hint={draft.avatar ? "已生成" : ""}
        >
          <div className="flex flex-col gap-3.5">
            <textarea
              value={avatarDesc}
              onChange={(e) => setAvatarDesc(e.target.value)}
              placeholder={`比如:橘虎斑,白肚皮,圆脸贪吃;或:奶牛猫,黑色三角耳,神态机灵`}
              rows={2}
              maxLength={200}
              className="w-full resize-none border-b border-[var(--hairline)] bg-transparent py-2.5 text-[14px] leading-relaxed text-ink outline-none placeholder:text-ink-faint"
            />

            {draft.avatar ? (
              <div className="flex items-center gap-4">
                <CatAvatar
                  avatar={draft.avatar}
                  name={draft.name}
                  size={88}
                />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <button
                    type="button"
                    onClick={generateAvatar}
                    disabled={!avatarDesc.trim() || avatarLoading}
                    className="self-start rounded-full border border-[var(--line)] bg-surface px-3 py-1.5 text-[12.5px] text-ink disabled:opacity-50"
                  >
                    {avatarLoading ? "重新生成中…" : "重新生成"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      set("avatar", undefined);
                      setAvatarError(null);
                    }}
                    className="self-start text-[12px] text-ink-faint underline underline-offset-2"
                  >
                    清除头像
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={generateAvatar}
                disabled={!avatarDesc.trim() || avatarLoading}
                className={
                  "rounded-xl py-3 text-[14px] font-medium tracking-wide transition-colors " +
                  (avatarDesc.trim() && !avatarLoading
                    ? "bg-[var(--surface-2)] text-ink"
                    : "bg-[var(--surface-2)] text-ink-faint")
                }
              >
                {avatarLoading ? "生成中…(约 10 秒)" : "生成卡通形象 →"}
              </button>
            )}

            {avatarError && (
              <p className="text-[12.5px] leading-relaxed text-[var(--red-ink)]">
                {avatarError}
              </p>
            )}
            <p className="text-[11.5px] leading-relaxed text-ink-faint">
              AI 出图,仅做头像 / 角色装饰用,不做症状示意。
            </p>
          </div>
        </Field>
      </div>

      {/* 可后补分隔 */}
      <div className="mb-5 mt-9 flex items-center gap-3">
        <span className="h-px flex-1 bg-[var(--line)]" />
        <span className="shrink-0 text-[11px] tracking-[0.08em] text-ink-faint">
          下面这些 · 之后随时能补
        </span>
        <span className="h-px flex-1 bg-[var(--line)]" />
      </div>

      {/* 选填字段 */}
      <div className="flex flex-col gap-7">
        <Field label="到家日期">
          <input
            type="date"
            value={draft.homeDate}
            onChange={(e) => set("homeDate", e.target.value)}
            className={inputCls + " text-[15px]"}
            style={{ colorScheme: "light" }}
          />
        </Field>

        <Field
          label="疫苗记录"
          hint={draft.vaccines.length ? `${draft.vaccines.length} 针` : "未记录"}
        >
          <div className="flex flex-col gap-2">
            {draft.vaccines.map((v, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-surface px-3 py-2"
              >
                <input
                  value={v.name}
                  onChange={(e) => setVaccine(i, { name: e.target.value })}
                  placeholder="疫苗名"
                  className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-faint"
                />
                <input
                  type="date"
                  value={v.date}
                  onChange={(e) => setVaccine(i, { date: e.target.value })}
                  className="bg-transparent text-[12px] text-ink-soft outline-none"
                  style={{ colorScheme: "light" }}
                />
                <button
                  type="button"
                  onClick={() =>
                    set(
                      "vaccines",
                      draft.vaccines.filter((_, k) => k !== i),
                    )
                  }
                  aria-label="删除这针"
                  className="shrink-0 text-ink-faint"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M6 6l12 12M18 6L6 18"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                set("vaccines", [...draft.vaccines, { name: "", date: "" }])
              }
              className="flex items-center gap-2 rounded-lg border border-dashed border-[var(--line)] px-3 py-2.5 text-[13px] text-ink-soft"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 5v14M5 12h14"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
              加一针
            </button>
          </div>
        </Field>

        <Field label="上次驱虫">
          <input
            type="date"
            value={draft.deworm}
            onChange={(e) => set("deworm", e.target.value)}
            className={inputCls + " text-[15px]"}
            style={{ colorScheme: "light" }}
          />
        </Field>

        <Field label="过敏 / 慢性病 · 可选">
          <textarea
            value={draft.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="比如:对鸡肉过敏 / 有先天性心脏病 / 在吃 XX 药"
            rows={3}
            className="w-full resize-none border-b border-[var(--hairline)] bg-transparent py-2.5 text-[14px] leading-relaxed text-ink outline-none placeholder:text-ink-faint"
          />
        </Field>
      </div>

      {/* CTA */}
      <div className="mt-10">
        <button
          type="button"
          onClick={commit}
          disabled={!ready}
          className={
            "w-full rounded-2xl py-4 text-[16px] font-medium tracking-wide transition-colors " +
            (ready
              ? "bg-accent text-accent-fg"
              : "bg-[var(--surface-2)] text-ink-faint")
          }
        >
          {isEdit ? "保存修改" : "建档,开始 →"}
        </button>
        {!isEdit && (
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-3.5 w-full text-center text-[12.5px] text-ink-faint underline underline-offset-4"
          >
            跳过,先用着
          </button>
        )}
        {!ready && (
          <p className="mt-3 text-center text-[12px] text-ink-faint">
            给它起个名字就能开始。
          </p>
        )}
      </div>

      <Disclaimer />
    </main>
  );
}
