"use client";

import { useState } from "react";
import type { CaseSummaryOutput } from "@/lib/case-summary";

type Props = {
  source: "report" | "chat";
  label: string;
  payload: Record<string, unknown>;
  tier?: string;
  symptom?: string;
  hasCatProfile: boolean;
  hasTriageContext: boolean;
};

type CaseSummaryEventName =
  | "case_summary_opened"
  | "case_summary_generated"
  | "case_summary_copied"
  | "case_summary_regenerated"
  | "case_summary_from_report"
  | "case_summary_from_chat";

function clientRegionPayload() {
  return {
    locale: navigator.language,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

async function trackCaseSummaryEvent(
  name: CaseSummaryEventName,
  meta: Record<string, unknown> = {},
) {
  try {
    await fetch("/api/case-summary/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, meta }),
    });
  } catch {
    // Task 7 will add this endpoint. Until then, analytics must never block UI.
  }
}

function isCaseSummaryOutput(value: unknown): value is CaseSummaryOutput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const summary = value as Record<string, unknown>;
  return (
    typeof summary.userSummary === "string" &&
    typeof summary.doctorNote === "string" &&
    Array.isArray(summary.doctorQuestions) &&
    Array.isArray(summary.dontDo) &&
    typeof summary.copyText === "string"
  );
}

export function CaseSummaryPanel({
  source,
  label,
  payload,
  tier,
  symptom,
  hasCatProfile,
  hasTriageContext,
}: Props) {
  const [summary, setSummary] = useState<CaseSummaryOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const baseMeta = {
    source,
    tier,
    symptom,
    hasCatProfile,
    hasTriageContext,
  };

  async function generate(regenerate = false) {
    if (loading) return;

    setLoading(true);
    setError("");
    setCopied(false);

    void trackCaseSummaryEvent(
      regenerate ? "case_summary_regenerated" : "case_summary_opened",
      baseMeta,
    );
    void trackCaseSummaryEvent(
      source === "report"
        ? "case_summary_from_report"
        : "case_summary_from_chat",
      baseMeta,
    );

    try {
      const response = await fetch("/api/case-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          source,
          region: clientRegionPayload(),
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        summary?: unknown;
        error?: unknown;
      } | null;

      if (!response.ok) {
        const message =
          typeof body?.error === "string"
            ? body.error
            : "病情说明生成失败,请稍后再试。";
        setError(message);
        return;
      }

      if (!isCaseSummaryOutput(body?.summary)) {
        setError("病情说明生成失败,请稍后再试。");
        return;
      }

      setSummary(body.summary);
      void trackCaseSummaryEvent("case_summary_generated", {
        ...baseMeta,
        contentLength: body.summary.copyText.length,
        includesUnknown:
          body.summary.userSummary.includes("不详") ||
          body.summary.copyText.includes("不详"),
      });
    } catch {
      setError("网络有点不稳定,请稍后再试。");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!summary) return;

    setError("");
    try {
      await navigator.clipboard.writeText(summary.copyText);
      setCopied(true);
      void trackCaseSummaryEvent("case_summary_copied", {
        ...baseMeta,
        contentLength: summary.copyText.length,
        includesUnknown: summary.copyText.includes("不详"),
      });
    } catch {
      setError("复制失败,请长按下方病情说明手动复制。");
    }
  }

  return (
    <section className="mt-3 rounded-[28px] bg-surface p-4 shadow-[var(--shadow-control)]">
      {!summary ? (
        <button
          type="button"
          onClick={() => void generate()}
          disabled={loading}
          className="flex w-full items-center justify-between gap-3 rounded-[22px] bg-accent px-4 py-3.5 text-left text-[14.5px] font-medium text-accent-fg shadow-[var(--shadow-accent)] transition-transform duration-300 active:scale-[0.985] disabled:opacity-60"
        >
          <span>{loading ? "正在整理病情说明..." : label}</span>
          <span aria-hidden="true">{loading ? "..." : "→"}</span>
        </button>
      ) : (
        <div>
          <p className="whitespace-pre-wrap text-[14.5px] leading-relaxed text-ink">
            {summary.userSummary}
          </p>

          <div className="mt-3 rounded-[22px] border border-[var(--line)] bg-white/65 p-3.5 shadow-[var(--shadow-control)]">
            <p className="text-[12px] font-medium tracking-wide text-ink-soft">
              给医生看的病情说明
            </p>
            <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink">
              {summary.copyText}
            </p>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => void copy()}
              disabled={loading}
              className="flex-1 rounded-[22px] bg-accent px-4 py-3 text-[14px] font-medium text-accent-fg shadow-[var(--shadow-accent)] transition-transform duration-300 active:scale-[0.985] disabled:opacity-60"
            >
              {copied ? "已复制" : "复制给医生"}
            </button>
            <button
              type="button"
              onClick={() => void generate(true)}
              disabled={loading}
              className="rounded-[22px] bg-[var(--surface-2)] px-4 py-3 text-[14px] font-medium text-ink shadow-[var(--shadow-control)] transition-transform duration-300 active:scale-[0.985] disabled:opacity-60"
            >
              {loading ? "整理中" : "重整"}
            </button>
          </div>
        </div>
      )}

      {error ? (
        <p className="mt-3 text-[13px] leading-relaxed text-[var(--red)]">
          {error}
        </p>
      ) : null}
    </section>
  );
}
