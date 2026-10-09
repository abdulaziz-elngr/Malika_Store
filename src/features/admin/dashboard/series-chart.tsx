"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { formatMoney, type Loc } from "@/lib/localize";

export type SeriesPoint = { day: string; value: number };
type Props = { points: SeriesPoint[]; kind: "bar" | "area"; format: "money" | "int"; title: string; step: 1 | 7 };

const H = 232, M = { l: 48, r: 10, t: 14, b: 28 };

function niceMax(v: number) {
  if (v <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow;
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(640);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => e && setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/**
 * Dependency-free SVG chart. The plot keeps a left-to-right time axis in both languages (numerals and
 * dates are localized); a visually hidden table gives screen-reader users the same data.
 */
export function SeriesChart({ points, kind, format, title, step }: Props) {
  const t = useTranslations("admin.dashboard.charts");
  const loc = useLocale() as Loc;
  const [wrap, W] = useWidth();
  const [hover, setHover] = useState<number | null>(null);

  const dateFmt = new Intl.DateTimeFormat(loc === "ar" ? "ar-EG" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  const dayLabel = (d: string) => dateFmt.format(new Date(`${d}T00:00:00Z`));
  const fmt = (v: number) => (format === "money" ? formatMoney(v, loc) : new Intl.NumberFormat(loc === "ar" ? "ar-EG" : "en-GB").format(v));
  const axisFmt = (v: number) => new Intl.NumberFormat(loc === "ar" ? "ar-EG" : "en-GB", { notation: "compact", maximumFractionDigits: 1 }).format(format === "money" ? v / 100 : v);

  const total = points.reduce((s, p) => s + p.value, 0);
  const rawMax = Math.max(...points.map((p) => p.value), 0);
  // Counts must never get fractional gridlines (2.5 orders): use a multiple of the 4 intervals instead.
  const max = format === "int" && rawMax <= 40 ? Math.max(4, Math.ceil(rawMax / 4) * 4) : niceMax(rawMax);
  const iw = W - M.l - M.r, ih = H - M.t - M.b;
  const n = points.length;
  const x = (i: number) => M.l + (kind === "bar" ? ((i + 0.5) / n) * iw : n === 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => M.t + ih - (v / max) * ih;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 78))));
  const band = iw / n, barW = Math.min(22, Math.max(2, band * 0.66));

  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join("");
  const area = `${line}L${x(n - 1).toFixed(1)},${M.t + ih}L${x(0).toFixed(1)},${M.t + ih}Z`;

  const onMove = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left - M.l;
    setHover(Math.min(n - 1, Math.max(0, kind === "bar" ? Math.floor(px / band) : Math.round((px / iw) * (n - 1)))));
  };

  const summary = t("summary", { title, from: dayLabel(points[0]!.day), to: dayLabel(points.at(-1)!.day), total: fmt(total) });
  const tip = hover != null ? points[hover]! : null;

  return (
    <div ref={wrap} className="relative" dir="ltr">
      <svg width={W} height={H} role="img" aria-label={summary} className="block overflow-visible text-brand" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} className="stroke-line" strokeWidth={1} strokeDasharray={v === 0 ? undefined : "2 4"} />
            <text x={M.l - 8} y={y(v) + 4} textAnchor="end" className="fill-muted text-[10px]">{axisFmt(v)}</text>
          </g>
        ))}
        {kind === "area" && (<><path d={area} fill="currentColor" opacity={0.1} /><path d={line} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinejoin="round" /></>)}
        {kind === "bar" && points.map((p, i) => <rect key={p.day} x={x(i) - barW / 2} width={barW} y={y(p.value)} height={Math.max(0, M.t + ih - y(p.value))} fill="currentColor" opacity={hover === i ? 1 : 0.78} />)}
        {points.map((p, i) => i % labelEvery === 0 && <text key={p.day} x={x(i)} y={H - 8} textAnchor="middle" className="fill-muted text-[10px]">{dayLabel(p.day)}</text>)}
        {tip && kind === "area" && (<><line x1={x(hover!)} x2={x(hover!)} y1={M.t} y2={M.t + ih} className="stroke-accent" strokeWidth={1} /><circle cx={x(hover!)} cy={y(tip.value)} r={4} fill="currentColor" className="stroke-surface" strokeWidth={2} /></>)}
        <rect x={M.l} y={M.t} width={iw} height={ih} fill="transparent" />
      </svg>
      {tip && (
        <div className="pointer-events-none absolute z-10 -translate-x-1/2 border border-line bg-surface px-3 py-2 text-xs shadow-soft" style={{ left: Math.min(Math.max(x(hover!), 70), W - 70), top: 0 }}>
          <p className="text-muted">{step === 7 ? t("weekOf", { date: dayLabel(tip.day) }) : dayLabel(tip.day)}</p>
          <p className="font-medium text-foreground">{fmt(tip.value)}</p>
        </div>
      )}
      <table className="sr-only">
        <caption>{t("tableLabel", { title })}</caption>
        <thead><tr><th scope="col">{t("period")}</th><th scope="col">{t("value")}</th></tr></thead>
        <tbody>{points.map((p) => <tr key={p.day}><th scope="row">{dayLabel(p.day)}</th><td>{fmt(p.value)}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
