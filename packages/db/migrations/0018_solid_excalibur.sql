CREATE TABLE "chrome_preset" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text DEFAULT 'user' NOT NULL,
	"userId" text,
	"name" text NOT NULL,
	"surface" text NOT NULL,
	"accent" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chrome_preset" ADD CONSTRAINT "chrome_preset_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chrome_preset_user_name_idx" ON "chrome_preset" USING btree ("userId","name");--> statement-breakpoint
CREATE UNIQUE INDEX "chrome_preset_system_name_idx" ON "chrome_preset" USING btree ("name") WHERE "chrome_preset"."type" = 'system';--> statement-breakpoint
CREATE INDEX "chrome_preset_user_idx" ON "chrome_preset" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "chrome_preset_type_idx" ON "chrome_preset" USING btree ("type");--> statement-breakpoint
-- Seed the shipped palettes. These are the eight fixed chrome themes, their
-- `oklch()` originals converted to sRGB hex, now offered as colour pairs
-- (`L2-UI-55`). Ownerless by definition: `type = 'system'`, `userId` null.
INSERT INTO "chrome_preset" ("id", "type", "userId", "name", "surface", "accent") VALUES
  (gen_random_uuid()::text, 'system', NULL, 'Slate', '#19212d', '#2c3646'),
  (gen_random_uuid()::text, 'system', NULL, 'Graphite', '#1a1a1a', '#2e2e2e'),
  (gen_random_uuid()::text, 'system', NULL, 'Pine', '#00271e', '#0f3e32'),
  (gen_random_uuid()::text, 'system', NULL, 'Aubergine', '#38123b', '#522455'),
  (gen_random_uuid()::text, 'system', NULL, 'Gold', '#f9f1e3', '#e3d8c2'),
  (gen_random_uuid()::text, 'system', NULL, 'Sky Blue', '#e8f3fd', '#cadbeb'),
  (gen_random_uuid()::text, 'system', NULL, 'Sage', '#e7f5ea', '#c9dfcf'),
  (gen_random_uuid()::text, 'system', NULL, 'Rose Gold', '#ffedec', '#edd2d0')
ON CONFLICT DO NOTHING;--> statement-breakpoint
-- Four pairs that land in a *user's* shelf rather than the system set, so each
-- can be renamed or deleted like any pair someone saved. `Brick` is the seed
-- of the family; the other three are its own OKLCH lightness and chroma at
-- three other hues, so the set reads as one intensity rather than four
-- unrelated colours.
--
-- Seeded for the accounts that exist at migration time; an account created
-- later starts with an empty shelf, which is the honest default for a list
-- whose whole meaning is "what you saved".
INSERT INTO "chrome_preset" ("id", "type", "userId", "name", "surface", "accent")
SELECT gen_random_uuid()::text, 'user', u."id", p."name", p."surface", p."accent"
FROM "user" u
CROSS JOIN (VALUES
  ('Brick', '#6b2424', '#933939'),
  ('Indigo', '#233c74', '#37579f'),
  ('Moss', '#114c19', '#236c2b'),
  ('Amethyst', '#562a60', '#784185')
) AS p("name", "surface", "accent")
ON CONFLICT DO NOTHING;
