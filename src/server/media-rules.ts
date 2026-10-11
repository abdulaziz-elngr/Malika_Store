/** Shared upload rules for the media library (direct-to-Cloudinary and local-dev paths). */
export const MAX_BYTES = 20 * 1024 * 1024;

/** Exact MIME → extension + kind. Anything not listed here is refused (notably SVG, which can carry scripts). */
export const ACCEPTED: Record<string, { ext: string; kind: "image" | "video" }> = {
  "image/jpeg": { ext: ".jpg", kind: "image" },
  "image/png": { ext: ".png", kind: "image" },
  "image/webp": { ext: ".webp", kind: "image" },
  "image/avif": { ext: ".avif", kind: "image" },
  "video/mp4": { ext: ".mp4", kind: "video" },
  "video/webm": { ext: ".webm", kind: "video" },
};

export const cleanFolder = (raw: unknown) =>
  String(raw ?? "")
    .replace(/[^\w\-/ ]/g, "")
    .replace(/\/+/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .slice(0, 60) || "general";

export const cleanName = (raw: unknown) => String(raw || "upload").replace(/[\\/:*?"<>|]/g, "-").slice(0, 120);
