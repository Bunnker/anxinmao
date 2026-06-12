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
import { loadStore, saveConversation, STORAGE_KEY } from "@/lib/storage";
import { SYMPTOM_LABELS } from "@/lib/triage";
import { loadTriageHandoff } from "@/lib/triage-handoff";
import { CaseSummaryPanel } from "@/components/CaseSummaryPanel";
import { Disclaimer } from "@/components/Disclaimer";
import type { Cat, RiskTier, Store } from "@/types/cat";

// 问诊 / 养育问答 —— 对话式,接服务端 /api/behavior 调大模型。
// 产品红线:可以聊健康,但绝不诊断 / 开药;红旗症状急停送医;健康边界按场景
// 自然提醒。系统提示词强约束;页面留「去分诊」入口给结构化分诊兜底。

type Msg = { role: "user" | "assistant"; content: string };
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

const STARTERS = [
  "猫一直打喷嚏,要紧吗?",
  "幼猫一天喂几次、喂多少?",
  "猫不太爱吃饭,要不要去医院?",
  "怎么让猫慢慢接受剪指甲?",
];

// 对话上下文压缩 —— 未摘要的消息超过 COMPRESS_AT 条时,把较早的折进摘要,
// 只留最近 KEEP_VERBATIM 条原文。长对话既不丢上下文、也不无限变长。
const COMPRESS_AT = 20;
const KEEP_VERBATIM = 8;

// 只在前几轮回答后给追问 —— 新手最需要引导;聊深了就不给,省一次调用。
const MAX_FOLLOWUP_TURNS = 3;

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
              className="text-[15px] font-semibold leading-snug text-ink"
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
              className="text-[14.5px] leading-relaxed text-ink"
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
              className="list-disc space-y-1.5 pl-5 text-[14.5px] leading-relaxed text-ink"
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
            className="list-decimal space-y-1.5 pl-5 text-[14.5px] leading-relaxed text-ink"
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
      <span className="grid size-6 place-items-center rounded-full bg-accent text-[11px] font-medium text-accent-fg">
        猫
      </span>
      <span className="text-[11px] font-semibold tracking-[0.16em] text-ink-faint">
        一位懂猫的朋友
      </span>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="max-w-[82%] self-end whitespace-pre-wrap rounded-[26px] rounded-br-lg bg-ink px-4 py-3 text-[14.5px] leading-relaxed text-paper shadow-[var(--shadow-control)]">
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
      <div className="rounded-[28px] rounded-tl-lg bg-surface px-5 py-4 shadow-[var(--shadow-card)]">
        <MarkdownMessage text={text} streaming={streaming} />
      </div>
    </div>
  );
}

function Thinking() {
  return (
    <div className="max-w-[96%] self-start">
      <CatTag />
      <div className="inline-flex items-center gap-1.5 rounded-[28px] rounded-tl-lg bg-surface px-5 py-4 shadow-[var(--shadow-card)]">
        <span className="size-1.5 animate-bounce rounded-full bg-ink-faint [animation-delay:-0.3s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-ink-faint [animation-delay:-0.15s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-ink-faint" />
      </div>
    </div>
  );
}

function ErrorRow({ text, onRetry }: { text: string; onRetry: () => void }) {
  return (
    <div className="max-w-[96%] self-start rounded-[28px] bg-[var(--surface-2)] px-4 py-3 shadow-[var(--shadow-control)]">
      <p className="text-[13px] leading-relaxed text-ink-soft">{text}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 text-[13px] font-medium text-accent"
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
      <span className="shrink-0 text-[11px] tracking-wide text-ink-faint">
        更早的对话已收进摘要
      </span>
      <span className="h-px flex-1 bg-[var(--line-soft)]" />
    </div>
  );
}

