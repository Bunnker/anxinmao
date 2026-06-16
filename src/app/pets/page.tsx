"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  loadStore,
  saveStore,
  saveStoreLocal,
  seedTemplateStore,
  setActiveCat as storeSetActiveCat,
} from "@/lib/storage";
import { pullHistory } from "@/lib/history-sync";
import { Disclaimer } from "@/components/Disclaimer";
import { Welcome } from "@/components/Welcome";
import { CatFace } from "@/components/CatFace";
import { ageLabel, companionDays, careStatus } from "@/lib/profile";
import type { Cat, CatRecord, Store } from "@/types/cat";

// 性别 chip 装饰色 —— 内联常量,绝不进 :root 风险 token(不碰红黄绿)。
const SEX_VIS: Record<Cat["sex"], { label: string; color: string; bg: string }> =
  {
    雌: { label: "♀ 母", color: "#c77fa0", bg: "#fbeaf1" },
    雄: { label: "♂ 公", color: "#5a90c2", bg: "#e6f0f8" },
    不确定: { label: "性别未定", color: "#8a6f54", bg: "rgba(255,255,255,0.65)" },
  };

// 头像:优先 AI 生成图 cat.avatar,无则 CatFace 通用猫脸(许可范围:身份/陪伴)。
function Avatar({ cat, size }: { cat: Cat; size: number }) {
  if (cat.avatar) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={cat.avatar}
        alt=""
        draggable={false}
        className="h-full w-full object-cover"
      />
    );
  }
  return (
    <span className="flex h-full w-full items-center justify-center">
      <CatFace mood="relieved" size={size} />
    </span>
  );
}

