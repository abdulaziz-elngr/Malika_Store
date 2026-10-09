import { NextResponse } from "next/server";
import { z } from "zod";
import { isSameOrigin } from "@/server/auth/origin";
import { rateLimit } from "@/server/auth/rate-limit";
import { recordVisit } from "@/server/services/analytics";

const body = z.object({ visitorId: z.string().regex(/^[A-Za-z0-9_-]{12,40}$/), path: z.string().max(200).startsWith("/") });

/** Anonymous "a session started" beacon: the denominator of the conversion rate. Stores no personal data. */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!(await rateLimit("track", 30, 60_000))) return new NextResponse(null, { status: 429 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  await recordVisit(parsed.data.visitorId, parsed.data.path);
  return new NextResponse(null, { status: 204 });
}
