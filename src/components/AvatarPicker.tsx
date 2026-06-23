"use client";

// 头像选择器 —— 自包含,供「新用户欢迎/建第一只猫」首屏用。
// 空态:陶土红虚线圆 + 相机图标 + AI 角标(按 codex 设计稿)。点开底部 sheet:
//   ① 上传真实照片直接当头像  ② 描述 + 可选照片 → /api/avatar AI 生成卡通头像
// 复用稳定后端 /api/avatar(含 NOT_A_CAT 视觉守门 + 限流)与 CatAvatar 展示组件。
// 红线:AI 生成形象只作身份/伴侣角色用,不进医学示意图(此处是猫的头像,合规)。
// 不改 onboarding(避免与并发工作流冲突),逻辑独立。
import { useEffect, useRef, useState } from "react";
import { CatAvatar } from "@/components/CatAvatar";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("读取失败"));
    reader.onerror = () => reject(new Error("照片读取失败"));
    reader.readAsDataURL(file);
  });
}

function badImage(file: File): string | null {
  if (!file.type.startsWith("image/")) return "这看着不是图片,换一张照片。";
  if (file.size > 5 * 1024 * 1024) return "照片不能超过 5MB,压缩一下再试。";
  return null;
}

export function AvatarPicker({
  avatar,
  name,
  onChange,
}: {
  avatar?: string;
  name?: string;
  onChange: (v: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [photo, setPhoto] = useState<string | null>(null); // AI 输入用的照片 dataURL
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notCat, setNotCat] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // 打开时:重置瞬态输入(避免重开残留上次的描述/照片)。
  function openSheet() {
    setDesc("");
    setPhoto(null);
    setError(null);
    setNotCat(false);
    setOpen(true);
  }
  const close = () => setOpen(false);

  // 模态可达性:ESC 关闭 + 锁 body 滚动 + 初始焦点移入 + 关闭还原焦点到触发按钮。
  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => sheetRef.current?.focus(), 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
      trigger?.focus();
    };
  }, [open]);

  async function onUploadAsAvatar(file: File | undefined) {
    if (!file) return;
    const bad = badImage(file);
    if (bad) return setError(bad);
    try {
      onChange(await fileToDataUrl(file));
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "图片读取失败。");
    }
  }

  async function onPickAiPhoto(file: File | undefined) {
    if (!file) return;
    const bad = badImage(file);
    if (bad) return setError(bad);
    try {
      setPhoto(await fileToDataUrl(file));
      setError(null);
      setNotCat(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "照片读取失败。");
    }
  }

  async function generate() {
    if ((!desc.trim() && !photo) || loading) return;
    setLoading(true);
    setError(null);
    setNotCat(false);
    try {
      const res = await fetch("/api/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: desc.trim(),
          photoDataUrl: photo ?? undefined,
          name: name || undefined,
        }),
      });
      const data = (await res.json()) as {
        dataUrl?: string;
        error?: string;
        code?: string;
      };
      if (!res.ok || !data.dataUrl) {
        if (data.code === "NOT_A_CAT") {
          setNotCat(true);
          setError(data.error ?? "上传的照片看着不像是猫。");
          return;
        }
        throw new Error(data.error ?? `生成失败 (${res.status})`);
      }
      onChange(data.dataUrl);
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* 头像圆 —— 有图显示图,空态显示虚线圆+相机+AI 角标 */}
      <button
        ref={triggerRef}
        type="button"
        onClick={openSheet}
        aria-label={avatar ? "更换头像" : "添加头像"}
        className="relative block h-[82px] w-[82px] shrink-0 rounded-full transition-transform active:scale-[0.97]"
      >
        {avatar ? (
          <CatAvatar
            avatar={avatar}
            name={name}
            size={82}
            className="border-[1.5px] border-[rgba(176,90,80,0.5)] shadow-[0_10px_28px_rgba(176,90,80,0.1)]"
          />
        ) : (
          <span
            className="grid h-full w-full place-items-center rounded-full"
            style={{
              border: "1.5px dashed rgba(176,90,80,0.5)",
              background:
                "linear-gradient(180deg, rgba(255,246,232,0.95), rgba(255,255,255,0.95)), #fbf2e4",
              boxShadow: "0 10px 28px rgba(176,90,80,0.1)",
            }}
          >
            {/* 相机图标 */}
            <svg
              width="30"
              height="24"
              viewBox="0 0 30 24"
              fill="none"
              aria-hidden="true"
            >
              <rect
                x="1"
                y="5"
                width="28"
                height="18"
                rx="5"
                stroke="rgba(176,90,80,0.7)"
                strokeWidth="2"
              />
              <path
                d="M9 5l1.5-3h9L21 5"
                stroke="rgba(176,90,80,0.7)"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <circle
                cx="15"
                cy="14"
                r="4.5"
                stroke="rgba(176,90,80,0.7)"
                strokeWidth="2"
              />
            </svg>
          </span>
        )}
        {/* AI 角标(陶土红药丸 + 白描边) */}
        <span
          aria-hidden="true"
          className="absolute -right-[3px] bottom-[6px] grid h-6 min-w-[29px] place-items-center rounded-full text-micro font-bold leading-none text-white"
          style={{ border: "2px solid #fff", background: "var(--accent)" }}
        >
          AI
        </span>
      </button>

      {/* 底部 sheet */}
      {open && (
        <div
          className="fixed inset-0 z-[1000] flex flex-col justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="设置头像"
        >
          <button
            type="button"
            aria-label="关闭"
            onClick={close}
            className="absolute inset-0 bg-[rgba(20,18,16,0.42)]"
          />
          <div
            ref={sheetRef}
            tabIndex={-1}
            className="relative z-10 mx-auto w-full max-w-[430px] rounded-t-2xl bg-surface px-5 pb-[calc(20px+env(safe-area-inset-bottom,0px))] pt-3 shadow-[0_-18px_48px_rgba(54,43,35,0.18)] outline-none"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--hairline)]" />
            <h2 className="font-serif text-title font-semibold text-ink">
              给它一张头像
            </h2>
            <p className="mt-1 text-caption leading-relaxed text-ink-soft">
              可选 —— 只用作它的卡通头像,不影响看病。
            </p>

            {/* 上传真实照片 */}
            <label
              className="mt-4 flex h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl text-callout font-semibold text-white"
              style={{ background: "var(--accent)" }}
            >
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  onUploadAsAvatar(f);
                }}
              />
              拍照 / 从相册选一张
            </label>

            {/* AI 生成 */}
            <div className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-3">
              <div className="text-footnote font-bold text-ink">
                或 · 让 AI 画一只卡通头像
              </div>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={2}
                placeholder="描述一下它:橘色短毛、圆脸、绿眼睛…"
                className="mt-2 w-full resize-none rounded-xl border border-[var(--hairline)] bg-surface p-2.5 text-body text-ink outline-none placeholder:text-ink-faint"
              />
              <div className="mt-2 flex items-center gap-2">
                <label className="cursor-pointer rounded-full border border-[rgba(176,90,80,0.3)] px-3 py-1.5 text-caption font-semibold text-[var(--accent-deep)]">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      onPickAiPhoto(f);
                    }}
                  />
                  {photo ? "已选照片 · 换一张" : "传一张它的照片(可选)"}
                </label>
                {photo && (
                  <button
                    type="button"
                    onClick={() => setPhoto(null)}
                    className="text-caption text-ink-faint"
                  >
                    移除
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={generate}
                disabled={loading || (!desc.trim() && !photo)}
                className="mt-3 h-11 w-full rounded-full text-callout font-bold text-white disabled:opacity-50"
                style={{ background: "var(--accent)" }}
              >
                {loading ? "生成中…" : "生成卡通头像"}
              </button>
            </div>

            {error && (
              <p role="alert" className="mt-3 text-footnote leading-relaxed text-[var(--red)]">
                {error}
                {notCat && "(换一张更清楚的猫照片,或用默认头像)"}
              </p>
            )}

            <button
              type="button"
              onClick={() => {
                onChange(undefined);
                close();
              }}
              className="mt-3 h-11 w-full rounded-full bg-[var(--surface-2)] text-body font-semibold text-ink-soft"
            >
              先用默认头像
            </button>
          </div>
        </div>
      )}
    </>
  );
}
