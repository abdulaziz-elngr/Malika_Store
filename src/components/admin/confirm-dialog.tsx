"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Modal } from "./overlay";

type Props = {
  open: boolean; onClose: () => void; title: string; body: string; confirmLabel: string;
  /** Destructive and irreversible actions use the filled button; the default is also focused last so Enter is never a surprise. */
  onConfirm?: () => void;
  /** For server actions: wrap the confirm button in this form action instead of using onConfirm. */
  formAction?: () => void | Promise<void>;
  busy?: boolean;
};

export function ConfirmDialog({ open, onClose, title, body, confirmLabel, onConfirm, formAction, busy }: Props) {
  const t = useTranslations("admin.shell");
  const confirm = <Button type={formAction ? "submit" : "button"} onClick={formAction ? undefined : onConfirm} disabled={busy} className="min-h-11 px-6">{confirmLabel}</Button>;
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="mb-6 text-muted">{body}</p>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} data-autofocus className="min-h-11 px-6">{t("cancel")}</Button>
        {formAction ? <form action={formAction}>{confirm}</form> : confirm}
      </div>
    </Modal>
  );
}
