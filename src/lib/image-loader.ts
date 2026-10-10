/**
 * Custom next/image loader: images are served straight from their source instead of going through
 * Vercel's image optimizer (which rejects unknown hosts, has quotas, and was returning errors).
 * Cloudinary URLs get on-the-fly resizing + automatic format/quality; every other URL is used as-is.
 */
export default function imageLoader({ src, width }: { src: string; width: number; quality?: number }): string {
  const m = src.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/);
  if (m) return `${m[1]}f_auto,q_auto,w_${width},c_limit/${m[2]}`;
  if (src.startsWith("/")) return `${src}?w=${width}`; // local /public files ignore the query string
  return src;
}
