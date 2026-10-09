import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Logo } from "@/components/brand/logo";

/** Slim top bar used by the admin entry pages until the full dashboard shell arrives in Phase 6. */
export function AdminTopBar({ children }: { children?: React.ReactNode }) {
  return (
    <header className="flex h-20 items-center justify-between border-b border-line px-6 lg:px-10">
      <Logo height={36} />
      <div className="flex items-center gap-3">
        {children}
        <ThemeToggle />
        <LanguageSwitcher />
      </div>
    </header>
  );
}
