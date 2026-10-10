import type { ThemeMode, ThemeSettings } from "@/server/services/settings";

const HEX = /^#[0-9a-f]{6}$/i;
const VARS: [keyof ThemeMode, string][] = [
  ["bg", "--bg"], ["surface", "--surface"], ["fg", "--fg"], ["muted", "--muted"],
  ["line", "--line"], ["brand", "--brand"], ["brandContrast", "--brand-contrast"], ["accent", "--accent"],
];

function block(selector: string, mode: Partial<ThemeMode> | undefined, extra = "") {
  const decls = VARS.flatMap(([key, name]) => {
    const v = mode?.[key];
    return typeof v === "string" && HEX.test(v) ? [`${name}:${v}`] : [];
  });
  return decls.length || extra ? `${selector}{${decls.join(";")}${extra}}` : "";
}

/**
 * Turns the admin's saved theme into CSS variable overrides for the storefront.
 * `html:root` / `html.dark` out-rank the defaults in globals.css whatever the stylesheet order.
 * Only strict #rrggbb values are emitted, so nothing else can reach the stylesheet.
 */
export function themeToCss(theme: ThemeSettings): string {
  const radius = Number.isFinite(Number(theme.radius)) ? Math.min(32, Math.max(0, Number(theme.radius))) : null;
  return [
    block("html:root", theme.light, radius === null ? "" : `;--radius-brand:${radius}px`),
    block("html.dark", theme.dark),
  ].join("");
}
