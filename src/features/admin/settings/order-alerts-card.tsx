"use client";

import { Mail, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Card, CardHeader } from "@/components/admin/primitives";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { addOrderAlertEmailAction, removeOrderAlertEmailAction, sendTestOrderAlertAction, toggleOrderAlertsAction } from "@/server/actions/admin-system";
import type { ActionState } from "@/server/actions/types";

type Props = { emails: string[]; enabled: boolean; mailReady: boolean; readOnly: boolean };
type Kind = "add" | "remove" | "toggle" | "test";

/** Where owners add/remove the addresses that get an email the moment a customer places an order. */
export function OrderAlertsCard({ emails, enabled, mailReady, readOnly }: Props) {
  const t = useTranslations("admin.settings.alerts");
  const [addState, addAction, adding] = useActionState(addOrderAlertEmailAction, {} as ActionState);
  const [busy, startTransition] = useTransition();
  const [status, setStatus] = useState<{ kind: Kind; state: ActionState } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // After an add: clear the input and report the outcome (field-level errors are shown by the field itself).
  useEffect(() => {
    if (addState.ok) formRef.current?.reset();
    if (addState.ok || addState.errors?.form) setStatus({ kind: "add", state: addState });
  }, [addState]);

  const run = (kind: Kind, action: (fd: FormData) => Promise<ActionState>, fd: FormData) => {
    setStatus(null);
    startTransition(async () => setStatus({ kind, state: await action(fd) }));
  };

  const formError = status?.state.errors?.form;
  const message = formError ? t(`errors.${formError}` as never) : status?.state.ok ? t(`status.${status.kind}` as never) : "";

  return (
    <Card>
      <CardHeader title={t("title")} />
      <div className="space-y-5 p-5">
        <p className="text-sm text-muted">{t("intro")}</p>

        {!mailReady && (
          <p role="alert" className="border border-brand/40 bg-brand/5 px-4 py-3 text-sm text-brand">
            {t("notConfigured")}
          </p>
        )}

        <label className="flex h-12 max-w-sm items-center gap-3 border border-line px-4 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            disabled={readOnly || busy}
            onChange={(e) => {
              const fd = new FormData();
              fd.set("enabled", String(e.target.checked));
              run("toggle", toggleOrderAlertsAction.bind(null, {}), fd);
            }}
            className="size-4 accent-[var(--color-brand,#67251b)]"
          />
          <span>{t("enabled")}</span>
        </label>

        <div className="space-y-2">
          <p className="text-[0.72rem] font-medium uppercase tracking-[0.2em] text-accent">{t("recipients")}</p>
          {emails.length === 0 ? (
            <p className="border border-dashed border-line px-4 py-3 text-sm text-muted">{t("empty")}</p>
          ) : (
            <ul className="divide-y divide-line border border-line">
              {emails.map((email) => (
                <li key={email} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Mail className="size-4 shrink-0 text-accent" aria-hidden />
                    <span dir="ltr" className="truncate">{email}</span>
                  </span>
                  {!readOnly && (
                    <button
                      type="button"
                      disabled={busy}
                      aria-label={t("remove", { email })}
                      title={t("remove", { email })}
                      onClick={() => {
                        const fd = new FormData();
                        fd.set("email", email);
                        run("remove", removeOrderAlertEmailAction.bind(null, {}), fd);
                      }}
                      className="inline-flex size-9 shrink-0 items-center justify-center text-muted transition-colors hover:text-brand disabled:opacity-50"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {!readOnly && (
          <form ref={formRef} action={addAction} noValidate aria-busy={adding} className="flex flex-wrap items-start gap-3">
            <Field label={t("addLabel")} error={addState.errors?.email} className="min-w-64 flex-1">
              {(p) => <input {...p} name="email" type="email" dir="ltr" autoComplete="off" placeholder="owner@example.com" className={inputClass} />}
            </Field>
            <Button type="submit" disabled={adding} aria-busy={adding} className="mt-[1.65rem] min-h-12 px-6">
              {adding ? t("adding") : t("add")}
            </Button>
          </form>
        )}

        <p role="status" aria-live="polite" className={`text-sm ${formError ? "text-brand" : "text-sage-700 dark:text-sage-200"}`}>
          {message}
        </p>

        {!readOnly && emails.length > 0 && (
          <div className="flex justify-end border-t border-line pt-5">
            <Button variant="secondary" disabled={busy || !mailReady} aria-busy={busy} onClick={() => run("test", sendTestOrderAlertAction, new FormData())} className="min-h-11 px-6">
              {busy ? t("sending") : t("sendTest")}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
