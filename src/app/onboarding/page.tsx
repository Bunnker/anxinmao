"use client";

import { useEffect, useState, type ChangeEvent, type ReactNode } from "react";
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
    neutered: "否",
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
                ? "bg-white text-ink shadow-[var(--shadow-control)]"
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
const MAX_PROFILE_PHOTOS = 6;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("图片读取失败。"));
    reader.onerror = () => reject(new Error("图片读取失败。"));
    reader.readAsDataURL(file);
  });
}

function ageLabel(months: number): string {
  if (months < 12) return `${months} 个月`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m ? `${y} 岁 ${m} 个月` : `${y} 岁`;
}

function displayValue(value: string | number | undefined, fallback = "未记录") {
  if (value === undefined || value === "") return fallback;
  return String(value);
}

// 保存档案时自动记一笔体重(同日覆盖;与上一条相同则不重复记;最多留 60 条)。
function withWeightLog(c: Cat): Cat {
  const today = new Date().toISOString().slice(0, 10);
  const prev = c.weightLog ?? [];
  const rest = prev.filter((e) => e.date !== today);
  const hadToday = rest.length !== prev.length;
  const last = rest[rest.length - 1];
  if (last?.kg === c.weight && !hadToday) return { ...c, weightLog: prev };
  return {
    ...c,
    weightLog: [...rest, { date: today, kg: c.weight }].slice(-60),
  };
}

