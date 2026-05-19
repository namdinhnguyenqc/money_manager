-- Migration 017_fix_users_columns.sql
-- Add missing columns to users table that were omitted in migration 016

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_profile_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_step VARCHAR(50) DEFAULT 'COMPLETE_PROFILE';

-- Update existing users to have default values if null
UPDATE public.users SET is_profile_completed = FALSE WHERE is_profile_completed IS NULL;
UPDATE public.users SET onboarding_step = 'COMPLETE_PROFILE' WHERE onboarding_step IS NULL;

-- Add index for onboarding_step if useful
CREATE INDEX IF NOT EXISTS idx_users_onboarding_step ON public.users(onboarding_step);
