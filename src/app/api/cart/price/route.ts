import { NextResponse } from "next/server";
import { z } from "zod";
import { DELIVERY_IDS } from "@/lib/shipping";
import { normalizePhone } from "@/lib/validation/checkout";
import { rateLimit } from "@/server/auth/rate-limit";
import { getCustomer } from "@/server/auth/session";
import { priceCart } from "@/server/services/cart";

const body = z.object({
  items: z.array(z.object({ variantId: z.uuid(), quantity: z.number().int().min(1).max(99) })).max(30),
  coupon: z.string().trim().max(40).nullish(),
  deliveryMethod: z.enum(DELIVERY_IDS).nullish(),
  phone: z.string().max(30).nullish(),
});

export async function POST(req: Request) {
  if (!(await rateLimit("cart-price", 90, 60_000))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const customer = await getCustomer();
  const pricing = await priceCart({
    items: parsed.data.items,
    coupon: parsed.data.coupon,
    deliveryMethod: parsed.data.deliveryMethod,
    phone: parsed.data.phone ? normalizePhone(parsed.data.phone) : null,
    customerId: customer?.id,
    email: customer?.email,
  });
  // couponId is internal; undefined is dropped from the JSON.
  return NextResponse.json({ ...pricing, couponId: undefined }, { headers: { "Cache-Control": "no-store" } });
}
