CREATE TABLE "telemetry_identity" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text DEFAULT 'install' NOT NULL,
	"installId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "telemetry_identity_kind_unique" UNIQUE("kind")
);
