ALTER TABLE "users" ADD COLUMN "full_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "account_type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "organization_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "use_case" text NOT NULL;