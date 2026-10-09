import type { Loc } from "./localize";

export function formatDate(date: Date | string, loc: Loc, withTime = false) {
  return new Intl.DateTimeFormat(loc === "ar" ? "ar-EG" : "en-GB", { dateStyle: "medium", ...(withTime ? { timeStyle: "short" } : {}), timeZone: "Africa/Cairo" }).format(new Date(date));
}
