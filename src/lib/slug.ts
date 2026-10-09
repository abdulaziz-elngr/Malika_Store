/**
 * URL slugs. Arabic names have no ASCII transliteration, so callers pass the English name
 * (or an explicit slug); anything unexpected degrades to a short random suffix rather than an empty string.
 */
export function slugify(input: string): string {
  const base = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  if (base) return base;
  return `item-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Appends "-1", "-2"… until the candidate is not in `taken`. */
export function uniqueSlug(candidate: string, taken: Iterable<string>): string {
  const set = new Set(taken);
  if (!set.has(candidate)) return candidate;
  for (let i = 2; i < 500; i++) {
    const next = `${candidate}-${i}`;
    if (!set.has(next)) return next;
  }
  return `${candidate}-${Date.now().toString(36)}`;
}
