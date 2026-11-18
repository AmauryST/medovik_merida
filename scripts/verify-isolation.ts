import path from "node:path";
import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

async function check() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (existsSync(envPath)) process.loadEnvFile(envPath);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
      realtime: { transport: ws as unknown as typeof WebSocket },
    }
  );

  const { data: stores } = await supabase.from("stores").select("id, name, slug");
  console.log("Stores in DB:", stores);

  const { data: angelProducts } = await supabase
    .from("products")
    .select("id, name, is_featured")
    .eq("store_id", "cbdcc7b9-3567-4e6a-b7a3-acee237b2197");
  console.log("Floristería el Ángel total products:", angelProducts?.length);
  const angelFeatured = angelProducts?.filter((p) => p.is_featured);
  console.log("Floristería el Ángel featured count:", angelFeatured?.length);

  const { data: deliaProducts } = await supabase
    .from("products")
    .select("id, name, is_featured")
    .eq("store_id", "db2a699e-43bb-4770-8260-adcf910fbc00");
  console.log("Donde Delia total products:", deliaProducts?.length);
  const deliaFeatured = deliaProducts?.filter((p) => p.is_featured);
  console.log("Donde Delia featured count:", deliaFeatured?.length);
}

check().catch(console.error);
