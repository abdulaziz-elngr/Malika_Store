import type { Resource } from "@/lib/permissions";

/**
 * The admin information architecture. `ready` flips to true as each phase ships its screens; until
 * then the entry is shown as "Soon" and is not a link, so there are no dead routes.
 * Visibility is derived from the permission "<resource>:view".
 */
export type IconName =
  | "dashboard" | "products" | "inventory" | "categories" | "collections" | "orders" | "customers" | "coupons" | "marketing" | "reviews"
  | "homepage" | "banners" | "pages" | "navigation" | "media" | "theme" | "seo" | "users" | "roles" | "audit" | "settings";

export type NavDef = { key: string; resource: Resource; href: string; icon: IconName; ready: boolean; bottom?: boolean };
export const NAV_GROUPS: { key: string; items: NavDef[] }[] = [
  { key: "overview", items: [{ key: "dashboard", resource: "dashboard", href: "/admin", icon: "dashboard", ready: true, bottom: true }] },
  {
    key: "catalog",
    items: [
      { key: "products", resource: "products", href: "/admin/products", icon: "products", ready: false },
      { key: "inventory", resource: "inventory", href: "/admin/inventory", icon: "inventory", ready: false },
      { key: "categories", resource: "categories", href: "/admin/categories", icon: "categories", ready: false },
      { key: "collections", resource: "collections", href: "/admin/collections", icon: "collections", ready: false },
    ],
  },
  {
    key: "sales",
    items: [
      { key: "orders", resource: "orders", href: "/admin/orders", icon: "orders", ready: false, bottom: true },
      { key: "customers", resource: "customers", href: "/admin/customers", icon: "customers", ready: false },
      { key: "coupons", resource: "coupons", href: "/admin/coupons", icon: "coupons", ready: false },
      { key: "marketing", resource: "marketing", href: "/admin/marketing", icon: "marketing", ready: false },
      { key: "reviews", resource: "reviews", href: "/admin/reviews", icon: "reviews", ready: false },
    ],
  },
  {
    key: "content",
    items: [
      { key: "homepage", resource: "homepage", href: "/admin/homepage", icon: "homepage", ready: false },
      { key: "banners", resource: "banners", href: "/admin/banners", icon: "banners", ready: false },
      { key: "pages", resource: "pages", href: "/admin/pages", icon: "pages", ready: false },
      { key: "navigation", resource: "navigation", href: "/admin/navigation", icon: "navigation", ready: false },
      { key: "media", resource: "media", href: "/admin/media", icon: "media", ready: false },
    ],
  },
  {
    key: "appearance",
    items: [
      { key: "theme", resource: "theme", href: "/admin/theme", icon: "theme", ready: false },
      { key: "seo", resource: "seo", href: "/admin/seo", icon: "seo", ready: false },
    ],
  },
  {
    key: "system",
    items: [
      { key: "users", resource: "users", href: "/admin/users", icon: "users", ready: false },
      { key: "roles", resource: "roles", href: "/admin/roles", icon: "roles", ready: false },
      { key: "audit", resource: "audit", href: "/admin/audit", icon: "audit", ready: true },
      { key: "settings", resource: "settings", href: "/admin/settings", icon: "settings", ready: false },
    ],
  },
];

export type NavGroup = { key: string; items: { key: string; href: string; icon: IconName; ready: boolean; bottom: boolean }[] };

/** Server-side: only entries the staff member may view are ever sent to the browser. */
export function visibleNav(can: (resource: Resource) => boolean): NavGroup[] {
  return NAV_GROUPS.map((g) => ({
    key: g.key,
    items: g.items.filter((i) => can(i.resource)).map((i) => ({ key: i.key, href: i.href, icon: i.icon, ready: i.ready, bottom: !!i.bottom })),
  })).filter((g) => g.items.length);
}
