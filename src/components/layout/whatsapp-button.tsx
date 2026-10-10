import { getTranslations } from "next-intl/server";
import { whatsappUrl } from "@/lib/whatsapp";
import { getSeoSettings } from "@/server/services/settings";
import { SocialIcon } from "./social-icons";

/** Floating WhatsApp button. Appears only when a WhatsApp number is set in Admin → SEO → Social links. */
export async function WhatsAppButton() {
  const seo = await getSeoSettings();
  const href = whatsappUrl(seo.social?.whatsapp);
  if (!href) return null;
  const t = await getTranslations("footer");
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("whatsappChat")}
      title={t("whatsappChat")}
      className="fixed bottom-5 end-5 z-40 grid size-14 place-items-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform duration-300 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366] sm:bottom-6 sm:end-6"
    >
      <SocialIcon name="whatsapp" size={28} />
    </a>
  );
}
