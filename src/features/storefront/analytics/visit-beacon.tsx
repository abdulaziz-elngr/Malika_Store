"use client";

import { useEffect } from "react";

const KEY = "malika.visit";

/** Sends one anonymous beacon per browser session. Honors Do Not Track. */
export function VisitBeacon() {
  useEffect(() => {
    try {
      if (navigator.doNotTrack === "1" || sessionStorage.getItem(KEY)) return;
      const id = crypto.randomUUID().replace(/-/g, "");
      sessionStorage.setItem(KEY, id);
      void fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitorId: id, path: location.pathname }), keepalive: true });
    } catch {
      /* analytics must never break the page */
    }
  }, []);
  return null;
}
