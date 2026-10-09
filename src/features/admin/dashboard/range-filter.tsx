import { CalendarRange } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { cairoDay, RANGE_KEYS, type RangeKey } from "@/lib/date-range";
import { inputClass } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import type { Loc } from "@/lib/localize";

/** Server-rendered, so the period is a plain URL (shareable, back-button friendly, works without JS). */
export async function RangeFilter({ active, fromDay, toDay }: { active: RangeKey; fromDay: string; toDay: string }) {
  const [t, loc] = await Promise.all([getTranslations("admin.dashboard"), getLocale() as Promise<Loc>]);
  const presets = RANGE_KEYS.filter((k) => k !== "custom");
  const today = cairoDay(new Date());
  const pill = "inline-flex min-h-9 items-center border px-3 text-sm transition-colors";
  return (
    <div className="space-y-3" role="group" aria-label={t("period")}>
      <ul className="flex flex-wrap gap-2">
        {presets.map((k) => (
          <li key={k}>
            <Link href={{ pathname: "/admin", query: { range: k } }} aria-current={active === k ? "true" : undefined} scroll={false}
              className={cn(pill, active === k ? "border-brand bg-brand text-brand-contrast" : "border-line text-foreground hover:border-accent")}>{t(`ranges.${k}`)}</Link>
          </li>
        ))}
        <li>
          <details className="group relative" open={active === "custom"}>
            <summary className={cn(pill, "cursor-pointer list-none gap-2", active === "custom" ? "border-brand bg-brand text-brand-contrast" : "border-line hover:border-accent")}>
              <CalendarRange size={15} strokeWidth={1.4} aria-hidden />{t("ranges.custom")}
            </summary>
            <form method="get" className="absolute end-0 top-full z-20 mt-2 grid w-72 gap-3 border border-line bg-surface p-4 shadow-soft">
              <input type="hidden" name="range" value="custom" />
              <label className="grid gap-1 text-xs uppercase tracking-[0.15em] text-accent">{t("customFrom")}<input type="date" name="from" defaultValue={fromDay} max={today} required className={cn(inputClass, "h-10 text-sm normal-case tracking-normal text-foreground")} /></label>
              <label className="grid gap-1 text-xs uppercase tracking-[0.15em] text-accent">{t("customTo")}<input type="date" name="to" defaultValue={toDay} max={today} required className={cn(inputClass, "h-10 text-sm normal-case tracking-normal text-foreground")} /></label>
              <Button type="submit" className="min-h-10">{t("apply")}</Button>
            </form>
          </details>
        </li>
      </ul>
      <p className="text-sm text-muted">{t("showing", { from: formatDate(`${fromDay}T12:00:00Z`, loc), to: formatDate(`${toDay}T12:00:00Z`, loc) })} · {t("comparedWith")}</p>
    </div>
  );
}
