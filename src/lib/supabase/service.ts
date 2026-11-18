import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { supabaseEnv } from "./env";

/**
 * Privileged server-only Supabase client (`service_role`).
 * Use ONLY in server-side payment/webhook handlers where `anon` has no table
 * access (`orders`, `store_payment_credentials`) and after verifying tenant
 * ownership (`store_id`) or cryptographic webhook signatures.
 */
export function createServiceRoleClient(): SupabaseClient {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey) {
    throw new Error("Falta la variable de entorno SUPABASE_SERVICE_ROLE_KEY en el servidor.");
  }
  return createClient(supabaseEnv.url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
