/**
 * Dashboard date ranges. "Days" are Africa/Cairo calendar days (the shop's business day), expressed as
 * YYYY-MM-DD strings; a range is [from, to) in UTC instants. Pure functions: easy to test.
 */
export const TZ = "Africa/Cairo";
export const RANGE_KEYS = ["today", "yesterday", "7d", "30d", "month", "last_month", "year", "custom"] as const;
export type RangeKey = (typeof RANGE_KEYS)[number];
export const MAX_RANGE_DAYS = 366;

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function offsetMs(at: Date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(at).map((x) => [x.type, x.value]),
  );
  return Date.UTC(+p.year!, +p.month! - 1, +p.day!, +p.hour!, +p.minute!, +p.second!) - Math.floor(at.getTime() / 1000) * 1000;
}

export const cairoDay = (at: Date) => new Date(at.getTime() + offsetMs(at)).toISOString().slice(0, 10);

export function dayStart(day: string) {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const naive = Date.UTC(y, m - 1, d);
  // Two passes so the result is right on either side of a daylight-saving change.
  return new Date(naive - offsetMs(new Date(naive - offsetMs(new Date(naive)))));
}

export function addDays(day: string, n: number) {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
export const diffDays = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
const firstOfMonth = (day: string, shift = 0) => { const [y, m] = day.split("-").map(Number) as [number, number]; return new Date(Date.UTC(y, m - 1 + shift, 1)).toISOString().slice(0, 10); };

export type ResolvedRange = {
  key: RangeKey;
  fromDay: string; // inclusive
  toDay: string; // inclusive
  from: Date; // inclusive instant
  to: Date; // exclusive instant
  prevFrom: Date;
  prevTo: Date;
  days: string[];
  step: 1 | 7; // chart bucket size in days
};

export function resolveRange(key: string | undefined, custom?: { from?: string; to?: string }, now = new Date()): ResolvedRange {
  const today = cairoDay(now);
  let k: RangeKey = (RANGE_KEYS as readonly string[]).includes(key ?? "") ? (key as RangeKey) : "30d";
  let fromDay = today, toDay = today;
  switch (k) {
    case "today": break;
    case "yesterday": fromDay = toDay = addDays(today, -1); break;
    case "7d": fromDay = addDays(today, -6); break;
    case "30d": fromDay = addDays(today, -29); break;
    case "month": fromDay = firstOfMonth(today); break;
    case "last_month": fromDay = firstOfMonth(today, -1); toDay = addDays(firstOfMonth(today), -1); break;
    case "year": fromDay = `${today.slice(0, 4)}-01-01`; break;
    case "custom": {
      const f = custom?.from, t = custom?.to;
      if (f && t && DAY.test(f) && DAY.test(t) && f <= t && t <= today && diffDays(f, t) < MAX_RANGE_DAYS && !Number.isNaN(Date.parse(f))) { fromDay = f; toDay = t; }
      else { k = "30d"; fromDay = addDays(today, -29); }
    }
  }
  const len = diffDays(fromDay, toDay) + 1;
  const from = dayStart(fromDay), to = dayStart(addDays(toDay, 1));
  const prevFromDay = addDays(fromDay, -len);
  return {
    key: k, fromDay, toDay, from, to,
    prevFrom: dayStart(prevFromDay), prevTo: from,
    days: Array.from({ length: len }, (_, i) => addDays(fromDay, i)),
    step: len > 62 ? 7 : 1,
  };
}

/** Percentage change vs the previous period; null when there is nothing to compare with. */
export const deltaPercent = (now: number, before: number) => (before === 0 ? null : Math.round(((now - before) / before) * 1000) / 10);
