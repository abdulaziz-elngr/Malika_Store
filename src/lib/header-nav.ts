import { audienceHref, audienceSlugFromHref } from "@/lib/audience";
import { pick, type Loc } from "@/lib/localize";
import type { HeaderAudience } from "@/server/services/catalog";

export type HeaderSubLink = { id: string; href: string; label: string };
export type HeaderGroup = { id: string; title: string; links: HeaderSubLink[] };
/** One top-level header entry. Audience entries also carry the dropdown groups (categories, collections). */
export type HeaderLink = { id: string; href: string; label: string; groups?: HeaderGroup[] };

type Labels = { categories: string; collections: string; viewAll: string };

/**
 * Merges the CMS header menu with the audiences created in the admin.
 * - Every visible audience becomes a header entry automatically, with its own categories and collections in a dropdown.
 * - CMS items that point at one of those audiences (/women, /men, /for/kids) are dropped so nothing shows twice.
 * - The audience block sits where the first such CMS item was; otherwise right after "Collections"; otherwise at the end.
 */
export function buildHeaderLinks(cms: HeaderLink[], audiences: HeaderAudience[], locale: Loc, labels: Labels): HeaderLink[] {
  if (!audiences.length) return cms;
  const slugs = new Set(audiences.map((a) => a.slug));
  const isAudienceLink = (l: HeaderLink) => {
    const s = audienceSlugFromHref(l.href);
    return s !== null && slugs.has(s);
  };

  const entries: HeaderLink[] = audiences.map((a) => {
    const href = audienceHref(a.slug);
    const groups: HeaderGroup[] = [];
    if (a.categories.length)
      groups.push({ id: `${a.id}-categories`, title: labels.categories, links: a.categories.map((c) => ({ id: c.slug, href: `${href}?category=${c.slug}`, label: pick(locale, c.nameAr, c.nameEn) })) });
    if (a.collections.length)
      groups.push({ id: `${a.id}-collections`, title: labels.collections, links: a.collections.map((c) => ({ id: c.slug, href: `/collections/${c.slug}`, label: pick(locale, c.nameAr, c.nameEn) })) });
    return { id: `audience-${a.id}`, href, label: pick(locale, a.nameAr, a.nameEn), groups: groups.length ? groups : undefined };
  });

  const firstDup = cms.findIndex(isAudienceLink);
  const rest = cms.filter((l) => !isAudienceLink(l));
  let at = rest.length;
  if (firstDup >= 0) at = cms.slice(0, firstDup).filter((l) => !isAudienceLink(l)).length;
  else {
    const col = rest.findIndex((l) => l.href.split(/[?#]/)[0] === "/collections");
    if (col >= 0) at = col + 1;
  }
  return [...rest.slice(0, at), ...entries, ...rest.slice(at)];
}
