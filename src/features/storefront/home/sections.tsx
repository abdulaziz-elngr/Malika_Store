import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/motion/reveal";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Link } from "@/i18n/navigation";
import { ImageSlot } from "./image-slot";
import type { SectionOverrides } from "./overrides";
import { toneOf } from "./overrides";
import { SectionHeading } from "./section-heading";

export async function NewCollection({ o }: { o?: SectionOverrides } = {}) {
  const t = await getTranslations("newCollection");
  const href = o?.ctaHref ?? "/collections";
  const label = o?.ctaLabel ?? t("cta");
  return (
    <section className="py-24 lg:py-32">
      <Container className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <Reveal className="order-2 space-y-8 lg:order-none">
          <SectionHeading eyebrow={o?.eyebrow ?? t("eyebrow")} title={o?.title ?? t("title")} />
          <p className="max-w-md text-muted">{o?.body ?? t("body")}</p>
          <Link href={href} className={buttonClasses("secondary")}>{label}</Link>
        </Reveal>
        <Reveal>
          <Link href={href} data-cursor="explore" className="group block overflow-hidden" aria-label={label}>
            <ImageSlot src={o?.image} alt={o?.title ?? ""} tone={toneOf(o?.tone, "copper")} className="aspect-[4/5] transition-transform duration-[1200ms] ease-luxe group-hover:scale-[1.04]" sizes="(min-width:1024px) 45vw, 100vw" />
          </Link>
        </Reveal>
      </Container>
    </section>
  );
}

export async function Categories({ o }: { o?: SectionOverrides } = {}) {
  const t = await getTranslations("categories");
  const items = [
    { key: "women", href: "/women", tone: "wine" },
    { key: "men", href: "/men", tone: "sage" },
    { key: "collections", href: "/collections", tone: "copper" },
  ] as const;
  return (
    <section className="py-12 lg:py-20">
      <Container className="space-y-12">
        <SectionHeading eyebrow={o?.eyebrow ?? t("eyebrow")} title={o?.title ?? t("title")} />
        <ul className="grid gap-5 md:grid-cols-3">
          {items.map((c, i) => (
            <Reveal as="li" key={c.key} delay={i * 0.1}>
              <Link href={c.href} data-cursor="view" className="group relative block aspect-[3/4] overflow-hidden text-cream-50">
                <ImageSlot tone={c.tone} className="absolute inset-0 transition-transform duration-[1200ms] ease-luxe group-hover:scale-105" sizes="(min-width:768px) 33vw, 100vw" />
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-wine-950/60 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-6">
                  <span className="font-display text-4xl">{t(c.key)}</span>
                  <span className="text-xs uppercase tracking-[0.25em]">{t("explore")}</span>
                </div>
              </Link>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}

export async function Editorial({ o }: { o?: SectionOverrides } = {}) {
  const t = await getTranslations("editorial");
  const href = o?.ctaHref ?? "/about";
  const label = o?.ctaLabel ?? t("cta");
  return (
    <section className="py-24 lg:py-32">
      <Container className="grid items-end gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
        <Reveal><ImageSlot src={o?.image} alt={o?.title ?? ""} tone={toneOf(o?.tone, "cream")} className="aspect-[4/5] border border-line" sizes="(min-width:1024px) 40vw, 100vw" /></Reveal>
        <Reveal className="space-y-8 lg:pb-12">
          <SectionHeading eyebrow={o?.eyebrow ?? t("eyebrow")} title={o?.title ?? t("title")} />
          <p className="max-w-lg text-lg text-muted">{o?.body ?? t("body")}</p>
          <Link href={href} className={buttonClasses("secondary")}>{label}</Link>
        </Reveal>
      </Container>
    </section>
  );
}

export async function PromoBanner({ o }: { o?: SectionOverrides } = {}) {
  const t = await getTranslations("promo");
  const href = o?.ctaHref ?? "/shop";
  const label = o?.ctaLabel ?? t("cta");
  const band = toneOf(o?.tone, "wine");
  const bandCls =
    band === "wine" ? "bg-wine-800 text-cream-50"
    : band === "copper" ? "bg-copper-300 text-wine-900"
    : band === "sage" ? "bg-sage-200 text-wine-900"
    : "bg-cream-100 text-wine-900";
  const eyebrowCls = band === "wine" ? "text-copper-300" : "text-wine-900/60";
  const linkCls = band === "wine" ? buttonClasses("secondary", "border-cream-50 text-cream-50 hover:bg-cream-50 hover:text-wine-900") : buttonClasses("secondary", "border-wine-900 text-wine-900 hover:bg-wine-900 hover:text-cream-50");
  return (
    <section className="py-12">
      <Container>
        <Reveal className={`grid place-items-center gap-6 px-6 py-20 text-center ${bandCls}`}>
          <p className={`text-xs uppercase tracking-[0.3em] ${eyebrowCls}`}>{o?.eyebrow ?? t("eyebrow")}</p>
          <h2 className="max-w-2xl font-display text-4xl sm:text-5xl">{o?.title ?? t("title")}</h2>
          {o?.body ? <p className="max-w-xl text-sm opacity-80">{o.body}</p> : null}
          <Link href={href} className={linkCls}>{label}</Link>
        </Reveal>
      </Container>
    </section>
  );
}
