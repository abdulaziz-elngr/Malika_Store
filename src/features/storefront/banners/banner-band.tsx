import { getLocale } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Link } from "@/i18n/navigation";
import { pick, type Loc } from "@/lib/localize";
import type { BannerRow } from "@/server/services/content";

const stripCls = (tone: string) =>
  tone === "sage" ? "bg-sage-200 text-wine-900"
  : tone === "copper" ? "bg-copper-300 text-wine-900"
  : tone === "cream" ? "bg-cream-100 text-wine-900"
  : "bg-wine-800 text-cream-50";

/** Slim announcement row (position = strip) pinned above the homepage content. */
export async function StripBar({ banners }: { banners: BannerRow[] }) {
  if (!banners.length) return null;
  const loc = (await getLocale()) as Loc;
  const first = banners[0];
  return (
    <div className={stripCls(first?.tone ?? "wine")}>
      <Container className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 py-2.5 text-center text-[0.68rem] uppercase tracking-[0.22em]">
        {banners.map((b) => {
          const title = pick(loc, b.titleAr, b.titleEn);
          const body = pick(loc, b.bodyAr, b.bodyEn);
          const cta = pick(loc, b.ctaLabelAr, b.ctaLabelEn);
          const inner = (
            <>
              {title}
              {body ? <span className="normal-case tracking-normal opacity-80"> — {body}</span> : null}
              {b.href && cta ? <span className="ms-1 underline underline-offset-4"> · {cta}</span> : null}
            </>
          );
          return <span key={b.id}>{b.href ? <Link href={b.href}>{inner}</Link> : inner}</span>;
        })}
      </Container>
    </div>
  );
}

/** Editorial banner cards (position = home), shown after the hero. */
export async function BannerCards({ banners }: { banners: BannerRow[] }) {
  if (!banners.length) return null;
  const loc = (await getLocale()) as Loc;
  return (
    <section className="py-12">
      <Container className="grid gap-6 md:grid-cols-2">
        {banners.map((b) => {
          const title = pick(loc, b.titleAr, b.titleEn);
          const body = pick(loc, b.bodyAr, b.bodyEn);
          const cta = pick(loc, b.ctaLabelAr, b.ctaLabelEn);
          return (
            <article key={b.id} className="relative isolate min-h-64 overflow-hidden border border-line">
              {b.imageUrl ? (
                <picture className="absolute inset-0 -z-10">
                  {b.mobileImageUrl ? <source media="(max-width: 640px)" srcSet={b.mobileImageUrl} /> : null}
                  <img src={b.imageUrl} alt="" loading="lazy" className="size-full object-cover" />
                </picture>
              ) : (
                <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-br from-wine-900 via-wine-700 to-copper-500" />
              )}
              <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-wine-950/85 via-wine-950/25 to-transparent" />
              <div className="flex min-h-64 flex-col justify-end gap-3 p-6 text-cream-50">
                <h2 className="font-display text-3xl sm:text-4xl">{title}</h2>
                {body ? <p className="max-w-md text-sm text-cream-100/85">{body}</p> : null}
                {b.href ? (
                  <Link href={b.href} className="w-fit text-xs uppercase tracking-[0.24em] text-copper-200 underline-offset-4 hover:underline">
                    {cta || title}
                  </Link>
                ) : null}
              </div>
            </article>
          );
        })}
      </Container>
    </section>
  );
}
