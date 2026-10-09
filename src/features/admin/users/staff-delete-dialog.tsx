"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect } from "react";
import { Modal } from "@/components/admin/overlay";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/field";
import { useRouter } from "@/i18n/navigation";
import { deleteStaffAction } from "@/server/actions/admin-system";
import type { ActionState } from "@/server/actions/types";

type Target = { id: string; name: string };

/** Guarded delete: runs through useActionState so selfDelete/lastSuper errors surface in the dialog. */
export function StaffDeleteDialog({ target, onClose }: { target: Target | null; onClose: () => void }) {
  const f = useTranslations("admin.form");
  const s = useTranslations("admin.shell");
  const router = useRouter();
  const [state, formAction, pending] = useActionState(deleteStaffAction, {} as ActionState);

  useEffect(() => {
    if (state.ok) {
      onClose();
      router.refresh();
    }
  }, [state, onClose, router]);

  return (
    <Modal open={target !== null} onClose={onClose} title={f("deleteTitle", { name: target ? target.name : "" })}>
      <p className="mb-4 text-muted">{f("deleteBody")}</p>
      <FormError error={state.errors?.form} />
      <form action={formAction} className="flex justify-end gap-3">
        <input type="hidden" name="id" value={target?.id ?? ""} />
        <Button variant="secondary" onClick={onClose} data-autofocus className="min-h-11 px-6">
          {s("cancel")}
        </Button>
        <Button type="submit" disabled={pending} aria-busy={pending} className="min-h-11 px-6">
          {pending ? f("saving") : f("deleteConfirm")}
        </Button>
      </form>
    </Modal>
  );
}
