import "server-only";

import { requireSupabasePublicEnv } from "@/lib/supabase/env";

export type UsernameAuthConfig = {
  supabaseUrl: string;
  supabaseSecretKey: string;
  usernameSecret: string;
  recoverySecret: string;
};

export function getUsernameAuthConfig(): UsernameAuthConfig {
  const { url } = requireSupabasePublicEnv();
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const usernameSecret = process.env.USERNAME_AUTH_SECRET ?? "";
  const recoverySecret = process.env.ACCOUNT_RECOVERY_SECRET ?? "";

  if (!supabaseSecretKey || usernameSecret.length < 32 || recoverySecret.length < 32) {
    throw new Error("Username authentication server configuration is incomplete.");
  }

  return { supabaseUrl: url, supabaseSecretKey, usernameSecret, recoverySecret };
}
