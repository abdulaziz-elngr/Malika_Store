/**
 * Turns whatever the admin typed into a wa.me link.
 * Accepts a local Egyptian number (01012345678), an international one (+20 101 234 5678 / 0020…),
 * or a ready-made https link. Returns null when nothing usable was entered.
 */
export function whatsappUrl(raw: string | null | undefined, text?: string): string | null {
  const v = (raw ?? "").trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  let d = v.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = `20${d.slice(1)}`; // Egypt default
  if (d.length < 8 || d.length > 15) return null;
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

/** Only plain http(s) links are rendered for social profiles. */
export function safeHttpUrl(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim();
  return /^https?:\/\//i.test(v) ? v : null;
}
