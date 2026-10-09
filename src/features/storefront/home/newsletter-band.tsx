"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { inputClass, useFieldError } from "@/components/ui/field";
import { subscribeAction } from "@/server/actions/admin-content";
import type { ActionState } from "@/server/actions/types";
import type { SectionOverrides } from "./overrides";
import { SectionHeading } from "./section-heading";

/** Homepage newsletter band — subscribes through the same public action as the footer intent. */
export function NewsletterBand({ o }: { o?: SectionOverrides }) {
  const t = useTranslations("homeSections");
  const locale = useLocale();
  const ferr = useFieldError();
  const [state, action, pending] = useActionState(subscribeAction, {} as ActionState);

  const emailErr = state.errors?.email ? ferr(state.errors.email) : undefined;
  const formErr = state.errors?.form ? ferr(state.errors.form) : undefined;
  const status = state.ok ? t("newsletter.success") : (formErr ?? emailErr ?? "");
  const inputId = `nl-email-${o?.ctaHref?.replace(/\W+/g, "") ?? "home"}`;

  return (
    <section className="py-16 lg:py-24">
      <Container>
        <div className="grid gap-8 place-items-center border border-line bg-surface px-6 py-16 text-center">
          <SectionHeading eyebrow={o?.eyebrow ?? t("newsletter.eyebrow")} title={o?.title ?? t("newsletter.title")} className="items-center" />
          {o?.body ?? t("newsletter.body") ? <p className="max-w-lg text-sm text-muted">{o?.body ?? t("newsletter.body")}</p> : null}

          <form action={action} className="flex w-full max-w-lg flex-col gap-3 sm:flex-row" noValidate>
            <input type="hidden" name="locale" value={locale} />
            <label htmlFor={inputId} className="sr-only">
              {t("newsletter.placeholder")}
            </label>
            <input
              id={inputId}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              dir="ltr"
              required
              maxLength={160}
              placeholder={t("newsletter.placeholder")}
              aria-invalid={!!emailErr}
              aria-describedby={emailErr ? `${inputId}-err` : undefined}
              className={`${inputClass} h-12 flex-1 text-start`}
            />
            <button type="submit" disabled={pending} aria-busy={pending} className={`${buttonClasses("primary")} h-12 shrink-0 px-8`}>
              {pending ? t("newsletter.joining") : (o?.ctaLabel ?? t("newsletter.cta"))}
            </button>
          </form>

          <p id={`${inputId}-err`} role="status" aria-live="polite" className={`min-h-5 text-sm ${state.ok ? "text-sage-700 dark:text-sage-200" : "text-brand"}`}>
            {status}
          </p>
        </div>
      </Container>
    </section>
  );
}
