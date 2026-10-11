"use client";

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, inputClass } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { submitReviewAction } from "@/server/actions/reviews";
import type { ActionState } from "@/server/actions/types";

const initial: ActionState = {};

export function ReviewForm({ productId, initialRating = 0, initialBody = "", editing = false }: { productId: string; initialRating?: number; initialBody?: string; editing?: boolean }) {
  const t = useTranslations("reviews");
  const tv = useTranslations("validation");
  const [state, action, pending] = useActionState(submitReviewAction, initial);
  const [rating, setRating] = useState(initialRating);
  const [hover, setHover] = useState(0);
  const shown = hover || rating;

  if (state.ok) return <p role="status" className="border border-sage-700 bg-sage-700/5 px-4 py-3 text-sm text-sage-700 dark:border-sage-500 dark:text-sage-500">{t("thanks")}</p>;

  const ratingError = state.errors?.rating;
  return (
    <form action={action} className="grid max-w-xl gap-6" noValidate>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rating" value={rating || ""} />
      <FormError error={state.errors?.form} />
      <fieldset className="space-y-2">
        <legend className="text-[0.72rem] font-medium uppercase tracking-[0.2em] text-accent">{t("yourRating")}</legend>
        <div role="radiogroup" aria-label={t("yourRating")} className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={t("starsLabel", { n })}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              className="p-1 text-accent outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Star size={28} strokeWidth={1.6} className={cn("transition-colors", n <= shown && "fill-current")} />
            </button>
          ))}
        </div>
        {ratingError && <p role="alert" className="text-sm text-brand">{tv.has(ratingError as never) ? tv(ratingError as never) : tv("invalid")}</p>}
      </fieldset>
      <Field label={t("yourReview")} error={state.errors?.body} hint={t("moderationNote")}>
        {(p) => <textarea {...p} name="body" rows={5} maxLength={1500} defaultValue={state.values?.body ?? initialBody} placeholder={t("placeholder")} className={cn(inputClass, "h-auto py-3")} />}
      </Field>
      <div><Button type="submit" disabled={pending} aria-busy={pending}>{editing ? t("update") : t("submit")}</Button></div>
    </form>
  );
}
