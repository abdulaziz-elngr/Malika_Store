import { getTranslations } from "next-intl/server";
import { Badge, type BadgeTone } from "@/components/admin/primitives";

const TONE: Record<string, BadgeTone> = { pending: "copper", confirmed: "neutral", preparing: "neutral", shipped: "brand", delivered: "sage", cancelled: "brand", returned: "brand" };

export async function OrderStatusBadge({ status }: { status: string }) {
  const t = await getTranslations("orders.status");
  return <Badge tone={TONE[status] ?? "neutral"}>{t(status as never)}</Badge>;
}
