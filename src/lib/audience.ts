/** Storefront page for an audience. Women and Men keep their original pages; every other audience lives under /for/<slug>. */
export const audienceHref = (slug: string) => (slug === "women" ? "/women" : slug === "men" ? "/men" : `/for/${slug}`);

/** The audience slug a storefront path points at (/women, /men, /for/kids), or null for any other link. */
export function audienceSlugFromHref(href: string): string | null {
  const path = href.split(/[?#]/)[0]!.replace(/\/+$/, "");
  if (path === "/women") return "women";
  if (path === "/men") return "men";
  const m = /^\/for\/([a-z0-9-]+)$/.exec(path);
  return m ? m[1]! : null;
}