// 体重迷你折线 —— 无依赖手画 SVG,取最近 12 条。≥2 条才有曲线可言。
function WeightSparkline({ log }: { log: { date: string; kg: number }[] }) {
  const pts = log.slice(-12);
  if (pts.length < 2) return null;
  const w = 280;
  const h = 56;
  const pad = 8;
  const kgs = pts.map((p) => p.kg);
  const min = Math.min(...kgs);
  const max = Math.max(...kgs);
  const span = max - min || 1;
  const x = (i: number) => pad + (i * (w - 2 * pad)) / (pts.length - 1);
  const y = (kg: number) => h - pad - ((kg - min) * (h - 2 * pad)) / span;
  const d = pts
    .map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.kg).toFixed(1)}`)
    .join(" ");
  const lastPt = pts[pts.length - 1];
  const delta = Number((lastPt.kg - pts[0].kg).toFixed(1));
  return (
    <div className="relative mt-3 rounded-[22px] bg-[var(--surface-2)] px-4 py-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] text-ink-faint">
          体重记录 · {pts.length} 次
        </span>
        <span className="text-[12px] tabular-nums text-ink-soft">
          {pts[0].kg} → {lastPt.kg} kg
          {delta !== 0 && ` (${delta > 0 ? "+" : ""}${delta})`}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="mt-1 h-14 w-full"
        aria-hidden="true"
      >
        <path
          d={d}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={x(pts.length - 1)}
          cy={y(lastPt.kg)}
          r="3.4"
          fill="var(--accent)"
        />
      </svg>
    </div>
  );
}

/* ---------- 页面 ---------- */

export default function OnboardingPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<Cat | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [isEdit, setIsEdit] = useState(false);
  const [editing, setEditing] = useState(true);
  // 头像生成 —— 仅 UI 状态,生成结果落到 draft.avatar
  const [avatarDesc, setAvatarDesc] = useState("");
  const [avatarPhoto, setAvatarPhoto] = useState<string | null>(null); // dataURL
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  // 视觉守门:照片被判非猫 → 显示「用默认头像 / 换一张」 inline 选项
  const [avatarNotCat, setAvatarNotCat] = useState(false);
  // 头像设置弹窗 —— 上传真实头像 / AI 生成卡通,二合一
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const s = loadStore();
      if (s && s.cats.length > 0) {
        const active = s.cats.find((c) => c.id === s.activeCatId) ?? s.cats[0];
        setStore(s);
        setDraft({ ...active });
        setIsEdit(true);
        setEditing(false);
      } else {
        setDraft(newCat());
        setIsEdit(false);
        setEditing(true);
      }
    });
    return () => {
      cancelled = true;
    };
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
  function onPhotoPick(e: ChangeEvent<HTMLInputElement>) {
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

  async function onAvatarUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("照片不能超过 5MB。压缩一下再试。");
      return;
    }
    try {
      set("avatar", await fileToDataUrl(file));
      setAvatarError(null);
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "图片读取失败。");
    }
  }

  async function onAlbumUpload(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0 || !draft) return;
    const usable = files
      .filter((file) => file.size <= 5 * 1024 * 1024)
      .slice(0, MAX_PROFILE_PHOTOS);
    try {
      const dataUrls = await Promise.all(usable.map(fileToDataUrl));
      set("photos", [...(draft.photos ?? []), ...dataUrls].slice(0, MAX_PROFILE_PHOTOS));
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "图片读取失败。");
    }
  }

  function removeAlbumPhoto(index: number) {
    if (!draft) return;
    set("photos", (draft.photos ?? []).filter((_, i) => i !== index));
  }

  function commit() {
    if (!ready || !draft) return;
    const saved = withWeightLog(draft); // 顺手记一笔体重(同日覆盖,不重复)
    const next: Store =
      isEdit && store
        ? {
            ...store,
            cats: store.cats.map((c) => (c.id === saved.id ? saved : c)),
          }
        : { cats: [saved], activeCatId: saved.id, records: [] };
    saveStore(next);
    router.push("/");
  }

  // 离开建档页(返回)。直接回首页 —— 无档案时首页显示欢迎页(有选择,非死胡同),
  // 不再 seed 豆豆。
  function leaveOnboarding() {
    router.push("/");
  }

  if (isEdit && !editing) {
    const meta = [
      ageLabel(draft.ageMonths),
      draft.sex,
      draft.coat,
      `${draft.weight} kg`,
    ]
      .filter(Boolean)
      .join(" · ");
    const photos = draft.photos ?? [];

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
        <header className="flex items-center py-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-medium tracking-[0.06em]"
            style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <ellipse cx="12" cy="16" rx="4.2" ry="3.4" />
              <circle cx="6.4" cy="11" r="1.9" />
              <circle cx="10" cy="7.8" r="1.9" />
              <circle cx="14" cy="7.8" r="1.9" />
              <circle cx="17.6" cy="11" r="1.9" />
            </svg>
            {draft.name ? `${draft.name}的档案` : "我的档案"}
          </span>
        </header>

        <section className="pt-7">
          <div className="relative overflow-hidden rounded-[34px] bg-surface p-5 shadow-[var(--shadow-card)]">
            <div className="absolute -right-10 -top-12 size-36 rounded-full bg-[var(--accent-soft)]" />
            <div className="relative flex items-start gap-4">
              <CatAvatar
                avatar={draft.avatar}
                name={draft.name}
                size={92}
                className="shadow-[var(--shadow-control)]"
              />
              <div className="min-w-0 flex-1 pt-1">
                <p className="text-[12px] font-semibold tracking-[0.16em] text-accent">
                  猫咪档案
                </p>
                <h1 className="mt-2 text-[2.25rem] font-semibold leading-none tracking-tight text-ink">
                  {draft.name}
                </h1>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{meta}</p>
              </div>
            </div>

            <div className="relative mt-5 grid grid-cols-2 gap-2.5">
              {[
                ["绝育", draft.neutered],
                ["到家", displayValue(draft.homeDate)],
                ["驱虫", displayValue(draft.deworm)],
                ["疫苗", draft.vaccines.length ? `${draft.vaccines.length} 针` : "未记录"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[22px] bg-[var(--surface-2)] px-4 py-3">
                  <span className="block text-[11px] text-ink-faint">{label}</span>
                  <span className="mt-1 block text-[14px] font-semibold text-ink">
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {(draft.weightLog?.length ?? 0) >= 2 && (
              <WeightSparkline log={draft.weightLog!} />
            )}

            {draft.notes && (
              <div className="relative mt-3 rounded-[22px] bg-[var(--accent-soft)] px-4 py-3">
                <span className="block text-[11px] text-ink-faint">备注</span>
                <p className="mt-1 text-[13px] leading-relaxed text-ink">{draft.notes}</p>
              </div>
            )}
          </div>
        </section>

        <section className="mt-5 rounded-[28px] bg-surface p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-medium text-ink">生活照</p>
              <p className="mt-1 text-[12px] text-ink-faint">
                {photos.length ? `${photos.length}/${MAX_PROFILE_PHOTOS} 张` : "还没有上传"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-full bg-[var(--surface-2)] px-3 py-1.5 text-[12.5px] font-medium text-accent shadow-[var(--shadow-control)]"
            >
              管理
            </button>
          </div>
          {photos.length > 0 && (
            <div className="mt-4 grid grid-cols-4 gap-2.5">
              {photos.slice(0, 4).map((photo, index) => (
                <div
                  key={`${photo.slice(0, 32)}-${index}`}
                  className="aspect-square overflow-hidden rounded-[22px] bg-[var(--surface-2)] shadow-[var(--shadow-control)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo}
                    alt={`${draft.name}的生活照 ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-6 w-full rounded-[28px] bg-accent py-4 text-[16px] font-medium tracking-wide text-accent-fg shadow-[var(--shadow-accent)] transition-transform duration-500 active:scale-[0.985]"
        >
          修改档案
        </button>

        <Disclaimer />
      </main>
    );
  }

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
      {/* 顶栏：isEdit 时是 Tab 入口不需要返回按钮；首次建档 Tab Bar 隐藏需要保留 */}
      <header className="flex items-center py-2">
        {!isEdit ? (
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
        ) : (
          <span className="size-9" />
        )}
        <span className="flex-1 text-center text-[12px] font-medium uppercase tracking-[0.18em] text-ink-soft">
          {isEdit ? `${draft.name || "我的"}的档案` : "新建档案"}
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
            options={["是", "否"]}
            onChange={(v) => set("neutered", v as Cat["neutered"])}
          />
        </Field>

        {/* 头像 —— 上传真实照片 或 AI 生成卡通,二合一,点开走弹窗 */}
        <Field label="头像 · 可选">
          <div className="flex items-center gap-4 rounded-[28px] bg-surface p-4 shadow-[var(--shadow-card)]">
            <CatAvatar
              avatar={draft.avatar}
              name={draft.name}
              size={76}
              className="shadow-[var(--shadow-control)]"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-ink">
                {draft.name || "这只猫"}的头像
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-faint">
                上传自家猫的照片,或让 AI 生成一只卡通形象。
              </p>
              <button
                type="button"
                onClick={() => {
                  setAvatarError(null);
                  setAvatarNotCat(false);
                  setAvatarModalOpen(true);
                }}
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-[var(--surface-2)] px-3.5 py-1.5 text-[12.5px] font-medium text-ink shadow-[var(--shadow-control)]"
              >
                {draft.avatar ? "更换头像" : "设置头像"}
              </button>
            </div>
          </div>
        </Field>

        {/* 生活照相册 —— 独立于头像;仅「我的」橱窗展示,不参与分诊 */}
        <Field
          label="生活照相册 · 可选"
          hint={`${draft.photos?.length ?? 0}/${MAX_PROFILE_PHOTOS} 张`}
        >
          <div className="grid grid-cols-4 gap-2.5">
            {(draft.photos ?? []).map((photo, index) => (
              <button
                key={`${photo.slice(0, 32)}-${index}`}
                type="button"
                onClick={() => removeAlbumPhoto(index)}
                aria-label="移除这张相册照片"
                className="relative aspect-square overflow-hidden rounded-[22px] bg-[var(--surface-2)] shadow-[var(--shadow-control)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo}
                  alt={`${draft.name || "猫咪"}的生活照 ${index + 1}`}
                  className="h-full w-full object-cover"
                />
                <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-black/55 text-[11px] text-white">
                  ×
                </span>
              </button>
            ))}
            {(draft.photos?.length ?? 0) < MAX_PROFILE_PHOTOS && (
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-[22px] border border-dashed border-[var(--line)] bg-white/60 text-ink-soft shadow-[var(--shadow-control)]">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={onAlbumUpload}
                  className="hidden"
                />
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
                </svg>
                <span className="text-[11px]">添加</span>
              </label>
            )}
          </div>
          <p className="text-[11.5px] leading-relaxed text-ink-faint">
            生活照只在「我的」橱窗展示,不参与分诊判断。
          </p>
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
                className="flex items-center gap-2 rounded-[22px] border border-[var(--line)] bg-surface px-3 py-2 shadow-[var(--shadow-control)]"
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
                className="flex flex-1 items-center gap-2 rounded-[22px] border border-dashed border-[var(--line)] bg-white/50 px-3 py-2.5 text-[13px] text-ink-soft shadow-[var(--shadow-control)]"
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
                  className="rounded-[22px] bg-surface px-3 py-2.5 text-[12px] text-ink-soft shadow-[var(--shadow-control)]"
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
            "w-full rounded-[28px] py-4 text-[16px] font-medium tracking-wide transition-colors duration-500 " +
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

      {/* 头像设置弹窗 —— 上传真实照片 / AI 生成卡通,二合一 */}
      {avatarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <button
            type="button"
            aria-label="关闭"
            onClick={() => setAvatarModalOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div
            className="relative w-full max-w-[430px] overflow-y-auto rounded-t-[28px] bg-paper px-6 pt-4 shadow-[var(--shadow-card)]"
            style={{
              maxHeight: "88dvh",
              paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))",
            }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--line)]" />
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-semibold text-ink">设置头像</h2>
              <button
                type="button"
                onClick={() => setAvatarModalOpen(false)}
                className="text-[13px] font-medium text-accent"
              >
                完成
              </button>
            </div>

            {/* 1) 上传真实照片当头像 */}
            <div className="mt-4 flex items-center gap-4 rounded-[24px] bg-surface p-4 shadow-[var(--shadow-control)]">
              <CatAvatar
                avatar={draft.avatar}
                name={draft.name}
                size={68}
                className="shadow-[var(--shadow-control)]"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium text-ink">用真实照片当头像</p>
                <p className="mt-0.5 text-[12px] text-ink-faint">直接用你拍的猫照片</p>
                <label className="mt-2.5 inline-flex cursor-pointer items-center gap-2 rounded-full bg-accent px-3.5 py-1.5 text-[12.5px] font-medium text-accent-fg">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onAvatarUpload}
                    className="hidden"
                  />
                  上传照片
                </label>
              </div>
              {draft.avatar && (
                <button
                  type="button"
                  onClick={() => {
                    set("avatar", undefined);
                    setAvatarError(null);
                  }}
                  className="self-start text-[12px] text-ink-faint underline underline-offset-2"
                >
                  清除
                </button>
              )}
            </div>

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-[var(--line)]" />
              <span className="shrink-0 text-[11px] tracking-[0.06em] text-ink-faint">
                或 让 AI 生成卡通形象
              </span>
              <span className="h-px flex-1 bg-[var(--line)]" />
            </div>

            {/* 2) AI 生成:照片 / 描述 → 生成 */}
            <div className="flex flex-col gap-3.5">
              <div className="flex items-start gap-3">
                {avatarPhoto ? (
                  <button
                    type="button"
                    onClick={() => setAvatarPhoto(null)}
                    aria-label="换一张照片"
                    className="relative size-20 shrink-0 overflow-hidden rounded-[24px] border border-[var(--line)] shadow-[var(--shadow-control)]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={avatarPhoto} alt="选中的照片" className="h-full w-full object-cover" />
                    <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-black/60 text-[10px] text-white">
                      ×
                    </span>
                  </button>
                ) : (
                  <label className="flex size-20 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-[24px] border border-dashed border-[var(--line)] bg-white/55 text-ink-soft shadow-[var(--shadow-control)] transition-colors hover:bg-white">
                    <input type="file" accept="image/*" onChange={onPhotoPick} className="hidden" />
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
                      ? "(可选)比如:圆脸一点,露出小爪子,画得软萌"
                      : "没照片就描述一下:橘虎斑,白肚皮,圆脸…"
                  }
                  rows={3}
                  maxLength={200}
                  className="min-w-0 flex-1 resize-none border-b border-[var(--hairline)] bg-transparent py-2.5 text-[14px] leading-relaxed text-ink outline-none placeholder:text-ink-faint"
                />
              </div>

              <button
                type="button"
                onClick={generateAvatar}
                disabled={(!avatarDesc.trim() && !avatarPhoto) || avatarLoading}
                className={
                  "rounded-[22px] py-3 text-[14px] font-medium tracking-wide transition-colors " +
                  ((avatarDesc.trim() || avatarPhoto) && !avatarLoading
                    ? "bg-accent text-accent-fg"
                    : "bg-[var(--surface-2)] text-ink-faint")
                }
              >
                {avatarLoading
                  ? "生成中…(约 10-30 秒)"
                  : avatarPhoto
                    ? "从照片生成卡通形象 →"
                    : "从描述生成卡通形象 →"}
              </button>

              {avatarError && (
                <div className="rounded-[22px] border border-[var(--red)]/20 bg-[var(--red-bg)] p-3">
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
                AI 出图仅作头像 / 角色装饰,不做症状示意。传猫照效果最好(会先检测是不是猫,不是猫不出图);纯文字描述也行。
              </p>
            </div>
          </div>
        </div>
      )}

      <Disclaimer />
    </main>
  );
}
