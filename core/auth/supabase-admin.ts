import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicEnvironment, getSupabaseSecretKey } from "./env";

export function createSupabaseAdminClient() {
  const { url } = getSupabasePublicEnvironment();

  return createClient(url, getSupabaseSecretKey(), {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
