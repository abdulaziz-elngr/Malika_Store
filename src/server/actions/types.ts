import type { FieldErrors } from "@/lib/validation/checkout";

/** Shared result shape for form actions. `errors` holds translation keys from the "validation" namespace. */
export type ActionState = { ok?: boolean; errors?: FieldErrors; values?: Record<string, string> };
