"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { usePathname, useRouter } from "next/navigation";

type GuideStep = {
  targetId: string;
  route: string;
  badge: string;
  title: string;
  body: string;
  hint: string;
  catSrc: string;
  pad?: number;
  radius?: number;
};

type SpotlightRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export const GUIDE_STEPS: GuideStep[] = [
  {
    targetId: "guide-home-stage",
    route: "/",
    badge: "1 / 小猫的家",
    title: "这里不是装饰,它真的能玩",
    body: "摸摸小猫、点家具,它会走过去睡觉、喝水、钻箱子。它也会偶尔冒泡提醒你一件事。",
    hint: "先看它在家里待着,别急着找菜单。",
    catSrc: "/guide/cat-happy-t.png",
    pad: 8,
    radius: 30,
  },
  {
    targetId: "guide-tools",
    route: "/",
    badge: "2 / 小道具",
    title: "长按拖过去,像小游戏一样用",
    body: "梳子拖到猫身上可以梳毛,水瓶拖到水碗可以加水,逗猫棒拖到猫身上会逗它扑一下。",
    hint: "长按 0.4 秒拿起,松手就放下。",
    catSrc: "/guide/cat-curious-t.png",
    pad: 10,
    radius: 24,
  },
  {
    targetId: "guide-triage",
    route: "/",
    badge: "3 / 分诊入口",
    title: "猫不对劲时,先从这里进",
    body: "选最像的症状,再回答几个关键问题。结果会给红、黄、绿建议,告诉你该马上去医院、尽快看,还是先观察。",
    hint: "它是分诊和安抚,不是替代兽医诊断。",
    catSrc: "/guide/cat-worry-t.png",
    pad: 8,
    radius: 24,
  },
  {
    targetId: "guide-symptom-picker",
    route: "/symptoms",
    badge: "4 / 分诊 · 选症状",
    title: "先点最像的,不需要一开始就说完整",
    body: "这里按常见情况和可能要急的情况排好。先选最接近的一项,后面会继续追问细节。",
    hint: "如果拿不准,选“其它情况”也可以继续走。",
    catSrc: "/guide/cat-worry-t.png",
    pad: 8,
    radius: 24,
  },
  {
    targetId: "guide-triage-questions",
    route: "/triage?symptom=vomit",
    badge: "5 / 分诊 · 答关键问题",
    title: "每题都在帮你判断急不急",
    body: "题目会抓住兽医最在意的线索。只要选到危险信号,不用答完全部题,会直接让你看处理建议。",
    hint: "红旗项宁可保守一点;不确定就按真实观察选。",
    catSrc: "/guide/cat-worry-t.png",
    pad: 8,
    radius: 24,
  },
  {
    targetId: "guide-behavior",
    route: "/",
    badge: "6 / 问答",
    title: "拿不准的小事,直接问",
    body: "喂养、习性、护理、病情边界都可以问。健康相关回答会尽量把风险讲清楚,不会只丢一句“去医院”。",
    hint: "越具体越好:吃了什么、多久了、精神怎么样。",
    catSrc: "/guide/cat-calm-t.png",
    pad: 8,
    radius: 22,
  },
  {
    targetId: "guide-knowledge",
    route: "/",
    badge: "7 / 小知识",
    title: "有些情况看着吓人,其实能先稳住",
    body: "这里放的是常见安心知识,适合你不知道要不要慌的时候先翻一眼。",
    hint: "真正急的信号,还是优先走分诊或就医。",
    catSrc: "/guide/cat-curious-t.png",
    pad: 10,
    radius: 999,
  },
  {
    targetId: "guide-profile",
    route: "/",
    badge: "8 / 毛孩子",
    title: "档案越完整,判断越贴近你家猫",
    body: "底部“毛孩子”是它的长期档案入口。年龄、体重、疫苗、驱虫和历史记录都会影响后面的判断。",
    hint: "先开始用,以后再补资料也可以。",
    catSrc: "/guide/cat-calm-t.png",
    pad: 8,
    radius: 22,
  },
  {
    targetId: "guide-profile-summary",
    route: "/pets",
    badge: "9 / 档案总览",
    title: "这里先看年龄、体重和最近记录",
    body: "年龄和体重会影响很多判断:幼猫、老年猫、体重变化太快,处理方式都不一样。",
    hint: "看到资料不准,就点编辑档案去修。",
    catSrc: "/guide/cat-calm-t.png",
    pad: 8,
    radius: 22,
  },
  {
    targetId: "guide-profile-health",
    route: "/pets",
    badge: "10 / 健康档案",
    title: "驱虫、疫苗要单独记住",
    body: "疫苗和驱虫不是装饰字段。它们会影响感染风险、寄生虫判断,也会提醒你哪些护理该补。",
    hint: "点“管理”可以直接去编辑这块。",
    catSrc: "/guide/cat-curious-t.png",
    pad: 8,
    radius: 22,
  },
  {
    targetId: "guide-profile-edit-basic",
    route: "/onboarding#edit-basic",
    badge: "11 / 编辑 · 年龄体重",
    title: "生日和体重是最该填准的两项",
    body: "生日会自动算月龄;体重每次保存会记入曲线。小猫长得太快、体重掉得太快,都值得早点发现。",
    hint: "没有准确生日也没关系,先填大概年龄和当前体重。",
    catSrc: "/guide/cat-calm-t.png",
    pad: 8,
    radius: 22,
  },
  {
    targetId: "guide-profile-edit-health",
    route: "/onboarding#edit-health",
    badge: "12 / 编辑 · 疫苗驱虫",
    title: "疫苗记录和上次驱虫,后面会经常用到",
    body: "把猫三联、狂犬等疫苗日期,以及最近一次驱虫时间记下来。以后问腹泻、皮肤痒、寄生虫风险时,这些信息很关键。",
    hint: "不用一次填满,但有记录就尽量补上日期。",
    catSrc: "/guide/cat-happy-t.png",
    pad: 8,
    radius: 22,
  },
  {
    targetId: "guide-help",
    route: "/",
    badge: "13 / 随时重看",
    title: "忘了怎么玩,点问号再看一遍",
    body: "教程只会自动弹一次。以后你想重看,右上角这个问号就是入口。",
    hint: "看完就可以让小猫继续待在首页。",
    catSrc: "/guide/cat-happy-t.png",
    pad: 10,
    radius: 999,
  },
];

