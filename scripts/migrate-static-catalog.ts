import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import ws from "ws";

const ROOT = path.resolve(import.meta.dirname, "..");
const BUCKET = "product-images";
const APPLY = process.argv.includes("--apply");

interface JsonProduct {
  id: string;
  name: string;
  short_description?: string;
  description: string;
  categoria: string;
  presentacion?: string;
  peso?: string;
  porciones?: string;
  price_cents: number;
  is_featured?: boolean;
  image: string;
  alt: string;
}

interface StaticProduct {
  sourceNumber: number;
  id: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string;
  description: string;
  priceCents: number;
  isFeatured: boolean;
  peso: string;
  porciones: string;
  presentacionSlug: string;
  imagePath: string;
  alt: string;
  sortOrder: number;
  categorySlug: string;
}

function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function loadProducts(): StaticProduct[] {
  const jsonPath = path.join(ROOT, "public", "data", "products.json");
  const raw = readFileSync(jsonPath, "utf8");
  const items: JsonProduct[] = JSON.parse(raw);

  return items.map((item, index) => {
    const num = index + 1;
    const cat = item.categoria.toLowerCase();
    const cleanSlug = item.id ? slugify(item.id) : slugify(item.name);
    const relImage = item.image.startsWith("/") ? item.image.slice(1) : item.image;
    const fullImagePath = path.join(ROOT, "public", relImage);

    return {
      sourceNumber: num,
      id: item.id,
      name: item.name,
      slug: cleanSlug,
      sku: `MED-MER-${String(num).padStart(2, "0")}`,
      shortDescription:
        item.short_description ??
        (item.description.length > 90
          ? `${item.description.slice(0, 87)}...`
          : item.description),
      description: item.description,
      priceCents: item.price_cents,
      isFeatured: Boolean(item.is_featured),
      peso: item.peso ?? "",
      porciones: item.porciones ?? "",
      presentacionSlug: (item.presentacion ?? "mediano").replace(/^pastel-/, ""),
      imagePath: fullImagePath,
      alt: item.alt || item.name,
      sortOrder: num,
      categorySlug: cat,
    };
  });
}

