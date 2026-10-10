import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { del, put } from "@vercel/blob";
import { rateLimit } from "@/server/auth/rate-limit";
import { authorize, ForbiddenError, UnauthenticatedError } from "@/server/auth/rbac";
import { recordMedia } from "@/server/services/admin-content";

/** Hard cap for the boutique's media: photography and short lookbook clips only. */
const MAX_BYTES = 5 * 1024 * 1024;

/** Exact MIME → extension + kind. Anything not listed here is refused (notably SVG, which can carry scripts). */
const ACCEPTED: Record<string, { ext: string; kind: "image" | "video" }> = {
  "image/jpeg": { ext: ".jpg", kind: "image" },
  "image/png": { ext: ".png", kind: "image" },
  "image/webp": { ext: ".webp", kind: "image" },
  "image/avif": { ext: ".avif", kind: "image" },
  "video/mp4": { ext: ".mp4", kind: "video" },
  "video/webm": { ext: ".webm", kind: "video" },
};

export async function POST(req: Request) {
  try {
    const admin = await authorize("media:create");
    if (!(await rateLimit("media-upload", 30, 60_000))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!file || !(file instanceof File)) return NextResponse.json({ error: "bad_request" }, { status: 400 });

    const spec = ACCEPTED[file.type];
    if (!spec) return NextResponse.json({ error: "bad_type" }, { status: 415 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "too_large" }, { status: 413 });

    // Folder is client metadata only: whitelisted characters, no traversal possible.
    const folder =
      String(form?.get("folder") ?? "")
        .replace(/[^\w\-/ ]/g, "")
        .replace(/\/+/g, "/")
        .replace(/^\/+|\/+$/g, "")
        .slice(0, 60) || "general";

    // The stored name never comes from the client: uuid + today's folder keeps paths clean and collision-free.
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `${randomUUID()}${spec.ext}`;
    const displayName = (file.name || "upload").replace(/[\\/:*?"<>|]/g, "-").slice(0, 120);

    // Vercel's filesystem is read-only, so when a Blob token exists the file goes to Vercel Blob (public URL).
    // Without a token (local dev) it still falls back to public/uploads.
    const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
    let relUrl: string;
    let abs = "";
    if (useBlob) {
      const blob = await put(`uploads/${stamp}/${filename}`, file, { access: "public", contentType: file.type, addRandomSuffix: false });
      relUrl = blob.url;
    } else {
      const dir = join(process.cwd(), "public", "uploads", stamp);
      abs = join(dir, filename);
      relUrl = `/uploads/${stamp}/${filename}`;
      await mkdir(dir, { recursive: true });
      await writeFile(abs, Buffer.from(await file.arrayBuffer()));
    }

    try {
      const created = await recordMedia(admin, { url: relUrl, name: displayName, folder, kind: spec.kind, sizeBytes: file.size });
      return NextResponse.json({ ok: true, media: { id: created.id, url: created.url, name: created.name, kind: created.kind } });
    } catch (err) {
      // Never leave an orphan file behind if the row could not be written.
      if (useBlob) await del(relUrl).catch(() => {});
      else await unlink(abs).catch(() => {});
      throw err;
    }
  } catch (err) {
    if (err instanceof UnauthenticatedError || err instanceof ForbiddenError) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    console.error("[media/upload]", err);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
