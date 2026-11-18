import path from "node:path";
import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

async function main() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (existsSync(envPath)) process.loadEnvFile(envPath);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(url, key, {
    auth: { persistSession: false },
    realtime: { transport: ws as unknown as typeof WebSocket },
  });

  // 1. Fetch medovik-merida store
  const { data: store, error: storeErr } = await supabase
    .from("stores")
    .select("id, name, slug, theme_config")
    .eq("slug", "medovik-merida")
    .single();

  if (storeErr || !store) {
    console.error("No se encontró la tienda medovik-merida:", storeErr);
    process.exit(1);
  }

  console.log("Tienda encontrada:", store.name, store.id);

  // 2. Set is_featured = true for the star Medovik cakes
  const featuredSlugs = [
    "clasico-mediano",
    "spartak-mediano",
    "caramelo-salado-mediano",
    "clasico-higos",
    "degustacion-tres-sabores",
  ];

  const { data: updatedProducts, error: prodErr } = await supabase
    .from("products")
    .update({ is_featured: true })
    .eq("store_id", store.id)
    .in("slug", featuredSlugs)
    .select("id, slug, name, is_featured");

  if (prodErr) {
    console.error("Error al actualizar productos destacados:", prodErr);
  } else {
    console.log("Productos destacados actualizados con éxito:", updatedProducts);
  }

  // 3. Prepare initial editorial billboard items for Medovik Mérida
  const initialBillboard = [
    {
      id: "bb-medovik-01",
      store_id: store.id,
      media_id: null,
      image_url: "/assets/hero.webp",
      image_alt: "Medovik Clásico con Higos Frescos en Mérida",
      kicker: "Receta Tradicional Rusa en Mérida",
      title: "Medovik Clásico de Miel Natural",
      subtitle:
        "Finas capas horneadas una por una con miel natural y mantequilla de verdad, ensambladas con crema suave y delicada. Disponible en porción ($100 MXN), mediano ($500 MXN) y grande ($1,000 MXN).",
      cta_label: "Ver Medovik Clásico",
      target_type: "PRODUCT",
      target_value: "clasico-mediano",
      placement: "BOTH",
      is_active: true,
      sort_order: 1,
    },
    {
      id: "bb-medovik-02",
      store_id: store.id,
      media_id: null,
      image_url: "/assets/hero-spartak.webp",
      image_alt: "Medovik Spartak — Miel, Cacao, Ciruela y Nuez",
      kicker: "Intenso y Delicioso",
      title: "Medovik Spartak · Miel, Cacao, Ciruela & Nuez",
      subtitle:
        "Capas de miel y cacao profundo intercaladas con crema sedosa, ciruela pasa seleccionada y nuez tostada.",
      cta_label: "Pedir Spartak",
      target_type: "PRODUCT",
      target_value: "spartak-mediano",
      placement: "BOTH",
      is_active: true,
      sort_order: 2,
    },
  ];

  // 4. Try inserting into store_billboard_items table if it exists
  try {
    const { error: tableErr } = await supabase
      .from("store_billboard_items")
      .upsert(initialBillboard, { onConflict: "id" });
    if (tableErr) {
      console.log("Nota sobre tabla store_billboard_items:", tableErr.message);
    } else {
      console.log("Tabla store_billboard_items actualizada con éxito.");
    }
  } catch {
    console.log("Tabla store_billboard_items no disponible aún en DB.");
  }

  // 5. Update stores.theme_config.billboard
  const currentTheme =
    store.theme_config && typeof store.theme_config === "object"
      ? (store.theme_config as Record<string, unknown>)
      : {};

  const nextTheme = {
    ...currentTheme,
    billboard: initialBillboard,
  };

  const { error: themeErr } = await supabase
    .from("stores")
    .update({ theme_config: nextTheme })
    .eq("id", store.id);

  if (themeErr) {
    console.error("Error al actualizar theme_config:", themeErr);
    process.exit(1);
  }

  console.log("theme_config.billboard de medovik-merida actualizado con éxito.");

  // 6. Ensure size categories (mediano, grande, porciones) are linked in product_categories
  const { data: cats } = await supabase
    .from("categories")
    .select("id, slug")
    .eq("store_id", store.id);
  const { data: prods } = await supabase
    .from("products")
    .select("id, slug")
    .eq("store_id", store.id);

  const catMap = new Map((cats ?? []).map((c) => [c.slug, c.id]));
  for (const p of prods ?? []) {
    const sizeSlug = p.slug.includes("grande")
      ? "grande"
      : p.slug.includes("porcion") || p.slug.includes("degustacion")
        ? "porciones"
        : "mediano";
    const catId = catMap.get(sizeSlug);
    if (catId) {
      await supabase.from("product_categories").upsert(
        {
          store_id: store.id,
          product_id: p.id,
          category_id: catId,
        },
        { onConflict: "product_id,category_id" },
      );
    }
  }

  console.log("Seed completado exitosamente.");
}

main().catch(console.error);
