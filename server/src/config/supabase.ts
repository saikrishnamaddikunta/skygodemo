import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env, integrationStatus } from "./env";

let supabaseAdminClient: SupabaseClient | null = null;

if (integrationStatus.supabaseConfigured) {
  supabaseAdminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export const getSupabaseAdmin = (): SupabaseClient | null => supabaseAdminClient;
