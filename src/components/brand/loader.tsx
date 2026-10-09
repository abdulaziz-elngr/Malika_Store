"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Logo } from "./logo";

const KEY = "malika:intro-seen";

/** Luxury loading screen. Plays once per browser session; the logo is revealed, never redrawn. */
export function Loader() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(KEY) === "1";
    } catch {}
    if (seen || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setShow(true);
    document.body.style.overflow = "hidden";
    const id = window.setTimeout(() => {
      setShow(false);
      document.body.style.overflow = "";
      try {
        sessionStorage.setItem(KEY, "1");
      } catch {}
    }, 2300);
    return () => {
      window.clearTimeout(id);
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="loader"
          role="status"
          aria-label="MALIKA"
          className="fixed inset-0 z-[90] grid place-items-center bg-background"
          exit={{ clipPath: "inset(0 0 100% 0)" }}
          transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
        >
          <div className="flex flex-col items-center gap-6" dir="ltr">
            <motion.div initial={{ clipPath: "inset(0 100% 0 0)" }} animate={{ clipPath: "inset(0 0% 0 0)" }} transition={{ duration: 1.5, ease: [0.65, 0, 0.35, 1] }}>
              <Logo height={130} priority />
            </motion.div>
            <motion.span className="block h-px bg-accent" initial={{ width: 0 }} animate={{ width: 160 }} transition={{ delay: 0.5, duration: 1.4, ease: [0.65, 0, 0.35, 1] }} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
