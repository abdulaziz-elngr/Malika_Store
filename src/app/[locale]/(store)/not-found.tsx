import { getTranslations } from "next-intl/server";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("errors");
  return (
    <Container className="grid min-h-[60dvh] place-items-center py-20 text-center">
      <div className="max-w-md space-y-5">
        <h1 className="font-display text-4xl text-brand">{t("notFoundTitle")}</h1>
        <p className="text-muted">{t("notFoundBody")}</p>
        <Link href="/" className={buttonClasses("secondary")}>{t("backHome")}</Link>
      </div>
    </Container>
  );
}