function EmptyState({
  catName,
  disabled,
  onPick,
}: {
  catName?: string;
  disabled: boolean;
  onPick: (t: string) => void;
}) {
  return (
    <div className="pt-7">
      <div className="rounded-[28px] bg-surface p-5 shadow-[var(--shadow-card)]">
        <h1 className="font-serif text-[1.7rem] font-medium leading-snug tracking-tight text-ink">
          {catName ? `关于${catName},想问点什么?` : "养猫的事,想问点什么?"}
        </h1>
        <p className="mt-2.5 text-[13px] leading-relaxed text-ink-soft">
          生病拿不准、喂养、训练、行为都能问 —— 急症会直接让你去医院。不能替代兽医。
        </p>
        <div className="mt-4 border-t border-[var(--line-soft)] pt-4">
          <p className="mb-2.5 text-[11px] font-semibold tracking-[0.16em] text-ink-faint">
            试试这些问题
          </p>
          <div className="flex flex-col gap-1.5">
            {STARTERS.map((s) => (
              <button
                key={s}
                type="button"
                disabled={disabled}
                onClick={() => onPick(s)}
                className="flex w-full items-center justify-between gap-3 rounded-[16px] px-4 py-3 text-left text-[13.5px] text-ink-soft transition-colors duration-150 hover:bg-[var(--surface-2)] active:bg-[var(--surface-2)] disabled:opacity-50"
                style={{ background: "var(--surface-2)" }}
              >
                <span>{s}</span>
                <span className="shrink-0 text-[12px] text-ink-faint">→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// 分诊衔接条 —— 带着分诊上下文进来时显示,让用户感知到「接着刚才的分诊聊」。
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
  return (
    <div className="flex items-center gap-2 self-start rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-3.5 py-1.5">
      <span className="size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
      <span className="text-[12px] text-ink-soft">
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
      <span className="ml-1 flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.16em] text-ink-faint">
        <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
        接着可以问
      </span>
      {items.map((q) => (
        <button
          key={q}
          type="button"
          disabled={disabled}
          onClick={() => onPick(q)}
          className="group flex items-center justify-between gap-3 rounded-[18px] border border-[var(--line)] bg-surface px-4 py-2.5 text-left text-[13.5px] leading-snug text-ink-soft shadow-[var(--shadow-control)] transition-colors duration-150 active:bg-[var(--surface-2)] disabled:opacity-50"
        >
          <span className="min-w-0">{q}</span>
          <span className="shrink-0 text-[12.5px] font-medium text-accent transition-transform duration-200 group-active:translate-x-0.5">
            →
          </span>
        </button>
      ))}
    </div>
  );
}

let cachedStoreRaw: string | null | undefined;
let cachedStore: Store | null | undefined;

function subscribeStore(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
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

function hasMedicalConversation(
  messages: Msg[],
  memo: string,
  medicalContext: MedicalChatContext | null,
): boolean {
  if (medicalContext) return true;
  const text = [
    memo,
    ...messages
      .filter((m) => m.role === "user")
      .map((m) => m.content),
  ].join("\n");
  return /呕吐|吐|腹泻|拉稀|软便|便血|黑便|不吃|食欲|精神差|嗜睡|尿频|尿血|尿少|尿不出|排尿|咳嗽|喷嚏|鼻涕|眼屎|流泪|眯眼|耳朵|甩头|挠耳|皮肤|掉毛|瘙痒|牙龈|牙齿|牙齿发黄|口臭|流口水|跛|瘸|出血|误食|中毒|百合|巧克力|葡萄|支原体|PCR|医生|兽医|医院|发烧|疼|痛|呼吸|喘|抽搐|昏迷/.test(text);
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
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 追问建议 —— 每轮回答完后台拉取,点一下当成新问题发出。
  const [followups, setFollowups] = useState<string[]>([]);
  // 对话摘要:memo 是较早对话压成的摘要,memoCount 是已折进 memo 的消息条数。
  const [memo, setMemo] = useState("");
  const [memoCount, setMemoCount] = useState(0);
  const endRef = useRef<HTMLDivElement | null>(null);
  // 会话 id —— 从「最近」点回来时是 ?c=<id>;新会话首次发送时再生成。
  const convIdRef = useRef<string | null>(searchParams.get("c"));
  const restoredRef = useRef(false);
  // 每次发起问答自增;拉追问建议时带上,回来对不上就丢弃(防竞态串台)。
  const reqSeqRef = useRef(0);

  useEffect(() => {
    // 无档案:回首页(首页会显示欢迎页让用户选建档 / 默认模版)
    if (store === null || (store && store.cats.length === 0)) {
      router.replace("/");
    }
  }, [router, store]);

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
    // 并行:发问的同时就开跑追问生成(基于问题 + 上下文),与回答同时进行,
    // 答完即有,不用等回答完再单独跑一轮。只前几轮给(末条是用户问题,用 < 判断)。
    if (msgs.filter((m) => m.role === "assistant").length < MAX_FOLLOWUP_TURNS) {
      void fetchFollowups(msgs, seq);
    }
    let acc = "";
    try {
      const res = await fetch("/api/behavior", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // 只发未摘要的部分;更早的对话靠 memo 摘要带上下文。
          messages: msgs.slice(memoCount),
          memo,
          cat: catProfilePayload(cat),
          region: clientRegionPayload(),
          medical: medicalContext,
        }),
      });

      // 出错时后端返回普通 JSON(非流式),在这里拦下。
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || "出了点问题,请稍后重试。");
        return;
      }

      // 流式读取:每收到一段,就更新末尾那条 assistant 消息。
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        const piece = decoder.decode(value, { stream: true });
        if (!piece) continue;
        acc += piece;
        setMessages([...msgs, { role: "assistant", content: acc }]);
      }
      acc += decoder.decode();

      if (acc.trim() === "") {
        setError("没收到回答,请重试。");
      } else {
        const finalMsgs: Msg[] = [...msgs, { role: "assistant", content: acc }];
        setMessages(finalMsgs);
        persistConversation(finalMsgs, memo, memoCount); // 落「最近」+ 云同步
        void compressIfNeeded(finalMsgs); // 后台压缩,不阻塞当前回合
        // 追问已在本轮开头并行发起,这里不再重复调用。
      }
    } catch {
      // 已收到部分回答就保留它;一个字都没收到才报错。
      if (acc.trim() === "") {
        setError("网络中断了 —— 检查下网络,重试一下。");
      } else {
        const partial: Msg[] = [...msgs, { role: "assistant", content: acc }];
        setMessages(partial);
        persistConversation(partial, memo, memoCount);
      }
    } finally {
      setLoading(false);
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

  const empty = messages.length === 0;
  const showCaseSummary =
    !empty &&
    !loading &&
    messages[messages.length - 1]?.role === "assistant" &&
    hasMedicalConversation(messages, memo, medicalContext ?? null);
  const caseSummaryPayload = {
    cat: catProfilePayload(cat),
    medical: medicalContext
      ? {
          symptom: medicalContext.symptom,
          symptomLabel: medicalContext.symptom
            ? SYMPTOM_LABELS[medicalContext.symptom] ?? medicalContext.symptom
            : undefined,
          tier: medicalContext.tier,
          claimIds: medicalContext.claimIds,
          report: medicalContext.report,
          qa: medicalContext.qa,
        }
      : { claimIds: [] },
    conversation: {
      memo,
      messages: messages.slice(memoCount).slice(-12),
    },
  };

  if (store === undefined) return <main className="min-h-dvh" aria-hidden="true" />;
  if (!cat) return <main className="min-h-dvh" aria-hidden="true" />;

  return (
    <main
      className="relative mx-auto flex max-w-[430px] flex-col"
      style={{
        background: "var(--gradient-page)",
        height: "100dvh",
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
      {/* 顶栏 */}
      <header className="flex shrink-0 items-center px-6 py-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-medium tracking-[0.06em]"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          </svg>
          问点什么
        </span>
      </header>

      {/* 对话区 —— 独立滚动 */}
      <div className="flex-1 overflow-y-auto px-6">
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
            <EmptyState catName={cat?.name} disabled={loading} onPick={send} />
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
                  <AssistantCard
                    text={m.content}
                    streaming={loading && i === messages.length - 1}
                  />
                )}
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
            {showCaseSummary && (
              <CaseSummaryPanel
                source="chat"
                label="总结现在情况"
                payload={caseSummaryPayload}
                tier={medicalContext?.tier}
                symptom={medicalContext?.symptom}
                hasCatProfile={Boolean(cat)}
                hasTriageContext={Boolean(medicalContext)}
              />
            )}
            {error && <ErrorRow text={error} onRetry={retry} />}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* 底部:去分诊兜底入口 + 输入栏 + 免责 */}
      <div className="shrink-0 px-6 pt-2" style={{ paddingBottom: "calc(1.25rem + 56px + env(safe-area-inset-bottom, 0px))" }}>
        <Link
          href="/symptoms"
          className="flex items-center justify-between rounded-[24px] border border-dashed border-[var(--line)] bg-white/55 px-3.5 py-2.5 shadow-[var(--shadow-control)]"
        >
          <span className="text-[12.5px] text-ink-soft">
            想要红黄绿分诊报告?
          </span>
          <span className="shrink-0 text-[12.5px] font-medium text-accent">
            去分诊 →
          </span>
        </Link>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="mt-2.5 flex items-center gap-2.5 rounded-full bg-surface py-2 pl-4 pr-2 shadow-[var(--shadow-control)]"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="生病、喂养、行为…都能问"
            enterKeyHint="send"
            maxLength={500}
            className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-faint disabled:opacity-60"
          />
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
