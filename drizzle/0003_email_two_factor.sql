ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_two_factor_enabled" boolean DEFAULT false NOT NULL;
