"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { loadStore } from "@/lib/storage";

const TABS = [
  { href: "/", label: "首页", icon: "home" },
  { href: "/symptoms", label: "分诊", icon: "triage" },
  { href: "/behavior", label: "问答", icon: "chat" },
  { href: "/pets", label: "毛孩子", icon: "profile" },
] as const;

// /pets 是档案展示页(显 TabBar);/onboarding 是编辑/添加表单(全屏,不显 TabBar)。
const SHOW_PATHS = ["/", "/symptoms", "/behavior", "/pets", "/knowledge"];

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 11.5L12 3l9 8.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8.5z"
        stroke="currentColor"
        strokeWidth={active ? "1.9" : "1.6"}
        strokeLinejoin="round"
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? "0.12" : "0"}
      />
      <path
        d="M9 21v-8h6v8"
        stroke="currentColor"
        strokeWidth={active ? "1.9" : "1.6"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TriageIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="3" y="3" width="18" height="18" rx="5"
        stroke="currentColor"
        strokeWidth={active ? "1.9" : "1.6"}
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? "0.12" : "0"}
      />
      <path
        d="M12 8v8M8 12h8"
        stroke="currentColor"
        strokeWidth={active ? "2.1" : "1.8"}
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChatIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 11.5a8.4 8.4 0 0 1-8.5 8.5 9 9 0 0 1-3.8-.9L3 21l1.9-5.6A8.4 8.4 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5z"
        stroke="currentColor"
        strokeWidth={active ? "1.9" : "1.6"}
        strokeLinejoin="round"
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? "0.12" : "0"}
      />
    </svg>
  );
}

// 猫爪 —— 「毛孩子」tab(猫咪档案)
function ProfileIcon({ active }: { active: boolean }) {
  const fill = active ? "currentColor" : "none";
  const fo = active ? "0.18" : "0";
  const sw = active ? "1.9" : "1.6";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <ellipse cx="12" cy="15.5" rx="4.6" ry="3.7" stroke="currentColor" strokeWidth={sw} fill={fill} fillOpacity={fo} />
      <circle cx="6" cy="10" r="1.85" stroke="currentColor" strokeWidth={sw} fill={fill} fillOpacity={fo} />
      <circle cx="9.7" cy="6.7" r="1.85" stroke="currentColor" strokeWidth={sw} fill={fill} fillOpacity={fo} />
      <circle cx="14.3" cy="6.7" r="1.85" stroke="currentColor" strokeWidth={sw} fill={fill} fillOpacity={fo} />
      <circle cx="18" cy="10" r="1.85" stroke="currentColor" strokeWidth={sw} fill={fill} fillOpacity={fo} />
    </svg>
  );
}

function TabIcon({ name, active }: { name: string; active: boolean }) {
  if (name === "home") return <HomeIcon active={active} />;
  if (name === "triage") return <TriageIcon active={active} />;
  if (name === "chat") return <ChatIcon active={active} />;
  return <ProfileIcon active={active} />;
}

export function TabBar() {
  const pathname = usePathname();
  const [hasCat, setHasCat] = useState(false);

  useEffect(() => {
    const check = () => {
      const s = loadStore();
      setHasCat(!!s && s.cats.length > 0);
    };
    check();
    // storage: 跨 tab 变化; catstore:updated: 同窗口写入后手动派发
    window.addEventListener("storage", check);
    window.addEventListener("catstore:updated", check);
    return () => {
      window.removeEventListener("storage", check);
      window.removeEventListener("catstore:updated", check);
    };
  }, []);

  const show = SHOW_PATHS.includes(pathname) && hasCat;
  if (!show) return null;

  // /knowledge 归属首页 tab
  const activeHref = pathname === "/knowledge" ? "/" : pathname;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "rgba(247,246,243,0.88)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        borderTop: "0.5px solid rgba(28,26,22,0.10)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="mx-auto flex h-14 max-w-[430px] items-center">
        {TABS.map((tab) => {
          const active = activeHref === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className="flex flex-1 flex-col items-center justify-center gap-[3px]"
              style={{ color: active ? "var(--accent)" : "var(--ink-ghost)" }}
            >
              <TabIcon name={tab.icon} active={active} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
