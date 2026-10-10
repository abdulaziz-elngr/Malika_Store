"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, inputClass } from "@/components/ui/field";
import { useRouter } from "@/i18n/navigation";
import { saveSectionConfigAction } from "@/server/actions/admin-content";
import type { ActionState } from "@/server/actions/types";
import type { SectionDTO } from "./types";

type Group = "copy" | "media" | "layout";
type Kind = "text" | "textarea" | "url" | "list" | "datetime" | "select";
type Options = { values: readonly string[]; keys: readonly string[]; fromForm?: boolean };
type FieldDef = { kind: Kind; group: Group; max: number; ltr?: boolean; hint?: boolean; options?: Options };

const TONES = ["wine", "copper", "cream", "sage"] as const;
const GROUPS: readonly Group[] = ["copy", "media", "layout"];

/** Every scalar the sectionConfigSchema accepts, with its own widget and copy limit. */
const FIELDS: Record<string, FieldDef> = {
  eyebrowAr: { kind: "text", group: "copy", max: 60 },
  eyebrowEn: { kind: "text", group: "copy", max: 60, ltr: true },
  titleAr: { kind: "text", group: "copy", max: 160 },
  titleEn: { kind: "text", group: "copy", max: 160, ltr: true },
  bodyAr: { kind: "textarea", group: "copy", max: 600 },
  bodyEn: { kind: "textarea", group: "copy", max: 600, ltr: true },
  itemsAr: { kind: "list", group: "copy", max: 200, hint: true },
  itemsEn: { kind: "list", group: "copy", max: 200, ltr: true, hint: true },
  image: { kind: "url", group: "media", max: 500, ltr: true },
  mobileImage: { kind: "url", group: "media", max: 500, ltr: true },
  secondaryImage: { kind: "url", group: "media", max: 500, ltr: true },
  womenImage: { kind: "url", group: "media", max: 500, ltr: true },
  menImage: { kind: "url", group: "media", max: 500, ltr: true },
  collectionsImage: { kind: "url", group: "media", max: 500, ltr: true },
  videoUrl: { kind: "url", group: "media", max: 500, ltr: true },
  ctaLabelAr: { kind: "text", group: "media", max: 60 },
  ctaLabelEn: { kind: "text", group: "media", max: 60, ltr: true },
  ctaHref: { kind: "url", group: "media", max: 300, ltr: true },
  secondaryCtaHref: { kind: "url", group: "media", max: 300, ltr: true },
  href: { kind: "url", group: "media", max: 300, ltr: true, hint: true },
  tone: {
    kind: "select",
    group: "layout",
    max: 20,
    options: { values: TONES, keys: ["toneWine", "toneCopper", "toneCream", "toneSage"], fromForm: true },
  },
  align: { kind: "select", group: "layout", max: 20, options: { values: ["start", "center", "end"], keys: ["alignStart", "alignCenter", "alignEnd"] } },
  height: { kind: "select", group: "layout", max: 20, options: { values: ["full", "tall"], keys: ["heightFull", "heightTall"] } },
  overlay: { kind: "text", group: "layout", max: 10, ltr: true, hint: true },
  countdownTo: { kind: "datetime", group: "layout", max: 40, hint: true },
  badge: { kind: "text", group: "layout", max: 10, hint: true },
  count: { kind: "text", group: "layout", max: 10, ltr: true, hint: true },
  animation: { kind: "text", group: "layout", max: 20, ltr: true, hint: true },
  layout: { kind: "text", group: "layout", max: 20, ltr: true, hint: true },
};

