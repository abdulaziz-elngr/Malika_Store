import { governorateName } from "@/lib/geo";
import { formatMoney } from "@/lib/localize";
import { site } from "@/lib/site";
import { sendMail, type MailResult } from "./mailer";
import { getOrderByNumber, type OrderDetails } from "./orders";
import { getOrderAlertSettings } from "./settings";

const esc = (v: string | number | null | undefined) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const money = (minor: number) => formatMoney(minor, "ar");
const DELIVERY: Record<string, string> = { standard: "توصيل عادي", express: "توصيل سريع" };
const PAYMENT: Record<string, string> = { cod: "الدفع عند الاستلام", card: "بطاقة", wallet: "محفظة إلكترونية" };

const adminOrderUrl = (orderId: string) => `${site.url.replace(/\/$/, "")}/ar/admin/orders/${orderId}`;

function buildOrderEmail(order: OrderDetails) {
  const number = `MLK-${order.seq}`;
  const address = [governorateName(order.governorate, "ar"), order.city, order.line1, order.line2].filter(Boolean).join("، ");
  const url = adminOrderUrl(order.id);

  const rows = order.items
    .map((i) => {
      const variant = [i.size, i.colorNameAr].filter(Boolean).join(" / ");
      return `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #eadfce">${esc(i.nameAr)}${variant ? `<br><span style="color:#8c6551;font-size:13px">${esc(variant)}</span>` : ""}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #eadfce;text-align:center">× ${esc(i.quantity)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #eadfce;text-align:left" dir="ltr">${esc(money(i.lineTotalMinor))}</td>
      </tr>`;
    })
    .join("");

  const line = (label: string, value: string) =>
    `<tr><td style="padding:4px 0;color:#8c6551">${label}</td><td style="padding:4px 0;text-align:left" dir="auto">${value}</td></tr>`;

  const html = `<!doctype html>
<html lang="ar" dir="rtl"><body style="margin:0;background:#f7f0e6;font-family:Tahoma,Arial,sans-serif;color:#2a0f0b">
  <div style="max-width:600px;margin:0 auto;padding:24px">
    <div style="background:#67251b;color:#fcf9f4;padding:20px 24px">
      <div style="font-size:13px;letter-spacing:2px;opacity:.8">MALIKA</div>
      <div style="font-size:22px;margin-top:6px">طلب جديد ${esc(number)}</div>
    </div>
    <div style="background:#fcf9f4;padding:24px">
      <p style="margin:0 0 16px;font-size:18px">الإجمالي: <strong>${esc(money(order.totalMinor))}</strong></p>

      <h3 style="margin:20px 0 8px;font-size:14px;color:#8c6551">العميل</h3>
      <table style="width:100%;border-collapse:collapse;font-size:15px">
        ${line("الاسم", esc(order.name))}
        ${line("الهاتف", `<span dir="ltr">${esc(order.phone)}</span>`)}
        ${line("البريد", `<span dir="ltr">${esc(order.email)}</span>`)}
        ${line("العنوان", esc(address))}
        ${order.notes ? line("ملاحظات", esc(order.notes)) : ""}
      </table>

      <h3 style="margin:24px 0 8px;font-size:14px;color:#8c6551">المنتجات</h3>
      <table style="width:100%;border-collapse:collapse;font-size:15px">${rows}</table>

      <table style="width:100%;border-collapse:collapse;font-size:15px;margin-top:16px">
        ${line("المجموع الفرعي", `<span dir="ltr">${esc(money(order.subtotalMinor))}</span>`)}
        ${order.discountMinor > 0 ? line(`الخصم${order.couponCode ? ` (${esc(order.couponCode)})` : ""}`, `<span dir="ltr">- ${esc(money(order.discountMinor))}</span>`) : ""}
        ${line("الشحن", order.shippingMinor > 0 ? `<span dir="ltr">${esc(money(order.shippingMinor))}</span>` : "مجاني")}
        ${line("التوصيل", esc(DELIVERY[order.deliveryMethod] ?? order.deliveryMethod))}
        ${line("الدفع", esc(PAYMENT[order.paymentMethod] ?? order.paymentMethod))}
      </table>

      <p style="margin:28px 0 0;text-align:center">
        <a href="${esc(url)}" style="display:inline-block;background:#67251b;color:#fcf9f4;text-decoration:none;padding:12px 28px;font-size:15px">فتح الطلب في لوحة التحكم</a>
      </p>
    </div>
  </div>
</body></html>`;

  const text = [
    `طلب جديد ${number}`,
    `الإجمالي: ${money(order.totalMinor)}`,
    "",
    `العميل: ${order.name}`,
    `الهاتف: ${order.phone}`,
    `البريد: ${order.email}`,
    `العنوان: ${address}`,
    order.notes ? `ملاحظات: ${order.notes}` : "",
    "",
    "المنتجات:",
    ...order.items.map((i) => `- ${i.nameAr}${[i.size, i.colorNameAr].filter(Boolean).length ? ` (${[i.size, i.colorNameAr].filter(Boolean).join(" / ")})` : ""} × ${i.quantity} = ${money(i.lineTotalMinor)}`),
    "",
    `التوصيل: ${DELIVERY[order.deliveryMethod] ?? order.deliveryMethod}`,
    `الدفع: ${PAYMENT[order.paymentMethod] ?? order.paymentMethod}`,
    "",
    `فتح الطلب: ${url}`,
  ]
    .filter((l, i, a) => l !== "" || a[i - 1] !== "")
    .join("\n");

  return { subject: `طلب جديد ${number} — ${money(order.totalMinor)}`, html, text, replyTo: order.email };
}

/**
 * Emails the configured recipients about a freshly placed order.
 * Safe to fire-and-forget: it never throws, because the order is already committed by the time this runs.
 */
export async function notifyAdminsOfNewOrder(orderNumber: string): Promise<void> {
  try {
    const settings = await getOrderAlertSettings();
    if (!settings.enabled || settings.emails.length === 0) return;
    const order = await getOrderByNumber(orderNumber);
    if (!order) return;
    const res = await sendMail({ to: settings.emails, ...buildOrderEmail(order) });
    if (!res.ok) console.error(`[order-alerts] ${orderNumber}: email not sent (${res.error})`);
  } catch (e) {
    console.error(`[order-alerts] ${orderNumber}:`, e instanceof Error ? e.message : e);
  }
}

/** Used by the "send test email" button in the dashboard, so the owner can verify the SMTP setup immediately. */
export function sendOrderAlertTest(to: string[]): Promise<MailResult> {
  const text = "هذه رسالة تجريبية من لوحة تحكم MALIKA. إذا وصلتك، فإشعارات الطلبات الجديدة تعمل بنجاح.";
  return sendMail({
    to,
    subject: "رسالة تجريبية — إشعارات طلبات MALIKA",
    text,
    html: `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;font-size:16px;color:#2a0f0b;padding:16px">${esc(text)}</div>`,
  });
}
