ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "prepaid_minor" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "transfer_channel" text;
--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "sender_phone" text;
--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "payment_proof_url" text;
