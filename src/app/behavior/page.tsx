"use client";

import {
  Fragment,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { catProfilePayload } from "@/lib/cat-profile-context";
import { readPersisted } from "@/lib/persist";
import {
  getCatMemory,
  loadStore,
  saveConversation,
  STORAGE_KEY,
} from "@/lib/storage";
import { SYMPTOM_LABELS } from "@/lib/triage";
import { loadTriageHandoff } from "@/lib/triage-handoff";
import { ageLabel, relativeDate } from "@/lib/profile";
import { toEpisodeInputs } from "@/lib/behavior-memory";
import {
  flushMemoryExtract,
  scheduleMemoryExtract,
} from "@/lib/memory-extract";
import {
  QUESTION_POOL,
  recommendQuestions,
  type Suggestion,
} from "@/lib/behavior-suggest";
import { CatAvatar } from "@/components/CatAvatar";
import { Disclaimer } from "@/components/Disclaimer";
import type { Cat, CatRecord, ChatMessage, RiskTier, Store } from "@/types/cat";
import { isKnowledgePosterAttachment } from "@/types/knowledge-poster";
import type { KnowledgePosterAttachment } from "@/types/knowledge-poster";

// 问诊 / 养育问答 —— 对话式,接服务端 /api/behavior 调大模型。
// 产品红线:可以聊健康,但绝不诊断 / 开药;红旗症状急停送医;健康边界按场景
// 自然提醒。系统提示词强约束;页面留「去分诊」入口给结构化分诊兜底。
//
// 2026-06-17 批一 UI 重设计(spec: docs/superpowers/specs/2026-06-17-behavior-qa-
// redesign-and-memory.md):发现态(猫徽章 navbar + 分类 chips + 带标签推荐 +
// 最近问过 + 去分诊)、对话态 restyle(陶土红气泡 + 急症横幅 + ContextChip 按档
// 上色)、语音输入(Web Speech API,不支持则不渲染)。SSE 流式 / 压缩 / 追问 /
// 分诊衔接 / 持久化全部保留不动。

type Msg = ChatMessage;
type MedicalChatContext = {
  symptom?: string;
  tier?: RiskTier;
  claimIds: string[];
  report?: string; // 报告页带来的分诊结论摘要(档位 + 结论 + 判断依据)
  qa?: string; // 分诊问答记录(问了什么、用户答了什么)
};

function clientRegionPayload() {
  if (typeof navigator === "undefined") return undefined;
  const locale = navigator.language;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return {
    locale,
    timeZone,
  };
}

function posterFromHeader(headers: Headers): KnowledgePosterAttachment | undefined {
  const raw = headers.get("X-Knowledge-Poster");
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    return isKnowledgePosterAttachment(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

// 对话上下文压缩 —— 未摘要的消息超过 COMPRESS_AT 条时,把较早的折进摘要,
// 只留最近 KEEP_VERBATIM 条原文。长对话既不丢上下文、也不无限变长。
const COMPRESS_AT = 20;
const KEEP_VERBATIM = 8;

// 只在前几轮回答后给追问 —— 新手最需要引导;聊深了就不给,省一次调用。
const MAX_FOLLOWUP_TURNS = 3;

// 发现态:分类 chips。「推荐」(all)走个性化引擎 recommendQuestions(0 LLM,
// 从记录/资料/记忆派生);具体分类走该类 curated 池 QUESTION_POOL。
const CATEGORIES = [
  { key: "all", label: "推荐" },
  { key: "health", label: "健康" },
  { key: "feed", label: "喂养" },
  { key: "behave", label: "行为" },
  { key: "daily", label: "日常" },
] as const;
type CategoryKey = (typeof CATEGORIES)[number]["key"];

// 急症词 —— 命中即时弹「这可能是急症」红横幅(红旗中途急停红线的前端可视化)。
// 这是防御纵深 / 即时提示,不替代后端 LLM + 意图分流的真实急症处理。
const ER_WORDS = [
  "呼吸",
  "喘",
  "误食",
  "尿不出",
  "憋尿",
  "出血",
  "便血",
  "抽搐",
  "倒下",
  "瘫",
  "中毒",
  "叫不醒",
];
function isEmergency(q: string): boolean {
  return ER_WORDS.some((w) => q.includes(w));
}

// ── 语音输入(Web Speech API)──────────────────────────────────────────
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult:
    | ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void)
    | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};
function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
function useVoiceInput(opts: {
  onResult: (t: string) => void;
  onError: () => void;
}) {
  // 支持性是「只在 client 才知道」的能力探测 —— 用 useSyncExternalStore:
  // 服务端快照 false、客户端快照真实值,React 自动处理 hydration,不闪不报错。
  const supported = useSyncExternalStore(
    () => () => {},
    () => getSpeechRecognition() !== null,
    () => false,
  );
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  // 卸载时停掉还在跑的识别(不碰 state,纯清理)。
  useEffect(() => {
    return () => {
      try {
        recRef.current?.stop();
      } catch {
        // 卸载时停录音失败无所谓
      }
    };
  }, []);

  const toggle = () => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;
    if (listening) {
      try {
        recRef.current?.stop();
      } catch {
        setListening(false);
      }
      return;
    }
    try {
      const rec = new Ctor();
      rec.lang = "zh-CN";
      rec.interimResults = false;
      rec.continuous = false;
      rec.onresult = (e) => {
        let text = "";
        for (let i = 0; i < e.results.length; i++) {
          text += e.results[i]?.[0]?.transcript ?? "";
        }
        if (text.trim()) opts.onResult(text.trim());
      };
      rec.onerror = () => {
        setListening(false);
        opts.onError();
      };
      rec.onend = () => {
        setListening(false);
        recRef.current = null;
      };
      recRef.current = rec;
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
      opts.onError();
    }
  };

  return { voiceSupported: supported, listening, toggleVoice: toggle };
}

type MarkdownBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "ul" | "ol"; items: string[] };

function parseMarkdownBlocks(text: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const paragraph: string[] = [];
  let list: { type: "ul" | "ol"; items: string[] } | null = null;

  function flushParagraph() {
    if (paragraph.length === 0) return;
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
    paragraph.length = 0;
  }

  function flushList() {
    if (!list) return;
    blocks.push({ type: list.type, items: list.items });
    list = null;
  }

  function addListItem(type: "ul" | "ol", item: string) {
    flushParagraph();
    if (!list || list.type !== type) flushList();
    if (!list) list = { type, items: [] };
    list.items.push(item);
  }

  for (const rawLine of text.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "heading",
        level: Math.min(heading[1].length, 3) as 1 | 2 | 3,
        text: heading[2].trim(),
      });
      continue;
    }

    const unordered = /^[-*]\s+(.+)$/.exec(line);
    if (unordered) {
      addListItem("ul", unordered[1].trim());
      continue;
    }

    const ordered = /^\d+[.)]\s+(.+)$/.exec(line);
    if (ordered) {
      addListItem("ol", ordered[1].trim());
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  return blocks;
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const token = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = token.exec(text)) !== null) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index));

    const value = match[0];
    const key = `${keyPrefix}-${index}`;
    if (value.startsWith("**") && value.endsWith("**")) {
      nodes.push(
        <strong key={key} className="font-semibold text-ink">
          {renderInline(value.slice(2, -2), key)}
        </strong>,
      );
    } else if (value.startsWith("`") && value.endsWith("`")) {
      nodes.push(
        <code
          key={key}
          className="rounded bg-[var(--surface-2)] px-1 py-0.5 text-[0.92em] text-ink"
        >
          {value.slice(1, -1)}
        </code>,
      );
    } else {
      const link = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/.exec(value);
      if (link) {
        nodes.push(
          <a
            key={key}
            href={link[2]}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-accent underline underline-offset-2"
          >
            {link[1]}
          </a>,
        );
      } else {
        nodes.push(value);
      }
    }

    cursor = match.index + value.length;
    index += 1;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

function MarkdownMessage({
  text,
  streaming,
}: {
  text: string;
  streaming?: boolean;
}) {
  const blocks = parseMarkdownBlocks(text);
  if (blocks.length === 0) return streaming ? <Caret /> : null;

  return (
    <div className="space-y-2.5">
      {blocks.map((block, blockIndex) => {
        const isLastBlock = blockIndex === blocks.length - 1;
        if (block.type === "heading") {
          const Tag = block.level === 1 ? "h3" : block.level === 2 ? "h4" : "h5";
          return (
            <Tag
              key={blockIndex}
              className="text-callout font-semibold leading-snug text-ink"
            >
              {renderInline(block.text, `h-${blockIndex}`)}
              {streaming && isLastBlock && <Caret />}
            </Tag>
          );
        }

        if (block.type === "paragraph") {
          return (
            <p
              key={blockIndex}
              className="text-body leading-relaxed text-ink"
            >
              {renderInline(block.text, `p-${blockIndex}`)}
              {streaming && isLastBlock && <Caret />}
            </p>
          );
        }

        if (block.type === "ul") {
          return (
            <ul
              key={blockIndex}
              className="list-disc space-y-1.5 pl-5 text-body leading-relaxed text-ink"
            >
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  {renderInline(item, `ul-${blockIndex}-${itemIndex}`)}
                  {streaming &&
                    isLastBlock &&
                    itemIndex === block.items.length - 1 && <Caret />}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <ol
            key={blockIndex}
            className="list-decimal space-y-1.5 pl-5 text-body leading-relaxed text-ink"
          >
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>
                {renderInline(item, `ol-${blockIndex}-${itemIndex}`)}
                {streaming &&
                  isLastBlock &&
                  itemIndex === block.items.length - 1 && <Caret />}
              </li>
            ))}
          </ol>
        );
      })}
    </div>
  );
}

function CatTag() {
  return (
    <div className="mb-2.5 flex items-center gap-2">
      <span className="grid size-6 place-items-center rounded-full bg-accent text-caption font-medium text-accent-fg">
        猫
      </span>
      <span className="text-caption font-semibold tracking-[0.16em] text-ink-faint">
        一位懂猫的朋友
      </span>
    </div>
  );
}

// 用户气泡 —— 设计稿 Q6 拍板:陶土红渐变(与发送键统一)。
function UserBubble({ text }: { text: string }) {
  return (
    <div
      className="max-w-[82%] self-end whitespace-pre-wrap rounded-xl rounded-br-lg px-4 py-3 text-body leading-relaxed text-white"
      style={{
        background: "linear-gradient(180deg, var(--accent-light), var(--accent))",
        boxShadow: "0 8px 18px rgba(176,90,80,0.26)",
      }}
    >
      {text}
    </div>
  );
}

// 流式输出时跟在文末的闪烁光标。
function Caret() {
  return (
    <span className="ml-0.5 inline-block h-[0.92em] w-[2px] translate-y-[0.13em] animate-pulse rounded-full bg-accent" />
  );
}

