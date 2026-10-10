import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/motion/reveal";
import { Container } from "@/components/ui/container";
import type { SectionOverrides } from "./overrides";
import { SectionHeading } from "./section-heading";

/**
 * Client quotes managed from the homepage builder (`itemsAr` / `itemsEn`).
 * An entry may carry an attribution after an em dash: “Quote — Name”, otherwise it renders as a plain quote.
 */
export async function Testimonials({ o }: { o?: SectionOverrides }) {
  const t = await getTranslations("homeSections");
  const items = o?.items ?? [];
  if (!items.length) return null;

  const split = (entry: string) => {
    // Attribution convention: everything after the FINAL em dash is the name.
    const at = entry.lastIndexOf("—");
    if (at > 0 && at < entry.length - 1) return { quote: entry.slice(0, at).trim(), who: entry.slice(at + 1).trim() };
    return { quote: entry, who: "" };
  };

  return (
    <section className="py-16 lg:py-24">
      <Container className="space-y-12">
        <SectionHeading eyebrow={o?.eyebrow ?? t("testimonials.eyebrow")} title={o?.title ?? t("testimonials.title")} />
        <ul className="grid gap-6 md:grid-cols-3">
          {items.slice(0, 6).map((entry, i) => {
            const { quote, who } = split(entry);
            return (
              <Reveal as="li" key={entry} delay={i * 0.08} y={20}>
                <figure className="flex h-full flex-col gap-6 border border-line bg-surface p-7">
                  <span aria-hidden className="font-display text-5xl leading-none text-brand/70">“</span>
                  <blockquote className="flex-1 text-sm leading-relaxed text-muted">{quote}</blockquote>
                  {who ? <figcaption className="text-xs uppercase tracking-[0.2em] text-accent">{who}</figcaption> : null}
                </figure>
              </Reveal>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
