CREATE TABLE IF NOT EXISTS "context_star" (
	"user_id" text NOT NULL,
	"context_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "context_star_user_id_context_id_pk" PRIMARY KEY("user_id","context_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public_context" (
	"id" text PRIMARY KEY NOT NULL,
	"context_id" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
