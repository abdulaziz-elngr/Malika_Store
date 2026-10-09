"use client";

import { useCallback, useSyncExternalStore } from "react";

const KEY = "malika.admin.sidebar";
const listeners = new Set<() => void>();
const read = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } };

/** Sidebar collapsed state, remembered per browser. Server render always starts expanded. */
export function useCollapsed() {
  const collapsed = useSyncExternalStore((cb) => { listeners.add(cb); return () => void listeners.delete(cb); }, read, () => false);
  const toggle = useCallback(() => {
    try { localStorage.setItem(KEY, read() ? "0" : "1"); } catch { /* private mode: state just won't persist */ }
    listeners.forEach((l) => l());
  }, []);
  return [collapsed, toggle] as const;
}
