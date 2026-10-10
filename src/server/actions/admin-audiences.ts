"use server";

import { revalidatePath } from "next/cache";
import { fieldErrors } from "@/lib/validation/checkout";
import { audienceFormSchema } from "@/lib/validation/admin-catalog";
import { authorize } from "@/server/auth/rbac";
import { deleteAudience, reorderAudience, saveAudience } from "@/server/services/admin-audiences";
import type { ActionState } from "./types";

const str = (fd: FormData, k: string) => (typeof fd.get(k) === "string" ? (fd.get(k) as string) : "");

const revalidateAll = () => {
  revalidatePath("/[locale]/admin/audiences", "page");
  revalidatePath("/[locale]/admin/products", "page");
  revalidatePath("/[locale]/shop", "page");
  revalidatePath("/", "layout");
};

export async function saveAudienceAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd, "id") || null;
  const admin = await authorize(id ? "categories:edit" : "categories:create");
  const parsed = audienceFormSchema.safeParse({
    nameAr: str(fd, "nameAr"),
    nameEn: str(fd, "nameEn"),
    slug: str(fd, "slug"),
    includeUnisex: str(fd, "includeUnisex"),
    visible: str(fd, "visible"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  try {
    const audienceId = await saveAudience(admin, id, parsed.data);
    revalidateAll();
    return { ok: true, id: audienceId };
  } catch (e) {
    if (/audience_slug_idx/.test(e instanceof Error ? e.message : "")) return { errors: { slug: "duplicate" } };
    throw e;
  }
}

export async function deleteAudienceAction(fd: FormData): Promise<void> {
  const admin = await authorize("categories:delete");
  await deleteAudience(admin, str(fd, "id"));
  revalidateAll();
}

export async function moveAudienceAction(fd: FormData): Promise<void> {
  const admin = await authorize("categories:edit");
  await reorderAudience(admin, str(fd, "id"), str(fd, "dir") === "up" ? -1 : 1);
  revalidateAll();
}
