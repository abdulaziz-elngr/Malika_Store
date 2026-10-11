import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { rateLimit } from "@/server/auth/rate-limit";
import { authorize, ForbiddenError, UnauthenticatedError } from "@/server/auth/rbac";
import { listMediaAdmin, recordMedia } from "@/server/services/admin-content";
import { ACCEPTED, MAX_BYTES, cleanFolder, cleanName } from "@/server/media-rules";
import { cloudinaryEnabled, deleteFromCloudinary, uploadToCloudinary } from "@/server/cloudinary";

/** Library browser for the picker dialog: GET /api/admin/media?q=&page=&kind=image|video */
export async function GET(req: Request) {
  try {
    await authorize("media:view");
    const sp = new URL(req.url).searchParams;
    const page = Math.min(500, Math.max(1, Number.parseInt(sp.get("page") ?? "", 10) || 1));
    const kind = sp.get("kind");
    const data = await listMediaAdmin({ q: sp.get("q")?.slice(0, 80) || undefined, page });
    const rows = data.rows
      .filter((r) => !kind || r.kind === kind)
      .map((r) => ({ id: r.id, url: r.url, name: r.name, kind: r.kind }));
    return NextResponse.json({ ok: true, rows, pages: data.pages });
  } catch (err) {
    if (err instanceof UnauthenticatedError || err instanceof ForbiddenError) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    console.error("[media/list]", err);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}

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
    const folder = cleanFolder(form?.get("folder"));

    // The stored name never comes from the client: uuid + today's folder keeps paths clean and collision-free.
    const stamp = new Date().toISOString().slice(0, 10);
    const id = randomUUID();
    const filename = `${id}${spec.ext}`;
    const displayName = cleanName(file.name);

    // Vercel's filesystem is read-only, so with Cloudinary env vars set the file goes to Cloudinary.
    // Without them (local dev) it falls back to public/uploads.
    const useCloud = cloudinaryEnabled();
    let relUrl: string;
    let abs = "";
    if (useCloud) {
      relUrl = await uploadToCloudinary(file, { folder: `malika/${stamp}`, publicId: id, kind: spec.kind });
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
      if (useCloud) await deleteFromCloudinary(relUrl).catch(() => {});
      else await unlink(abs).catch(() => {});
      throw err;
    }
  } catch (err) {
    if (err instanceof UnauthenticatedError || err instanceof ForbiddenError) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    console.error("[media/upload]", err);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
