"use client";

import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/admin/primitives";
import { Button } from "@/components/ui/button";

export default function PanelError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("admin.error");
  return (
    <EmptyState
      icon={<TriangleAlert size={32} strokeWidth={1.2} />} title={t("title")} body={t("body")}
      action={<div className="grid justify-items-center gap-3"><Button onClick={reset}>{t("retry")}</Button>{error.digest && <p className="text-xs text-muted" dir="ltr">{t("reference", { digest: error.digest })}</p>}</div>}
    />
  );
}
