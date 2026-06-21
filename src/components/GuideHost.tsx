"use client";

import { useCallback, useEffect, useState } from "react";
import { Guide } from "@/components/Guide";
import { readPersisted, writePersisted } from "@/lib/persist";
import { loadStore } from "@/lib/storage";

const GUIDE_SEEN_KEY = "catTriage:guideSeen:v1";
const GUIDE_OPEN_EVENT = "catTriage:openGuide";

export function openGuide() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(GUIDE_OPEN_EVENT));
}

export function GuideHost() {
  const [open, setOpen] = useState(false);

  const maybeOpenFirstRun = useCallback(() => {
    if (readPersisted(GUIDE_SEEN_KEY)) return;
    const store = loadStore();
    if (store && store.cats.length > 0) setOpen(true);
  }, []);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(GUIDE_OPEN_EVENT, onOpen);
    window.addEventListener("catstore:updated", maybeOpenFirstRun);
    window.addEventListener("storage", maybeOpenFirstRun);
    queueMicrotask(maybeOpenFirstRun);
    return () => {
      window.removeEventListener(GUIDE_OPEN_EVENT, onOpen);
      window.removeEventListener("catstore:updated", maybeOpenFirstRun);
      window.removeEventListener("storage", maybeOpenFirstRun);
    };
  }, [maybeOpenFirstRun]);

  const close = useCallback(() => {
    setOpen(false);
    writePersisted(GUIDE_SEEN_KEY, "1");
  }, []);

  return open ? <Guide onClose={close} /> : null;
}
