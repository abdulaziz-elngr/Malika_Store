"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackMeta, trackOnceMeta, type MetaData, type MetaEvent } from "@/lib/meta-pixel";

export function MetaPixel() {
  const pathname = usePathname();
  const previous = useRef<string | null>(null);
  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    trackMeta("PageView");
  }, [pathname]);

  useEffect(() => {
    const contact = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      const href = link?.getAttribute("href") ?? "";
      if (/^(https?:\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)(\/|$)|tel:|mailto:)/i.test(href)) {
        trackMeta("Contact");
      }
    };
    document.addEventListener("click", contact);
    return () => document.removeEventListener("click", contact);
  }, []);
  return null;
}

/** Render only after the server has authorized and loaded the event's data. */
export function MetaEventBeacon({ event, data, orderId }: { event: MetaEvent; data: MetaData; orderId?: string }) {
  const signature = JSON.stringify({ event, data, orderId });
  const previous = useRef<string | null>(null);
  useEffect(() => {
    if (signature === previous.current) return;
    previous.current = signature;
    const payload = JSON.parse(signature) as { event: MetaEvent; data: MetaData; orderId?: string };
    if (payload.orderId) trackOnceMeta(payload.event, payload.orderId, payload.data);
    else trackMeta(payload.event, payload.data);
  }, [signature]);
  return null;
}