const FALLBACK_RECT: SpotlightRect = {
  left: 26,
  top: 92,
  width: 140,
  height: 140,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function targetSelector(targetId: string): string {
  return `[data-guide-target="${targetId}"]`;
}

function getTarget(targetId: string): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector<HTMLElement>(targetSelector(targetId));
}

function rectFromTarget(target: HTMLElement, pad: number): SpotlightRect {
  const rect = target.getBoundingClientRect();
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const left = clamp(rect.left - pad, 10, viewportW - 20);
  const top = clamp(rect.top - pad, 10, viewportH - 20);
  const width = clamp(rect.width + pad * 2, 44, viewportW - left - 10);
  const height = clamp(rect.height + pad * 2, 44, viewportH - top - 10);

  return { left, top, width, height };
}

function useSpotlight(step: GuideStep, routeKey: string) {
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const rafRef = useRef<number | null>(null);

  const measure = useCallback(() => {
    if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    rafRef.current = window.requestAnimationFrame(() => {
      const target = getTarget(step.targetId);
      if (!target || target.offsetParent === null) {
        setRect(null);
        return;
      }
      setRect(rectFromTarget(target, step.pad ?? 8));
    });
  }, [step]);

  useLayoutEffect(() => {
    measure();
    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    };
  }, [measure, routeKey]);

  useEffect(() => {
    const target = getTarget(step.targetId);
    target?.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center",
    });

    const timers = [
      window.setTimeout(measure, 80),
      window.setTimeout(measure, 360),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [measure, routeKey, step.targetId]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure]);

  return rect;
}

function spotlightStyle(rect: SpotlightRect | null, radius: number): CSSProperties {
  const safeRect = rect ?? {
    ...FALLBACK_RECT,
    left: Math.max(18, window.innerWidth / 2 - FALLBACK_RECT.width / 2),
  };

  return {
    left: safeRect.left,
    top: safeRect.top,
    width: safeRect.width,
    height: safeRect.height,
    borderRadius: radius,
  };
}

function coachStyle(
  rect: SpotlightRect | null,
  measuredHeight: number | null,
): CSSProperties {
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const margin = 16;
  const width = Math.min(362, viewportW - 32);
  const coachHeight = Math.min(
    measuredHeight ?? 300,
    viewportH - margin * 2,
  );
  const safeRect = rect ?? {
    ...FALLBACK_RECT,
    left: viewportW / 2 - FALLBACK_RECT.width / 2,
  };
  const center = safeRect.left + safeRect.width / 2;
  const left = clamp(center - width / 2, margin, viewportW - width - margin);
  const belowTop = safeRect.top + safeRect.height + 16;
  const aboveTop = safeRect.top - coachHeight - 16;
  const hasRoomBelow = belowTop + coachHeight <= viewportH - margin;
  const hasRoomAbove = aboveTop >= margin;
  const top =
    hasRoomBelow || !hasRoomAbove
      ? clamp(belowTop, margin, viewportH - coachHeight - margin)
      : aboveTop;

  return { left, width, top };
}

