"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Disclaimer } from "@/components/Disclaimer";
import {
  getFlow,
  decideTier,
  hasRedFlag,
  selectedClaimIds,
  triageTranscript,
  SYMPTOM_LABELS,
} from "@/lib/triage";
import { createTriageHandoffId, saveTriageHandoff } from "@/lib/triage-handoff";
import { SymptomIcon, iconForOption } from "@/lib/triage-icons";
import { loadStore, saveStore } from "@/lib/storage";
import type { CatRecord, RiskTier } from "@/types/cat";

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 分诊完成时,把这次写进猫的历史记录(长期记忆 → 首页"最近")。
function recordTriage(symptom: string, tier: RiskTier, claimIds: string[]) {
  const store = loadStore();
  if (!store) return;
  const catId = store.activeCatId ?? store.cats[0]?.id;
  if (!catId) return;
  const label = SYMPTOM_LABELS[symptom] ?? "不舒服";
  const tierShort = tier === "red" ? "红档" : tier === "yellow" ? "黄档" : "绿档";
  const rec: CatRecord = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : "r-" + Math.random().toString(36).slice(2, 10),
    catId,
    date: new Date().toISOString(),
    kind: "triage",
    symptom: label,
    symptomKey: symptom, // 症状键 —— 让「最近」能点回这张报告卡
    tier,
    ...(claimIds.length > 0 ? { claimIds } : {}),
    summary: `${label} · ${tierShort}`,
  };
  saveStore({ ...store, records: [rec, ...store.records] });
}

function TriageSession({ symptom }: { symptom: string }) {
  const router = useRouter();
  const flow = useMemo(() => getFlow(symptom), [symptom]);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[][]>([]);

  const total = flow.questions.length;
  const q = flow.questions[step];
  const selected = answers[step] ?? [];
  const answered = selected.length > 0;
  const redNow = hasRedFlag(q, selected);
  const isLast = step === total - 1;

  function choose(optIdx: number) {
    setAnswers((prev) => {
      const next = prev.slice();
      if (!q.multi) {
        next[step] = [optIdx];
        return next;
      }
      // 否定 / 兜底项(exclusive)与其它项互斥:选它 → 清空其它;选其它项 → 自动取消它。
      const noneIdx = q.options.findIndex((o) => o.exclusive);
      const cur = next[step] ? next[step].slice() : [];
      const at = cur.indexOf(optIdx);
      if (at >= 0) {
        cur.splice(at, 1);
      } else if (optIdx === noneIdx) {
        next[step] = [optIdx];
        return next;
      } else {
        const ni = cur.indexOf(noneIdx);
        if (ni >= 0) cur.splice(ni, 1);
        cur.push(optIdx);
      }
      next[step] = cur;
      return next;
    });
  }

  function toReport(tier: RiskTier) {
    const claimIds = selectedClaimIds(flow, answers);
    recordTriage(flow.symptom, tier, claimIds);
    const params = new URLSearchParams({ tier, symptom: flow.symptom });
    if (claimIds.length > 0) params.set("claims", claimIds.join(","));
    const qa = triageTranscript(flow, answers).slice(0, 800);
    const handoffId = createTriageHandoffId();
    saveTriageHandoff(handoffId, {
      symptom: flow.symptom,
      tier,
      claimIds,
      qa,
    });
    params.set("handoff", handoffId);
    router.push(`/report?${params.toString()}`);
  }

  function next() {
    if (!answered) return;
    if (redNow) {
      toReport("red"); // 红旗 → 中途急停,直接看处理
      return;
    }
    if (isLast) {
      toReport(decideTier(flow, answers));
      return;
    }
    setStep(step + 1);
  }

  function back() {
    if (step > 0) setStep(step - 1);
    else router.push("/symptoms");
  }

  const nextLabel = redNow ? "立刻看处理 →" : isLast ? "看结果 →" : "下一题 →";

  return (
    <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col px-7 pb-7 pt-3" style={{ background: "var(--gradient-page)" }}>
      {/* 顶栏 + 进度 */}
      <header className="flex items-center">
        <button
          type="button"
          onClick={back}
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
          分诊中 · {step + 1} / {total}
        </span>
        <span className="size-9" />
      </header>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--line-soft)]">
        <div
          className="h-full rounded-full bg-accent transition-all duration-300"
          style={{ width: `${((step + 1) / total) * 100}%` }}
        />
      </div>

      {/* 症状锚点 */}
      <div className="mt-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-[12px] text-ink-soft shadow-[var(--shadow-control)]">
          <SymptomIcon id={flow.symptom} size={15} className="text-accent" />
          症状 · {SYMPTOM_LABELS[flow.symptom]}
        </span>
      </div>

      {/* 问题 */}
      <div className="mt-4">
        <h1 className="text-display font-semibold leading-snug tracking-tight text-ink">
          {q.text}
          {q.multi && (
            <span className="ml-1.5 align-[0.12em] text-[0.6em] font-normal text-ink-faint">
              可多选
            </span>
          )}
        </h1>
        {q.hint && (
          <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{q.hint}</p>
        )}
      </div>

      {/* 选项 */}
      <div
        className="mt-6 flex flex-col gap-2.5"
        data-guide-target="guide-triage-questions"
      >
        {q.options.map((opt, i) => {
          const on = selected.includes(i);
          const optIcon = iconForOption(opt.label);
          return (
            <button
              key={i}
              type="button"
              onClick={() => choose(i)}
              className={
                "flex items-center gap-3 rounded-2xl border px-5 py-4 text-left shadow-[var(--shadow-card)] transition-all duration-500 " +
                (on
                  ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                  : "border-[var(--line)] bg-surface")
              }
            >
              {optIcon && (
                <SymptomIcon
                  id={optIcon}
                  size={20}
                  className={on ? "shrink-0 text-accent" : "shrink-0 text-ink/40"}
                />
              )}
              <span className="flex-1 text-callout text-ink">{opt.label}</span>
              <span
                className={
                  "grid size-5 shrink-0 place-items-center border " +
                  // 多选用方框、单选用圆圈 —— 形状即语义,符合表单直觉
                  (q.multi ? "rounded-md " : "rounded-full ") +
                  (on
                    ? "border-[var(--accent)] bg-accent text-accent-fg"
                    : "border-[var(--hairline)]")
                }
                aria-hidden="true"
              >
                {on && <CheckIcon />}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex-1" />

      {/* 下一步 */}
      <button
        type="button"
        onClick={next}
        disabled={!answered}
        className={
          "mt-7 w-full rounded-2xl py-4 text-[16px] font-medium tracking-wide transition-colors duration-500 " +
          (answered
            ? "bg-accent text-accent-fg"
            : "bg-[var(--surface-2)] text-ink-faint")
        }
      >
        {nextLabel}
      </button>
      {redNow && (
        <p className="mt-2.5 text-center text-[12px] text-[var(--red)]">
          你选的这项可能要紧 —— 直接看处理建议,不用问完。
        </p>
      )}

      <Disclaimer />
    </main>
  );
}

function TriageContent() {
  const searchParams = useSearchParams();
  const symptom = searchParams.get("symptom") ?? "other";
  return <TriageSession key={symptom} symptom={symptom} />;
}

export default function TriagePage() {
  return (
    <Suspense fallback={<main className="min-h-dvh" aria-hidden="true" />}>
      <TriageContent />
    </Suspense>
  );
}
