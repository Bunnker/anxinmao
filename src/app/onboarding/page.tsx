"use client";

import {
  Suspense,
  useEffect,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { addCat, deleteCat, loadStore, saveStore } from "@/lib/storage";
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

// 保存档案时自动记一笔体重 —— 体重值有变化就追加(同一天改多次也各记一笔,
// 当天就能看到曲线;之前的「同日覆盖」会让用户第一天永远凑不齐 2 条)。
// 与上一条相同则不重复记;最多留 60 条。
function withWeightLog(c: Cat): Cat {
  const today = new Date().toISOString().slice(0, 10);
  const prev = c.weightLog ?? [];
  const last = prev[prev.length - 1];
  if (last?.kg === c.weight) return { ...c, weightLog: prev };
  return {
    ...c,
    weightLog: [...prev, { date: today, kg: c.weight }].slice(-60),
  };
}

// 编辑表单的分组卡 —— scroll-mt 给深链滚动留出顶部空间。
function EditCard({
  id,
  title,
  hint,
  children,
}: {
  id: string;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-20 rounded-[28px] bg-surface px-5 py-5 shadow-[var(--shadow-card)]"
    >
      <p className="text-[12px] font-semibold tracking-[0.14em] text-accent">
        {title}
      </p>
      {hint && (
        <p className="mt-1 text-[11.5px] leading-relaxed text-ink-faint">
          {hint}
        </p>
      )}
      <div className="mt-4 flex flex-col gap-6">{children}</div>
    </section>
  );
}

/* ---------- 页面 ---------- */

// 编辑/添加表单 —— 档案展示已搬到 /pets;本页只做录入(首次建档 / 编辑 / 添加)。
function OnboardingForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [draft, setDraft] = useState<Cat | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  // 模式:edit = 编辑已有猫(?pet 或活动猫);add = 新增一只(?add=1);else = 首次建档。
  const [isEdit, setIsEdit] = useState(false);
  const [isAdd, setIsAdd] = useState(false);
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
    const add = sp.get("add") === "1";
    const petId = sp.get("pet");
    queueMicrotask(() => {
      if (cancelled) return;
      const s = loadStore();
      if (add) {
        // 添加新猫(进入空白表单,保存=addCat 追加)。
        setStore(s);
        setDraft(newCat());
        setIsAdd(true);
        setIsEdit(false);
        return;
      }
      if (s && s.cats.length > 0) {
        // 编辑指定猫(?pet)或活动猫。
        const target =
          (petId && s.cats.find((c) => c.id === petId)) ||
          s.cats.find((c) => c.id === s.activeCatId) ||
          s.cats[0];
        setStore(s);
        setDraft({ ...target });
        setIsEdit(true);
        setIsAdd(false);
        return;
      }
      // 首次建档(尚无任何猫)。
      setDraft(newCat());
      setIsEdit(false);
      setIsAdd(false);
    });
    return () => {
      cancelled = true;
    };
  }, [sp]);

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

  // 健康提醒偏好 —— 默认 vaccine/deworm 开、weight 关。仅存偏好,本批不真推送。
  const reminders = draft.reminders ?? {
    vaccine: true,
    deworm: true,
    weight: false,
  };
  function setReminder(key: "vaccine" | "deworm" | "weight", val: boolean) {
    setDraft((d) => (d ? { ...d, reminders: { ...reminders, [key]: val } } : d));
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
    if (isAdd) {
      addCat(saved); // 追加 + 设为活动猫
      router.push("/pets");
      return;
    }
    if (isEdit && store) {
      saveStore({
        ...store,
        cats: store.cats.map((c) => (c.id === saved.id ? saved : c)),
      });
      router.push("/pets");
      return;
    }
    // 首次建档 —— 新建并设为活动猫,回首页看它在院子里。
    saveStore({ cats: [saved], activeCatId: saved.id, records: [] });
    router.push("/");
  }

  // 删除这只猫(连带它的 records);删后回 /pets(删空则 /pets 自然回新建流程)。
  function removeCat() {
    if (!draft || !isEdit) return;
    if (!window.confirm(`确定移除「${draft.name || "这只猫"}」?它的记录也会一起删除。`))
      return;
    deleteCat(draft.id);
    router.push("/pets");
  }

  // 离开表单(取消)—— 首次建档回首页;编辑/添加回 /pets。
  function leaveOnboarding() {
    router.push(isEdit || isAdd ? "/pets" : "/");
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
      {/* 顶栏:取消(返回)+ 标题。编辑/添加回 /pets,首次建档回首页(leaveOnboarding 已分流) */}
      <header className="flex items-center py-2">
        <button
          type="button"
          onClick={leaveOnboarding}
          aria-label={isEdit || isAdd ? "取消" : "返回"}
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
          {isAdd ? "添加毛孩子" : isEdit ? `${draft.name || "我的"}的档案` : "新建档案"}
        </span>
        <span className="size-9" />
      </header>

      {/* 引导 */}
      <section className="pb-7 pt-6">
        <p className="mb-3 text-[13px] leading-relaxed text-ink-soft">
          {isAdd
            ? "——给家里添一只新成员。"
            : isEdit
              ? "——改完点最下面保存。"
              : "——你好,先认识一下你家的小家伙。"}
        </p>
        <h1 className="font-serif text-[2rem] font-medium leading-tight tracking-tight text-ink">
          {isAdd
            ? "添加毛孩子"
            : isEdit
              ? `${draft.name || "这只猫"}的档案`
              : "新加一只猫"}
        </h1>
        <p className="mt-2.5 text-[13px] leading-relaxed text-ink-soft">
          这些帮我判断它的情况。
          {isEdit ? "" : "只有名字是必填,其它随时能补。"}
        </p>
      </section>

      {/* 编辑表单 —— 三组卡片;查看页各卡「编辑」直达对应组(scroll 锚) */}
      <div className="flex flex-col gap-4">
        <EditCard id="edit-basic" title="基本信息">
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
        </EditCard>

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
        <div id="edit-photos" className="scroll-mt-20">
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

        <EditCard
          id="edit-health"
          title="健康记录"
          hint="之后随时能补 —— 记了之后,档案页会有体重曲线和驱虫提醒"
        >
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
        </EditCard>

        <EditCard
          id="edit-background"
          title="健康背景"
          hint="慢性病 / 过敏填了之后,分诊和问答会替它考虑"
        >
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
        </EditCard>

        {/* 健康提醒 —— 开关存偏好(Cat.reminders),本批不真推送 */}
        <EditCard id="edit-reminders" title="健康提醒">
          {(
            [
              ["vaccine", "疫苗加强提醒", "到期前提醒一次"],
              ["deworm", "每月驱虫提醒", "每月提醒一次"],
              ["weight", "体重记录提醒", "每两周称一次"],
            ] as const
          ).map(([key, title, sub], i) => {
            const on = reminders[key];
            return (
              <div
                key={key}
                className={
                  "flex items-center gap-3 py-3 " +
                  (i < 2 ? "border-b border-[var(--line-soft)]" : "")
                }
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] text-ink">{title}</span>
                  <span className="mt-0.5 block text-[11.5px] text-ink-faint">
                    {sub}
                  </span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={title}
                  onClick={() => setReminder(key, !on)}
                  className={
                    "relative h-7 w-[46px] flex-none rounded-full transition-colors " +
                    (on ? "bg-accent" : "bg-[var(--surface-2)]")
                  }
                >
                  <span
                    className={
                      "absolute top-[3px] size-[22px] rounded-full bg-white shadow transition-all " +
                      (on ? "left-[21px]" : "left-[3px]")
                    }
                  />
                </button>
              </div>
            );
          })}
          <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">
            本地提醒偏好,暂不发推送通知。
          </p>
        </EditCard>
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
          {isAdd ? "添加" : isEdit ? "保存修改" : "建档,开始 →"}
        </button>
        {!ready && (
          <p className="mt-3 text-center text-[12px] text-ink-faint">
            给它起个名字就能开始。
          </p>
        )}
      </div>

      {/* 危险区:移除这只猫(仅编辑已有猫时;暗红非风险红,二次确认) */}
      {isEdit && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={removeCat}
            className="px-2 py-2 text-[13.5px] tracking-wide"
            style={{ color: "#b54b3f" }}
          >
            移除这只毛孩子
          </button>
        </div>
      )}

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

// useSearchParams 需 Suspense 边界(Next 16)。
export default function OnboardingPage() {
  return (
    <Suspense fallback={<main className="min-h-dvh" aria-hidden="true" />}>
      <OnboardingForm />
    </Suspense>
  );
}
