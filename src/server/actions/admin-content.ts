"use server";

import { revalidatePath } from "next/cache";
import { fieldErrors } from "@/lib/validation/checkout";
import { bannerFormSchema, navItemFormSchema, pageFormSchema, sectionConfigSchema } from "@/lib/validation/admin-content";
import { rateLimit } from "@/server/auth/rate-limit";
import { authorize } from "@/server/auth/rbac";
import {
  deleteBanner,
  deleteNavItem,
  deletePage,
  deleteSubscriber,
  moveHomepageSection,
  moveNavItem,
  reorderHomepageSections,
  saveBanner,
  saveNavItem,
  savePage,
  saveHomepageSectionConfig,
  subscribeNewsletter,
  toggleBanner,
  toggleHomepageSection,
  updateMedia,
  deleteMedia,
} from "@/server/services/admin-content";
import type { ActionState } from "./types";

const str = (fd: FormData, k: string) => (typeof fd.get(k) === "string" ? (fd.get(k) as string) : "");

function json<T>(fd: FormData, key: string, fallback: T): T {
  const raw = fd.get(key);
  if (typeof raw !== "string" || !raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const revalidateContent = () => {
  revalidatePath("/[locale]/(store)", "layout");
  revalidatePath("/[locale]/admin/homepage", "page");
  revalidatePath("/[locale]/admin/banners", "page");
  revalidatePath("/[locale]/admin/pages", "page");
  revalidatePath("/[locale]/admin/navigation", "page");
  revalidatePath("/", "layout");
};

/* ───────── homepage builder ───────── */

export async function toggleSectionAction(fd: FormData): Promise<void> {
  const admin = await authorize("homepage:edit");
  await toggleHomepageSection(admin, str(fd, "id"), str(fd, "enabled") === "true");
  revalidateContent();
}

export async function moveSectionAction(fd: FormData): Promise<void> {
  const admin = await authorize("homepage:edit");
  await moveHomepageSection(admin, str(fd, "id"), str(fd, "dir") === "up" ? -1 : 1);
  revalidateContent();
}

/** Full drag-and-drop order: `ids` holds the section ids as a JSON array, top to bottom. */
export async function reorderSectionsAction(fd: FormData): Promise<void> {
  const admin = await authorize("homepage:edit");
  const raw = json<unknown>(fd, "ids", []);
  const ids = Array.isArray(raw) ? raw.filter((id): id is string => typeof id === "string" && !!id) : [];
  if (ids.length) await reorderHomepageSections(admin, ids);
  revalidateContent();
}

export async function saveSectionConfigAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await authorize("homepage:edit");
  const id = str(fd, "id");
  if (!id) return { errors: { form: "notFound" } };
  const parsed = sectionConfigSchema.safeParse(json(fd, "config", {}));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  await saveHomepageSectionConfig(admin, id, parsed.data);
  revalidateContent();
  return { ok: true };
}

/* ───────── banners ───────── */

export async function saveBannerAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd, "id") || null;
  const admin = await authorize(id ? "banners:edit" : "banners:create");
  const parsed = bannerFormSchema.safeParse({
    titleAr: str(fd, "titleAr"),
    titleEn: str(fd, "titleEn"),
    bodyAr: str(fd, "bodyAr"),
    bodyEn: str(fd, "bodyEn"),
    imageUrl: str(fd, "imageUrl"),
    mobileImageUrl: str(fd, "mobileImageUrl"),
    ctaLabelAr: str(fd, "ctaLabelAr"),
    ctaLabelEn: str(fd, "ctaLabelEn"),
    href: str(fd, "href"),
    position: str(fd, "position") || "home",
    tone: str(fd, "tone") || "wine",
    startsAt: str(fd, "startsAt"),
    endsAt: str(fd, "endsAt"),
    visible: str(fd, "visible"),
    sortOrder: str(fd, "sortOrder"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const bannerId = await saveBanner(admin, id, parsed.data);
  revalidateContent();
  return { ok: true, id: bannerId };
}

export async function deleteBannerAction(fd: FormData): Promise<void> {
  const admin = await authorize("banners:delete");
  await deleteBanner(admin, str(fd, "id"));
  revalidateContent();
}

export async function toggleBannerAction(fd: FormData): Promise<void> {
  const admin = await authorize("banners:edit");
  await toggleBanner(admin, str(fd, "id"), str(fd, "visible") === "true");
  revalidateContent();
}

/* ───────── CMS pages ───────── */

export async function savePageAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd, "id") || null;
  const admin = await authorize(id ? "pages:edit" : "pages:create");
  const parsed = pageFormSchema.safeParse({
    slug: str(fd, "slug"),
    titleAr: str(fd, "titleAr"),
    titleEn: str(fd, "titleEn"),
    bodyAr: str(fd, "bodyAr"),
    bodyEn: str(fd, "bodyEn"),
    visible: str(fd, "visible"),
    seoTitleAr: str(fd, "seoTitleAr"),
    seoTitleEn: str(fd, "seoTitleEn"),
    seoDescriptionAr: str(fd, "seoDescriptionAr"),
    seoDescriptionEn: str(fd, "seoDescriptionEn"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  try {
    const pageId = await savePage(admin, id, parsed.data);
    revalidateContent();
    return { ok: true, id: pageId };
  } catch (e) {
    if (/page_slug_idx/.test(e instanceof Error ? e.message : "")) return { errors: { slug: "duplicate" } };
    throw e;
  }
}

export async function deletePageAction(fd: FormData): Promise<void> {
  const admin = await authorize("pages:delete");
  await deletePage(admin, str(fd, "id"));
  revalidateContent();
}

/* ───────── navigation ───────── */

export async function saveNavItemAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd, "id") || null;
  const admin = await authorize(id ? "navigation:edit" : "navigation:create");
  const parsed = navItemFormSchema.safeParse({
    menu: str(fd, "menu") || "header",
    labelAr: str(fd, "labelAr"),
    labelEn: str(fd, "labelEn"),
    href: str(fd, "href"),
    visible: str(fd, "visible"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const itemId = await saveNavItem(admin, id, parsed.data.menu, parsed.data);
  revalidateContent();
  return { ok: true, id: itemId };
}

export async function deleteNavItemAction(fd: FormData): Promise<void> {
  const admin = await authorize("navigation:delete");
  await deleteNavItem(admin, str(fd, "id"));
  revalidateContent();
}

export async function moveNavItemAction(fd: FormData): Promise<void> {
  const admin = await authorize("navigation:edit");
  await moveNavItem(admin, str(fd, "id"), str(fd, "dir") === "up" ? -1 : 1);
  revalidateContent();
}

/* ───────── media ───────── */

export async function updateMediaAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await authorize("media:edit");
  const id = str(fd, "id");
  if (!id) return { errors: { form: "notFound" } };
  const ok = await updateMedia(admin, id, {
    name: str(fd, "name") || undefined,
    altAr: str(fd, "altAr") || null,
    altEn: str(fd, "altEn") || null,
    folder: str(fd, "folder") || undefined,
  });
  if (!ok) return { errors: { form: "notFound" } };
  revalidatePath("/[locale]/admin/media", "page");
  return { ok: true };
}

export async function deleteMediaAction(fd: FormData): Promise<void> {
  const admin = await authorize("media:delete");
  const targets = await deleteMedia(admin, fd.getAll("id").map(String).filter(Boolean));
  revalidatePath("/[locale]/admin/media", "page");
  // Remove the physical files only after the rows are gone, so a failure never leaves orphan URLs.
  if (targets.length) {
    const { unlink } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const { deleteFromCloudinary } = await import("@/server/cloudinary");
    await Promise.allSettled(
      targets.map(({ url }) => {
        if (/^https?:\/\//.test(url)) return deleteFromCloudinary(url);
        const rel = url.replace(/^\/uploads\//, "").replace(/^\/+/, "");
        if (rel.includes("..")) return Promise.resolve();
        return unlink(join(process.cwd(), "public", "uploads", rel));
      }),
    );
  }
}

/* ───────── newsletter (public) ───────── */

export async function subscribeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  if (!(await rateLimit("newsletter", 5, 60_000))) return { errors: { form: "rateLimited" } };
  const email = str(fd, "email").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 160) return { errors: { email: "email" } };
  const locale = str(fd, "locale") === "ar" ? "ar" : "en";
  await subscribeNewsletter(email, locale);
  revalidatePath("/[locale]/admin/marketing", "page");
  return { ok: true };
}

export async function deleteSubscriberAction(fd: FormData): Promise<void> {
  const admin = await authorize("marketing:edit");
  await deleteSubscriber(admin, str(fd, "id"));
  revalidatePath("/[locale]/admin/marketing", "page");
}
