"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { MAX_LINE_QTY, type CartItem, type CartLine, type CartPricing } from "@/lib/cart-types";
import type { DeliveryMethodId } from "@/lib/shipping";

const KEY = "malika.cart.v2";
export type QuoteExtras = { deliveryMethod?: DeliveryMethodId | null; phone?: string | null };
/** A cart row: the priced line when the server has answered, otherwise null (rendered as a skeleton). */
export type ViewLine = { variantId: string; quantity: number; line: CartLine | null };

type Ctx = {
  ready: boolean;
  items: CartItem[];
  count: number;
  rows: ViewLine[];
  pricing: CartPricing | null;
  pricingLoading: boolean;
  pricingFailed: boolean;
  coupon: string | null;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  add: (variantId: string, quantity?: number, opts?: { openDrawer?: boolean }) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  applyCoupon: (code: string) => void;
  removeCoupon: () => void;
  setExtras: (e: QuoteExtras) => void;
};

const CartContext = createContext<Ctx | null>(null);
export function useCart() {
  const c = useContext(CartContext);
  if (!c) throw new Error("useCart must be used inside <CartProvider>");
  return c;
}

type Stored = { items: CartItem[]; coupon: string | null };
function read(): Stored {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null") as Stored | null;
    const items = Array.isArray(v?.items) ? v!.items.filter((i) => typeof i?.variantId === "string" && Number.isInteger(i.quantity) && i.quantity > 0).slice(0, 30) : [];
    return { items, coupon: typeof v?.coupon === "string" ? v.coupon : null };
  } catch {
    return { items: [], coupon: null };
  }
}

/**
 * The browser stores only variant ids and quantities. Prices, stock, coupon discount and shipping
 * always come from the server (/api/cart/price), so a tampered localStorage can never change what is charged.
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const [coupon, setCoupon] = useState<string | null>(null);
  const [pricing, setPricing] = useState<CartPricing | null>(null);
  const [pricingLoading, setLoading] = useState(false);
  const [pricingFailed, setFailed] = useState(false);
  const [isOpen, setOpen] = useState(false);
  const [extras, setExtrasState] = useState<QuoteExtras>({});

  // Hydrate from localStorage and keep several tabs in sync.
  useEffect(() => {
    const s = read();
    setItems(s.items);
    setCoupon(s.coupon);
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) {
        const n = read();
        setItems(n.items);
        setCoupon(n.coupon);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ items, coupon } satisfies Stored));
    } catch {
      /* storage unavailable — the cart still works for this session */
    }
  }, [items, coupon, ready]);

  // Ask the server for authoritative prices, stock, coupon and shipping whenever the inputs change.
  const itemsKey = JSON.stringify(items);
  const extrasKey = JSON.stringify(extras);
  const latest = useRef(0);
  useEffect(() => {
    if (!ready) return;
    if (!items.length) {
      setPricing(null);
      setLoading(false);
      return;
    }
    const ticket = ++latest.current;
    const ctrl = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/cart/price", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items, coupon, deliveryMethod: extras.deliveryMethod ?? null, phone: extras.phone ?? null }),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as CartPricing;
        if (ticket !== latest.current) return;
        setPricing(data);
        setFailed(false);
        // Reconcile the stored cart with reality: drop vanished variants, clamp quantities to stock.
        setItems((cur) => {
          let changed = false;
          const next = cur
            .filter((i) => {
              const gone = data.missing.includes(i.variantId);
              if (gone) changed = true;
              return !gone;
            })
            .map((i) => {
              const l = data.lines.find((x) => x.variantId === i.variantId);
              if (l && l.quantity > 0 && l.quantity !== i.quantity) {
                changed = true;
                return { ...i, quantity: l.quantity };
              }
              return i;
            });
          return changed ? next : cur;
        });
      } catch (e) {
        if ((e as Error).name !== "AbortError" && ticket === latest.current) setFailed(true);
      } finally {
        if (ticket === latest.current) setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
    // itemsKey/extrasKey stand in for the objects so the effect only reruns on real changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, itemsKey, extrasKey, coupon]);

  const add = useCallback((variantId: string, quantity = 1, opts?: { openDrawer?: boolean }) => {
    setItems((cur) => {
      const found = cur.find((i) => i.variantId === variantId);
      return found ? cur.map((i) => (i.variantId === variantId ? { ...i, quantity: Math.min(MAX_LINE_QTY, i.quantity + quantity) } : i)) : [...cur, { variantId, quantity: Math.min(MAX_LINE_QTY, quantity) }];
    });
    if (opts?.openDrawer !== false) setOpen(true);
  }, []);
  const setQuantity = useCallback((variantId: string, quantity: number) => {
    if (quantity < 1) return setItems((cur) => cur.filter((i) => i.variantId !== variantId));
    setItems((cur) => cur.map((i) => (i.variantId === variantId ? { ...i, quantity: Math.min(MAX_LINE_QTY, quantity) } : i)));
  }, []);
  const remove = useCallback((variantId: string) => setItems((cur) => cur.filter((i) => i.variantId !== variantId)), []);
  const clear = useCallback(() => {
    setItems([]);
    setCoupon(null);
    setPricing(null);
  }, []);
  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);
  const setExtras = useCallback((e: QuoteExtras) => setExtrasState((cur) => (JSON.stringify(cur) === JSON.stringify(e) ? cur : e)), []);

  const rows = useMemo<ViewLine[]>(
    () =>
      items.map((i) => {
        const line = pricing?.lines.find((l) => l.variantId === i.variantId) ?? null;
        // Optimistic: show the quantity the customer just chose (capped by known stock) until the server confirms.
        const inStock = !!line && line.stock > 0;
        const quantity = inStock ? Math.min(i.quantity, line.stock) : i.quantity;
        return { variantId: i.variantId, quantity, line: line ? { ...line, quantity: inStock ? quantity : 0, lineTotalMinor: inStock ? line.unitPriceMinor * quantity : 0 } : null };
      }),
    [items, pricing],
  );

  const value = useMemo<Ctx>(
    () => ({
      ready, items, count: items.reduce((s, i) => s + i.quantity, 0), rows, pricing, pricingLoading, pricingFailed, coupon, isOpen,
      open, close,
      add, setQuantity, remove, clear,
      applyCoupon: (code) => setCoupon(code.trim().toUpperCase() || null),
      removeCoupon: () => setCoupon(null),
      setExtras,
    }),
    [ready, items, rows, pricing, pricingLoading, pricingFailed, coupon, isOpen, open, close, add, setQuantity, remove, clear, setExtras],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
