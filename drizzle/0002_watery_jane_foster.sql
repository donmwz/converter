ALTER TABLE "conversions" ADD COLUMN "result_name" text;--> statement-breakpoint
ALTER TABLE "conversions" ADD COLUMN "uploaded_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "conversions" ADD COLUMN "converted_at" timestamp with time zone;