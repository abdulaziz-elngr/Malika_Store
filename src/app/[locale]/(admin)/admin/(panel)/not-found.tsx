import { SearchX } from "lucide-react";
import { getLocale } from "next-intl/server";
import { EmptyState } from "@/components/admin/primitives";
import { buttonClasses } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/** A missing admin record (e.g. a deleted order) shows a clear message inside the panel instead of a bare platform 404. */
export default async function PanelNotFound() {
  const ar = (await getLocale()) === "ar";
  return (
    <EmptyState
      icon={<SearchX size={32} strokeWidth={1.2} />}
      title={ar ? "العنصر غير موجود" : "Not found"}
      body={ar ? "هذا العنصر غير موجود أو تم حذفه." : "This item doesn't exist or was removed."}
      action={<Link href="/admin" className={buttonClasses("secondary")}>{ar ? "العودة للوحة التحكم" : "Back to dashboard"}</Link>}
    />
  );
}
