/**
 * Permission catalogue shared by the server (enforcement) and the future roles UI.
 * A permission is "<resource>:<action>". Roles are just named sets of permissions.
 */
export const ACTIONS = ["view", "create", "edit", "delete", "publish", "manage_settings"] as const;
export type Action = (typeof ACTIONS)[number];

const CRUD: Action[] = ["view", "create", "edit", "delete", "publish"];

/** Which actions make sense for each resource. */
export const RESOURCES = {
  dashboard: ["view"],
  products: CRUD,
  inventory: CRUD,
  categories: CRUD,
  collections: CRUD,
  orders: CRUD,
  customers: CRUD,
  coupons: CRUD,
  marketing: CRUD,
  reviews: CRUD,
  media: CRUD,
  seo: [...CRUD, "manage_settings"],
  navigation: CRUD,
  pages: CRUD,
  homepage: CRUD,
  banners: CRUD,
  theme: [...CRUD, "manage_settings"],
  users: CRUD,
  roles: CRUD,
  settings: ["view", "manage_settings"],
  audit: ["view"],
} as const satisfies Record<string, readonly Action[]>;

export type Resource = keyof typeof RESOURCES;
export type PermissionKey = `${Resource}:${Action}`;

export const permissionKey = (r: Resource, a: Action) => `${r}:${a}` as PermissionKey;
export const ALL_PERMISSIONS: PermissionKey[] = (Object.keys(RESOURCES) as Resource[]).flatMap((r) => (RESOURCES[r] as readonly Action[]).map((a) => permissionKey(r, a)));

const grant = (resources: Resource[], actions: Action[]) =>
  resources.flatMap((r) => actions.filter((a) => (RESOURCES[r] as readonly Action[]).includes(a)).map((a) => permissionKey(r, a)));

export type SystemRoleKey = "super_admin" | "admin" | "manager" | "content_manager" | "marketing_manager" | "inventory_manager" | "customer_support";

export const SYSTEM_ROLES: Record<SystemRoleKey, { nameAr: string; nameEn: string; permissions: PermissionKey[] }> = {
  // Super admin is also checked explicitly in code, so it can never be locked out by a bad permission edit.
  super_admin: { nameAr: "مدير عام", nameEn: "Super Admin", permissions: ALL_PERMISSIONS },
  admin: { nameAr: "مدير", nameEn: "Admin", permissions: ALL_PERMISSIONS.filter((p) => !p.startsWith("roles:") && p !== "users:delete") },
  manager: {
    nameAr: "مدير عمليات",
    nameEn: "Manager",
    permissions: [
      ...grant(["dashboard", "audit"], ["view"]),
      ...grant(["products", "inventory", "categories", "collections", "orders", "customers", "coupons", "reviews"], ["view", "create", "edit", "publish"]),
      ...grant(["marketing", "banners"], ["view"]),
    ],
  },
  content_manager: {
    nameAr: "مدير محتوى",
    nameEn: "Content Manager",
    permissions: [
      ...grant(["dashboard"], ["view"]),
      ...grant(["products", "categories", "collections", "homepage", "banners", "pages", "navigation", "media", "seo"], ["view", "create", "edit", "publish"]),
      ...grant(["theme", "reviews"], ["view"]),
    ],
  },
  marketing_manager: {
    nameAr: "مدير تسويق",
    nameEn: "Marketing Manager",
    permissions: [
      ...grant(["dashboard"], ["view"]),
      ...grant(["coupons", "marketing", "banners", "homepage", "reviews"], ["view", "create", "edit", "publish"]),
      ...grant(["customers", "products", "collections", "seo"], ["view"]),
    ],
  },
  inventory_manager: {
    nameAr: "مدير مخزون",
    nameEn: "Inventory Manager",
    permissions: [...grant(["dashboard", "orders", "products"], ["view"]), ...grant(["inventory"], ["view", "create", "edit"])],
  },
  customer_support: {
    nameAr: "دعم العملاء",
    nameEn: "Customer Support",
    permissions: [...grant(["dashboard", "products"], ["view"]), ...grant(["orders", "customers", "reviews"], ["view", "edit"])],
  },
};
