"use server";

import { revalidatePath } from "next/cache";
import { fieldErrors } from "@/lib/validation/checkout";
import { reviewSchema } from "@/lib/validation/review";
import { rateLimit } from "@/server/auth/rate-limit";
import { getCustomer } from "@/server/auth/session";
import { submitReview } from "@/server/services/reviews";
import type { ActionState } from "./types";

const str = (fd: FormData, k: string) => (typeof fd.get(k) === "string" ? (fd.get(k) as string) : "");

/** Customer-facing: only a signed-in customer whose order containing the product was delivered may review it. */
export async function submitReviewAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const values = { rating: str(fd, "rating"), body: str(fd, "body"), productId: str(fd, "productId") };
  const customer = await getCustomer();
  if (!customer) return { errors: { form: "reviewLogin" }, values };
  const parsed = reviewSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  if (!(await rateLimit("review", 10, 15 * 60_000))) return { errors: { form: "rateLimited" }, values };
  const res = await submitReview(customer, parsed.data.productId, { rating: parsed.data.rating, body: parsed.data.body });
  if (!res.ok) return { errors: { form: "reviewNotEligible" }, values };
  revalidatePath("/[locale]/products/[slug]", "page");
  revalidatePath("/[locale]/account/orders/[number]", "page");
  return { ok: true, values };
}