function must<T>(
  label: string,
  result: { data: T | null; error: { message: string } | null },
): T {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`);
  }
  return result.data as T;
}

async function toWebp(filePath: string): Promise<Buffer> {
  return sharp(filePath)
    .rotate()
    .resize(1000, 1000, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 84 })
    .toBuffer();
}

async function ensureBucket(supabase: SupabaseClient): Promise<void> {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw new Error(`listBuckets: ${error.message}`);
  if (buckets?.some((b) => b.name === BUCKET)) return;

  const { error: createError } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 2 * 1024 * 1024,
    allowedMimeTypes: ["image/webp"],
  });
  if (createError) throw new Error(`createBucket: ${createError.message}`);
  console.log(`Bucket "${BUCKET}" creado (público, solo image/webp).`);
}

async function provisionTenant(supabase: SupabaseClient): Promise<string> {
  // 1. Store Medovik Mérida (MX / MXN)
  const storeData = {
    slug: "medovik-merida",
    name: "Medovik Mérida",
    country_code: "MX",
    currency: "MXN",
    whatsapp_number: "529999030512",
    enable_whatsapp_checkout: true,
    is_active: true,
    save_orders: false,
    show_delivery_zone: false,
    payment_methods: ["WHATSAPP_COORDINATION", "TRANSFER", "CASH"],
  };

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .upsert(storeData, { onConflict: "slug" })
    .select("id")
    .single<{ id: string }>();

  if (storeError) throw new Error(`stores upsert: ${storeError.message}`);
  const storeId = store.id;

  // 2. Categories (Sabores + Tamaños)
  const categories = [
    {
      store_id: storeId,
      slug: "clasico",
      name: "Medovik Clásico",
      group_type: "FLAVOR",
      sort_order: 1,
      is_featured_filter: true,
      is_active: true,
    },
    {
      store_id: storeId,
      slug: "spartak",
      name: "Spartak (Miel & Cacao)",
      group_type: "FLAVOR",
      sort_order: 2,
      is_featured_filter: true,
      is_active: true,
    },
    {
      store_id: storeId,
      slug: "caramelo-salado",
      name: "Caramelo Salado & Pecana",
      group_type: "FLAVOR",
      sort_order: 3,
      is_featured_filter: true,
      is_active: true,
    },
    {
      store_id: storeId,
      slug: "mediano",
      name: "Mediano (~1.225 kg)",
      group_type: "OCCASION",
      sort_order: 1,
      is_featured_filter: true,
      is_active: true,
    },
    {
      store_id: storeId,
      slug: "grande",
      name: "Grande (~2.45 kg)",
      group_type: "OCCASION",
      sort_order: 2,
      is_featured_filter: true,
      is_active: true,
    },
    {
      store_id: storeId,
      slug: "porciones",
      name: "Porción (~180 g)",
      group_type: "OCCASION",
      sort_order: 3,
      is_featured_filter: true,
      is_active: true,
    },
    {
      store_id: storeId,
      slug: "especialidades",
      name: "Ediciones Especiales",
      group_type: "CAMPAIGN",
      sort_order: 1,
      is_featured_filter: false,
      is_active: true,
    },
  ];

  for (const cat of categories) {
    const { error: catError } = await supabase
      .from("categories")
      .upsert(cat, { onConflict: "store_id,slug" });
    if (catError)
      console.warn(`categories upsert ${cat.slug}: ${catError.message}`);
  }

  // 3. Delivery Zone en Mérida
  const zone = {
    store_id: storeId,
    name: "Mérida, Yucatán (Entrega o recolección coordinada)",
    fee_cents: 0,
    estimated_time_text: "Pasteles frescos hechos por pedido",
    sort_order: 1,
    is_active: true,
  };
  const { error: zoneError } = await supabase
    .from("delivery_zones")
    .upsert(zone, { onConflict: "store_id,name" });
  if (zoneError) {
    const { data: existingZones } = await supabase
      .from("delivery_zones")
      .select("id")
      .eq("store_id", storeId)
      .limit(1);
    if (!existingZones || existingZones.length === 0) {
      await supabase.from("delivery_zones").insert(zone);
    }
  }

  // 4. Store Members
  const owners = ["amauryst@gmail.com"];
  for (const email of owners) {
    const { data: userRecord } = await supabase
      .from("auth_users_view")
      .select("id")
      .eq("email", email)
      .maybeSingle<{ id: string }>();

    if (userRecord?.id) {
      await supabase.from("store_members").upsert(
        { store_id: storeId, user_id: userRecord.id, role: "OWNER" },
        { onConflict: "store_id,user_id" },
      );
    }
  }

  return storeId;
}

async function apply(products: StaticProduct[]): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const storeSlug = process.env.NEXT_PUBLIC_STORE_SLUG;
  if (!url || !storeSlug)
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_STORE_SLUG");
  if (!serviceKey || !/^(eyJ|sb_secret_)/.test(serviceKey)) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY en .env.local no es una clave real.",
    );
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
    realtime: { transport: ws as unknown as typeof WebSocket },
  });

  console.log("Aprovisionando tienda Medovik Mérida y categorías...");
  const storeId = await provisionTenant(supabase);
  console.log(`Tienda id: ${storeId}`);

  await ensureBucket(supabase);

  const categories = must(
    "categorías",
    await supabase
      .from("categories")
      .select("id, slug")
      .eq("store_id", storeId),
  ) as Array<{ id: string; slug: string }>;
  const categoryIdMap = new Map(categories.map((c) => [c.slug, c.id]));

  const existing = must(
    "productos existentes",
    await supabase.from("products").select("slug").eq("store_id", storeId),
  ) as Array<{ slug: string }>;
  const existingSlugs = new Set(existing.map((p) => p.slug));

  let created = 0;
  for (const p of products) {
    if (existingSlugs.has(p.slug)) {
      console.log(`  = ${p.slug} (ya existe, se omite)`);
      continue;
    }

    if (!existsSync(p.imagePath)) {
      console.warn(`  ! No se encontró el archivo de imagen: ${p.imagePath}`);
      continue;
    }

    const mediaId = randomUUID();
    const storagePath = `${storeId}/${mediaId}.webp`;
    const webp = await toWebp(p.imagePath);

    must(
      `subir ${p.imagePath}`,
      await supabase.storage
        .from(BUCKET)
        .upload(storagePath, webp, { contentType: "image/webp", upsert: true }),
    );
    const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
      .data.publicUrl;

    must(
      `media_assets ${p.slug}`,
      await supabase
        .from("media_assets")
        .insert({
          id: mediaId,
          store_id: storeId,
          storage_path: storagePath,
          public_url: publicUrl,
          mime_type: "image/webp",
          alt_text: p.alt,
          file_size_bytes: webp.byteLength,
        })
        .select("id"),
    );

    const product = must(
      `products ${p.slug}`,
      await supabase
        .from("products")
        .insert({
          store_id: storeId,
          slug: p.slug,
          name: p.name,
          sku: p.sku,
          short_description: p.shortDescription,
          description: p.description,
          price_cents: p.priceCents,
          is_available: true,
          is_featured: p.isFeatured,
          sort_order: p.sortOrder,
          is_live: true,
          publication_status: "PUBLISHED",
          attributes: {
            legacy_id: p.id,
            legacy_category: p.categorySlug,
            peso: p.peso,
            porciones: p.porciones,
          },
        })
        .select("id")
        .single<{ id: string }>(),
    );

    must(
      `media_placements ${p.slug}`,
      await supabase
        .from("media_placements")
        .insert({
          store_id: storeId,
          slot_code: "PRODUCT_PRIMARY",
          product_id: product.id,
          media_id: mediaId,
          sort_order: 0,
          is_active: true,
          is_live: true,
          publication_status: "PUBLISHED",
        })
        .select("id"),
    );

    // Link flavor category + size/occasion category
    const flavorCatId = categoryIdMap.get(p.categorySlug);
    const sizeCatId = categoryIdMap.get(p.presentacionSlug);
    const catIds = Array.from(
      new Set([flavorCatId, sizeCatId].filter((id): id is string => Boolean(id))),
    );

    for (const catId of catIds) {
      must(
        `product_categories ${p.slug}`,
        await supabase
          .from("product_categories")
          .insert({
            store_id: storeId,
            product_id: product.id,
            category_id: catId,
          })
          .select("product_id"),
      );
    }

    created += 1;
    console.log(
      `  + ${p.slug} (${(webp.byteLength / 1024).toFixed(0)} KB) -> $${(
        p.priceCents / 100
      ).toFixed(0)} MXN`,
    );
  }

  console.log(`\nListo: ${created} creados, ${products.length - created} omitidos.`);
}

async function main(): Promise<void> {
  const envPath = path.join(ROOT, ".env.local");
  if (existsSync(envPath)) {
    process.loadEnvFile(envPath);
  }

  const products = loadProducts();
  console.log(`Se cargaron ${products.length} productos de Medovik Mérida.`);
  console.table(
    products.map((p) => ({
      n: p.sourceNumber,
      sku: p.sku,
      slug: p.slug,
      precio_mxn: `$${p.priceCents / 100} MXN`,
      sabor: p.categorySlug,
      tamano: p.presentacionSlug,
    })),
  );

  if (!APPLY) {
    console.log(
      `\nDry run: ${products.length} productos listos. Nada escrito. Usa --apply para migrar a Supabase.`,
    );
    return;
  }
  await apply(products);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
