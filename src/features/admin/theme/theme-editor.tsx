"use client";

import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { Card, CardHeader } from "@/components/admin/primitives";
import { Button } from "@/components/ui/button";
import { FormError, inputClass, useFieldError } from "@/components/ui/field";
import { themeContrastIssues } from "@/lib/validation/admin-system";
import { saveThemeAction } from "@/server/actions/admin-system";
import type { ActionState } from "@/server/actions/types";
import type { ThemeSettings } from "@/server/services/settings";

const KEYS = ["bg", "surface", "fg", "muted", "line", "brand", "brandContrast", "accent"] as const;
type ColorKey = (typeof KEYS)[number];
type Mode = "light" | "dark";
type State = { light: Record<ColorKey, string>; dark: Record<ColorKey, string>; radius: string };

const toState = (t: ThemeSettings): State => ({
  light: { ...t.light },
  dark: { ...t.dark },
  radius: String(t.radius),
});

export function ThemeEditor({ theme, defaults }: { theme: ThemeSettings; defaults: ThemeSettings }) {
  const t = useTranslations("admin.theme");
  const f = useTranslations("admin.form");
  const ferr = useFieldError();
  const [state, action, pending] = useActionState(saveThemeAction, {} as ActionState);
  const [s, setS] = useState<State>(() => toState(theme));

  const setColor = (mode: Mode, key: ColorKey, value: string) => setS((prev) => ({ ...prev, [mode]: { ...prev[mode], [key]: value } }));
  const setRadius = (value: string) => setS((prev) => ({ ...prev, radius: value }));

  // Live WCAG guard — the server enforces the same rule, this just says it before you press save.
  const flat = {
    ...s.light,
    darkBg: s.dark.bg,
    darkSurface: s.dark.surface,
    darkFg: s.dark.fg,
    darkMuted: s.dark.muted,
    darkLine: s.dark.line,
    darkBrand: s.dark.brand,
    darkBrandContrast: s.dark.brandContrast,
    darkAccent: s.dark.accent,
    radius: Number(s.radius) || 0,
  };
  const issues = themeContrastIssues(flat);
  const pairErrors: Record<string, string | undefined> = {};
  for (const issue of issues) pairErrors[issue.pair] = "contrast";
  for (const [k, v] of Object.entries(state.errors ?? {})) if (k.endsWith("OnBg") || k.endsWith("Text")) pairErrors[k] = v;

  const modeLabels = { light: t("light"), dark: t("dark") };

  return (
    <form action={action} className="space-y-8" noValidate aria-busy={pending}>
      {Object.entries(s.light).map(([k, v]) => (
        <input key={`l-${k}`} type="hidden" name={k} value={v} />
      ))}
      {Object.entries(s.dark).map(([k, v]) => (
        <input key={`d-${k}`} type="hidden" name={`dark${k[0]!.toUpperCase()}${k.slice(1)}`} value={v} />
      ))}
      <input type="hidden" name="radius" value={s.radius} />

      <FormError error={state.errors?.form} />

      <div className="grid gap-6 xl:grid-cols-2">
        {(["light", "dark"] as Mode[]).map((mode) => (
          <Card key={mode}>
            <CardHeader title={modeLabels[mode]} />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              {KEYS.map((key) => {
                const pair = mode === "light" ? lightPair(key) : darkPair(key);
                return (
                  <ColorField
                    key={`${mode}-${key}`}
                    label={t(`keys.${key}` as "keys.bg")}
                    value={s[mode][key]}
                    onChange={(v) => setColor(mode, key, v)}
                    error={pair ? pairErrors[pair] : undefined}
                    ferr={ferr}
                  />
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <Card>
          <CardHeader title={t("shapeTitle")} />
          <div className="space-y-5 p-5">
            <label className="grid gap-1.5 text-xs uppercase tracking-[0.18em] text-accent">
              {t("radius")}
              <input
                type="number"
                min={0}
                max={16}
                step={0.5}
                value={s.radius}
                onChange={(e) => setRadius(e.target.value)}
                className={`${inputClass} text-foreground`}
              />
            </label>
            <p className="text-xs text-muted">{t("radiusHint")}</p>
            <p role="status" aria-live="polite" className="text-sm text-sage-700 dark:text-sage-200">
              {state.ok ? f("saved") : ""}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="secondary" onClick={() => setS(toState(defaults))} className="min-h-11 flex-1 px-4">
                <RotateCcw size={14} /> {t("reset")}
              </Button>
              <Button type="submit" disabled={pending} aria-busy={pending} className="min-h-11 flex-1 px-4">
                {pending ? f("saving") : f("save")}
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title={t("previewTitle")} action={<span className="text-xs text-muted">{t("previewHint")}</span>} />
          <div className="space-y-4 p-5">
            <div
              className="border p-5"
              style={{
                background: s.light.bg,
                color: s.light.fg,
                borderColor: s.light.line,
                borderRadius: `${Number(s.radius) || 0}px`,
              }}
            >
              <p className="text-xs uppercase tracking-[0.25em]" style={{ color: s.light.accent }}>
                {t("previewEyebrow")}
              </p>
              <p className="mt-2 font-display text-2xl">{t("previewHeadline")}</p>
              <p className="mt-2 text-sm" style={{ color: s.light.muted }}>
                {t("previewBody")}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span
                  className="inline-flex min-h-10 items-center px-5 text-sm"
                  style={{ background: s.light.brand, color: s.light.brandContrast, borderRadius: `${Number(s.radius) || 0}px` }}
                >
                  {t("previewCta")}
                </span>
                <span
                  className="inline-flex min-h-10 items-center border px-5 text-sm"
                  style={{ borderColor: s.light.brand, color: s.light.brand, borderRadius: `${Number(s.radius) || 0}px` }}
                >
                  {t("previewSecondary")}
                </span>
                <span className="inline-flex min-h-10 items-center px-5 text-sm" style={{ background: s.light.surface, borderRadius: `${Number(s.radius) || 0}px` }}>
                  {t("previewSurface")}
                </span>
              </div>
            </div>

            <section className="space-y-2">
              <h3 className="text-xs uppercase tracking-[0.2em] text-accent">{t("contrastTitle")}</h3>
              {issues.length === 0 ? (
                <p className="text-sm text-sage-700 dark:text-sage-200">{t("contrastOk", { ratio: 4.5 })}</p>
              ) : (
                <ul className="space-y-1.5">
                  {issues.map((issue) => (
                    <li key={issue.pair} className="border border-brand/40 bg-brand/5 px-3 py-2 text-sm text-brand">
                      {t(`pairs.${issue.pair}` as "pairs.fgOnBg")} — {issue.ratio}:1 ({t("minRatio", { ratio: 4.5 })})
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </Card>
      </div>

      {/* Server-side pair errors also land on the form; mirror them near the preview for screen readers. */}
      <p className="sr-only" role="alert">
        {issues.length > 0 ? ferr(pairErrors[issues[0]!.pair]) : ""}
      </p>
    </form>
  );
}

function lightPair(key: ColorKey): string | undefined {
  if (key === "fg" || key === "bg") return "fgOnBg";
  if (key === "muted") return "mutedOnBg";
  if (key === "brandContrast" || key === "brand") return "brandText";
  return undefined;
}

function darkPair(key: ColorKey): string | undefined {
  if (key === "fg" || key === "bg") return "darkFgOnBg";
  if (key === "brandContrast" || key === "brand") return "darkBrandText";
  return undefined;
}

function ColorField({ label, value, onChange, error, ferr }: { label: string; value: string; onChange: (v: string) => void; error?: string; ferr: (k?: string) => string | undefined }) {
  const msg = ferr(error);
  return (
    <label className="grid gap-1.5 text-xs uppercase tracking-[0.18em] text-accent">
      <span className="flex items-center justify-between gap-2">
        {label}
        <span className="flex items-center gap-2">
          <span className="font-mono text-[0.7rem] normal-case tracking-normal text-muted" dir="ltr">
            {value}
          </span>
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={label}
            className="size-7 cursor-pointer border border-line bg-surface p-0.5"
          />
        </span>
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        dir="ltr"
        maxLength={7}
        spellCheck={false}
        aria-invalid={!!msg}
        aria-describedby={msg ? `${label}-err` : undefined}
        className={`${inputClass} h-10 font-mono text-sm normal-case`}
      />
      {msg ? (
        <span id={`${label}-err`} className="normal-case text-brand">
          {msg}
        </span>
      ) : null}
    </label>
  );
}