export function Guide({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [stepIndex, setStepIndex] = useState(0);
  const [coachHeight, setCoachHeight] = useState<number | null>(null);
  const coachRef = useRef<HTMLElement | null>(null);
  const step = GUIDE_STEPS[stepIndex] ?? GUIDE_STEPS[0];
  const rect = useSpotlight(step, pathname);
  const last = stepIndex === GUIDE_STEPS.length - 1;

  const styles = useMemo(
    () => ({
      spotlight: spotlightStyle(rect, step.radius ?? 26),
      coach: coachStyle(rect, coachHeight),
    }),
    [coachHeight, rect, step.radius],
  );

  useLayoutEffect(() => {
    const node = coachRef.current;
    if (!node) return;
    const measure = () => setCoachHeight(node.getBoundingClientRect().height);
    measure();
    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(node);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [stepIndex]);

  useEffect(() => {
    const routePath = step.route.split(/[?#]/)[0] || "/";
    if (pathname !== routePath) {
      router.push(step.route);
      return;
    }
    const hashIndex = step.route.indexOf("#");
    const routeHash = hashIndex >= 0 ? step.route.slice(hashIndex) : "";
    if (routeHash && window.location.hash !== routeHash) {
      window.history.replaceState(null, "", step.route);
    }
    if (step.route.includes("#")) {
      window.setTimeout(() => {
        getTarget(step.targetId)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        });
      }, 80);
    }
  }, [pathname, router, step.route, step.targetId]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight" && !last) setStepIndex((i) => i + 1);
      if (event.key === "ArrowLeft" && stepIndex > 0) setStepIndex((i) => i - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [last, onClose, stepIndex]);

  return (
    <div
      className="fixed inset-0 z-[80]"
      role="dialog"
      aria-modal="true"
      aria-label="小猫怎么了使用教程"
    >
      <button
        type="button"
        aria-label="关闭使用教程"
        className="absolute inset-0 cursor-default bg-transparent"
        onClick={() => {
          if (!last) setStepIndex((i) => i + 1);
        }}
      />

      <div
        className="guide-spotlight pointer-events-none absolute border-2 border-white/95 shadow-[0_0_0_9999px_rgba(22,18,14,0.55),0_0_0_7px_rgba(176,90,80,0.2),0_18px_50px_rgba(0,0,0,0.22)]"
        style={styles.spotlight}
      >
        <span
          aria-hidden="true"
          className="absolute -inset-2 rounded-[inherit] border border-white/60"
        />
      </div>

      <section
        ref={coachRef}
        className="guide-coach absolute overflow-y-auto rounded-xl border border-white/75 bg-[rgba(255,255,255,0.96)] p-4 text-ink shadow-[0_24px_70px_rgba(15,12,10,0.24),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-xl"
        style={{ ...styles.coach, maxHeight: "calc(100dvh - 32px)" }}
      >
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={step.catSrc}
            alt=""
            aria-hidden="true"
            width={58}
            height={58}
            className="mt-0.5 size-[58px] shrink-0 object-contain"
          />
          <div className="min-w-0">
            <p className="text-caption font-semibold tracking-[0.18em] text-accent">
              {step.badge}
            </p>
            <h2 className="mt-1 font-serif text-title font-semibold leading-tight tracking-wide text-ink">
              {step.title}
            </h2>
          </div>
        </div>

        <p className="mt-3 text-body leading-relaxed text-ink-soft">
          {step.body}
        </p>
        <p className="mt-2 rounded-sm bg-[var(--accent-soft)] px-3 py-2 text-caption leading-relaxed text-[var(--accent-deep)]">
          {step.hint}
        </p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {GUIDE_STEPS.map((item, index) => (
              <span
                key={item.targetId}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: index === stepIndex ? 22 : 7,
                  background:
                    index <= stepIndex ? "var(--accent)" : "var(--line)",
                }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 px-1 text-footnote font-medium text-ink-faint"
          >
            跳过
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            className="rounded-full bg-[var(--surface-2)] px-4 py-3 text-footnote font-medium text-ink-soft shadow-[var(--shadow-control)] transition disabled:opacity-35"
          >
            上一步
          </button>
          <button
            type="button"
            onClick={() => (last ? onClose() : setStepIndex((i) => i + 1))}
            className="flex-1 rounded-full bg-accent px-5 py-3 text-body font-semibold text-accent-fg shadow-[var(--shadow-accent)] transition-transform active:scale-[0.985]"
          >
            {last ? "知道啦,开始用" : "下一处"}
          </button>
        </div>
      </section>
    </div>
  );
}
