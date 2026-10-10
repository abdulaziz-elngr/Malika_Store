import { z } from "zod";
import { GOVERNORATE_KEYS } from "@/lib/geo";
import { DELIVERY_IDS } from "@/lib/shipping";

/** Validation messages are translation keys under the "validation" namespace, so errors render in the active language. */
export const normalizePhone = (raw: string) => {
  const digits = raw.replace(/[\s\-()]/g, "").replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  const m = /^(?:\+?20|0)?(1[0125]\d{8})$/.exec(digits);
  return m ? `0${m[1]}` : null;
};

const text = (min = 1, max = 120) => z.string().trim().min(min, "required").max(max, "tooLong");
const phone = z
  .string()
  .trim()
  .min(1, "required")
  .transform((v, ctx) => {
    const n = normalizePhone(v);
    if (!n) ctx.addIssue({ code: "custom", message: "phone" });
    return n ?? "";
  });
const email = z.string().trim().toLowerCase().min(1, "required").max(160, "tooLong").pipe(z.email("email"));

export const customerInfoSchema = z.object({ name: text(2, 80), email, phone });
export const addressSchema = z.object({
  governorate: z.enum(GOVERNORATE_KEYS, "required"),
  city: text(2, 80),
  line1: text(4, 200),
  line2: z.string().trim().max(200, "tooLong").optional().default(""),
  notes: z.string().trim().max(300, "tooLong").optional().default(""),
});
export const deliverySchema = z.object({ deliveryMethod: z.enum(DELIVERY_IDS, "required") });
export const paymentSchema = z.object({ paymentMethod: z.string().min(1, "required").max(30) });
/** Present only when the chosen method needs a transfer (wallet / InstaPay, or a cash-on-delivery deposit). The server decides whether it is required. */
export const transferSchema = z.object({
  transferChannel: z.enum(["wallet", "instapay"]).optional(),
  senderPhone: z.string().trim().max(30).optional().default(""),
  receiptToken: z.string().max(600).optional().default(""),
});

export const checkoutSchema = customerInfoSchema.extend(addressSchema.shape).extend(deliverySchema.shape).extend(paymentSchema.shape).extend(transferSchema.shape).extend({
  coupon: z.string().trim().max(40).optional().default(""),
  saveAddress: z.boolean().optional().default(false),
  items: z.array(z.object({ variantId: z.uuid(), quantity: z.number().int().min(1).max(10) })).min(1, "emptyCart").max(30),
});

export type CheckoutInput = z.input<typeof checkoutSchema>;
export type FieldErrors = Record<string, string>;

/** Flattens a zod error to { field: messageKey } using the first issue per field. */
export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = typeof issue.message === "string" && /^[a-zA-Z]+$/.test(issue.message) ? issue.message : "invalid";
  }
  return out;
}
