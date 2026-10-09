import { NextResponse } from "next/server";
import { z } from "zod";
import { getProductsByIds } from "@/server/services/catalog";

const ids = z.array(z.uuid()).max(60);

/** Minimal product data for the wishlist page, so guests (whose list lives in the browser) can see their items. */
export async function GET(req: Request) {
  const parsed = ids.safeParse((new URL(req.url).searchParams.get("ids") ?? "").split(",").filter(Boolean));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const rows = await getProductsByIds(parsed.data);
  return NextResponse.json(
    rows.map((p) => ({
      id: p.id, slug: p.slug, nameAr: p.nameAr, nameEn: p.nameEn, priceMinor: p.priceMinor, salePriceMinor: p.salePriceMinor,
      image: p.images[0] ? { url: p.images[0].url, tone: p.images[0].tone } : null,
      variants: p.variants.map((v) => ({ id: v.id, size: v.size, stock: v.stock, colorHex: v.colorHex })),
    })),
    { headers: { "Cache-Control": "no-store" } },
  );
}
