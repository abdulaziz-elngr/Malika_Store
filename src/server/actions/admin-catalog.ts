"use server";

import { revalidatePath } from "next/cache";
import { type FieldErrors, fieldErrors } from "@/lib/validation/checkout";
import { categoryFormSchema, collectionFormSchema, productFormSchema, stockAdjustSchema } from "@/lib/validation/admin-catalog";
import { authorize } from "@/server/auth/rbac";
import {
  adjustStock,
  deleteCategory,
  deleteCollection,
  deleteProducts,
  duplicateProduct,
  listMovements,
  reorderCategory,
  saveCategory,
  saveCollection,
  saveProduct,
  setProductFlags,
  setProductStatus,
  setStock,
} from "@/server/services/admin-catalog";
import type { ActionState, MovementDTO } from "./types";

const str = (fd: FormData, k: string) => (typeof fd.get(k) === "string" ? (fd.get(k) as string) : "");
const flag = (fd: FormData, k: string) => str(fd, k) === "true";

function json<T>(fd: FormData, key: string, fallback: T): T {
  const raw = fd.get(key);
  if (typeof raw !== "string" || !raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Maps Postgres unique-index violations to the field that caused them. */
function uniqueError(message: string): FieldErrors | null {
  if (/product_sku_idx|variant_sku_idx/.test(message)) return { sku: "duplicate" };
  if (/product_slug_idx|category_slug_idx|collection_slug_idx|page_slug_idx/.test(message)) return { slug: "duplicate" };
  if (/coupon_code_idx/.test(message)) return { code: "duplicate" };
  if (/newsletter_email_idx/.test(message)) return { email: "duplicate" };
  if (/admin_user_email_idx/.test(message)) return { email: "duplicate" };
  if (/role_key_idx|permission_key_idx/.test(message)) return { key: "duplicate" };
  return null;
}

const revalidateCatalog = () => {
  revalidatePath("/[locale]/admin/products", "page");
  revalidatePath("/[locale]/admin/inventory", "page");
  revalidatePath("/[locale]/admin/categories", "page");
  revalidatePath("/[locale]/admin/collections", "page");
  revalidatePath("/[locale]/shop", "page");
  revalidatePath("/", "layout");
};

/* ───────── products ───────── */

export async function saveProductAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd, "id") || null;
  const admin = await authorize(id ? "products:edit" : "products:create");

  const parsed = productFormSchema.safeParse({
    nameAr: str(fd, "nameAr"),
    nameEn: str(fd, "nameEn"),
    sku: str(fd, "sku"),
    slug: str(fd, "slug"),
    shortAr: str(fd, "shortAr"),
    shortEn: str(fd, "shortEn"),
    descriptionAr: str(fd, "descriptionAr"),
    descriptionEn: str(fd, "descriptionEn"),
    materialsAr: str(fd, "materialsAr"),
    materialsEn: str(fd, "materialsEn"),
    careAr: str(fd, "careAr"),
    careEn: str(fd, "careEn"),
    priceMinor: str(fd, "priceMinor"),
    salePriceMinor: str(fd, "salePriceMinor"),
    costMinor: str(fd, "costMinor"),
    categoryId: str(fd, "categoryId") || null,
    gender: str(fd, "gender") || "women",
    status: str(fd, "status") || "draft",
    featured: str(fd, "featured"),
    isNew: str(fd, "isNew"),
    bestSeller: str(fd, "bestSeller"),
    weightGrams: str(fd, "weightGrams"),
    tags: json<string[]>(fd, "tags", []),
    videoUrl: str(fd, "videoUrl"),
    collectionIds: json<string[]>(fd, "collectionIds", []),
    images: json(fd, "images", []),
    variants: json(fd, "variants", []),
    seoTitleAr: str(fd, "seoTitleAr"),
    seoTitleEn: str(fd, "seoTitleEn"),
    seoDescriptionAr: str(fd, "seoDescriptionAr"),
    seoDescriptionEn: str(fd, "seoDescriptionEn"),
  });

  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  try {
    const productId = await saveProduct(admin, id, parsed.data);
    revalidateCatalog();
    return { ok: true, id: productId };
  } catch (e) {
    const mapped = uniqueError(e instanceof Error ? e.message : "");
    if (mapped) return { errors: mapped };
    throw e;
  }
}

export async function deleteProductsAction(fd: FormData): Promise<void> {
  const admin = await authorize("products:delete");
  await deleteProducts(admin, fd.getAll("id").map(String).filter(Boolean));
  revalidateCatalog();
}

export async function setProductStatusAction(fd: FormData): Promise<void> {
  const admin = await authorize("products:publish");
  const status = str(fd, "status");
  if (status !== "draft" && status !== "published" && status !== "archived") return;
  await setProductStatus(admin, fd.getAll("id").map(String).filter(Boolean), status);
  revalidateCatalog();
}

