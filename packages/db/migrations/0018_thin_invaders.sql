CREATE TABLE "chrome_preset" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"surface" text NOT NULL,
	"accent" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chrome_preset" ADD CONSTRAINT "chrome_preset_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chrome_preset_user_name_idx" ON "chrome_preset" USING btree ("userId","name");--> statement-breakpoint
CREATE INDEX "chrome_preset_user_idx" ON "chrome_preset" USING btree ("userId");