CREATE TABLE "telemetry_install" (
	"id" text PRIMARY KEY NOT NULL,
	"installIdHash" text NOT NULL,
	"firstSeenAt" timestamp DEFAULT now() NOT NULL,
	"lastSeenAt" timestamp DEFAULT now() NOT NULL,
	"startCount" integer DEFAULT 1 NOT NULL,
	"activeDays" integer DEFAULT 1 NOT NULL,
	"lastActiveDay" text NOT NULL,
	"appVersion" text,
	"platform" text,
	"nodeMajor" integer,
	"ignored" boolean DEFAULT false NOT NULL,
	CONSTRAINT "telemetry_install_installIdHash_unique" UNIQUE("installIdHash")
);
--> statement-breakpoint
CREATE TABLE "telemetry_start" (
	"id" text PRIMARY KEY NOT NULL,
	"installIdHash" text NOT NULL,
	"ipHash" text,
	"appVersion" text,
	"platform" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "telemetry_start_created_idx" ON "telemetry_start" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "telemetry_start_install_idx" ON "telemetry_start" USING btree ("installIdHash");