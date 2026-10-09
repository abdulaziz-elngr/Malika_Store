export type Loc = "ar" | "en";

/** Picks the Arabic or English variant of a bilingual DB field, falling back to the other language. */
export function pick(loc: Loc, ar: string | null | undefined, en: string | null | undefined) {
  return (loc === "ar" ? ar || en : en || ar) ?? "";
}

export function formatMoney(minor: number, loc: Loc) {
  // Arabic: number + suffix built explicitly, so the bidi algorithm cannot move the "ج.م." dots around the digits.
  if (loc === "ar") return `${new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(minor / 100)}\u00A0ج.م.`;
  return new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(minor / 100);
}
