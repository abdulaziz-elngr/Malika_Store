import type { Metadata } from "next";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** The admin area has no storefront chrome (no header, footer, cart or custom cursor). Pages bring their own <main>. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-background">{children}</div>;
}
