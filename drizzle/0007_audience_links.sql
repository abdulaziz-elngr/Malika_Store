ALTER TABLE "audience" ADD COLUMN IF NOT EXISTS "show_in_header" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
-- "Unisex" is a product flag that Women/Men can opt in to, not a shop-by-audience entry, so it stays out of the header by default.
UPDATE "audience" SET "show_in_header" = false WHERE "slug" = 'unisex';
--> statement-breakpoint
ALTER TABLE "category" ADD COLUMN IF NOT EXISTS "audience_id" uuid;
--> statement-breakpoint
ALTER TABLE "collection" ADD COLUMN IF NOT EXISTS "audience_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "category" ADD CONSTRAINT "category_audience_id_audience_id_fk" FOREIGN KEY ("audience_id") REFERENCES "audience"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "collection" ADD CONSTRAINT "collection_audience_id_audience_id_fk" FOREIGN KEY ("audience_id") REFERENCES "audience"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "category_audience_idx" ON "category" USING btree ("audience_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "collection_audience_idx" ON "collection" USING btree ("audience_id");
--> statement-breakpoint
-- Backfill existing rows: when every product in a category / collection is for one audience, link it to that audience.
-- Anything mixed (or empty) stays null, i.e. a general entry that every audience shows, until it is edited in the admin.
UPDATE "category" c SET "audience_id" = a."id"
FROM "audience" a
WHERE c."audience_id" IS NULL
  AND a."slug" = (
    SELECT min(p."gender") FROM "product" p
    WHERE p."category_id" = c."id" AND p."gender" <> 'unisex'
    HAVING count(DISTINCT p."gender") = 1
  );
--> statement-breakpoint
UPDATE "collection" col SET "audience_id" = a."id"
FROM "audience" a
WHERE col."audience_id" IS NULL
  AND a."slug" = (
    SELECT min(p."gender") FROM "product_collection" pc
    JOIN "product" p ON p."id" = pc."product_id"
    WHERE pc."collection_id" = col."id" AND p."gender" <> 'unisex'
    HAVING count(DISTINCT p."gender") = 1
  );
