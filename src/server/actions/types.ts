import type { FieldErrors } from "@/lib/validation/checkout";

/** Shared result shape for form actions. `errors` holds translation keys from the "validation" namespace. */
export type ActionState = { ok?: boolean; errors?: FieldErrors; values?: Record<string, string>; id?: string; message?: string };

/** One inventory movement, serialised for the drawer (dates become ISO strings). */
export type MovementDTO = { id: string; delta: number; reason: string; note: string | null; createdAt: string };
