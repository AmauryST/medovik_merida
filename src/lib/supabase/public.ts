import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { supabaseEnv } from "./env";

/**
 * Cookie-less anon client for public catalog reads on the server.
 * Unlike `server.ts`, it does not call `cookies()`, so pages that use it can
 * stay static/ISR (`export const revalidate`). Never use it for user data.
 */
export function createPublicClient(): SupabaseClient {
  return createClient(supabaseEnv.url, supabaseEnv.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
