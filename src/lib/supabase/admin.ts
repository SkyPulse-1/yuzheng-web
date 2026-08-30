import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { getUsernameAuthConfig } from "@/lib/auth/config";

export function createAdminClient() {
  const { supabaseUrl, supabaseSecretKey } = getUsernameAuthConfig();
  return createSupabaseClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
