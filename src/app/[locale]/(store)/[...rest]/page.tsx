import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/container";
import type { Locale } from "@/i18n/routing";
import { pick } from "@/lib/localize";
import { getPageBySlug } from "@/server/services/content";

export const dynamic = "force-dynamic";

type Params = { locale: Locale; rest: string[] };

/**
 * CMS-backed content pages: /about, /contact, /faq, /privacy, /terms and any other
 * slug an editor publishes. Anything unknown still resolves to the branded 404.
 */
async function loadPage(params: Promise<Params>) {
  const { locale, rest } = await params;
  setRequestLocale(locale);
  if (!rest.length || rest.length > 3) notFound();
  if (rest.some((seg) => !seg || seg === "." || seg === "..")) notFound();
  const page = await getPageBySlug(rest.join("/"));
  if (!page) notFound();
  return { locale, page };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale, page } = await loadPage(params);
  const title = pick(locale, page.seoTitleAr, page.seoTitleEn) || pick(locale, page.titleAr, page.titleEn);
  const description = pick(locale, page.seoDescriptionAr, page.seoDescriptionEn) || undefined;
  return { title, description };
}

export default async function ContentPage({ params }: { params: Promise<Params> }) {
  const { locale, page } = await loadPage(params);
  const t = await getTranslations("cmsPage");
  const title = pick(locale, page.titleAr, page.titleEn);
  const body = pick(locale, page.bodyAr, page.bodyEn);
  const paragraphs = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <article className="py-16 lg:py-24">
      <Container className="max-w-3xl space-y-10">
        <header className="space-y-5 border-b border-line pb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-accent">{t("eyebrow")}</p>
          <h1 className="font-display text-4xl leading-tight text-brand sm:text-5xl lg:text-6xl">{title}</h1>
        </header>
        <div className="space-y-6 text-base leading-relaxed text-muted">
          {paragraphs.length ? (
            paragraphs.map((line, i) => <p key={`${i}-${line.slice(0, 16)}`}>{line}</p>)
          ) : (
            <p>{t("empty")}</p>
          )}
        </div>
      </Container>
    </article>
  );
}
