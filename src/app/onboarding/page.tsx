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
  const [avatarPhoto, setAvatarPhoto] = useState<string | null>(null); // dataURL
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  // 视觉守门:照片被判非猫 → 显示「用默认头像 / 换一张」 inline 选项
  const [avatarNotCat, setAvatarNotCat] = useState(false);

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
    // 至少有照片或描述其一
    if ((!avatarDesc.trim() && !avatarPhoto) || avatarLoading || !draft) return;
    setAvatarLoading(true);
    setAvatarError(null);
    setAvatarNotCat(false);
    try {
      const res = await fetch("/api/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: avatarDesc.trim(),
          photoDataUrl: avatarPhoto ?? undefined,
          name: draft.name || undefined,
        }),
      });
      const data = (await res.json()) as {
        dataUrl?: string;
        error?: string;
        code?: string;
      };
      if (!res.ok || !data.dataUrl) {
        // 视觉守门特判:照片不是猫
        if (data.code === "NOT_A_CAT") {
          setAvatarNotCat(true);
          setAvatarError(data.error ?? "上传的照片看着不像是猫。");
          return;
        }
        throw new Error(data.error ?? `生成失败 (${res.status})`);
      }
      set("avatar", data.dataUrl);
    } catch (e) {
      setAvatarError(e instanceof Error ? e.message : String(e));
    } finally {
      setAvatarLoading(false);
    }
  }

  // 用默认头像:清掉照片 + avatar 字段,前端 CatAvatar 会自动 fallback 到默认 icon
  function useDefaultAvatar() {
    setAvatarPhoto(null);
    setAvatarDesc("");
    set("avatar", undefined);
    setAvatarNotCat(false);
    setAvatarError(null);
  }

  // 选照片 → 转 dataURL → 存到 avatarPhoto(用户预览 + 提交时发给后端)
  function onPhotoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // 重置 input 允许选同一张文件重传
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("照片不能超过 5MB。压缩一下再试。");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatarPhoto(reader.result);
        setAvatarError(null);
      }
    };
    reader.onerror = () => setAvatarError("照片读取失败。");
    reader.readAsDataURL(file);
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

  // 离开建档页(返回)。直接回首页 —— 无档案时首页显示欢迎页(有选择,非死胡同),
  // 不再 seed 豆豆。
  function leaveOnboarding() {
    router.push("/");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col bg-paper px-7 pb-10 pt-3">
      {/* 顶栏 */}
      <header className="flex items-center">
        <button
          type="button"
          onClick={leaveOnboarding}
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
            生成时机:用户主动点击。边界:docs/product/AI生成形象-实施说明.md §二
            两个 provider:有照片走即梦 i2i(贴近自家猫);无照片走 wanx t2i(纯文字)*/}
        <Field
          label="卡通形象 · 可选"
          hint={draft.avatar ? "已生成" : avatarPhoto ? "已选照片" : ""}
        >
          <div className="flex flex-col gap-3.5">
            {/* 照片 + 描述并列输入 —— 照片是图生图的主输入,描述是风格补充 */}
            <div className="flex items-start gap-3">
              {avatarPhoto ? (
                <button
                  type="button"
                  onClick={() => setAvatarPhoto(null)}
                  aria-label="换一张照片"
                  className="relative size-20 shrink-0 overflow-hidden rounded-xl border border-[var(--line)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatarPhoto}
                    alt="选中的照片"
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-black/60 text-[10px] text-white">
                    ×
                  </span>
                </button>
              ) : (
                <label className="flex size-20 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[var(--line)] text-ink-soft transition-colors hover:bg-[var(--surface-2)]">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onPhotoPick}
                    className="hidden"
                  />
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 8a2 2 0 0 1 2-2h2l1.5-2h5L16 6h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                  <span className="text-[11px]">传照片</span>
                </label>
              )}
              <textarea
                value={avatarDesc}
                onChange={(e) => setAvatarDesc(e.target.value)}
                placeholder={
                  avatarPhoto
                    ? "(可选)风格补充,如「画得圆润一点」"
                    : `没照片就描述一下:橘虎斑,白肚皮…`
                }
                rows={3}
                maxLength={200}
                className="min-w-0 flex-1 resize-none border-b border-[var(--hairline)] bg-transparent py-2.5 text-[14px] leading-relaxed text-ink outline-none placeholder:text-ink-faint"
              />
            </div>

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
                    disabled={
                      (!avatarDesc.trim() && !avatarPhoto) || avatarLoading
                    }
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
                disabled={
                  (!avatarDesc.trim() && !avatarPhoto) || avatarLoading
                }
                className={
                  "rounded-xl py-3 text-[14px] font-medium tracking-wide transition-colors " +
                  ((avatarDesc.trim() || avatarPhoto) && !avatarLoading
                    ? "bg-[var(--surface-2)] text-ink"
                    : "bg-[var(--surface-2)] text-ink-faint")
                }
              >
                {avatarLoading
                  ? "生成中…(约 10-30 秒)"
                  : avatarPhoto
                    ? "从照片生成卡通形象 →"
                    : "从描述生成卡通形象 →"}
              </button>
            )}

            {avatarError && (
              <div className="rounded-xl border border-[var(--red)]/30 bg-[var(--red)]/5 p-3">
                <p className="text-[12.5px] leading-relaxed text-[var(--red-ink)]">
                  {avatarError}
                </p>
                {avatarNotCat && (
                  <div className="mt-2.5 flex gap-2">
                    <button
                      type="button"
                      onClick={useDefaultAvatar}
                      className="rounded-full bg-[var(--surface-2)] px-3 py-1.5 text-[12px] text-ink"
                    >
                      用默认头像
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarPhoto(null);
                        setAvatarError(null);
                        setAvatarNotCat(false);
                      }}
                      className="rounded-full border border-[var(--line)] px-3 py-1.5 text-[12px] text-ink-soft"
                    >
                      换一张照片
                    </button>
                  </div>
                )}
              </div>
            )}
            <p className="text-[11.5px] leading-relaxed text-ink-faint">
              AI 出图,仅做头像 / 角色装饰用,不做症状示意。
              传猫照片效果最好(系统会先检测是不是猫,不是猫不出图);
              纯文字描述也行(走文生图回退)。
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
            {/* 常见疫苗名称参考提示 */}
            <p className="text-[11.5px] leading-relaxed text-ink-faint">
              常见:猫三联（第1/2/3针）· 猫白血病疫苗 · 狂犬疫苗
            </p>
            {draft.vaccines.map((v, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-surface px-3 py-2"
              >
                <input
                  value={v.name}
                  onChange={(e) => setVaccine(i, { name: e.target.value })}
                  placeholder={
                    i === 0 ? "如:猫三联第1针" :
                    i === 1 ? "如:猫三联第2针" :
                    i === 2 ? "如:猫三联第3针" : "疫苗名称"
                  }
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
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  set("vaccines", [...draft.vaccines, { name: "", date: "" }])
                }
                className="flex flex-1 items-center gap-2 rounded-lg border border-dashed border-[var(--line)] px-3 py-2.5 text-[13px] text-ink-soft"
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
              {draft.vaccines.length === 0 && (
                <button
                  type="button"
                  onClick={() =>
                    set("vaccines", [
                      { name: "猫三联第1针", date: "" },
                      { name: "猫三联第2针", date: "" },
                      { name: "猫三联第3针", date: "" },
                    ])
                  }
                  className="rounded-lg border border-[var(--line)] bg-surface px-3 py-2.5 text-[12px] text-ink-soft"
                >
                  填入参考模版
                </button>
              )}
            </div>
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
          <p className="text-[11.5px] leading-relaxed text-ink-faint">
            常见药:体外驱虫用福来恩/赛诺菲 · 体内驱虫用拜宠清/倍脉心 · 每1-3个月一次
          </p>
        </Field>

        <Field label="品种 · 可选">
          <input
            value={draft.breed ?? ""}
            onChange={(e) => set("breed", e.target.value)}
            placeholder="中华田园 / 英短 / 布偶 / 加菲…"
            className={inputCls + " text-[15px]"}
          />
          <p className="text-[11.5px] leading-relaxed text-ink-faint">
            有些情况跟品种相关(如扁脸猫易呼吸 / 泪痕),填了判断更准。
          </p>
        </Field>

        <Field label="慢性病史 · 可选">
          <textarea
            value={draft.chronicConditions ?? ""}
            onChange={(e) => set("chronicConditions", e.target.value)}
            placeholder="比如:心脏病 / 糖尿病 / 慢性肾病 / 长期在吃某种药"
            rows={2}
            className="w-full resize-none border-b border-[var(--hairline)] bg-transparent py-2.5 text-[14px] leading-relaxed text-ink outline-none placeholder:text-ink-faint"
          />
        </Field>

        <Field label="过敏史 · 可选">
          <textarea
            value={draft.allergies ?? ""}
            onChange={(e) => set("allergies", e.target.value)}
            placeholder="比如:对鸡肉过敏 / 对某种药物过敏"
            rows={2}
            className="w-full resize-none border-b border-[var(--hairline)] bg-transparent py-2.5 text-[14px] leading-relaxed text-ink outline-none placeholder:text-ink-faint"
          />
        </Field>

        <Field label="其它备注 · 可选">
          <textarea
            value={draft.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="比如:挑食 / 怕生 / 最近换了猫粮…"
            rows={2}
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
