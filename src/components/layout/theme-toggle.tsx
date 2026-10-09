"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

export function ThemeToggle() {
  const t = useTranslations("common");
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const dark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? t("lightMode") : t("darkMode")}
      className="grid size-10 place-items-center text-foreground transition-colors hover:text-accent"
    >
      {dark ? <Sun size={19} strokeWidth={1.4} /> : <Moon size={19} strokeWidth={1.4} />}
    </button>
  );
}
