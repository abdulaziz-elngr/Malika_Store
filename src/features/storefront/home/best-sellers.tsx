import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/motion/reveal";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Link } from "@/i18n/navigation";
import { ProductCard } from "@/features/storefront/shop/product-card";
import { listBestSellers } from "@/server/services/content";
import type { SectionOverrides } from "./overrides";
import { SectionHeading } from "./section-heading";

/** Merchandised best-sellers straight from the product table — no hardcoded cards. */
export async function BestSellers({ o, limit = 8 }: { o?: SectionOverrides; limit?: number }) {
  const t = await getTranslations("homeSections");
  const items = await listBestSellers(limit);
  if (!items.length) return null;

  const href = o?.ctaHref ?? "/shop?sort=best";
  const label = o?.ctaLabel ?? t("bestSellers.viewAll");
  return (
    <section className="py-16 lg:py-24">
      <Container className="space-y-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading eyebrow={o?.eyebrow ?? t("bestSellers.eyebrow")} title={o?.title ?? t("bestSellers.title")} />
          <Link href={href} className={buttonClasses("secondary")}>{label}</Link>
        </div>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((p, i) => (
            <Reveal as="li" key={p.id} delay={(i % 4) * 0.08} y={20}>
              <ProductCard product={p} priority={i < 4} />
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}
