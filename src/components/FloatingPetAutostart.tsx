"use client";

// 重开 App 时,若用户上次开着桌宠且权限仍在 → 自动放回桌面(PRD §5.7「记住偏好」)。
// 仅 App 壳 + 安卓;静默失败。
import { useEffect } from "react";
import { FloatingPet, isFloatingPetSupported } from "@/lib/floating-pet-bridge";
import { readPersisted } from "@/lib/persist";

export function FloatingPetAutostart() {
  useEffect(() => {
    if (!isFloatingPetSupported()) return;
    if (readPersisted("floatingPet:on") !== "1") return;
    void (async () => {
      try {
        const { granted } = await FloatingPet.requestPermission();
        if (granted) await FloatingPet.show();
      } catch {
        /* 静默 */
      }
    })();
  }, []);
  return null;
}
