import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/container";
import { Link } from "@/i18n/navigation";
import { getSeoSettings } from "@/server/services/settings";
import { safeHttpUrl, whatsappUrl } from "@/lib/whatsapp";
import { navItems } from "./nav-items";
import { SocialIcon, type SocialKey } from "./social-icons";

const TECNO_URL = "https://tecn0-platform.vercel.app/";

export async function Footer({ items }: { items?: { id: string; href: string; label: string }[] }) {
  const t = await getTranslations("footer");
  const n = await getTranslations("nav");
  const seo = await getSeoSettings();
  const s = seo.social ?? ({} as Partial<Record<SocialKey, string>>);
  const socials = (
    [
      ["instagram", safeHttpUrl(s.instagram), "Instagram"],
      ["tiktok", safeHttpUrl(s.tiktok), "TikTok"],
      ["facebook", safeHttpUrl(s.facebook), "Facebook"],
      ["x", safeHttpUrl(s.x), "X"],
      ["whatsapp", whatsappUrl(s.whatsapp), "WhatsApp"],
    ] as [SocialKey, string | null, string][]
  ).filter((i): i is [SocialKey, string, string] => !!i[1]);
  const care = [
    { key: "contact", href: "/contact" },
    { key: "faq", href: "/faq" },
    { key: "privacy", href: "/privacy" },
    { key: "terms", href: "/terms" },
  ] as const;
  // CMS footer menu (labels resolved in the layout) falls back to the default explore links.
  const explore = items?.length ? items : navItems.map((i) => ({ id: i.key as string, href: i.href, label: n(i.key) }));
  const col = "space-y-3 text-sm text-muted";
  const link = "transition-colors hover:text-foreground";

  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <Container className="grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-sm space-y-5">
          <Logo height={56} />
          <p className="text-muted">{t("about")}</p>
          {socials.length > 0 && (
            <ul className="flex flex-wrap items-center gap-3" aria-label={t("follow")}>
              {socials.map(([key, href, label]) => (
                <li key={key}>
                  <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} className="grid size-10 place-items-center rounded-full border border-line text-muted transition-colors hover:border-brand hover:text-brand">
                    <SocialIcon name={key} />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h2 className="mb-5 text-xs font-medium uppercase tracking-[0.22em] text-accent">{t("explore")}</h2>
          <ul className={col}>
            {explore.map((i) => (
              <li key={i.id}><Link href={i.href} className={link}>{i.label}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-5 text-xs font-medium uppercase tracking-[0.22em] text-accent">{t("care")}</h2>
          <ul className={col}>
            {care.map((i) => (
              <li key={i.key}><Link href={i.href} className={link}>{t(i.key)}</Link></li>
            ))}
          </ul>
        </div>
      </Container>
      <div className="border-t border-line">
        <Container className="flex flex-col gap-3 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} MALIKA. {t("rights")}</span>
          <span>
            {t("builtBy")}{" "}
            <a href={TECNO_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#EAB308] transition-opacity hover:opacity-80">Tecno</a>
          </span>
        </Container>
      </div>
    </footer>
  );
}