/** The fields each section exposes; keys left out are still kept in the stored config untouched. */
const SECTION_FIELDS: Record<string, readonly string[]> = {
  hero: ["eyebrowAr", "eyebrowEn", "titleAr", "titleEn", "bodyAr", "bodyEn", "image", "mobileImage", "videoUrl", "ctaLabelAr", "ctaLabelEn", "ctaHref", "secondaryCtaHref", "tone", "align", "height", "overlay", "badge", "countdownTo"],
  marquee: ["itemsAr", "itemsEn", "href"],
  new_collection: ["eyebrowAr", "eyebrowEn", "titleAr", "titleEn", "bodyAr", "bodyEn", "image", "mobileImage", "ctaLabelAr", "ctaLabelEn", "ctaHref", "tone", "align", "layout"],
  categories: ["eyebrowAr", "eyebrowEn", "titleAr", "titleEn", "bodyAr", "bodyEn", "womenImage", "menImage", "collectionsImage", "count", "tone", "align"],
  editorial: ["eyebrowAr", "eyebrowEn", "titleAr", "titleEn", "bodyAr", "bodyEn", "image", "secondaryImage", "ctaLabelAr", "ctaLabelEn", "ctaHref", "tone", "align", "layout", "animation"],
  lookbook: ["eyebrowAr", "eyebrowEn", "titleAr", "titleEn", "bodyAr", "bodyEn", "image", "videoUrl", "ctaLabelAr", "ctaLabelEn", "ctaHref", "tone", "align", "animation"],
  best_sellers: ["eyebrowAr", "eyebrowEn", "titleAr", "titleEn", "bodyAr", "bodyEn", "count", "tone", "align"],
  banner: ["eyebrowAr", "eyebrowEn", "titleAr", "titleEn", "bodyAr", "bodyEn", "image", "mobileImage", "ctaLabelAr", "ctaLabelEn", "ctaHref", "tone", "badge"],
  testimonials: ["eyebrowAr", "eyebrowEn", "titleAr", "titleEn", "bodyAr", "bodyEn", "count", "tone", "align"],
  newsletter: ["eyebrowAr", "eyebrowEn", "titleAr", "titleEn", "bodyAr", "bodyEn", "ctaLabelAr", "ctaLabelEn", "tone", "layout"],
};

const FALLBACK_FIELDS = ["eyebrowAr", "eyebrowEn", "titleAr", "titleEn", "bodyAr", "bodyEn"];

/** Stored values may be ISO ("…T00:00:00.000Z") while datetime-local wants the local 16-char form. */
const toLocalInput = (v: string) => (v ? v.slice(0, 16) : "");

