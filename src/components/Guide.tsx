"use client";

// 新手使用教程 —— 首次进入自动弹一次(localStorage 记标记),首页可随时重开。
// 文案走「小白 / 朋友口吻」,每屏配一张 gpt-image-2 出的超可爱橘猫插画(透明 PNG)。
// 4 屏:这是啥 → 能干三件事 → 靠不靠谱 → 走起。
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
      width={140}
      height={140}
      className="h-[140px] w-[140px] object-contain drop-shadow-[0_8px_16px_rgba(60,40,20,0.12)]"
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
      className="fixed inset-0 z-50 bg-paper"
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
            <Card variant={0} badge="嘿,新手铲屎官" title="猫猫不舒服?先别慌">
              刚养猫,看它哪儿不对就心慌 —— 太正常了。
              <br />
              这个小工具陪你看:
              <span className="font-medium text-ink">要不要去医院、现在先做点啥</span>。
            </Card>
          )}

          {step === 1 && (
            <Card variant={1} badge="在这儿能干三件事" title="点一点,就会用">
              <ul className="flex flex-col gap-3">
                <li>
                  <span className="font-medium text-ink">① 它好像生病了</span>
                  <br />
                  点几下答几个小问题,告诉你严不严重:
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
                    (红=快去医院 · 黄=尽快看 · 绿=先在家盯着)
                  </span>
                </li>
                <li>
                  <span className="font-medium text-ink">② 想问点啥</span>
                  <br />
                  直接打字,像问个懂猫的朋友 —— 生病、喂养、调皮都能聊。
                </li>
                <li>
                  <span className="font-medium text-ink">③ 有点慌</span>
                  <br />
                  翻翻「看着吓人、其实没事」那些情况,先安个心。
                </li>
              </ul>
            </Card>
          )}

          {step === 2 && (
            <Card variant={2} badge="它靠谱吗" title="照着医生的资料来的">
              里面的判断,都照着几家
              <span className="font-medium text-ink">权威猫医院的资料</span>整理,而且
              <span className="font-medium text-ink">特意往严了说</span> —— 宁可让你白跑一趟,也不让你漏掉急事。
              <br />
              <br />
              真碰上要命的(喘不上气、抽搐、大出血、尿不出、吃错东西),它会直接喊你
              <span className="font-medium text-ink">「马上去医院」</span>。
              <br />
              <br />
              不过它<span className="font-medium text-ink">不是医生</span>,拿不准还是得找大夫。
            </Card>
          )}

          {step === 3 && (
            <Card variant={3} badge="走,开始吧" title="先让它认识下你的猫">
              填一下猫几个月、公还是母,给的建议会更贴它。
              <br />
              懒得填也没关系 —— 直接选症状就能用。
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
            {last ? "好啦,开始用 →" : "下一步"}
          </button>
        </div>
      </div>
    </div>
  );
}
