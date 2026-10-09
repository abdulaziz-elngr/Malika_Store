"use client";

import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

type Props = { value: number; min?: number; max: number; onChange: (n: number) => void; className?: string; size?: "sm" | "md" };

export function QuantityStepper({ value, min = 1, max, onChange, className, size = "md" }: Props) {
  const t = useTranslations("cart");
  const btn = cn("grid place-items-center text-foreground transition-colors hover:text-accent disabled:cursor-not-allowed disabled:opacity-35", size === "sm" ? "size-9" : "size-11");
  return (
    <div role="group" aria-label={t("quantity")} className={cn("inline-flex items-center border border-line bg-surface", className)}>
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={t("decrease")}>
        <Minus size={14} strokeWidth={1.6} />
      </button>
      <output aria-live="polite" className={cn("min-w-8 text-center tabular-nums", size === "sm" ? "text-sm" : "text-base")}>{value}</output>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={t("increase")}>
        <Plus size={14} strokeWidth={1.6} />
      </button>
    </div>
  );
}