/** Typed editor for one homepage section's config: everything it posts passes sectionConfigSchema. */
export function SectionConfigForm({ row, onDone, onCancel }: { row: SectionDTO; onDone: () => void; onCancel: () => void }) {
  const t = useTranslations("admin.homepage");
  const f = useTranslations("admin.form");
  const router = useRouter();
  const [state, action, pending] = useActionState(saveSectionConfigAction, {} as ActionState);
  const [cfg, setCfg] = useState<Record<string, unknown>>(() => ({ ...row.config }));

  useEffect(() => {
    if (state.ok) {
      onDone();
      router.refresh();
    }
  }, [state, onDone, router]);

  const names = SECTION_FIELDS[row.key] ?? FALLBACK_FIELDS;

  const set = (name: string, value: unknown) => setCfg((c) => ({ ...c, [name]: value }));
  const str = (name: string) => {
    const v = cfg[name];
    return typeof v === "string" ? v : "";
  };
  const lines = (name: string) => {
    const v = cfg[name];
    return Array.isArray(v) ? v.map(String).join("\n") : "";
  };
  const optionLabel = (opts: Options, value: string) => {
    const i = opts.values.indexOf(value);
    const key = opts.keys[i] ?? opts.keys[0]!;
    return opts.fromForm ? f(key as "toneWine") : t(`fields.${key}` as "fields.alignStart");
  };

  /** Empties inside lists are dropped and legacy non-string values coerced, so the post always passes sectionConfigSchema. */
  const payload = useMemo(() => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(cfg)) {
      if (k === "itemsAr" || k === "itemsEn") {
        if (Array.isArray(v)) out[k] = v.map((x) => String(x).trim()).filter(Boolean);
      } else if (k in FIELDS) {
        if (v === null || v === undefined) continue;
        out[k] = typeof v === "string" ? v : String(v);
      } else {
        out[k] = v;
      }
    }
    return JSON.stringify(out);
  }, [cfg]);

  /** Validation errors on fields this section does not render are surfaced as one message instead of vanishing. */
  const stray = Object.entries(state.errors ?? {}).find(([k]) => !names.includes(k))?.[1];

  return (
    <form action={action} className="space-y-6 p-5" noValidate aria-busy={pending}>
      <input type="hidden" name="id" value={row.id} />
      <input type="hidden" name="config" value={payload} />
      <FormError error={state.errors?.form ?? stray} />

      {GROUPS.map((group) => {
        const visible = names.filter((n) => FIELDS[n]?.group === group);
        if (!visible.length) return null;
        return (
          <section key={group} className="space-y-4">
            <h3 className="border-b border-line pb-2 text-[0.72rem] font-medium uppercase tracking-[0.2em] text-accent">{t(`groups.${group}`)}</h3>
            <div className="grid gap-5 sm:grid-cols-2">
              {visible.map((name) => {
                const def = FIELDS[name]!;
                const label =
                  name === "image" ? f("image") : name === "tone" ? f("tone") : t(`fields.${name}` as "fields.titleAr");
                const hint = def.hint ? t(`fields.${name}Hint` as "fields.hrefHint") : name === "image" ? f("imageHint") : undefined;
                const wide = def.kind === "textarea" || def.kind === "list";

                if (def.kind === "select" && def.options) {
                  return (
                    <Field key={name} label={label} error={state.errors?.[name]} hint={hint}>
                      {(p) => (
                        <select {...p} name={name} value={str(name)} onChange={(e) => set(name, e.currentTarget.value)} className={inputClass}>
                          <option value="">{f("optional")}</option>
                          {def.options!.values.map((v) => (
                            <option key={v} value={v}>
                              {optionLabel(def.options!, v)}
                            </option>
                          ))}
                        </select>
                      )}
                    </Field>
                  );
                }

                if (def.kind === "list") {
                  return (
                    <Field key={name} label={label} error={state.errors?.[name]} hint={hint} className={wide ? "sm:col-span-2" : undefined}>
                      {(p) => (
                        <textarea {...p} name={name} value={lines(name)} onChange={(e) => set(name, e.currentTarget.value.split("\n"))} rows={4} maxLength={2400} className={`${inputClass} h-auto py-3 font-mono text-sm`} />
                      )}
                    </Field>
                  );
                }

                if (def.kind === "textarea") {
                  return (
                    <Field key={name} label={label} error={state.errors?.[name]} hint={hint} className={wide ? "sm:col-span-2" : undefined}>
                      {(p) => (
                        <textarea {...p} name={name} value={str(name)} onChange={(e) => set(name, e.currentTarget.value)} maxLength={def.max} rows={3} className={`${inputClass} h-auto py-3`} />
                      )}
                    </Field>
                  );
                }

                return (
                  <Field key={name} label={label} error={state.errors?.[name]} hint={hint} className={wide ? "sm:col-span-2" : undefined}>
                    {(p) => (
                      <input
                        {...p}
                        name={name}
                        type={def.kind === "datetime" ? "datetime-local" : "text"}
                        inputMode={name === "overlay" || name === "count" ? "decimal" : undefined}
                        dir={def.ltr ? "ltr" : undefined}
                        value={def.kind === "datetime" ? toLocalInput(str(name)) : str(name)}
                        onChange={(e) => set(name, e.currentTarget.value)}
                        maxLength={def.max}
                        className={inputClass}
                      />
                    )}
                  </Field>
                );
              })}
            </div>
          </section>
        );
      })}

      <p role="status" aria-live="polite" className="text-sm text-sage-700 dark:text-sage-200">
        {state.ok ? f("saved") : ""}
      </p>
      <div className="flex justify-end gap-3 border-t border-line pt-5">
        <Button type="button" variant="secondary" onClick={onCancel} className="min-h-11 px-6">
          {f("back")}
        </Button>
        <Button type="submit" disabled={pending} aria-busy={pending} className="min-h-11 px-6">
          {pending ? f("saving") : f("save")}
        </Button>
      </div>
    </form>
  );
}
