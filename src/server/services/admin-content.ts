import { and, asc, count, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { banners, homepageSections, media, navigationItems, newsletterSubscribers, pages } from "@/db/schema";
import type { AdminSessionUser } from "@/server/auth/admin-session";
import { recordAudit } from "./audit";

const escapeLike = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

/* ───────── homepage sections ───────── */

export const HOME_SECTION_KEYS = ["hero", "marquee", "new_collection", "categories", "editorial", "lookbook", "best_sellers", "banner", "testimonials", "newsletter", "collections"] as const;
export type HomeSectionKey = (typeof HOME_SECTION_KEYS)[number];

/** Section content lives in `config` (jsonb); shape depends on the key — see the homepage builder for the fields. */
export type SectionConfig = Record<string, unknown>;
export type SectionRow = typeof homepageSections.$inferSelect;

export const listHomepageSections = () => db.select().from(homepageSections).orderBy(asc(homepageSections.sortOrder), asc(homepageSections.key));

/** Enabled sections in display order — what the storefront renders. */
export const getEnabledSections = () => db.select().from(homepageSections).where(eq(homepageSections.enabled, true)).orderBy(asc(homepageSections.sortOrder), asc(homepageSections.key));

/**
 * Makes sure one row exists per known section key (new keys arrive with app updates),
 * then applies the admin's enabled/order/config edits in one transaction.
 */
export async function syncHomepageSections() {
  const existing = await db.select().from(homepageSections);
  const have = new Set(existing.map((s) => s.key));
  const missing = HOME_SECTION_KEYS.filter((k) => !have.has(k));
  if (missing.length) {
    const nextOrder = existing.length ? Math.max(...existing.map((s) => s.sortOrder)) + 1 : 0;
    // "collections" is opt-in: it arrives switched off so an existing homepage does not change until the admin enables it.
    await db.insert(homepageSections).values(missing.map((key, i) => ({ key, sortOrder: nextOrder + i, config: {}, enabled: key !== "collections" })));
  }
}

export async function toggleHomepageSection(actor: AdminSessionUser, id: string, enabled: boolean) {
  const [row] = await db.update(homepageSections).set({ enabled, updatedAt: new Date() }).where(eq(homepageSections.id, id)).returning({ key: homepageSections.key, enabled: homepageSections.enabled });
  if (!row) return false;
  await recordAudit(null, actor, { action: "homepage.toggle", entity: "homepage_section", entityId: id, summary: `${enabled ? "Enabled" : "Disabled"} homepage section ${row.key}`, before: { enabled: row.enabled }, after: { enabled } });
  return true;
}

export async function moveHomepageSection(actor: AdminSessionUser, id: string, dir: -1 | 1) {
  const all = await listHomepageSections();
  const i = all.findIndex((s) => s.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= all.length) return false;
  await db.transaction(async (tx) => {
    await tx.update(homepageSections).set({ sortOrder: j, updatedAt: new Date() }).where(eq(homepageSections.id, all[i]!.id));
    await tx.update(homepageSections).set({ sortOrder: i, updatedAt: new Date() }).where(eq(homepageSections.id, all[j]!.id));
  });
  await recordAudit(null, actor, { action: "homepage.reorder", entity: "homepage_section", entityId: id, summary: `Moved section ${all[i]!.key} ${dir < 0 ? "up" : "down"}` });
  return true;
}

/**
 * Applies a full drag-and-drop order in one transaction (moveHomepageSection only swaps neighbours).
 * `orderedIds` must be a permutation of the existing rows — anything else is rejected untouched.
 */
export async function reorderHomepageSections(actor: AdminSessionUser, orderedIds: string[]) {
  const all = await listHomepageSections();
  const unique = orderedIds.filter((id, i) => orderedIds.indexOf(id) === i);
  if (unique.length !== all.length || !all.every((s) => unique.includes(s.id))) return false;
  await db.transaction(async (tx) => {
    for (const [i, id] of unique.entries()) {
      await tx.update(homepageSections).set({ sortOrder: i, updatedAt: new Date() }).where(eq(homepageSections.id, id));
    }
  });
  await recordAudit(null, actor, { action: "homepage.reorder", entity: "homepage_section", entityId: unique.join(","), summary: `Reordered ${unique.length} homepage sections`, after: { order: unique } });
  return true;
}

export async function saveHomepageSectionConfig(actor: AdminSessionUser, id: string, config: SectionConfig) {
  const [before] = await db.select({ key: homepageSections.key, config: homepageSections.config }).from(homepageSections).where(eq(homepageSections.id, id)).limit(1);
  if (!before) return false;
  await db.update(homepageSections).set({ config, updatedAt: new Date() }).where(eq(homepageSections.id, id));
  await recordAudit(null, actor, {
    action: "homepage.edit",
    entity: "homepage_section",
    entityId: id,
    summary: `Edited homepage section ${before.key}`,
    before: { config: before.config },
    after: { config },
  });
  return true;
}

/* ───────── banners ───────── */

const BANNER_PAGE = 20;

export const listBannersAdmin = async () => ({ rows: await db.select().from(banners).orderBy(asc(banners.sortOrder), desc(banners.createdAt)) });

/** Paged variant of the banner list for the admin table (same ordering). */
export async function listBannersAdminPaged(page: number) {
  const [{ total } = { total: 0 }] = await db.select({ total: count() }).from(banners);
  const rows = await db.select().from(banners).orderBy(asc(banners.sortOrder), desc(banners.createdAt)).limit(BANNER_PAGE).offset((page - 1) * BANNER_PAGE);
  return { rows, total, pages: Math.max(1, Math.ceil(total / BANNER_PAGE)) };
}

export const getBannerAdmin = (id: string) => db.query.banners.findFirst({ where: eq(banners.id, id) });

export type BannerInput = {
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  imageUrl: string | null;
  mobileImageUrl: string | null;
  ctaLabelAr: string;
  ctaLabelEn: string;
  href: string | null;
  position: string;
  tone: string;
  startsAt: string;
  endsAt: string;
  visible: boolean;
  sortOrder: number;
};

export async function saveBanner(actor: AdminSessionUser, id: string | null, input: BannerInput) {
  const values = {
    titleAr: input.titleAr,
    titleEn: input.titleEn,
    bodyAr: input.bodyAr || null,
    bodyEn: input.bodyEn || null,
    imageUrl: input.imageUrl,
    mobileImageUrl: input.mobileImageUrl,
    ctaLabelAr: input.ctaLabelAr || null,
    ctaLabelEn: input.ctaLabelEn || null,
    href: input.href || null,
    position: input.position,
    tone: input.tone,
    startsAt: input.startsAt ? new Date(input.startsAt) : null,
    endsAt: input.endsAt ? new Date(input.endsAt) : null,
    visible: input.visible,
    sortOrder: input.sortOrder,
    updatedAt: new Date(),
  };
  let bid: string;
  if (id) {
    const [row] = await db.update(banners).set(values).where(eq(banners.id, id)).returning({ id: banners.id });
    bid = row!.id;
  } else {
    const [row] = await db.insert(banners).values(values).returning({ id: banners.id });
    bid = row!.id;
  }
  await recordAudit(null, actor, { action: id ? "banner.update" : "banner.create", entity: "banner", entityId: bid, summary: `${id ? "Updated" : "Created"} banner ${input.titleEn}`, after: { titleEn: input.titleEn, position: input.position, visible: input.visible } });
  return bid;
}

export async function deleteBanner(actor: AdminSessionUser, id: string) {
  const [row] = await db.delete(banners).where(eq(banners.id, id)).returning({ titleEn: banners.titleEn });
  if (row) await recordAudit(null, actor, { action: "banner.delete", entity: "banner", entityId: id, summary: `Deleted banner ${row.titleEn}`, before: { titleEn: row.titleEn } });
  return !!row;
}

export async function toggleBanner(actor: AdminSessionUser, id: string, visible: boolean) {
  const [row] = await db.update(banners).set({ visible, updatedAt: new Date() }).where(eq(banners.id, id)).returning({ titleEn: banners.titleEn, visible: banners.visible });
  if (!row) return false;
  await recordAudit(null, actor, { action: "banner.toggle", entity: "banner", entityId: id, summary: `${visible ? "Shown" : "Hidden"} banner ${row.titleEn}`, before: { visible: row.visible }, after: { visible } });
  return true;
}

/** Banners currently in flight for a storefront position. */
export function activeBanners(position: string, now = new Date()) {
  return db
    .select()
    .from(banners)
    .where(
      and(
        eq(banners.position, position),
        eq(banners.visible, true),
        or(isNull(banners.startsAt), sql`${banners.startsAt} <= ${now}`),
        or(isNull(banners.endsAt), sql`${banners.endsAt} >= ${now}`),
      ),
    )
    .orderBy(asc(banners.sortOrder));
}

/* ───────── CMS pages ───────── */

const PAGE_PAGE = 20;

export const listPagesAdmin = () => db.select().from(pages).orderBy(asc(pages.slug));

/** Paged variant of the page list for the admin table (same ordering). */
export async function listPagesAdminPaged(page: number) {
  const [{ total } = { total: 0 }] = await db.select({ total: count() }).from(pages);
  const rows = await db.select().from(pages).orderBy(asc(pages.slug)).limit(PAGE_PAGE).offset((page - 1) * PAGE_PAGE);
  return { rows, total, pages: Math.max(1, Math.ceil(total / PAGE_PAGE)) };
}

export const getPageAdmin = (id: string) => db.query.pages.findFirst({ where: eq(pages.id, id) });

/** Storefront lookup: only visible pages are served. */
export const getPublishedPage = (slug: string) => db.query.pages.findFirst({ where: and(eq(pages.slug, slug), eq(pages.visible, true)) });

export type PageInput = {
  slug: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  visible: boolean;
  seoTitleAr: string;
  seoTitleEn: string;
  seoDescriptionAr: string;
  seoDescriptionEn: string;
};

export async function savePage(actor: AdminSessionUser, id: string | null, input: PageInput) {
  const values = {
    slug: input.slug,
    titleAr: input.titleAr,
    titleEn: input.titleEn,
    bodyAr: input.bodyAr,
    bodyEn: input.bodyEn,
    visible: input.visible,
    seoTitleAr: input.seoTitleAr || null,
    seoTitleEn: input.seoTitleEn || null,
    seoDescriptionAr: input.seoDescriptionAr || null,
    seoDescriptionEn: input.seoDescriptionEn || null,
    updatedAt: new Date(),
  };
  let pid: string;
  if (id) {
    const [row] = await db.update(pages).set(values).where(eq(pages.id, id)).returning({ id: pages.id });
    pid = row!.id;
  } else {
    const [row] = await db.insert(pages).values(values).returning({ id: pages.id });
    pid = row!.id;
  }
  await recordAudit(null, actor, { action: id ? "page.update" : "page.create", entity: "page", entityId: pid, summary: `${id ? "Updated" : "Created"} page ${input.slug}`, after: { slug: input.slug, titleEn: input.titleEn, visible: input.visible } });
  return pid;
}

export async function deletePage(actor: AdminSessionUser, id: string) {
  const [row] = await db.delete(pages).where(eq(pages.id, id)).returning({ slug: pages.slug });
  if (row) await recordAudit(null, actor, { action: "page.delete", entity: "page", entityId: id, summary: `Deleted page ${row.slug}`, before: { slug: row.slug } });
  return !!row;
}

/* ───────── navigation menus ───────── */

export const NAV_MENUS = ["header", "footer"] as const;
export type NavMenu = (typeof NAV_MENUS)[number];

export const listNavItems = (menu: NavMenu) => db.select().from(navigationItems).where(eq(navigationItems.menu, menu)).orderBy(asc(navigationItems.sortOrder));

export type NavItemInput = { labelAr: string; labelEn: string; href: string; visible: boolean };

export async function saveNavItem(actor: AdminSessionUser, id: string | null, menu: NavMenu, input: NavItemInput) {
  const values = { menu, labelAr: input.labelAr, labelEn: input.labelEn, href: input.href, visible: input.visible, updatedAt: new Date() };
  let nid: string;
  if (id) {
    const [row] = await db.update(navigationItems).set(values).where(eq(navigationItems.id, id)).returning({ id: navigationItems.id });
    nid = row!.id;
  } else {
    const [{ max } = { max: -1 }] = await db.select({ max: sql<number>`coalesce(max(sort_order), -1)::int` }).from(navigationItems).where(eq(navigationItems.menu, menu));
    const [row] = await db.insert(navigationItems).values({ ...values, sortOrder: max + 1 }).returning({ id: navigationItems.id });
    nid = row!.id;
  }
  await recordAudit(null, actor, { action: id ? "navigation.update" : "navigation.create", entity: "navigation_item", entityId: nid, summary: `${id ? "Updated" : "Created"} ${menu} link ${input.labelEn}`, after: { ...input, menu } });
  return nid;
}

export async function moveNavItem(actor: AdminSessionUser, id: string, dir: -1 | 1) {
  const [target] = await db.select().from(navigationItems).where(eq(navigationItems.id, id)).limit(1);
  if (!target) return false;
  const siblings = await listNavItems(target.menu as NavMenu);
  const i = siblings.findIndex((n) => n.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= siblings.length) return false;
  await db.transaction(async (tx) => {
    await tx.update(navigationItems).set({ sortOrder: j, updatedAt: new Date() }).where(eq(navigationItems.id, siblings[i]!.id));
    await tx.update(navigationItems).set({ sortOrder: i, updatedAt: new Date() }).where(eq(navigationItems.id, siblings[j]!.id));
  });
  await recordAudit(null, actor, { action: "navigation.reorder", entity: "navigation_item", entityId: id, summary: `Moved ${target.menu} link ${target.labelEn} ${dir < 0 ? "up" : "down"}` });
  return true;
}

export async function deleteNavItem(actor: AdminSessionUser, id: string) {
  const [row] = await db.delete(navigationItems).where(eq(navigationItems.id, id)).returning({ labelEn: navigationItems.labelEn, menu: navigationItems.menu });
  if (row) await recordAudit(null, actor, { action: "navigation.delete", entity: "navigation_item", entityId: id, summary: `Deleted ${row.menu} link ${row.labelEn}`, before: { labelEn: row.labelEn } });
  return !!row;
}

/* ───────── media library ───────── */

const MEDIA_PAGE = 24;

export async function listMediaAdmin(f: { q?: string; folder?: string; page: number }) {
  const conds: (SQL | undefined)[] = [];
  const q = f.q?.trim().slice(0, 80);
  if (q) conds.push(or(ilike(media.name, escapeLike(q)), ilike(media.altEn, escapeLike(q)), ilike(media.altAr, escapeLike(q))));
  if (f.folder && f.folder !== "/") conds.push(eq(media.folder, f.folder));
  const where = conds.length ? and(...conds) : undefined;

  const [{ total } = { total: 0 }] = await db.select({ total: count() }).from(media).where(where);
  const rows = await db.select().from(media).where(where).orderBy(desc(media.createdAt)).limit(MEDIA_PAGE).offset((f.page - 1) * MEDIA_PAGE);
  return { rows, total, pages: Math.max(1, Math.ceil(total / MEDIA_PAGE)) };
}

export const mediaFolders = async () => {
  const rows = await db.selectDistinct({ folder: media.folder }).from(media).orderBy(media.folder);
  return rows.map((r) => r.folder);
};

export async function recordMedia(actor: AdminSessionUser, row: { url: string; name: string; folder: string; kind: "image" | "video"; sizeBytes: number | null }) {
  const [created] = await db.insert(media).values({ url: row.url, name: row.name, folder: row.folder || "/", kind: row.kind, sizeBytes: row.sizeBytes, createdById: actor.id }).returning();
  await recordAudit(null, actor, { action: "media.upload", entity: "media", entityId: created!.id, summary: `Uploaded ${row.name}`, after: { url: row.url, name: row.name, folder: row.folder } });
  return created!;
}

export async function updateMedia(actor: AdminSessionUser, id: string, patch: { name?: string; altAr?: string | null; altEn?: string | null; folder?: string }) {
  const [before] = await db.select().from(media).where(eq(media.id, id)).limit(1);
  if (!before) return false;
  // `url` stays as stored on disk — `name` is metadata only, so renaming never breaks the link.
  await db.update(media).set(patch).where(eq(media.id, id));
  await recordAudit(null, actor, {
    action: "media.update",
    entity: "media",
    entityId: id,
    summary: `Updated media ${patch.name ?? before.name}`,
    before: { name: before.name, altAr: before.altAr, altEn: before.altEn, folder: before.folder },
    after: patch as Record<string, unknown>,
  });
  return true;
}

export async function deleteMedia(actor: AdminSessionUser, ids: string[]) {
  const rows = await db.delete(media).where(inArray(media.id, ids)).returning({ id: media.id, url: media.url, name: media.name });
  if (rows.length) await recordAudit(null, actor, { action: "media.delete", entity: "media", entityId: ids.join(","), summary: `Deleted ${rows.length} media file(s)`, before: { names: rows.map((r) => r.name) } });
  return rows.map((r) => ({ url: r.url }));
}

/* ───────── newsletter subscribers ───────── */

export async function listSubscribers(f: { q?: string; page: number }) {
  const conds: (SQL | undefined)[] = [];
  const q = f.q?.trim().slice(0, 120);
  if (q) conds.push(ilike(newsletterSubscribers.email, escapeLike(q)));
  const where = conds.length ? and(...conds) : undefined;

  const [{ total } = { total: 0 }] = await db.select({ total: count() }).from(newsletterSubscribers).where(where);
  const rows = await db.select().from(newsletterSubscribers).where(where).orderBy(desc(newsletterSubscribers.createdAt)).limit(BANNER_PAGE).offset((f.page - 1) * BANNER_PAGE);
  return { rows, total, pages: Math.max(1, Math.ceil(total / BANNER_PAGE)) };
}

/** Idempotent opt-in: a duplicate address is a silent success (no account enumeration). */
export async function subscribeNewsletter(email: string, locale: string, source = "footer") {
  const existing = await db.select({ id: newsletterSubscribers.id }).from(newsletterSubscribers).where(eq(newsletterSubscribers.email, email)).limit(1);
  if (existing.length) return { ok: true as const, duplicate: true as const };
  await db.insert(newsletterSubscribers).values({ email, locale, source }).onConflictDoNothing();
  return { ok: true as const, duplicate: false as const };
}

export async function deleteSubscriber(actor: AdminSessionUser, id: string) {
  const [row] = await db.delete(newsletterSubscribers).where(eq(newsletterSubscribers.id, id)).returning({ email: newsletterSubscribers.email });
  if (row) await recordAudit(null, actor, { action: "newsletter.remove", entity: "newsletter_subscriber", entityId: id, summary: `Removed subscriber ${row.email}`, before: { email: row.email } });
  return !!row;
}
