"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function StableTitle({ title }: { title: string }) {
  const pathname = usePathname();

  useEffect(() => {
    let raf = 0;

    const applyTitle = () => {
      if (document.title !== title) {
        document.title = title;
      }
    };

    applyTitle();
    raf = window.requestAnimationFrame(applyTitle);

    const applyWhenVisible = () => {
      if (!document.hidden) applyTitle();
    };

    window.addEventListener("pageshow", applyTitle);
    window.addEventListener("focus", applyTitle);
    window.addEventListener("catstore:updated", applyTitle);
    window.addEventListener("storage", applyTitle);
    document.addEventListener("visibilitychange", applyWhenVisible);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("pageshow", applyTitle);
      window.removeEventListener("focus", applyTitle);
      window.removeEventListener("catstore:updated", applyTitle);
      window.removeEventListener("storage", applyTitle);
      document.removeEventListener("visibilitychange", applyWhenVisible);
    };
  }, [pathname, title]);

  return null;
}
