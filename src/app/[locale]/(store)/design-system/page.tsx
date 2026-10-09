import { getTranslations, setRequestLocale } from "next-intl/server";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import type { Locale } from "@/i18n/routing";

const swatches = [
  { name: "wine-700 · logo", hex: "#67251B", cls: "bg-wine-700", light: false },
  { name: "wine-900", hex: "#3D1611", cls: "bg-wine-900", light: false },
  { name: "copper-500 · logo outline", hex: "#B88870", cls: "bg-copper-500", light: false },
  { name: "copper-300", hex: "#DCBFAE", cls: "bg-copper-300", light: true },
  { name: "cream-100", hex: "#F7F0E6", cls: "bg-cream-100", light: true },
  { name: "cream-300", hex: "#E0D0BB", cls: "bg-cream-300", light: true },
  { name: "sage-500", hex: "#8A9A82", cls: "bg-sage-500", light: true },
  { name: "sage-200", hex: "#D3DCCC", cls: "bg-sage-200", light: true },
];

export default async function DesignSystemPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("designSystem");
  const h2 = "mb-6 text-xs font-medium uppercase tracking-[0.25em] text-accent";

  return (
    <Container className="space-y-20 py-16">
      <header className="max-w-2xl space-y-4">
        <h1 className="font-display text-5xl text-brand sm:text-6xl">{t("title")}</h1>
        <p className="text-muted">{t("intro")}</p>
      </header>

      <section aria-labelledby="ds-logo">
        <h2 id="ds-logo" className={h2}>{t("logo")}</h2>
        <div className="grid place-items-center border border-line bg-surface py-16"><Logo height={120} /></div>
      </section>

      <section aria-labelledby="ds-colors">
        <h2 id="ds-colors" className={h2}>{t("colors")}</h2>
        <p className="mb-6 max-w-2xl text-sm text-muted">{t("colorsNote")}</p>
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {swatches.map((s) => (
            <li key={s.hex} className="border border-line">
              <div className={`${s.cls} h-24`} />
              <div className="p-3 text-xs" dir="ltr">
                <p className="font-medium">{s.name}</p>
                <p className="text-muted">{s.hex}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="ds-type">
        <h2 id="ds-type" className={h2}>{t("typography")}</h2>
        <div className="space-y-6 border border-line bg-surface p-8">
          <p className="font-display text-6xl text-brand">{t("typeDisplay")}</p>
          <p className="max-w-xl text-muted">{t("typeBody")}</p>
        </div>
      </section>

      <section aria-labelledby="ds-buttons">
        <h2 id="ds-buttons" className={h2}>{t("buttons")}</h2>
        <div className="flex flex-wrap gap-4">
          <Button>{t("primary")}</Button>
          <Button variant="secondary">{t("secondary")}</Button>
          <Button variant="ghost">{t("ghost")}</Button>
        </div>
      </section>
    </Container>
  );
}
