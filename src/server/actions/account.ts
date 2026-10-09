"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { fieldErrors } from "@/lib/validation/checkout";
import { passwordChangeSchema, profileSchema, savedAddressSchema } from "@/lib/validation/account";
import { createSession, destroyAllSessions, getCustomer } from "@/server/auth/session";
import { rateLimit } from "@/server/auth/rate-limit";
import { markAllRead } from "@/server/services/notifications";
import { changePassword, deleteAddress, saveAddress, updateProfile } from "@/server/services/customers";
import type { ActionState } from "./types";

const str = (fd: FormData, k: string) => (typeof fd.get(k) === "string" ? (fd.get(k) as string) : "");

async function requireCustomer() {
  const c = await getCustomer();
  if (!c) redirect({ href: "/account/login", locale: await getLocale() });
  return c!;
}

export async function updateProfileAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const c = await requireCustomer();
  const values = { name: str(fd, "name"), phone: str(fd, "phone") };
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  await updateProfile(c.id, parsed.data);
  revalidatePath("/", "layout");
  return { ok: true, values };
}

export async function changePasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const c = await requireCustomer();
  if (!(await rateLimit("password", 6, 15 * 60_000))) return { errors: { form: "rateLimited" } };
  const parsed = passwordChangeSchema.safeParse({ current: str(fd, "current"), next: str(fd, "next") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  if (!(await changePassword(c.id, parsed.data.current, parsed.data.next))) return { errors: { current: "wrongPassword" } };
  // Sign out every other device, then keep this one signed in.
  await destroyAllSessions(c.id);
  await createSession(c.id);
  return { ok: true };
}

export async function saveAddressAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const c = await requireCustomer();
  const values = Object.fromEntries(["label", "recipient", "phone", "governorate", "city", "line1", "line2", "notes"].map((k) => [k, str(fd, k)]));
  const parsed = savedAddressSchema.safeParse({ ...values, isDefault: fd.get("isDefault") === "on" });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const id = str(fd, "id") || undefined;
  await saveAddress(c.id, parsed.data, id);
  revalidatePath("/[locale]/account/addresses", "page");
  return { ok: true };
}

export async function deleteAddressAction(fd: FormData) {
  const c = await requireCustomer();
  const id = str(fd, "id");
  if (id) await deleteAddress(c.id, id);
  revalidatePath("/[locale]/account/addresses", "page");
}

export async function markNotificationsReadAction() {
  const c = await requireCustomer();
  await markAllRead(c.id);
  revalidatePath("/[locale]/account/notifications", "page");
}
