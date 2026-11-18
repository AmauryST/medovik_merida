// Next.js only inlines NEXT_PUBLIC_* vars into client bundles when they are
// referenced literally, so each one is read by its full name here.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const storeSlug = process.env.NEXT_PUBLIC_STORE_SLUG;

export const supabaseEnv = {
  url: url || "https://placeholder-project.supabase.co",
  anonKey: anonKey || "placeholder-anon-key",
  storeSlug: storeSlug || "medovik-merida",
  isConfigured: Boolean(url && anonKey),
} as const;
