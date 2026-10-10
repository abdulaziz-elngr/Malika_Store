import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { audiences, products } from "@/db/schema";
import { slugify } from "@/lib/slug";
import type { AdminSessionUser } from "@/server/auth/admin-session";
import { recordAudit } from "./audit";

export const listAudiencesAdmin = () =>
  db
    .select({ a: audiences, productCount: sql<number>`(select count(*)::int from product p where p.gender = "audience"."slug")` })
    .from(audiences)
    .orderBy(asc(audiences.sortOrder));

/** Every audience (hidden ones too) for the product form and filters in the admin. */
export const listAudienceOptions = () =>
  db.select({ slug: audiences.slug, nameAr: audiences.nameAr, nameEn: audiences.nameEn }).from(audiences).orderBy(asc(audiences.sortOrder));

export type AudienceInput = { nameAr: string; nameEn: string; slug: string; includeUnisex: boolean; visible: boolean };

export async function saveAudience(actor: AdminSessionUser, id: string | null, input: AudienceInput) {
  let aid: string;
  if (id) {
    // The slug is what products point at, so it is fixed once created.
    const [row] = await db
      .update(audiences)
      .set({ nameAr: input.nameAr, nameEn: input.nameEn, includeUnisex: input.includeUnisex, visible: input.visible, updatedAt: new Date() })
      .where(eq(audiences.id, id))
      .returning({ id: audiences.id });
    aid = row!.id;
  } else {
    const slug = input.slug || slugify(input.nameEn);
    const [{ max } = { max: 0 }] = await db.select({ max: sql<number>`coalesce(max(sort_order), -1)::int` }).from(audiences);
    const [row] = await db
      .insert(audiences)
      .values({ slug, nameAr: input.nameAr, nameEn: input.nameEn, includeUnisex: input.includeUnisex, visible: input.visible, sortOrder: max + 1 })
      .returning({ id: audiences.id });
    aid = row!.id;
  }
  await recordAudit(null, actor, { action: id ? "audience.update" : "audience.create", entity: "audience", entityId: aid, summary: `${id ? "Updated" : "Created"} audience ${input.nameEn}`, after: { nameEn: input.nameEn, visible: input.visible } });
  return aid;
}

export async function reorderAudience(actor: AdminSessionUser, id: string, dir: -1 | 1) {
  const all = await db.select().from(audiences).orderBy(asc(audiences.sortOrder));
  const i = all.findIndex((a) => a.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= all.length) return;
  await db.transaction(async (tx) => {
    await tx.update(audiences).set({ sortOrder: j, updatedAt: new Date() }).where(eq(audiences.id, all[i]!.id));
    await tx.update(audiences).set({ sortOrder: i, updatedAt: new Date() }).where(eq(audiences.id, all[j]!.id));
  });
  await recordAudit(null, actor, { action: "audience.reorder", entity: "audience", entityId: id, summary: `Moved audience ${all[i]!.nameEn} ${dir < 0 ? "up" : "down"}` });
}

/** Refuses to delete an audience that products still use, so no product is left without a valid audience. */
export async function deleteAudience(actor: AdminSessionUser, id: string) {
  const [a] = await db.select().from(audiences).where(eq(audiences.id, id)).limit(1);
  if (!a) return false;
  const [{ n } = { n: 0 }] = await db.select({ n: sql<number>`count(*)::int` }).from(products).where(eq(products.gender, a.slug));
  if (n > 0) return false;
  await db.delete(audiences).where(eq(audiences.id, id));
  await recordAudit(null, actor, { action: "audience.delete", entity: "audience", entityId: id, summary: `Deleted audience ${a.nameEn}`, before: { nameEn: a.nameEn } });
  return true;
}
