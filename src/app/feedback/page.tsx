"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { apiUrl } from "@/lib/api-base";
import { isNativeApp, pickPhotoDataUrl } from "@/lib/native-photo";

// 意见反馈 —— 文字(必填)+ 可选配图 + 可选联系方式,落服务端 /api/feedback。
// 边界:不放赞赏 / 收款码(产品红线「不做电商 / 导流」)。

const MAX_TEXT = 2000;
const MAX_IMAGE_MB = 3;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("读取图片失败"));
    r.readAsDataURL(file);
  });
}

function BackBar() {
  return (
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
      <span className="flex-1 text-center text-caption font-medium uppercase tracking-[0.18em] text-ink-soft">
        意见反馈
      </span>
      <span className="size-9" />
    </header>
  );
}

export default function FeedbackPage() {
  const [text, setText] = useState("");
  const [contact, setContact] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [imgErr, setImgErr] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    setImgErr(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImgErr("只能传图片");
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setImgErr(`图片别超过 ${MAX_IMAGE_MB}MB`);
      return;
    }
    try {
      setImage(await fileToDataUrl(file));
    } catch {
      setImgErr("读取图片失败,换一张试试");
    }
  }

  function removeImage() {
    setImage(null);
    setImgErr(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit() {
    const t = text.trim();
    if (!t || status === "sending") return;
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/feedback"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: t,
          contact: contact.trim() || undefined,
          imageDataUrl: image || undefined,
          ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
          path: typeof document !== "undefined" ? document.referrer : "",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || "提交失败,稍后再试。");
        setStatus("error");
        return;
      }
      setStatus("done");
    } catch {
      setError("网络中断了,检查下网络再试。");
      setStatus("error");
    }
  }

  // 提交成功:致谢页
  if (status === "done") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col items-center justify-center px-7 text-center" style={{ background: "var(--gradient-page)" }}>
        <span className="grid size-16 place-items-center rounded-full bg-[var(--accent-soft)] text-display">
          🐱
        </span>
        <h1 className="mt-6 font-serif text-display font-medium tracking-tight text-ink">
          收到啦,谢谢你
        </h1>
        <p className="mt-3 text-body leading-relaxed text-ink-soft">
          每一条都会认真看 —— 你的反馈会让小猫怎么了更好用。
        </p>
        <Link
          href="/"
          className="mt-8 rounded-2xl bg-accent px-8 py-3.5 text-callout font-medium tracking-wide text-accent-fg shadow-[var(--shadow-accent)] transition-transform duration-500 active:scale-[0.985]"
        >
          回首页
        </Link>
      </main>
    );
  }

  const sending = status === "sending";
  const canSend = text.trim().length > 0 && !sending;

  return (
    <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col pb-7" style={{ background: "var(--gradient-page)" }}>
      <BackBar />

      <div className="px-7 pt-6">
        <h1 className="font-serif text-display font-medium leading-snug tracking-tight text-ink">
          有什么想说的?
        </h1>
        <p className="mt-2 text-footnote leading-relaxed text-ink-soft">
          哪里不好用、哪里看不懂、想要什么功能 —— 都告诉我。一个人在做,你的每条话都算数。
        </p>

        {/* 反馈正文 */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_TEXT))}
          disabled={sending}
          rows={6}
          placeholder="比如:多选那一题我以为是单选…… / 希望能加个 XX 功能"
          className="mt-5 w-full resize-none rounded-2xl border border-[var(--line)] bg-surface px-4 py-3.5 text-body leading-relaxed text-ink shadow-[var(--shadow-control)] outline-none placeholder:text-ink-faint focus:border-[var(--accent)] disabled:opacity-60"
        />
        <div className="mt-1 text-right text-caption text-ink-faint">
          {text.length} / {MAX_TEXT}
        </div>

        {/* 配图(可选) */}
        <div className="mt-3">
          {image ? (
            <div className="relative inline-block">
              {/* 用户本地预览,用原生 img 即可(避免 next/image 远端域名配置) */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt="反馈配图预览"
                className="max-h-44 rounded-xl border border-[var(--line)] object-cover shadow-[var(--shadow-control)]"
              />
              <button
                type="button"
                onClick={removeImage}
                aria-label="移除图片"
                className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-ink text-caption text-paper shadow"
              >
                ×
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={async () => {
                if (isNativeApp()) {
                  const url = await pickPhotoDataUrl();
                  if (url) setImage(url);
                } else {
                  fileRef.current?.click();
                }
              }}
              disabled={sending}
              className="flex items-center gap-2 rounded-xl border border-dashed border-[var(--line)] bg-surface px-4 py-3 text-footnote text-ink-soft shadow-[var(--shadow-control)] disabled:opacity-60"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 5v14M5 12h14"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              加张截图(可选)
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onPickImage}
            className="hidden"
          />
          {imgErr && (
            <p className="mt-1.5 text-caption text-[var(--red)]">{imgErr}</p>
          )}
        </div>

        {/* 联系方式(可选) */}
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value.slice(0, 120))}
          disabled={sending}
          placeholder="留个联系方式?想回复你时能找到(可选)"
          className="mt-3 w-full rounded-2xl border border-[var(--line)] bg-surface px-4 py-3 text-body text-ink shadow-[var(--shadow-control)] outline-none placeholder:text-ink-faint focus:border-[var(--accent)] disabled:opacity-60"
        />

        {error && (
          <p className="mt-4 text-footnote leading-relaxed text-[var(--red)]">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={!canSend}
          className={
            "mt-6 w-full rounded-2xl py-4 text-title font-medium tracking-wide transition-colors duration-500 " +
            (canSend
              ? "bg-accent text-accent-fg"
              : "bg-[var(--surface-2)] text-ink-faint")
          }
        >
          {sending ? "提交中…" : "提交反馈"}
        </button>
        <p className="mt-3 text-center text-caption leading-relaxed text-ink-faint">
          只会保存你写的内容,不收集身份信息。
        </p>
      </div>
    </main>
  );
}
