"use client";

import { ImageUp, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useRef, useState } from "react";
import { Card, CardHeader } from "@/components/admin/primitives";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/field";
import { saveBrandAction } from "@/server/actions/admin-system";
import type { ActionState } from "@/server/actions/types";
import type { BrandSettings } from "@/server/services/settings";

const MAX_BYTES = 5 * 1024 * 1024;
type Slot = keyof BrandSettings;

/** Built-in files shown when a slot is empty. */
const BUILT_IN: Record<Slot, string> = { logoUrl: "/brand/logo.png", logoDarkUrl: "/brand/logo-cream.png", faviconUrl: "/icon.png" };

export function BrandCard({ brand }: { brand: BrandSettings }) {
  const t = useTranslations("admin.theme.brand");
  const f = useTranslations("admin.form");
  const [state, action, pending] = useActionState(saveBrandAction, {} as ActionState);
  const [v, setV] = useState<BrandSettings>(brand);
  const [busy, setBusy] = useState<Slot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = async (slot: Slot, file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (file.size > MAX_BYTES) return setError(t("tooLarge"));
    setBusy(slot);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("folder", "brand");
      const res = await fetch("/api/admin/media", { method: "POST", body: fd });
      const body = (await res.json().catch(() => ({}))) as { media?: { url?: string }; error?: string };
      if (!res.ok || !body.media?.url) {
        setError(res.status === 415 ? t("badType") : res.status === 403 ? t("noPermission") : res.status === 413 ? t("tooLarge") : t("uploadFailed"));
      } else {
        setV((prev) => ({ ...prev, [slot]: body.media!.url! }));
      }
    } catch {
      setError(t("uploadFailed"));
    } finally {
      setBusy(null);
    }
  };

  const slots: { key: Slot; title: string; hint: string; dark?: boolean }[] = [
    { key: "logoUrl", title: t("logo"), hint: t("logoHint") },
    { key: "logoDarkUrl", title: t("logoDark"), hint: t("logoDarkHint"), dark: true },
    { key: "faviconUrl", title: t("favicon"), hint: t("faviconHint") },
  ];

  return (
    <form action={action} noValidate aria-busy={pending}>
      <input type="hidden" name="logoUrl" value={v.logoUrl} />
      <input type="hidden" name="logoDarkUrl" value={v.logoDarkUrl} />
      <input type="hidden" name="faviconUrl" value={v.faviconUrl} />
      <Card>
        <CardHeader title={t("title")} action={<span className="text-xs text-muted">{t("subtitle")}</span>} />
        <div className="space-y-5 p-5">
          <FormError error={state.errors?.form} />
          <div className="grid gap-5 md:grid-cols-3">
            {slots.map(({ key, title, hint, dark }) => (
              <SlotCard key={key} title={title} hint={hint} dark={dark} url={v[key] || BUILT_IN[key]} custom={!!v[key]} busy={busy === key} labels={{ choose: t("choose"), replace: t("replace"), reset: t("resetOne"), uploading: t("uploading"), builtIn: t("builtIn"), custom: t("custom") }} onFile={(file) => upload(key, file)} onReset={() => setV((p) => ({ ...p, [key]: "" }))} square={key === "faviconUrl"} />
            ))}
          </div>
          {error ? <p role="alert" className="text-sm text-brand">{error}</p> : null}
          <p role="status" aria-live="polite" className="text-sm text-sage-700 dark:text-sage-200">{state.ok ? t("savedNote") : ""}</p>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" className="min-h-11 px-4" onClick={() => setV({ logoUrl: "", logoDarkUrl: "", faviconUrl: "" })}>
              <RotateCcw size={14} /> {t("resetAll")}
            </Button>
            <Button type="submit" disabled={pending || busy !== null} aria-busy={pending} className="min-h-11 px-6">
              {pending ? f("saving") : f("save")}
            </Button>
          </div>
        </div>
      </Card>
    </form>
  );
}

function SlotCard({ title, hint, dark, url, custom, busy, labels, onFile, onReset, square }: {
  title: string; hint: string; dark?: boolean; url: string; custom: boolean; busy: boolean; square: boolean;
  labels: { choose: string; replace: string; reset: string; uploading: string; builtIn: string; custom: string };
  onFile: (file: File | undefined) => void; onReset: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-[0.2em] text-accent">{title}</h3>
      <div className={`grid h-36 place-items-center border border-line p-4 ${dark ? "bg-[#1b0f0c]" : "bg-background"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={title} className={square ? "h-16 w-16 object-contain" : "max-h-full max-w-full object-contain"} />
      </div>
      <p className="text-xs text-muted">{custom ? labels.custom : labels.builtIn} — {hint}</p>
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp,image/avif" className="sr-only" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" disabled={busy} className="min-h-10 px-4" onClick={() => ref.current?.click()}>
          <ImageUp size={14} /> {busy ? labels.uploading : custom ? labels.replace : labels.choose}
        </Button>
        {custom ? <Button type="button" variant="ghost" className="min-h-10 px-3" onClick={onReset}>{labels.reset}</Button> : null}
      </div>
    </div>
  );
}