function AssistantCard({
  text,
  streaming,
}: {
  text: string;
  streaming?: boolean;
}) {
  return (
    <div className="max-w-[96%] self-start">
      <CatTag />
      <div className="rounded-2xl rounded-tl-lg bg-surface px-5 py-4 shadow-[var(--shadow-card)]">
        <MarkdownMessage text={text} streaming={streaming} />
      </div>
    </div>
  );
}

function posterToneColor(poster: KnowledgePosterAttachment): string {
  if (poster.riskTone === "red") return "var(--red)";
  if (poster.riskTone === "yellow") return "var(--amber)";
  if (poster.riskTone === "green") return "var(--green)";
  return "var(--accent)";
}

function PosterAttachmentCard({
  poster,
  onOpen,
}: {
  poster: KnowledgePosterAttachment;
  onOpen: (poster: KnowledgePosterAttachment) => void;
}) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  const isInline = poster.displayMode === "inline";
  const actionText = poster.displayMode === "preview" ? "查看" : "展开";
  const toneColor = posterToneColor(poster);

  if (isInline) {
    return (
      <button
        type="button"
        onClick={() => onOpen(poster)}
        className="ml-8 w-[82%] max-w-[320px] self-start overflow-hidden rounded-xl border border-[var(--line)] bg-surface text-left shadow-[var(--shadow-card)]"
      >
        <div className="flex items-center justify-between gap-2 border-b border-[var(--line-soft)] px-3.5 py-2.5">
          <span className="inline-flex min-w-0 items-center gap-2 text-caption font-semibold text-ink-soft">
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{ background: toneColor }}
              aria-hidden="true"
            />
            <span className="truncate">相关图解</span>
          </span>
          <span className="shrink-0 text-caption text-ink-faint">点开看大图</span>
        </div>
        <img
          src={poster.image}
          alt={`${poster.title}相关图解`}
          className="block aspect-[9/16] w-full object-cover"
          loading="lazy"
          onError={() => setHidden(true)}
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(poster)}
      className="ml-8 flex w-[82%] max-w-[320px] items-center gap-3 self-start rounded-xl border border-[var(--line)] bg-surface px-3 py-2.5 text-left shadow-[var(--shadow-control)]"
    >
      <img
        src={poster.image}
        alt=""
        className="h-[70px] w-[44px] shrink-0 rounded-md object-cover"
        loading="lazy"
        onError={() => setHidden(true)}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-caption font-semibold text-ink">相关图解</span>
        <span className="mt-0.5 block truncate text-caption text-ink-soft">
          {poster.title}
        </span>
      </span>
      <span
        className="shrink-0 rounded-full px-2.5 py-1 text-caption font-semibold text-white"
        style={{ background: toneColor }}
      >
        {actionText}
      </span>
    </button>
  );
}

function PosterViewer({
  poster,
  onClose,
}: {
  poster: KnowledgePosterAttachment;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/92"
      role="dialog"
      aria-modal="true"
      aria-label={`${poster.title}相关图解`}
    >
      <div className="flex shrink-0 items-center gap-3 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] text-white">
        <div className="min-w-0 flex-1">
          <p className="truncate text-footnote font-semibold">{poster.title}</p>
          <p className="mt-0.5 text-caption text-white/62">相关图解</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid size-10 shrink-0 place-items-center rounded-full bg-white/12 text-title text-white"
          aria-label="关闭图解"
        >
          ×
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
        <img
          src={poster.image}
          alt={`${poster.title}相关图解`}
          className="mx-auto block min-h-0 max-h-none w-full max-w-[430px] rounded-lg object-contain"
        />
      </div>
    </div>
  );
}

function Thinking() {
  return (
    <div className="max-w-[96%] self-start">
      <CatTag />
      <div className="inline-flex items-center gap-1.5 rounded-2xl rounded-tl-lg bg-surface px-5 py-4 shadow-[var(--shadow-card)]">
        <span className="size-1.5 animate-bounce rounded-full bg-ink-faint [animation-delay:-0.3s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-ink-faint [animation-delay:-0.15s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-ink-faint" />
      </div>
    </div>
  );
}