export default function PetsPage() {
  const [store, setStore] = useState<Store | null>(null);
  const [cat, setCat] = useState<Cat | null>(null);
  const [records, setRecords] = useState<CatRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const applyStore = (s: Store) => {
      const active = s.cats.find((c) => c.id === s.activeCatId) ?? s.cats[0];
      setStore(s);
      setCat(active);
      setRecords(s.records.filter((r) => r.catId === active.id));
    };
    queueMicrotask(() => {
      if (cancelled) return;
      const local = loadStore();
      if (local && local.cats.length > 0) {
        applyStore(local);
        setLoaded(true);
        return;
      }
      // 本地空(可能微信清存储)→ 按匿名 deviceId 拉云端历史回填。
      pullHistory().then((cloud) => {
        if (cancelled) return;
        if (cloud && cloud.cats.length > 0) {
          saveStoreLocal(cloud);
          applyStore(cloud);
        }
        setLoaded(true);
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 切换活动猫 —— 写库 + 就地重渲染。
  function switchCat(id: string) {
    const next = storeSetActiveCat(id);
    if (next) {
      const active = next.cats.find((c) => c.id === id) ?? next.cats[0];
      setStore(next);
      setCat(active);
      setRecords(next.records.filter((r) => r.catId === active.id));
    }
  }

  // 写某只猫的字段(相册/头像编辑用)——写 store.cats + 落库 + 就地刷新。
  function persistCat(nextCat: Cat) {
    if (!store) return;
    const nextStore: Store = {
      ...store,
      cats: store.cats.map((c) => (c.id === nextCat.id ? nextCat : c)),
    };
    saveStore(nextStore);
    setStore(nextStore);
    setCat(nextCat);
  }

  function useTemplate() {
    const s = seedTemplateStore();
    setStore(s);
    setCat(s.cats[0]);
    setRecords([]);
  }

  if (!loaded) return <main className="min-h-dvh" aria-hidden="true" />;
  if (!cat) return <Welcome onUseTemplate={useTemplate} />;

  const cats = store?.cats ?? [cat];
  const sex = SEX_VIS[cat.sex];
  const care = careStatus(cat);
  const breedLine = [cat.breed, cat.coat, ageLabel(cat.ageMonths)]
    .filter(Boolean)
    .join(" · ");
  const tags = [
    `${cat.weight} kg`,
    care.deworm.status === "done" ? "已驱虫" : "待驱虫",
    cat.neutered === "是" ? "已绝育" : "未绝育",
    `到家 ${companionDays(cat.homeDate)} 天`,
  ];
  const editHref = `/onboarding?pet=${cat.id}`;

  return (
    <main className="mx-auto min-h-dvh max-w-[460px] bg-paper pb-24">
      {/* Hero 暖橘渐变头部(装饰色内联,不进 token) */}
      <section
        className="px-5 pt-3 pb-6"
        style={{
          paddingTop: "calc(0.75rem + env(safe-area-inset-top, 0px))",
          background: "linear-gradient(180deg,#f6e7d6,#f3ddc6)",
        }}
      >
        <div className="flex h-9 items-center">
          <span className="font-serif text-[16px] font-semibold tracking-wide text-ink">
            毛孩子
          </span>
        </div>

        {/* 多猫切换条 */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {cats.map((c) => {
            const on = c.id === cat.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => switchCat(c.id)}
                className={
                  "flex flex-none items-center gap-2 rounded-full border-[1.5px] py-[5px] pr-[13px] pl-[5px] transition " +
                  (on
                    ? "border-accent bg-white shadow-[0_4px_12px_rgba(176,90,80,0.16)]"
                    : "border-transparent bg-white/45")
                }
              >
                <span className="grid size-[30px] place-items-center overflow-hidden rounded-full shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.7)]">
                  <Avatar cat={c} size={26} />
                </span>
                <span
                  className={
                    "text-[13px] font-semibold tracking-wide whitespace-nowrap " +
                    (on ? "text-accent" : "text-ink-soft")
                  }
                >
                  {c.name || "未命名"}
                </span>
              </button>
            );
          })}
          <Link
            href="/onboarding?add=1"
            aria-label="添加一只毛孩子"
            className="grid size-[38px] flex-none place-items-center rounded-full border-[1.5px] border-dashed border-[#cdbfae] bg-white/35 text-[#9a7e62] transition active:scale-90"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </Link>
        </div>

        {/* 头像 + 资料 */}
        <div className="mt-2 flex items-start gap-4">
          <div className="flex flex-none flex-col items-center gap-2.5">
            <div
              className="relative size-[88px] overflow-hidden rounded-[28px] shadow-[0_10px_24px_-8px_rgba(190,130,70,0.55),inset_0_0_0_3px_#fff]"
              style={{
                background:
                  "radial-gradient(circle at 50% 38%,#f3c590,#e2954f 76%)",
              }}
            >
              <Avatar cat={cat} size={74} />
              <Link
                href={editHref}
                aria-label="换照片 / 编辑头像"
                className="absolute right-[5px] bottom-[5px] z-[3] grid size-6 place-items-center rounded-full bg-white text-accent shadow-[0_2px_6px_rgba(120,80,40,0.3)]"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 8.5h3l1.5-2h7L17 8.5h3v10H4z" />
                  <circle cx="12" cy="13" r="3.2" />
                </svg>
              </Link>
            </div>
            <Link
              href={editHref}
              className="flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-[12px] font-semibold tracking-wide text-accent shadow-[var(--shadow-control)] transition active:scale-95"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M14 4l6 6M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z" />
              </svg>
              编辑档案
            </Link>
          </div>

          <div className="min-w-0 pt-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-serif text-[25px] font-bold tracking-wide text-ink">
                {cat.name || "未命名"}
              </span>
              <span
                className="flex-none rounded-lg px-2 py-[3px] text-[12px] font-semibold whitespace-nowrap"
                style={{ color: sex.color, background: sex.bg }}
              >
                {sex.label}
              </span>
            </div>
            <p className="mt-1.5 text-[13px] tracking-wide text-ink-soft">
              {breedLine || "资料待完善"}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-white/60 px-2.5 py-[5px] text-[11px] tracking-wide text-[#8a6f54] whitespace-nowrap"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 四宫格 */}
        <div className="mt-[18px] flex gap-px overflow-hidden rounded-2xl bg-white/50 shadow-[var(--shadow-control)]">
          {(
            [
              [ageLabel(cat.ageMonths).split(" ")[0], ageLabel(cat.ageMonths).split(" ").slice(1).join(""), "年龄"],
              [String(cat.weight), "kg", "体重"],
              [String(records.length), "", "健康记录"],
              [String(companionDays(cat.homeDate)), "天", "陪伴"],
            ] as const
          ).map(([v, unit, k]) => (
            <div key={k} className="flex-1 bg-white/55 px-1 py-3 text-center">
              <div className="font-serif text-[18px] font-semibold tracking-wide text-ink">
                {v}
                {unit && (
                  <small className="ml-px text-[11px] font-normal text-ink-soft">
                    {unit}
                  </small>
                )}
              </div>
              <div className="mt-[3px] text-[11px] tracking-wide text-ink-faint">
                {k}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* body 各区(生活相册 / 健康档案 / 体重 / 健康背景 / 健康记录)在后续任务插入 */}
      <div className="px-5">
        <Disclaimer />
      </div>
    </main>
  );
}
