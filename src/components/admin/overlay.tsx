"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useRef } from "react";
import { cn } from "@/lib/cn";
import { useDialog } from "./use-dialog";

const ease = [0.22, 1, 0.36, 1] as const;

type BaseProps = { open: boolean; onClose: () => void; title: string; children: React.ReactNode; className?: string };

function Backdrop({ onClose }: { onClose: () => void }) {
  return <motion.div aria-hidden onClick={onClose} className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} />;
}

/** Slides in from the logical start (left in English, right in Arabic) or end edge. */
export function Drawer({ open, onClose, title, children, side = "end", className }: BaseProps & { side?: "start" | "end" }) {
  const t = useTranslations("admin.shell");
  const rtl = useLocale() === "ar";
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialog(open, onClose, panel);
  // start edge = left in LTR, right in RTL; the panel enters from that edge.
  const fromLeft = (side === "start") !== rtl;
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60]">
          <Backdrop onClose={onClose} />
          <motion.div
            ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
            initial={{ x: fromLeft ? "-100%" : "100%" }} animate={{ x: 0 }} exit={{ x: fromLeft ? "-100%" : "100%" }} transition={{ duration: 0.45, ease }}
            className={cn("absolute inset-y-0 flex w-[min(92vw,26rem)] flex-col bg-surface shadow-soft outline-none", fromLeft ? "left-0 border-e border-line" : "right-0 border-s border-line", className)}
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5">
              <h2 id={titleId} className="font-display text-2xl text-brand">{title}</h2>
              <button type="button" onClick={onClose} aria-label={t("close")} className="grid size-10 place-items-center text-muted hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Modal({ open, onClose, title, children, className }: BaseProps) {
  const t = useTranslations("admin.shell");
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialog(open, onClose, panel);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] grid place-items-center p-4">
          <Backdrop onClose={onClose} />
          <motion.div
            ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
            initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.35, ease }}
            className={cn("relative w-full max-w-md border border-line bg-surface p-6 shadow-soft outline-none", className)}
          >
            <button type="button" onClick={onClose} aria-label={t("close")} className="absolute end-3 top-3 grid size-9 place-items-center text-muted hover:text-foreground"><X size={16} /></button>
            <h2 id={titleId} className="mb-4 pe-8 font-display text-2xl text-brand">{title}</h2>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
