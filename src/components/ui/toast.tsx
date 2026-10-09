"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type Tone = "success" | "info" | "error";
type Toast = { id: number; message: string; tone: Tone };
type Ctx = { push: (message: string, tone?: Tone) => void };

const ToastContext = createContext<Ctx>({ push: () => {} });
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children, dismissLabel }: { children: React.ReactNode; dismissLabel: string }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (message: string, tone: Tone = "success") => {
      const id = next.current++;
      setToasts((t) => [...t.slice(-2), { id, message, tone }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );
  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className={cn("pointer-events-auto flex max-w-md items-center gap-3 border bg-surface px-4 py-3 text-sm shadow-soft", t.tone === "error" ? "border-brand text-brand" : "border-line text-foreground")}
            >
              {t.tone === "success" ? <Check size={16} className="text-sage-700 dark:text-sage-500" /> : <Info size={16} className="text-accent" />}
              <span>{t.message}</span>
              <button type="button" onClick={() => dismiss(t.id)} aria-label={dismissLabel} className="ms-2 text-muted hover:text-foreground"><X size={14} /></button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
