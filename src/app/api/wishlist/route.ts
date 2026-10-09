import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/server/auth/rate-limit";
import { getCustomer } from "@/server/auth/session";
import { addToWishlist, getWishlistIds, removeFromWishlist } from "@/server/services/customers";

const noStore = { "Cache-Control": "no-store" };

/** Tells the client whether a session exists and, if so, which products are already wished for. */
export async function GET() {
  const c = await getCustomer();
  return NextResponse.json({ authenticated: !!c, ids: c ? await getWishlistIds(c.id) : [] }, { headers: noStore });
}

const body = z.discriminatedUnion("op", [
  z.object({ op: z.literal("add"), productId: z.uuid() }),
  z.object({ op: z.literal("remove"), productId: z.uuid() }),
  z.object({ op: z.literal("merge"), ids: z.array(z.uuid()).max(200) }),
]);

export async function POST(req: Request) {
  const c = await getCustomer();
  if (!c) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!(await rateLimit("wishlist", 120, 60_000))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const b = parsed.data;
  if (b.op === "add") await addToWishlist(c.id, [b.productId]);
  else if (b.op === "remove") await removeFromWishlist(c.id, b.productId);
  else await addToWishlist(c.id, b.ids);
  return NextResponse.json({ ok: true, ids: await getWishlistIds(c.id) }, { headers: noStore });
}
