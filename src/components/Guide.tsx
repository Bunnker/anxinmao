"use client";

// 新手使用教程 —— 首次进入自动弹一次(localStorage 记标记),首页可随时重开。
// 文案走「第一次养猫也能懂」的朋友口吻,避免产品黑话。
// 4 屏:先分急不急 → 怎么用 → 依据边界 → 建档开始。
import { useState } from "react";

const TIERS = ["var(--red)", "var(--amber)", "var(--green)"];

// 同一只橘色虎斑小奶猫的 4 种表情(public/guide/,透明背景)。
const CAT_SRC = [
  "/guide/cat-worry.png", // 0 担心
  "/guide/cat-curious.png", // 1 好奇
  "/guide/cat-calm.png", // 2 安心
  "/guide/cat-happy.png", // 3 开心
];

function GuideCat({ variant }: { variant: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={CAT_SRC[variant] ?? CAT_SRC[0]}
      alt=""
      aria-hidden="true"
      width={150}
      height={150}
      className="h-[150px] w-[150px] object-contain"
    />
  );
}

function Card({
  variant,
  badge,
  title,
  children,
}: {
  variant: number;
  badge: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-4 flex justify-center">
        <GuideCat variant={variant} />
      </div>
      <span className="text-[11px] font-semibold tracking-[0.2em] text-accent">
        {badge}
      </span>
      <h2 className="mt-2.5 font-serif text-[1.95rem] font-medium leading-[1.2] tracking-tight text-ink">
        {title}
      </h2>
      <div className="mt-3.5 text-[14.5px] leading-relaxed text-ink-soft">
        {children}
      </div>
    </div>
  );
}

const TOTAL = 4;

export function Guide({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const last = step === TOTAL - 1;

  return (
    <div
      className="fixed inset-0 z-50"
      style={{ background: "#faf1e1" }}
      role="dialog"
      aria-modal="true"
      aria-label="安心猫使用教程"
    >
      <div className="mx-auto flex h-dvh max-w-[430px] flex-col px-7 pb-8 pt-5">
        {/* 进度 + 跳过 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: TOTAL }).map((_, i) => (
              <span
                key={i}
                className="h-1 rounded-full transition-all"
                style={{
                  width: i === step ? 22 : 7,
                  background: i <= step ? "var(--accent)" : "var(--line)",
                }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 px-1 text-[13px] tracking-wide text-ink-faint"
          >
            跳过
          </button>
        </div>

        {/* 内容 */}
        <div className="flex flex-1 flex-col justify-center">
          {step === 0 && (
            <Card variant={0} badge="嗨,新手铲屎官" title="猫猫不舒服?先别慌">
              第一次养猫,一点点不对劲都会心里咯噔一下,太正常啦。
              <br />
              安心猫陪你先看看:
              <span className="font-medium text-ink">要不要马上找医生、能不能先在家守一守</span>。
            </Card>
          )}

          {step === 1 && (
            <Card variant={1} badge="点一点就会用" title="先选一个最像的情况">
              <ul className="flex flex-col gap-3">
                <li>
                  <span className="font-medium text-ink">① 猫猫哪里不对劲?</span>
                  <br />
                  选一个最像的情况,再答几个小问题:
                  <span className="mx-1 inline-flex items-center gap-1 align-middle">
                    {TIERS.map((c) => (
                      <span
                        key={c}
                        className="size-2 rounded-full"
                        style={{ background: c }}
                      />
                    ))}
                  </span>
                  <br />
                  <span className="text-[13px]">
                    红=快找医生 · 黄=尽快看看 · 绿=先守着观察
                  </span>
                </li>
                <li>
                  <span className="font-medium text-ink">② 还想问一句?</span>
                  <br />
                  直接打字告诉我,吃饭、喝水、尿尿、便便、小习惯都可以问。
                </li>
                <li>
                  <span className="font-medium text-ink">③ 只是有点慌?</span>
                  <br />
                  可以翻翻安心知识,有些小状况看着吓人,其实先观察就好。
                </li>
              </ul>
            </Card>
          )}

          {step === 2 && (
            <Card variant={2} badge="安心一点点" title="该急的时候会认真提醒">
              安心猫不是医生,但会照着医生会关心的小线索,陪你先把心放稳一点。
              <br />
              <br />
              如果猫猫喘不上气、抽搐、流好多血、尿不出来、吃到百合或人药,它会很认真地提醒你
              <span className="font-medium text-ink">赶紧联系动物医院</span>。
              <br />
              <br />
              没那么急的时候,它会告诉你先盯吃喝、精神、尿尿这些小变化。
            </Card>
          )}

          {step === 3 && (
            <Card variant={3} badge="开始前" title="让它先认识你家猫猫">
              猫猫几个月、几斤、公猫母猫、打过针没,都会影响提醒。
              <br />
              先简单填一下就好,以后可以慢慢补。想马上开始,也可以直接选情况。
            </Card>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center gap-3">
          {!last && (
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 px-2 py-3 text-[13.5px] text-ink-faint"
            >
              直接用
            </button>
          )}
          <button
            type="button"
            onClick={() => (last ? onClose() : setStep(step + 1))}
            className="flex-1 rounded-2xl bg-accent px-6 py-4 text-center text-[15px] font-medium text-accent-fg shadow-[0_5px_18px_-9px_rgba(60,40,20,0.45)] transition-transform active:translate-y-px"
          >
            {last ? "好呀,开始用 →" : "下一步"}
          </button>
        </div>
      </div>
    </div>
  );
}
