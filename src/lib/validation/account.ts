import { z } from "zod";
import { addressSchema, normalizePhone } from "./checkout";

const phone = z.string().trim().min(1, "required").transform((v, ctx) => {
  const n = normalizePhone(v);
  if (!n) ctx.addIssue({ code: "custom", message: "phone" });
  return n ?? "";
});
const email = z.string().trim().toLowerCase().min(1, "required").max(160, "tooLong").pipe(z.email("email"));
const password = z.string().min(8, "passwordShort").max(100, "tooLong").regex(/[A-Za-z]/, "passwordWeak").regex(/\d/, "passwordWeak");

export const loginSchema = z.object({ email, password: z.string().min(1, "required").max(100) });
export const registerSchema = z.object({ name: z.string().trim().min(2, "required").max(80, "tooLong"), email, phone, password });
export const profileSchema = z.object({ name: z.string().trim().min(2, "required").max(80, "tooLong"), phone });
export const passwordChangeSchema = z.object({ current: z.string().min(1, "required"), next: password });
export const savedAddressSchema = addressSchema.extend({
  label: z.string().trim().max(40, "tooLong").optional().default(""),
  recipient: z.string().trim().min(2, "required").max(80, "tooLong"),
  phone,
  isDefault: z.boolean().optional().default(false),
});
