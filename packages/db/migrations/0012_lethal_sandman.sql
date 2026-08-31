CREATE TABLE "clickup_config" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text DEFAULT 'clickup' NOT NULL,
	"apiTokenEnc" text,
	"teamId" text,
	"clientId" text,
	"clientSecretEnc" text,
	"enabled" boolean DEFAULT false NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "clickup_config_kind_unique" UNIQUE("kind")
);
--> statement-breakpoint
CREATE TABLE "n8n_config" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text DEFAULT 'n8n' NOT NULL,
	"baseUrl" text,
	"apiKeyEnc" text,
	"enabled" boolean DEFAULT false NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "n8n_config_kind_unique" UNIQUE("kind")
);
--> statement-breakpoint
CREATE TABLE "slack_app" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"botTokenEnc" text,
	"signingSecretEnc" text,
	"defaultChannel" text,
	"teamName" text,
	"appId" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"lastCheckedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "slack_app_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "slack_webhook" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"urlEnc" text NOT NULL,
	"channel" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"lastCheckedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "slack_webhook_label_unique" UNIQUE("label")
);
