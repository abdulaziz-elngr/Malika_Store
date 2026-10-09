import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/cn";

/** One headline number with its change versus the previous period. `higherIsBetter=false` flips the colours (e.g. cancellations). */
export async function StatCard({ label, value, hint, delta, higherIsBetter = true }: { label: string; value: string; hint?: string; delta?: number | null; higherIsBetter?: boolean }) {
  const t = await getTranslations("admin.dashboard");
  const has = delta !== undefined;
  const flat = delta === 0;
  const good = delta != null && delta !== 0 && (delta > 0) === higherIsBetter;
  const Icon = delta == null || flat ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  const fmt = (n: number) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(Math.abs(n));
  return (
    <div className="flex flex-col justify-between gap-5 border border-line bg-surface p-5">
      <p className="text-[0.72rem] font-medium uppercase tracking-[0.22em] text-accent">{label}</p>
      <div className="space-y-2">
        <p className="text-3xl tabular-nums text-foreground sm:text-[2rem]">{value}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {has && (
            <span className={cn("inline-flex items-center gap-1", delta == null || flat ? "text-muted" : good ? "text-sage-700 dark:text-sage-500" : "text-brand")}>
              <Icon size={14} aria-hidden />
              {delta == null ? t("deltaNone") : flat ? t("deltaFlat") : delta > 0 ? t("deltaUp", { value: fmt(delta) }) : t("deltaDown", { value: fmt(delta) })}
            </span>
          )}
          {hint && <span className="text-muted">{hint}</span>}
        </div>
      </div>
    </div>
  );
}
