import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { LoginForm } from "@/features/storefront/account/auth-forms";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getCustomer } from "@/server/auth/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false } };

export default async function LoginPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ next?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { next } = await searchParams;
  if (await getCustomer()) redirect({ href: "/account", locale });
  const t = await getTranslations("auth");
  return (
    <Container className="grid max-w-md gap-8 py-16 lg:py-24">
      <div className="space-y-3 text-center"><h1 className="font-display text-5xl text-brand">{t("signInTitle")}</h1><p className="text-muted">{t("signInIntro")}</p></div>
      <LoginForm next={next} />
    </Container>
  );
}
