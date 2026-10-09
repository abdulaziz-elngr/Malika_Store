import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { logoutAction } from "@/server/actions/auth";
import type { SessionCustomer } from "@/server/auth/session";
import { unreadCount } from "@/server/services/notifications";
import { AccountNav } from "./account-nav";

export async function AccountShell({ customer, title, children }: { customer: SessionCustomer; title: string; children: React.ReactNode }) {
  const [t, unread] = await Promise.all([getTranslations("account"), unreadCount(customer.id)]);
  return (
    <Container className="py-12 lg:py-16">
      <p className="text-[0.72rem] uppercase tracking-[0.25em] text-accent">{t("hello", { name: customer.name.split(" ")[0] ?? customer.name })}</p>
      <h1 className="mb-10 mt-2 font-display text-5xl text-brand sm:text-6xl">{title}</h1>
      <div className="grid gap-10 lg:grid-cols-[14rem_1fr] lg:gap-16">
        <AccountNav
          unread={unread}
          logout={<form action={logoutAction}><button type="submit" className="px-4 py-3 text-sm uppercase tracking-[0.15em] text-muted transition-colors hover:text-brand">{t("logout")}</button></form>}
        />
        <div className="min-w-0">{children}</div>
      </div>
    </Container>
  );
}
