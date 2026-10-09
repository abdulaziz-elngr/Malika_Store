"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useFinePointer } from "./use-fine-pointer";

type Mode = "default" | "view" | "explore" | "drag" | "action";

/**
 * Subtle luxury cursor (desktop fine pointers only).
 * Opt in per element with data-cursor="view" | "explore" | "drag". Links and buttons enlarge the ring automatically.
 */
export function CustomCursor() {
  const t = useTranslations("cursor");
  const fine = useFinePointer();
  const [mode, setMode] = useState<Mode>("default");
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 480, damping: 36, mass: 0.35 });
  const sy = useSpring(y, { stiffness: 480, damping: 36, mass: 0.35 });

  useEffect(() => {
    if (!fine) return;
    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-cursor], a, button");
      const named = el?.dataset.cursor as Mode | undefined;
      setMode(named ?? (el ? "action" : "default"));
    };
    const leave = () => setMode("default");
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, [fine, x, y]);

  if (!fine) return null;

  const labelled = mode === "view" || mode === "explore" || mode === "drag";
  const size = labelled ? 84 : mode === "action" ? 44 : 12;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed start-0 top-0 z-[100] grid place-items-center rounded-full border border-accent bg-background/10 text-[0.62rem] font-medium uppercase tracking-[0.2em] text-foreground backdrop-blur-[2px]"
      style={{ x: sx, y: sy, translateX: "-50%", translateY: "-50%" }}
      animate={{ width: size, height: size, backgroundColor: labelled ? "var(--surface)" : "rgba(0,0,0,0)" }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {labelled ? t(mode as "view" | "explore" | "drag") : null}
    </motion.div>
  );
}
