import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { isSameOrigin } from "@/server/auth/origin";
import { rateLimit } from "@/server/auth/rate-limit";
import { sign } from "@/server/auth/secret";
import { cloudinaryEnabled, uploadToCloudinary } from "@/server/cloudinary";

/** Customers upload a screenshot of their transfer receipt before placing the order. Images only, 5 MB max. */
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

/** The declared MIME type is client-controlled, so the file's own first bytes must agree with it. */
function looksLike(type: string, b: Uint8Array) {
  if (type === "image/jpeg") return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (type === "image/png") return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  if (type === "image/webp") return b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;
  return false;
}

export async function POST(req: Request) {
  try {
    if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    if (!(await rateLimit("receipt-upload", 8, 10 * 60_000))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!file || !(file instanceof File)) return NextResponse.json({ error: "bad_request" }, { status: 400 });

    const ext = ACCEPTED[file.type];
    if (!ext) return NextResponse.json({ error: "bad_type" }, { status: 415 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "too_large" }, { status: 413 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!looksLike(file.type, bytes)) return NextResponse.json({ error: "bad_type" }, { status: 415 });

    // The stored name never comes from the client.
    const id = randomUUID();
    const stamp = new Date().toISOString().slice(0, 10);
    let url: string;
    if (cloudinaryEnabled()) {
      url = await uploadToCloudinary(file, { folder: `malika/receipts/${stamp}`, publicId: id, kind: "image" });
    } else {
      // Local development fallback (Vercel's filesystem is read-only, so production needs the Cloudinary env vars).
      const dir = join(process.cwd(), "public", "uploads", "receipts", stamp);
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, `${id}${ext}`), bytes);
      url = `/uploads/receipts/${stamp}/${id}${ext}`;
    }
    // The token proves this URL came from this endpoint, so an order can never reference an arbitrary link.
    return NextResponse.json({ ok: true, url, token: sign(url) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[checkout/receipt]", err);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
