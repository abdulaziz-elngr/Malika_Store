"use server";

import { cookies } from "next/headers";
import { after } from "next/server";
import { getLocale } from "next-intl/server";
import { checkoutSchema, fieldErrors, type CheckoutInput, type FieldErrors } from "@/lib/validation/checkout";
import { rateLimit } from "@/server/auth/rate-limit";
import { assertAuthSecret, ORDER_COOKIE, sign } from "@/server/auth/secret";
import { getCustomer } from "@/server/auth/session";
import { notifyAdminsOfNewOrder } from "@/server/services/order-alerts";
import { placeOrder } from "@/server/services/orders";

export type PlaceOrderActionResult = { ok: true; number: string; redirectUrl?: string } | { ok: false; code: "stock" | "coupon" | "payment" | "proof" | "empty" | "rateLimited" | "invalid"; errors?: FieldErrors };

export async function placeOrderAction(input: CheckoutInput): Promise<PlaceOrderActionResult> {
  assertAuthSecret(); // misconfiguration must fail before an order is committed, never after
  if (!(await rateLimit("checkout", 10, 10 * 60_000))) return { ok: false, code: "rateLimited" };
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid", errors: fieldErrors(parsed.error) };

  const [customer, locale] = await Promise.all([getCustomer(), getLocale()]);
  const res = await placeOrder(parsed.data, customer, locale === "en" ? "en" : "ar");
  if (!res.ok) return res;

  // The order is committed. Email the store team after the response is sent, so a slow or failing mail server can never delay or break checkout.
  after(() => notifyAdminsOfNewOrder(res.number));

  // Lets a guest see their confirmation page for a short while without an account.
  (await cookies()).set(ORDER_COOKIE, sign(res.number), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 });
  return res;
}
