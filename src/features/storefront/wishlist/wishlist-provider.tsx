"use client";

import { useTranslations } from "next-intl";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { usePathname } from "@/i18n/navigation";

const KEY = "malika.wishlist.v1";
type Ctx = { ids: string[]; count: number; has: (id: string) => boolean; toggle: (id: string) => void; authenticated: boolean | null };
const WishlistContext = createContext<Ctx>({ ids: [], count: 0, has: () => false, toggle: () => {}, authenticated: null });
export const useWishlist = () => useContext(WishlistContext);

const readLocal = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
};
const writeLocal = (ids: string[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* storage unavailable (private mode) — the wishlist still works for this session */
  }
};

/**
 * Guests keep their wishlist in the browser. Signed-in customers keep it in the database;
 * on sign-in the browser list is merged in, and on sign-out the local copy is wiped so nothing lingers on a shared device.
 */
export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations("wishlist");
  const toast = useToast();
  const pathname = usePathname();
  const [ids, setIds] = useState<string[]>([]);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const was = useRef<boolean | null>(null);

  // Re-checks the session on every navigation, so signing in or out is picked up without a full reload.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = readLocal();
      try {
        const res = await fetch("/api/wishlist", { cache: "no-store" });
        const data = (await res.json()) as { authenticated: boolean; ids: string[] };
        if (cancelled) return;
        if (data.authenticated) {
          let server = data.ids;
          if (local.length && !local.every((id) => server.includes(id))) {
            const merged = await fetch("/api/wishlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "merge", ids: local }) });
            if (merged.ok) server = ((await merged.json()) as { ids: string[] }).ids;
          }
          if (cancelled) return;
          setIds(server);
          writeLocal(server);
        } else if (was.current === true) {
          writeLocal([]);
          setIds([]);
        } else {
          setIds(local);
        }
        was.current = data.authenticated;
        setAuthenticated(data.authenticated);
      } catch {
        if (!cancelled) setIds(local);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const toggle = useCallback(
    (id: string) => {
      const on = !ids.includes(id);
      const next = on ? [id, ...ids] : ids.filter((x) => x !== id);
      setIds(next);
      writeLocal(next);
      toast.push(on ? t("added") : t("removed"), "info");
      if (authenticated) {
        fetch("/api/wishlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: on ? "add" : "remove", productId: id }) })
          .then((r) => {
            if (!r.ok) throw new Error();
          })
          .catch(() => {
            setIds(ids);
            writeLocal(ids);
            toast.push(t("syncFailed"), "error");
          });
      }
    },
    [ids, authenticated, toast, t],
  );

  const value = useMemo<Ctx>(() => ({ ids, count: ids.length, has: (id) => ids.includes(id), toggle, authenticated }), [ids, toggle, authenticated]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}
