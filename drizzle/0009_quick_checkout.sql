ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "phone2" text;
--> statement-breakpoint
ALTER TABLE "order" ALTER COLUMN "email" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "coupon_usage" ALTER COLUMN "email" DROP NOT NULL;
--> statement-breakpoint
UPDATE "site_setting" SET "value" = ("value" - 'freeThresholdMinor') || '{"standardMinor": 11000}'::jsonb WHERE "key" = 'shipping';
--> statement-breakpoint
UPDATE "site_setting" SET "value" = "value" - 'depositMinor' WHERE "key" = 'payments';
