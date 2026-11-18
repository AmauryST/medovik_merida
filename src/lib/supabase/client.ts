import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabaseEnv } from "./env";

let browserClient: SupabaseClient | undefined;

/**
 * Supabase client for Client Components ("use client").
 * Uses only the anon key: RLS decides what the visitor can read, and orders
 * go through `rpc('create_checkout_order')`, never a direct insert.
 */
export function createClient(): SupabaseClient {
  browserClient ??= createBrowserClient(supabaseEnv.url, supabaseEnv.anonKey);
  return browserClient;
}
