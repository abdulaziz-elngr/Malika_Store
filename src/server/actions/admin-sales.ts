"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type FieldErrors, fieldErrors } from "@/lib/validation/checkout";
import { couponFormSchema } from "@/lib/validation/admin-content";
import { authorize } from "@/server/auth/rbac";
import {
  deleteCoupon,
  moderateReview,
  saveCoupon,
  setInternalNote,
  toggleCoupon,
  updateOrderStatus,
  updatePaymentStatus,
} from "@/server/services/admin-sales";
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

const revalidateSales = () => {
  revalidatePath("/[locale]/admin/orders", "page");
  revalidatePath("/[locale]/admin/customers", "page");
  revalidatePath("/[locale]/admin/reviews", "page");
  revalidatePath("/[locale]/admin/coupons", "page");
  revalidatePath("/", "layout");
};

/* ───────── orders ───────── */

const statusSchema = z.enum(["pending", "confirmed", "preparing", "shipped", "delivered", "cancelled", "returned"]);
const paymentSchema = z.enum(["pending", "paid", "failed", "refunded"]);

export async function changeOrderStatusAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await authorize("orders:edit");
  const orderId = str(fd, "orderId");
  const status = statusSchema.safeParse(str(fd, "status"));
  if (!orderId || !status.success) return { errors: { status: "invalid" } };

  const res = await updateOrderStatus(admin, orderId, status.data, str(fd, "note"));
  if (!res.ok) return { errors: { status: res.code === "same" ? "sameStatus" : res.code === "invalid" ? "invalidTransition" : "notFound" } };
  revalidateSales();
  return { ok: true };
}

export async function changePaymentStatusAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await authorize("orders:edit");
  const orderId = str(fd, "orderId");
  const status = paymentSchema.safeParse(str(fd, "paymentStatus"));
  if (!orderId || !status.success) return { errors: { paymentStatus: "invalid" } };

  const ok = await updatePaymentStatus(admin, orderId, status.data);
  if (!ok) return errors("notFound");
  revalidateSales();
  return { ok: true };
}

export async function setOrderNoteAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await authorize("orders:edit");
  const orderId = str(fd, "orderId");
  if (!orderId) return errors("notFound");
  await setInternalNote(admin, orderId, str(fd, "note"));
  revalidateSales();
  return { ok: true };
}

const errors = (form: string): ActionState => ({ errors: { form } satisfies FieldErrors });

/* ───────── reviews ───────── */

const reviewActions = z.enum(["approve", "reject", "feature", "unfeature", "delete"]);

export async function moderateReviewAction(fd: FormData): Promise<void> {
  const admin = await authorize("reviews:edit");
  const parsed = reviewActions.safeParse(str(fd, "action"));
  const id = str(fd, "id");
  if (!parsed.success || !id) return;
  await moderateReview(admin, id, parsed.data);
  revalidatePath("/[locale]/admin/reviews", "page");
}

/* ───────── coupons ───────── */

export async function saveCouponAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd, "id") || null;
  const admin = await authorize(id ? "coupons:edit" : "coupons:create");
  const parsed = couponFormSchema.safeParse({
    code: str(fd, "code"),
    type: str(fd, "type") || "percent",
    value: str(fd, "value"),
    descriptionAr: str(fd, "descriptionAr"),
    descriptionEn: str(fd, "descriptionEn"),
    minOrderMinor: str(fd, "minOrderMinor"),
    maxDiscountMinor: str(fd, "maxDiscountMinor"),
    startsAt: str(fd, "startsAt"),
    expiresAt: str(fd, "expiresAt"),
    usageLimit: str(fd, "usageLimit"),
    perCustomerLimit: str(fd, "perCustomerLimit"),
    active: str(fd, "active"),
    productIds: json<string[]>(fd, "productIds", []),
    categoryIds: json<string[]>(fd, "categoryIds", []),
    collectionIds: json<string[]>(fd, "collectionIds", []),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  try {
    const couponId = await saveCoupon(admin, id, parsed.data);
    revalidateSales();
    return { ok: true, id: couponId };
  } catch (e) {
    if (/coupon_code_idx/.test(e instanceof Error ? e.message : "")) return { errors: { code: "duplicate" } };
    throw e;
  }
}

export async function deleteCouponAction(fd: FormData): Promise<void> {
  const admin = await authorize("coupons:delete");
  await deleteCoupon(admin, str(fd, "id"));
  revalidateSales();
}

export async function toggleCouponAction(fd: FormData): Promise<void> {
  const admin = await authorize("coupons:edit");
  await toggleCoupon(admin, str(fd, "id"), str(fd, "active") === "true");
  revalidateSales();
}
