import type { SupabaseClient } from "@supabase/supabase-js";

export type CurrentUser = {
  id: string;
  email: string | null;
  role: "USER" | "OWNER" | "ADMIN" | "SUPER_ADMIN";
  status?: string;
  name?: string | null;
  avatarUrl?: string | null;
  authProvider?: string | null;
  isProfileCompleted?: boolean;
  onboardingStep?: "COMPLETE_PROFILE" | "DONE";
};

export type AppEnv = {
  Variables: {
    user: CurrentUser;
    supabase: SupabaseClient; // Per-request client với RLS
  };
};