// 急症横幅 —— 命中急症词即时弹出(红线:红旗中途急停的前端可视化)。
// 红底红字 = 风险信号本体;CTA 直跳分诊(/symptoms 含红旗急症入口)。
function EmergencyNotice() {
  return (
    <div
      className="self-stretch rounded-xl px-4 py-3.5"
      style={{
        background: "var(--red-bg)",
        border: "1px solid rgba(217,45,32,0.22)",
      }}
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 shrink-0" style={{ color: "var(--red)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 3 2 20h20z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M12 9v5M12 17v.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <div className="min-w-0">
          <p
            className="text-footnote font-bold"
            style={{ color: "var(--red-ink)" }}
          >
            这可能是急症
          </p>
          <p
            className="mt-1 text-caption leading-relaxed"
            style={{ color: "var(--red-ink)" }}
          >
            这类情况别在这儿耗时间,尽快联系就近的宠物医院 / 急诊。
          </p>
          <Link
            href="/symptoms"
            className="mt-2.5 inline-flex items-center gap-1 rounded-sm px-3 py-1.5 text-caption font-semibold text-white"
            style={{ background: "var(--red)" }}
          >
            去分诊 / 找医院 →
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorRow({ text, onRetry }: { text: string; onRetry: () => void }) {
  return (
    <div className="max-w-[96%] self-start rounded-2xl bg-[var(--surface-2)] px-4 py-3 shadow-[var(--shadow-control)]">
      <p className="text-footnote leading-relaxed text-ink-soft">{text}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 text-footnote font-medium text-accent"
      >
        重试 →
      </button>
    </div>
  );
}

// 分隔线 —— 标出从这里往上的对话,已被压成摘要(AI 记的是摘要,不是原文)。
function MemoDivider() {
  return (
    <div className="flex items-center gap-2.5 py-0.5">
      <span className="h-px flex-1 bg-[var(--line-soft)]" />
      <span className="shrink-0 text-caption tracking-wide text-ink-faint">
        更早的对话已收进摘要
      </span>
      <span className="h-px flex-1 bg-[var(--line-soft)]" />
    </div>
  );
}

// 分诊衔接条 —— 带着分诊上下文进来时显示。圆点按档位上色(把三色用对地方)。
function ContextChip({ symptom, tier }: { symptom?: string; tier?: RiskTier }) {
  const label = (symptom && SYMPTOM_LABELS[symptom]) || "这次情况";
  const tierText =
    tier === "red"
      ? "红档 · 立刻就医"
      : tier === "yellow"
        ? "黄档 · 尽快就医"
        : tier === "green"
          ? "绿档 · 先观察"
          : "";
  const dotColor =
    tier === "red"
      ? "var(--red)"
      : tier === "yellow"
        ? "var(--amber)"
        : tier === "green"
          ? "var(--green)"
          : "var(--accent)";
  return (
    <div className="flex items-center gap-2 self-start rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-3.5 py-1.5">
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ background: dotColor }}
        aria-hidden="true"
      />
      <span className="text-caption text-ink-soft">
        接着刚才的分诊:{label}
        {tierText ? ` · ${tierText}` : ""}
      </span>
    </div>
  );
}

// 追问建议 —— 答完后挂在最后一条回答下面,点一下就当成新问题发出去。
function FollowupChips({
  items,
  disabled,
  onPick,
}: {
  items: string[];
  disabled: boolean;
  onPick: (t: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex max-w-[96%] flex-col gap-2 self-start">
      <span className="ml-1 flex items-center gap-1.5 text-caption font-semibold tracking-[0.16em] text-ink-faint">
        <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
        接着可以问
      </span>
      {items.map((q) => (
        <button
          key={q}
          type="button"
          disabled={disabled}
          onClick={() => onPick(q)}
          className="group flex items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-surface px-4 py-2.5 text-left text-footnote leading-snug text-ink-soft shadow-[var(--shadow-control)] transition-colors duration-150 active:bg-[var(--surface-2)] disabled:opacity-50"
        >
          <span className="min-w-0">{q}</span>
          <span className="shrink-0 text-caption font-medium text-accent transition-transform duration-200 group-active:translate-x-0.5">
            →
          </span>
        </button>
      ))}
    </div>
  );
}

// ── 发现态(空态)组件 ────────────────────────────────────────────────

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SuggestionRow({
  item,
  related,
  catName,
  disabled,
  onPick,
}: {
  item: Suggestion;
  related: boolean;
  catName?: string;
  disabled: boolean;
  onPick: (q: string) => void;
}) {
  // 只保留个性化「和{name}有关」标(命中既往记录时才出现,用 accent 系、绝不取风险盘)。
  // 分类「健康」标已去掉(信息冗余)。标签放问题文字之后、箭头之前。
  const relatedText = related
    ? catName
      ? `和${catName}有关`
      : "和它有关"
    : null;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onPick(item.q)}
      className="flex w-full items-center gap-3 rounded-sm bg-surface px-4 py-3.5 text-left shadow-[var(--shadow-control)] transition-transform duration-150 active:scale-[0.99] disabled:opacity-50"
    >
      <span className="flex-1 text-body leading-snug text-ink">{item.q}</span>
      {relatedText && (
        <span
          className="shrink-0 rounded-md px-1.5 py-1 text-micro font-semibold tracking-[0.02em]"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >
          {relatedText}
        </span>
      )}
      <ChevronRight className="shrink-0 text-ink-faint" />
    </button>
  );
}

