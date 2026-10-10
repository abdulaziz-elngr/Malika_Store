CREATE TABLE IF NOT EXISTS "audience" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"include_unisex" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "audience_slug_idx" ON "audience" USING btree ("slug");
--> statement-breakpoint
INSERT INTO "audience" ("slug", "name_ar", "name_en", "include_unisex", "sort_order") VALUES
	('women', 'نسائي', 'Women', true, 0),
	('men', 'رجالي', 'Men', true, 1),
	('kids', 'أطفال', 'Kids', false, 2),
	('unisex', 'للجنسين', 'Unisex', false, 3)
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender') THEN
    ALTER TABLE "product" ALTER COLUMN "gender" DROP DEFAULT;
    ALTER TABLE "product" ALTER COLUMN "gender" TYPE text USING "gender"::text;
    ALTER TABLE "product" ALTER COLUMN "gender" SET DEFAULT 'women';
    DROP TYPE "gender";
  END IF;
END $$;
