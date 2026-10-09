"use client";

import { useSyncExternalStore } from "react";

const q = "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";
const subscribe = (cb: () => void) => {
  const m = window.matchMedia(q);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

/** True only on desktop-class pointers where the user has not asked for reduced motion. */
export function useFinePointer() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(q).matches, () => false);
}