function Discovery({
  cat,
  records,
  disabled,
  onPick,
  onOpenRecord,
}: {
  cat: Cat;
  records: CatRecord[];
  disabled: boolean;
  onPick: (q: string) => void;
  onOpenRecord: (r: CatRecord) => void;
}) {
  const [category, setCategory] = useState<CategoryKey>("all");
  // 「推荐」走个性化引擎(0 LLM,读 记录/资料/记忆 派生);具体分类走该类 curated 池。
  const items = useMemo<Suggestion[]>(
    () =>
      category === "all"
        ? recommendQuestions(cat, records, getCatMemory(cat.id), 4)
        : QUESTION_POOL[category].map((q) => ({ q, topic: category, related: false })),
    [category, cat, records],
  );
  const recentBehavior = records
    .filter((r) => r.kind === "behavior")
    .slice(0, 3);
  const label = CATEGORIES.find((c) => c.key === category)?.label ?? "推荐";

  return (
    <div className="flex flex-col pb-4 pt-3">
      {/* 分类 chips */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {CATEGORIES.map((c) => {
          const on = c.key === category;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategory(c.key)}
              className="shrink-0 rounded-full px-4 py-2 text-footnote font-medium transition-colors duration-150"
              style={
                on
                  ? {
                      background: "var(--accent)",
                      color: "var(--accent-fg)",
                      boxShadow: "0 6px 14px rgba(176,90,80,0.28)",
                    }
                  : {
                      background: "var(--surface)",
                      color: "var(--ink-soft)",
                      boxShadow: "var(--shadow-control)",
                    }
              }
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* 推荐问题 */}
      <p className="mb-2.5 mt-3.5 px-1 text-caption font-semibold tracking-[0.16em] text-ink-faint">
        {category === "all" ? `为${cat.name}推荐` : label}
      </p>
      <div className="flex flex-col gap-2.5">
        {items.map((it) => (
          <SuggestionRow
            key={`${it.topic}-${it.q}`}
            item={it}
            related={it.related}
            catName={cat.name}
            disabled={disabled}
            onPick={onPick}
          />
        ))}
      </div>

      {/* 最近问过 */}
      {recentBehavior.length > 0 && (
        <div className="mt-6">
          <p className="mb-1 px-1 text-caption font-semibold tracking-[0.16em] text-ink-faint">
            最近问过
          </p>
          <div className="rounded-lg bg-surface px-1 shadow-[var(--shadow-control)]">
            {recentBehavior.map((r, i) => (
              <button
                key={r.id}
                type="button"
                disabled={disabled}
                onClick={() => onOpenRecord(r)}
                className="flex w-full items-center gap-2.5 px-3 py-3 text-left disabled:opacity-50"
                style={{
                  borderTop:
                    i === 0 ? "none" : "1px solid var(--line-soft)",
                }}
              >
                <span className="shrink-0 text-ink-faint">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="flex-1 truncate text-footnote text-ink-soft">
                  {r.question ?? r.summary}
                </span>
                <span className="shrink-0 text-caption text-ink-faint">
                  {relativeDate(r.date)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

let cachedStoreRaw: string | null | undefined;
let cachedStore: Store | null | undefined;

function subscribeStore(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  // storage:跨 tab 变化;catstore:updated:同窗口写入后手动派发(saveStoreLocal)。
  // 漏听后者会让本会话刚落的分诊/问答记录进不了下一轮 Tier A 回忆(同 TabBar 的写法)。
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("catstore:updated", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("catstore:updated", onStoreChange);
  };
}

function getStoreSnapshot(): Store | null | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = readPersisted(STORAGE_KEY);
  if (raw === cachedStoreRaw) return cachedStore;
  cachedStoreRaw = raw;
  cachedStore = loadStore();
  return cachedStore;
}

function getServerStoreSnapshot(): Store | null | undefined {
  return undefined;
}

function parseTier(raw: string | null): RiskTier | undefined {
  return raw === "red" || raw === "yellow" || raw === "green" ? raw : undefined;
}

function parseClaimIds(raw: string | null): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter((id) => /^[a-z]+_\d{3}$/.test(id))
    .filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice(0, 32);
}

function medicalContextFromQuery(rawQuery: string): MedicalChatContext | undefined {
  const params = new URLSearchParams(rawQuery);
  const handoff = loadTriageHandoff(params.get("handoff"));
  const symptom = params.get("symptom")?.trim() || handoff?.symptom;
  const tier = parseTier(params.get("tier")) ?? handoff?.tier;
  const claimIdsFromUrl = parseClaimIds(params.get("claims"));
  const claimIds = claimIdsFromUrl.length > 0 ? claimIdsFromUrl : (handoff?.claimIds ?? []);
  const report = handoff?.report?.trim().slice(0, 600) || undefined;
  const qa = handoff?.qa?.trim().slice(0, 800) || undefined;
  if (!symptom && !tier && claimIds.length === 0 && !report && !qa)
    return undefined;
  return { symptom, tier, claimIds, report, qa };
}

function openingText(ctx: MedicalChatContext): string {
  const label = (ctx.symptom && SYMPTOM_LABELS[ctx.symptom]) || "这次情况";
  if (ctx.tier === "red") {
    return `我已经接上刚才「${label}」的红档分诊了。这个档位先别靠聊天拖时间,优先联系最近动物医院/急诊;你可以补充它现在呼吸、意识、出血或排尿的最新变化,我帮你整理路上要注意什么。`;
  }
  if (ctx.tier === "yellow") {
    return `我已经接上刚才「${label}」的黄档分诊了。你可以继续补充最新变化,我会尽量不重复刚才问过的内容;最关键的是现在精神、吃喝、呼吸和排尿有没有变差。`;
  }
  return `我已经接上刚才「${label}」的分诊了。你可以继续补充最新变化,我会按刚才的回答接着判断;最关键的是现在精神、呼吸、吃喝和排尿是不是还正常。`;
}

function sexBadge(sex: Cat["sex"]): string | null {
  return sex === "不确定" ? null : sex;
}

function BehaviorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const store = useSyncExternalStore(
    subscribeStore,
    getStoreSnapshot,
    getServerStoreSnapshot,
  );
  const query = searchParams.toString();
  const medicalContext = useMemo(() => medicalContextFromQuery(query), [query]);
  const cat = useMemo<Cat | null>(() => {
    if (!store || store.cats.length === 0) return null;
    return store.cats.find((c) => c.id === store.activeCatId) ?? store.cats[0];
  }, [store]);
  const records = useMemo<CatRecord[]>(() => {
    if (!store || !cat) return [];
    return store.records.filter((r) => r.catId === cat.id);
  }, [store, cat]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [posterViewer, setPosterViewer] =
    useState<KnowledgePosterAttachment | null>(null);
  // 追问建议 —— 每轮回答完后台拉取,点一下当成新问题发出。
  const [followups, setFollowups] = useState<string[]>([]);
  // 对话摘要:memo 是较早对话压成的摘要,memoCount 是已折进 memo 的消息条数。
  const [memo, setMemo] = useState("");
  const [memoCount, setMemoCount] = useState(0);
  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  // 会话 id —— 从「最近」点回来时是 ?c=<id>;新会话首次发送时再生成。
  const convIdRef = useRef<string | null>(searchParams.get("c"));
  const restoredRef = useRef(false);
  // 每次发起问答自增;拉追问建议时带上,回来对不上就丢弃(防竞态串台)。
  const reqSeqRef = useRef(0);
  // 当前会话归属的猫 —— 多 tab 切活动猫时据此检测跨猫,清空会话防 A 猫对话串进 B 猫。
  const catIdRef = useRef<string | null>(null);

  const { voiceSupported, listening, toggleVoice } = useVoiceInput({
    onResult: (t) => setInput((prev) => (prev ? `${prev} ${t}` : t)),
    onError: () => setHint("没听清,直接打字也行"),
  });

  function invalidateRunChat() {
    reqSeqRef.current += 1;
    setLoading(false);
  }

  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(null), 2200);
    return () => clearTimeout(t);
  }, [hint]);

  useEffect(() => {
    // 无档案:回首页(首页会显示欢迎页让用户选建档 / 默认模版)
    if (store === null || (store && store.cats.length === 0)) {
      router.replace("/");
    }
  }, [router, store]);

  // 跨猫隔离(红线)—— 活动猫被切走(如另一 tab 在 /pets 切猫,经 catstore:updated 同步到本页):
  // 屏上仍是 A 猫的 messages,但 cat 已重算成 B 猫。若不重置,下一轮 runChat 会用 B 的 id
  // 把 A 的对话蒸馏/落库进 B 猫。这里检测 cat.id 变化即 flush 旧猫待蒸馏 + 清空会话回发现态。
  useEffect(() => {
    if (!cat) return;
    if (catIdRef.current === null) {
      catIdRef.current = cat.id; // 初次挂载,记下当前猫
      return;
    }
    if (catIdRef.current !== cat.id) {
      invalidateRunChat();
      flushMemoryExtract();
      catIdRef.current = cat.id;
      convIdRef.current = null;
      restoredRef.current = true;
      setMessages([]);
      setMemo("");
      setMemoCount(0);
      setFollowups([]);
      setError(null);
      setInput("");
      setPosterViewer(null);
    }
  }, [cat]);

  // 从「最近」点回某次聊天(?c=<id>):store 就绪后把当时的对话还原出来(只做一次)。
  useEffect(() => {
    if (restoredRef.current) return;
    const cid = convIdRef.current;
    if (!cid || !store) return;
    restoredRef.current = true;
    const rec = store.records.find(
      (r) => r.id === cid && r.kind === "behavior",
    );
    if (rec?.messages && rec.messages.length > 0) {
      setMessages(rec.messages);
      if (rec.memo) setMemo(rec.memo);
      if (typeof rec.memoCount === "number") setMemoCount(rec.memoCount);
    }
  }, [store]);

  useEffect(() => {
    // 流式输出会频繁更新,用瞬时滚动,避免 smooth 抖动。
    // followups 是答完后异步出现的,也加进来,让追问浮现时自动滚入视野。
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, loading, error, followups]);

  // Tier B:页面切走 / 隐藏 / 卸载时立即 flush 待蒸馏的记忆(带 keepalive,pagehide 也发得出)。
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flushMemoryExtract();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flushMemoryExtract);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flushMemoryExtract);
      flushMemoryExtract();
    };
  }, []);

  // 把当前会话存进「最近」(localStorage + 防抖云同步)。没 cat / 没会话 id 就跳过。
  const persistConversation = (msgs: Msg[], m: string, mc: number) => {
    if (!cat || !convIdRef.current) return;
    saveConversation({
      id: convIdRef.current,
      catId: cat.id,
      messages: msgs,
      memo: m,
      memoCount: mc,
    });
  };

  // 未摘要的对话过长时,把较早的部分压成摘要(后台进行,失败静默)。
  async function compressIfNeeded(all: Msg[]) {
    if (all.length - memoCount <= COMPRESS_AT) return;
    const foldEnd = all.length - KEEP_VERBATIM; // 折叠区间 [memoCount, foldEnd)
    const toFold = all.slice(memoCount, foldEnd);
    if (toFold.length === 0) return;
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memo, messages: toFold }),
      });
      const data = (await res.json().catch(() => ({}))) as { memo?: string };
      if (res.ok && typeof data.memo === "string" && data.memo.trim()) {
        setMemo(data.memo.trim());
        setMemoCount(foldEnd);
        persistConversation(all, data.memo.trim(), foldEnd);
      }
      // 失败不更新 memo —— 不影响对话,后端有兜底上限
    } catch {
      // 压缩失败静默,下次再说
    }
  }

  // 调一次问答接口,流式读取回答;msgs 末条须为用户问题。
  async function runChat(msgs: Msg[]) {
    setLoading(true);
    setError(null);
    setFollowups([]); // 新一轮:先清掉上一条回答的追问
    const seq = ++reqSeqRef.current;
    const stillActive = () => seq === reqSeqRef.current;
    // 并行:发问的同时就开跑追问生成(基于问题 + 上下文),与回答同时进行,
    // 答完即有,不用等回答完再单独跑一轮。只前几轮给(末条是用户问题,用 < 判断)。
    if (msgs.filter((m) => m.role === "assistant").length < MAX_FOLLOWUP_TURNS) {
      void fetchFollowups(msgs, seq);
    }
    // Tier A 既往档案回忆 —— 当前猫的既往 records 裁剪成 EpisodeInput(剥离 PII),
    // 排除当前会话防自指;服务端据此派生护栏化「近期档案」回忆块(更懂用户)。
    const episodes = toEpisodeInputs(records, convIdRef.current);
    // Tier B 蒸馏记忆 —— 当前猫的稳定画像(已过期清理 + 跨猫隔离),只发 {kind,text}。
    const memItems = cat
      ? getCatMemory(cat.id).map((m) => ({ kind: m.kind, text: m.text }))
      : [];
    let acc = "";
    try {
      const res = await fetch("/api/behavior", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // 只发未摘要的部分;更早的对话靠 memo 摘要带上下文。
          messages: msgs.slice(memoCount),
          memo,
          history: episodes.length > 0 ? episodes : undefined,
          memory: memItems.length > 0 ? memItems : undefined,
          cat: catProfilePayload(cat),
          region: clientRegionPayload(),
          medical: medicalContext,
        }),
      });

      if (!stillActive()) return;

      // 出错时后端返回普通 JSON(非流式),在这里拦下。
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!stillActive()) return;
        setError(data.error || "出了点问题,请稍后重试。");
        return;
      }

      const poster = posterFromHeader(res.headers);
      // 对话内去重:普通图解一次对话只展示一次(用户已看过,重复是噪音);
      // 红档急症图解保留重复展示,反复引起用户重视(安全)。
      const dedupedPoster =
        poster &&
        poster.riskTone !== "red" &&
        msgs.some((m) => m.poster?.id === poster.id)
          ? undefined
          : poster;

      // 流式读取:每收到一段,就更新末尾那条 assistant 消息。
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        const piece = decoder.decode(value, { stream: true });
        if (!piece) continue;
        acc += piece;
        if (!stillActive()) return;
        setMessages([...msgs, { role: "assistant", content: acc }]);
      }
      acc += decoder.decode();
      if (!stillActive()) return;

      if (acc.trim() === "") {
        setError("没收到回答,请重试。");
      } else {
        const assistantMsg: Msg = dedupedPoster
          ? { role: "assistant", content: acc, poster: dedupedPoster }
          : { role: "assistant", content: acc };
        const finalMsgs: Msg[] = [...msgs, assistantMsg];
        setMessages(finalMsgs);
        persistConversation(finalMsgs, memo, memoCount); // 落「最近」+ 云同步
        void compressIfNeeded(finalMsgs); // 后台压缩,不阻塞当前回合
        // Tier B:后台把本次对话蒸馏成长期记忆(防抖 + 单飞 + min-new 闸 + 失败静默)。
        if (cat && convIdRef.current) {
          scheduleMemoryExtract({
            catId: cat.id,
            conversationId: convIdRef.current,
            messages: finalMsgs,
            existingItems: memItems,
            catProfile: catProfilePayload(cat),
          });
        }
        // 追问已在本轮开头并行发起,这里不再重复调用。
      }
    } catch {
      if (!stillActive()) return;
      // 已收到部分回答就保留它;一个字都没收到才报错。
      if (acc.trim() === "") {
        setError("网络中断了 —— 检查下网络,重试一下。");
      } else {
        const partial: Msg[] = [...msgs, { role: "assistant", content: acc }];
        setMessages(partial);
        persistConversation(partial, memo, memoCount);
      }
    } finally {
      if (stillActive()) setLoading(false);
    }
  }

  // 答完后台拉「追问建议」。失败静默;只有仍是最新一轮(seq 对得上)才采用。
  async function fetchFollowups(msgs: Msg[], seq: number) {
    try {
      const res = await fetch("/api/followups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // 省 token:只发最近一两轮(后端也只取最后 4 条),不带猫档案 / 摘要
        body: JSON.stringify({ messages: msgs.slice(-4) }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        followups?: unknown;
      };
      if (seq !== reqSeqRef.current) return; // 用户已开新一轮,丢弃旧建议
      if (res.ok && Array.isArray(data.followups)) {
        setFollowups(
          data.followups
            .filter((x): x is string => typeof x === "string")
            .slice(0, 3),
        );
      }
    } catch {
      // 静默:不显示追问,不影响主流程
    }
  }

  function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    inputRef.current?.blur();
    if (!convIdRef.current) {
      convIdRef.current =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : "c-" + Math.random().toString(36).slice(2, 10);
    }
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    runChat(next);
  }

  // 出错时末条仍是用户问题,直接用现有 messages 重发。
  function retry() {
    if (loading || messages.length === 0) return;
    if (messages[messages.length - 1].role !== "user") return;
    runChat(messages);
  }

  // 从「最近问过」点开某次对话:直接把记录灌进 state(不靠路由,稳)。
  function openRecord(rec: CatRecord) {
    if (!rec.messages || rec.messages.length === 0) return;
    invalidateRunChat();
    flushMemoryExtract(); // 切走当前会话前,先 flush 它的待蒸馏记忆
    convIdRef.current = rec.id;
    restoredRef.current = true;
    setMessages(rec.messages);
    setMemo(rec.memo ?? "");
    setMemoCount(rec.memoCount ?? 0);
    setFollowups([]);
    setError(null);
    setPosterViewer(null);
  }

  // 新对话:清空本地状态回到发现态;有 query 参数则一并清掉。
  function newConversation() {
    invalidateRunChat();
    flushMemoryExtract(); // 切走当前会话前,先 flush 它的待蒸馏记忆
    convIdRef.current = null;
    restoredRef.current = true;
    setMessages([]);
    setMemo("");
    setMemoCount(0);
    setFollowups([]);
    setError(null);
    setInput("");
    setPosterViewer(null);
    if (query) router.replace("/behavior");
  }

  const empty = messages.length === 0;
  const lastUserIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") return i;
    }
    return -1;
  })();

  if (store === undefined) return <main className="min-h-dvh" aria-hidden="true" />;
  if (!cat) return <main className="min-h-dvh" aria-hidden="true" />;

  const sex = sexBadge(cat.sex);

  return (
    <main
      className="relative mx-auto flex max-w-[430px] flex-col"
      style={{
        background: "var(--gradient-page)",
        height: "100dvh",
        paddingTop: "calc(0.5rem + env(safe-area-inset-top, 0px))",
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

      {/* navbar —— 标题 + 猫徽章(+ 有对话时给「新对话」) */}
      <header className="flex shrink-0 items-center gap-2.5 px-5 py-2.5">
        <h1 className="font-serif text-title font-semibold tracking-wide text-ink">
          问{cat.name}
        </h1>
        {!empty && (
          <button
            type="button"
            onClick={newConversation}
            className="rounded-full border border-[var(--line)] bg-surface px-3 py-1 text-caption font-medium text-ink-soft shadow-[var(--shadow-control)]"
          >
            新对话
          </button>
        )}
        <span className="ml-auto flex items-center gap-1.5 rounded-full bg-surface py-1 pl-1 pr-3 shadow-[var(--shadow-control)]">
          <CatAvatar avatar={cat.avatar} name={cat.name} size={24} />
          <span className="text-caption text-ink-soft">
            {[ageLabel(cat.ageMonths), sex].filter(Boolean).join(" · ")}
          </span>
        </span>
      </header>

      {/* 对话区 —— 独立滚动 */}
      <div className="flex-1 overflow-y-auto px-5">
        {empty ? (
          medicalContext ? (
            <div className="flex flex-col gap-5 pb-2 pt-4">
              <ContextChip
                symptom={medicalContext.symptom}
                tier={medicalContext.tier}
              />
              <AssistantCard text={openingText(medicalContext)} />
              <div ref={endRef} />
            </div>
          ) : (
            <Discovery
              cat={cat}
              records={records}
              disabled={loading}
              onPick={send}
              onOpenRecord={openRecord}
            />
          )
        ) : (
          <div className="flex flex-col gap-5 pb-2 pt-4">
            {medicalContext && (
              <ContextChip
                symptom={medicalContext.symptom}
                tier={medicalContext.tier}
              />
            )}
            {messages.map((m, i) => (
              <Fragment key={i}>
                {memoCount > 0 && i === memoCount && <MemoDivider />}
                {m.role === "user" ? (
                  <UserBubble text={m.content} />
                ) : (
                  <>
                    <AssistantCard
                      text={m.content}
                      streaming={loading && i === messages.length - 1}
                    />
                    {m.poster && (
                      <PosterAttachmentCard
                        poster={m.poster}
                        onOpen={setPosterViewer}
                      />
                    )}
                  </>
                )}
                {/* 急症横幅 —— 紧跟触发它的那条用户消息 */}
                {m.role === "user" &&
                  i === lastUserIdx &&
                  isEmergency(m.content) && <EmergencyNotice />}
              </Fragment>
            ))}
            {loading && messages[messages.length - 1]?.role === "user" && (
              <Thinking />
            )}
            {!loading &&
              !error &&
              followups.length > 0 &&
              messages[messages.length - 1]?.role === "assistant" && (
                <FollowupChips
                  items={followups}
                  disabled={loading}
                  onPick={send}
                />
              )}
            {error && <ErrorRow text={error} onRetry={retry} />}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* 底部:输入栏(含语音)+ 免责 */}
      <div
        className="relative shrink-0 px-5 pt-2"
        style={{
          paddingBottom: "calc(1rem + 56px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {hint && (
          <div className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full rounded-sm bg-ink/90 px-3.5 py-2 text-caption text-paper">
            {hint}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 rounded-full bg-surface py-2 pl-4 pr-2 shadow-[var(--shadow-control)]"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="生病、喂养、行为…都能问"
            enterKeyHint="send"
            maxLength={500}
            className="min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-faint disabled:opacity-60"
          />
          {voiceSupported && (
            <button
              type="button"
              onClick={toggleVoice}
              aria-label={listening ? "停止语音输入" : "语音输入"}
              aria-pressed={listening}
              className="grid size-8 shrink-0 place-items-center rounded-full transition-colors"
              style={
                listening
                  ? { background: "var(--accent-soft)", color: "var(--accent)" }
                  : { color: "var(--ink-faint)" }
              }
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.7" />
                <path
                  d="M6 11a6 6 0 0 0 12 0M12 17v3"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
          <button
            type="submit"
            disabled={!input.trim() || loading}
            aria-label="发送"
            className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-accent-fg transition-opacity disabled:opacity-40"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M5 12h13M13 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </form>

        <Disclaimer />
      </div>

      {posterViewer && (
        <PosterViewer
          poster={posterViewer}
          onClose={() => setPosterViewer(null)}
        />
      )}
    </main>
  );
}

export default function BehaviorPage() {
  return (
    <Suspense fallback={<main className="min-h-dvh" aria-hidden="true" />}>
      <BehaviorContent />
    </Suspense>
  );
}
