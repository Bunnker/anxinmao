"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { loadOrSeedStore } from "@/lib/storage";
import { Disclaimer } from "@/components/Disclaimer";
import type { Cat } from "@/types/cat";

// 行为 / 养育问答 —— 对话式,接服务端 /api/behavior 调大模型。
// 产品红线:这里只聊喂养 / 训练 / 行为,健康判断交给「分诊」(系统提示词里
// 已强约束;页面再留一个显式「去分诊」入口兜底)。

type Msg = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "小猫总咬我的手,怎么训?",
  "幼猫一天喂几次、喂多少?",
  "猫为什么半夜跑酷、闹腾?",
  "怎么让猫慢慢接受剪指甲?",
];

// 对话上下文压缩 —— 未摘要的消息超过 COMPRESS_AT 条时,把较早的折进摘要,
// 只留最近 KEEP_VERBATIM 条原文。长对话既不丢上下文、也不无限变长。
const COMPRESS_AT = 20;
const KEEP_VERBATIM = 8;

// 回答按换行拆段渲染(系统提示词已要求不用 markdown)。
function paragraphs(text: string): string[] {
  return text
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
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
    <div className="max-w-[82%] self-end whitespace-pre-wrap rounded-2xl rounded-br-md bg-ink px-4 py-3 text-[14.5px] leading-relaxed text-paper">
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
  const paras = paragraphs(text);
  return (
    <div className="max-w-[96%] self-start">
      <CatTag />
      <div className="rounded-2xl rounded-tl-md border border-[var(--line)] bg-surface px-5 py-4">
        {paras.length === 0 && streaming && <Caret />}
        {paras.map((p, i) => (
          <p
            key={i}
            className="text-[14.5px] leading-relaxed text-ink [&:not(:first-child)]:mt-2.5"
          >
            {p}
            {streaming && i === paras.length - 1 && <Caret />}
          </p>
        ))}
      </div>
    </div>
  );
}

function Thinking() {
  return (
    <div className="max-w-[96%] self-start">
      <CatTag />
      <div className="inline-flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-[var(--line)] bg-surface px-5 py-4">
        <span className="size-1.5 animate-bounce rounded-full bg-ink-faint [animation-delay:-0.3s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-ink-faint [animation-delay:-0.15s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-ink-faint" />
      </div>
    </div>
  );
}

function ErrorRow({ text, onRetry }: { text: string; onRetry: () => void }) {
  return (
    <div className="max-w-[96%] self-start rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3">
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
    <div className="pt-8">
      <CatTag />
      <h1 className="font-serif text-[1.7rem] font-medium leading-snug tracking-tight text-ink">
        {catName ? `关于${catName},想问点什么?` : "养猫的事,想问点什么?"}
      </h1>
      <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-soft">
        喂养、训练、行为习惯都行 —— 像问朋友一样问就好。生病、要不要就医的判断不在这儿,那边有「分诊」。
      </p>
      <div className="mt-6 flex flex-col gap-2.5">
        {STARTERS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onClick={() => onPick(s)}
            className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-surface px-4 py-3.5 text-left text-[14px] text-ink transition-transform active:translate-y-px disabled:opacity-50"
          >
            <span>{s}</span>
            <span className="shrink-0 text-ink-faint">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function BehaviorPage() {
  const [cat, setCat] = useState<Cat | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 对话摘要:memo 是较早对话压成的摘要,memoCount 是已折进 memo 的消息条数。
  const [memo, setMemo] = useState("");
  const [memoCount, setMemoCount] = useState(0);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const store = loadOrSeedStore();
    const active =
      store.cats.find((c) => c.id === store.activeCatId) ?? store.cats[0];
    setCat(active ?? null);
  }, []);

  useEffect(() => {
    // 流式输出会频繁更新,用瞬时滚动,避免 smooth 抖动。
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, loading, error]);

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
    let acc = "";
    try {
      const res = await fetch("/api/behavior", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // 只发未摘要的部分;更早的对话靠 memo 摘要带上下文。
          messages: msgs.slice(memoCount),
          memo,
          cat: cat
            ? {
                name: cat.name,
                ageMonths: cat.ageMonths,
                sex: cat.sex,
                neutered: cat.neutered,
              }
            : undefined,
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
        void compressIfNeeded(finalMsgs); // 后台压缩,不阻塞当前回合
      }
    } catch {
      // 已收到部分回答就保留它;一个字都没收到才报错。
      if (acc.trim() === "") {
        setError("网络中断了 —— 检查下网络,重试一下。");
      } else {
        setMessages([...msgs, { role: "assistant", content: acc }]);
      }
    } finally {
      setLoading(false);
    }
  }

  function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
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

  return (
    <main className="mx-auto flex h-dvh max-w-[430px] flex-col bg-paper">
      {/* 顶栏 */}
      <header className="flex shrink-0 items-center px-7 pt-3">
        <Link
          href="/"
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
        </Link>
        <span className="flex-1 text-center text-[12px] font-medium uppercase tracking-[0.18em] text-ink-soft">
          问点什么
        </span>
        <span className="size-9" />
      </header>

      {/* 对话区 —— 独立滚动 */}
      <div className="flex-1 overflow-y-auto px-7">
        {empty ? (
          <EmptyState
            catName={cat?.name}
            disabled={loading}
            onPick={send}
          />
        ) : (
          <div className="flex flex-col gap-5 pb-2 pt-4">
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
            {error && <ErrorRow text={error} onRetry={retry} />}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* 底部:去分诊兜底入口 + 输入栏 + 免责 */}
      <div className="shrink-0 px-7 pb-5 pt-2">
        <Link
          href="/symptoms"
          className="flex items-center justify-between rounded-xl border border-dashed border-[var(--line)] px-3.5 py-2.5"
        >
          <span className="text-[12.5px] text-ink-soft">
            猫看着不舒服?这边只聊养育
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
          className="mt-2.5 flex items-center gap-2.5 rounded-full border border-[var(--line)] bg-surface py-2 pl-4 pr-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="问问喂养、训练、习惯…"
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