export async function setProductFlagAction(fd: FormData): Promise<void> {
  const admin = await authorize("products:edit");
  const key = str(fd, "flag");
  if (key !== "featured" && key !== "isNew" && key !== "bestSeller") return;
  await setProductFlags(admin, str(fd, "id"), { [key]: flag(fd, "value") });
  revalidateCatalog();
}

export async function duplicateProductAction(fd: FormData): Promise<void> {
  const admin = await authorize("products:create");
  await duplicateProduct(admin, str(fd, "id"));
  revalidateCatalog();
}

/* ───────── categories ───────── */

export async function saveCategoryAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd, "id") || null;
  const admin = await authorize(id ? "categories:edit" : "categories:create");
  const parsed = categoryFormSchema.safeParse({
    nameAr: str(fd, "nameAr"),
    nameEn: str(fd, "nameEn"),
    slug: str(fd, "slug"),
    descriptionAr: str(fd, "descriptionAr"),
    descriptionEn: str(fd, "descriptionEn"),
    imageUrl: str(fd, "imageUrl"),
    tone: str(fd, "tone") || "wine",
    parentId: str(fd, "parentId") || null,
    visible: str(fd, "visible"),
    seoTitleAr: str(fd, "seoTitleAr"),
    seoTitleEn: str(fd, "seoTitleEn"),
    seoDescriptionAr: str(fd, "seoDescriptionAr"),
    seoDescriptionEn: str(fd, "seoDescriptionEn"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  try {
    const categoryId = await saveCategory(admin, id, parsed.data);
    revalidateCatalog();
    return { ok: true, id: categoryId };
  } catch (e) {
    const mapped = uniqueError(e instanceof Error ? e.message : "");
    if (mapped) return { errors: mapped };
    throw e;
  }
}

export async function deleteCategoryAction(fd: FormData): Promise<void> {
  const admin = await authorize("categories:delete");
  await deleteCategory(admin, str(fd, "id"));
  revalidateCatalog();
}

export async function moveCategoryAction(fd: FormData): Promise<void> {
  const admin = await authorize("categories:edit");
  await reorderCategory(admin, str(fd, "id"), str(fd, "dir") === "up" ? -1 : 1);
  revalidateCatalog();
}

/* ───────── collections ───────── */

export async function saveCollectionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd, "id") || null;
  const admin = await authorize(id ? "collections:edit" : "collections:create");
  const parsed = collectionFormSchema.safeParse({
    nameAr: str(fd, "nameAr"),
    nameEn: str(fd, "nameEn"),
    slug: str(fd, "slug"),
    descriptionAr: str(fd, "descriptionAr"),
    descriptionEn: str(fd, "descriptionEn"),
    coverUrl: str(fd, "coverUrl"),
    bannerUrl: str(fd, "bannerUrl"),
    tone: str(fd, "tone") || "wine",
    startsAt: str(fd, "startsAt"),
    endsAt: str(fd, "endsAt"),
    visible: str(fd, "visible"),
    productIds: json<string[]>(fd, "productIds", []),
    seoTitleAr: str(fd, "seoTitleAr"),
    seoTitleEn: str(fd, "seoTitleEn"),
    seoDescriptionAr: str(fd, "seoDescriptionAr"),
    seoDescriptionEn: str(fd, "seoDescriptionEn"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  try {
    const collectionId = await saveCollection(admin, id, parsed.data);
    revalidateCatalog();
    return { ok: true, id: collectionId };
  } catch (e) {
    const mapped = uniqueError(e instanceof Error ? e.message : "");
    if (mapped) return { errors: mapped };
    throw e;
  }
}

export async function deleteCollectionAction(fd: FormData): Promise<void> {
  const admin = await authorize("collections:delete");
  await deleteCollection(admin, str(fd, "id"));
  revalidateCatalog();
}

/* ───────── inventory ───────── */

export async function adjustStockAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await authorize("inventory:edit");
  const parsed = stockAdjustSchema.safeParse({
    variantId: str(fd, "variantId"),
    mode: str(fd, "mode") || "delta",
    quantity: str(fd, "quantity"),
    reason: str(fd, "reason") || "adjustment",
    note: str(fd, "note"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const { variantId, mode, quantity, reason, note } = parsed.data;
  const dir = str(fd, "direction") === "down" ? -1 : 1;
  const ok = mode === "set" ? await setStock(admin, variantId, quantity, reason, note) : await adjustStock(admin, variantId, quantity * dir, reason, note);
  if (!ok) return { errors: { form: "invalid" } };
  revalidateCatalog();
  return { ok: true };
}

/** Read-only: the movement history shown inside the inventory drawer. */
export async function listMovementsAction(fd: FormData): Promise<MovementDTO[]> {
  const id = str(fd, "variantId");
  if (!id) return [];
  await authorize("inventory:view");
  const rows = await listMovements(id);
  return rows.map((m) => ({ id: m.id, delta: m.delta, reason: m.reason, note: m.note, createdAt: m.createdAt.toISOString() }));
}
