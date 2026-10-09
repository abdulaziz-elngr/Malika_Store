import { z } from "zod";

const email = z.string().trim().toLowerCase().min(1, "required").max(160, "tooLong").pipe(z.email("email"));

export const adminLoginSchema = z.object({ email, password: z.string().min(1, "required").max(200) });

/** Stricter than the customer policy: staff accounts can change prices and see every order. */
export const adminPasswordSchema = z.string().min(12, "adminPasswordShort").max(200, "tooLong").regex(/[a-z]/, "adminPasswordWeak").regex(/[A-Z]/, "adminPasswordWeak").regex(/\d/, "adminPasswordWeak");

export const createAdminSchema = z.object({ name: z.string().trim().min(2, "required").max(80, "tooLong"), email, password: adminPasswordSchema, roleKey: z.string().min(1) });
