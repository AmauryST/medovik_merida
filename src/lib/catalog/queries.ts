import "server-only";

import { cache } from "react";
import { BRAND } from "@/config/brand";
import { supabaseEnv } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";
import type {
  BillboardItem,
  BillboardPlacement,
  BillboardTargetType,
  CatalogProduct,
  Category,
  DeliveryZone,
  MediaBySlotMap,
  ProductFormatOption,
  StorePublic,
} from "@/types/catalog";

const STORE_COLUMNS =
  "id, slug, name, country_code, currency, whatsapp_number, enable_whatsapp_checkout, is_active";

const STORE_EXTENDED_COLUMNS = `${STORE_COLUMNS}, save_orders, show_delivery_zone, payment_methods, payment_provider, auto_generate_payment_link, card_surcharge_percent, theme_config`;

const PRODUCT_COLUMNS =
  "id, store_id, slug, name, sku, description, short_description, price_cents, compare_at_price_cents, is_featured, is_available, sort_order, primary_image_url, media_by_slot, categories, attributes";

const CATEGORY_COLUMNS =
  "id, name, slug, group_type, is_featured_filter, sort_order";

const ZONE_COLUMNS =
  "id, store_id, name, fee_cents, estimated_time_text, is_active, sort_order";

const BILLBOARD_COLUMNS =
  "id, store_id, media_id, kicker, title, subtitle, cta_label, target_type, target_value, placement, is_active, sort_order, media_assets(public_url, alt_text)";

const DEFAULT_STORE_ID = "00000000-0000-0000-0000-000000000999";

/* ------------------------------------------------------------------ */
/* 3 Productos Maestros de Medovik Mérida (3 Formatos c/u)            */
/* ------------------------------------------------------------------ */

interface MasterProductDefinition {
  id: string;
  slug: string;
  sku: string;
  name: string;
  subtitle: string;
  short_description: string;
  description: string;
  flavorSlug: string;
  flavorName: string;
  basePriceCents: number;
  primaryImage: string;
  galleryImages: string[];
  storyBadge: string;
  intensity: string;
  layersInfo: string;
  ingredients: string[];
  pairing: string;
  conservation: string;
  formats: ProductFormatOption[];
}

export const MASTER_MEDOVIK_PRODUCTS: MasterProductDefinition[] = [
  {
    id: "med-mer-prod-01",
    slug: "medovik-clasico",
    sku: "MED-MER-01",
    name: "Medovik Clásico",
    subtitle: "El sabor de siempre ♡ · Receta imperial rusa de miel natural",
    short_description:
      "8 a 10 finas capas de galleta horneadas con miel natural de abeja y mantequilla auténtica, ensambladas una por una con crema suave ligeramente ácida.",
    description:
      "La receta original que enamoró a la emperatriz Isabel en el siglo XVIII. Cada pastel se compone de finísimas capas de masa de miel caramelizada al horno una por una, intercaladas con nuestra crema artesanal suave y equilibrada que, tras horas de reposo en frío, se funde con las capas creando una textura aterciopelada única.",
    flavorSlug: "clasico",
    flavorName: "Medovik Clásico",
    basePriceCents: 50000,
    primaryImage: "/images/producto-01.webp",
    galleryImages: [
      "/images/producto-01.webp",
      "/images/producto-04.webp",
      "/assets/linea-clasico.webp",
      "/images/producto-09.webp",
    ],
    storyBadge: "Receta Imperial Original",
    intensity: "Dulzura equilibrada · Notas florales de miel tibia y crema fresca",
    layersInfo:
      "8 a 10 capas finas horneadas individualmente y cubiertas con miga dorada de miel",
    ingredients: [
      "Miel natural de abeja (100% pura, sin jarabes)",
      "Mantequilla auténtica de vaca",
      "Quesos y cremas naturales de alta calidad",
      "Huevos frescos y harina seleccionada",
      "Sin saborizantes, conservadores ni potenciadores artificiales",
    ],
    pairing:
      "Ideal con café americano de especialidad, té negro ruso (Earl Grey / Assam) o infusión de manzanilla.",
    conservation:
      "Mantener en refrigeración (2 °C a 6 °C). Consumir preferentemente dentro de los 5 días posteriores a su entrega.",
    formats: [
      {
        id: "clasico-rebanada",
        code: "rebanada",
        label: "Rebanada Individual (~180 g)",
        short_label: "Rebanada (~180 g)",
        weight: "~180 g",
        servings: "1 porción generosa",
        lead_time: "Sujeta a disponibilidad del día (consultar antes de hacer tu pedido)",
        price_cents: 10000,
        price_delta_cents: -40000,
        show_price: false,
        image: "/images/producto-09.webp",
      },
      {
        id: "clasico-mediano",
        code: "mediano",
        label: "Pastel Mediano (~1,225 kg)",
        short_label: "Mediano (~1.225 kg)",
        weight: "~1,225 kg",
        servings: "8 a 10 porciones",
        lead_time: "Haz tu pedido al menos 2 días antes · Se confirma con 50% de anticipo",
        price_cents: 50000,
        price_delta_cents: 0,
        show_price: false,
        image: "/images/producto-01.webp",
      },
      {
        id: "clasico-grande",
        code: "grande",
        label: "Pastel Grande (~2,45 kg)",
        short_label: "Grande (~2.45 kg)",
        weight: "~2,45 kg",
        servings: "16 a 20 porciones",
        lead_time: "Haz tu pedido al menos 2 días antes · Se confirma con 50% de anticipo",
        price_cents: 100000,
        price_delta_cents: 50000,
        show_price: false,
        image: "/images/producto-05.webp",
      },
    ],
  },
  {
    id: "med-mer-prod-02",
    slug: "medovik-spartak",
    sku: "MED-MER-02",
    name: "Medovik Spartak",
    subtitle: "Intenso y delicioso ♡ · Miel, cacao real, ciruela pasa y nuez",
    short_description:
      "Capas profundas de miel y cacao real intercaladas con crema sedosa, trozos de ciruela pasa seleccionada y nuez tostada.",
    description:
      "La versión de cacao profundo del Medovik tradicional. Sus finas capas combinan el perfume de la miel natural con cacao real de alta pureza, ensambladas una por una con crema suave, ciruelas pasas tiernas que aportan un acento frutal elegante y nueces seleccionadas ligeramente tostadas para un contraste crujiente inolvidable.",
    flavorSlug: "spartak",
    flavorName: "Medovik Spartak (Cacao, Ciruela & Nuez)",
    basePriceCents: 60000,
    primaryImage: "/images/producto-02.webp",
    galleryImages: [
      "/images/producto-02.webp",
      "/assets/linea-spartak.webp",
      "/images/producto-10.webp",
    ],
    storyBadge: "Especialidad de Cacao, Ciruela & Nuez",
    intensity: "Cacao profundo · Contraste frutal de ciruela pasa y nuez tostada",
    layersInfo:
      "8 a 10 capas oscuras de miel y cacao real con relleno de crema, ciruela pasa y nuez",
    ingredients: [
      "Miel natural de abeja y cacao real de alta pureza",
      "Ciruelas pasas seleccionadas y nueces enteras tostadas",
      "Mantequilla de verdad, quesos y cremas de alta calidad",
      "Huevos frescos y harina seleccionada",
      "Sin saborizantes artificiales ni conservadores",
    ],
    pairing:
      "Marida de forma extraordinaria con espresso doble, cappuccino, vino tinto joven o digestivos.",
    conservation:
      "Mantener en refrigeración (2 °C a 6 °C). Sacar del refrigerador 10 minutos antes de servir para apreciar todas las notas del cacao.",
    formats: [
      {
        id: "spartak-rebanada",
        code: "rebanada",
        label: "Rebanada Individual (~180 g)",
        short_label: "Rebanada (~180 g)",
        weight: "~180 g",
        servings: "1 porción generosa",
        lead_time: "Sujeta a disponibilidad del día (consultar antes de hacer tu pedido)",
        price_cents: 10000,
        price_delta_cents: -50000,
        show_price: false,
        image: "/images/producto-10.webp",
      },
      {
        id: "spartak-mediano",
        code: "mediano",
        label: "Pastel Mediano (~1,225 kg)",
        short_label: "Mediano (~1.225 kg)",
        weight: "~1,225 kg",
        servings: "8 a 10 porciones",
        lead_time: "Haz tu pedido al menos 2 días antes · Se confirma con 50% de anticipo",
        price_cents: 60000,
        price_delta_cents: 0,
        show_price: false,
        image: "/images/producto-02.webp",
      },
      {
        id: "spartak-grande",
        code: "grande",
        label: "Pastel Grande (~2,45 kg)",
        short_label: "Grande (~2.45 kg)",
        weight: "~2,45 kg",
        servings: "16 a 20 porciones",
        lead_time: "Haz tu pedido al menos 2 días antes · Se confirma con 50% de anticipo",
        price_cents: 120000,
        price_delta_cents: 60000,
        show_price: false,
        image: "/images/producto-06.webp",
      },
    ],
  },
  {
    id: "med-mer-prod-03",
    slug: "medovik-caramelo-salado",
    sku: "MED-MER-03",
    name: "Medovik Caramelo Salado & Nuez Pecana",
    subtitle: "Equilibrio perfecto ♡ · Miel, caramelo salado artesanal y pecana crujiente",
    short_description:
      "Capas doradas de miel natural con crema sedosa, caramelo salado cocinado en casa a fuego lento y tropiezos crujientes de nuez pecana.",
    description:
      "Una creación pensada para quienes buscan el balance exacto entre dulzura y carácter. Nuestras finas capas de miel se ensamblan con crema fresca, un hilo generoso de caramelo salado elaborado artesanalmente con mantequilla de verdad y un toque de sal de mar, más nuez pecana seleccionada y tostada que aporta textura en cada bocado.",
    flavorSlug: "caramelo-salado",
    flavorName: "Caramelo Salado & Nuez Pecana",
    basePriceCents: 60000,
    primaryImage: "/images/producto-03.webp",
    galleryImages: [
      "/images/producto-03.webp",
      "/assets/linea-caramelo.webp",
      "/images/producto-11.webp",
    ],
    storyBadge: "Equilibrio Dulce-Salado & Pecana",
    intensity:
      "Contraste seductor · Caramelo a la mantequilla, toque de sal de mar y pecana crujiente",
    layersInfo:
      "8 a 10 capas de miel natural con reducción artesanal de caramelo salado y nuez pecana",
    ingredients: [
      "Miel natural de abeja y caramelo salado hecho en casa",
      "Nuez pecana seleccionada y tostada al momento",
      "Mantequilla de verdad, quesos y cremas de alta calidad",
      "Toque sutil de sal de mar sin refinar",
      "Sin conservadores, saborizantes ni jarabes industriales",
    ],
    pairing:
      "Perfecto con cold brew, latte sin azúcar, té chai o como postre estelar en cenas especiales.",
    conservation:
      "Mantener en refrigeración (2 °C a 6 °C). Consumir dentro de los 5 días posteriores a su entrega.",
    formats: [
      {
        id: "caramelo-rebanada",
        code: "rebanada",
        label: "Rebanada Individual (~180 g)",
        short_label: "Rebanada (~180 g)",
        weight: "~180 g",
        servings: "1 porción generosa",
        lead_time: "Sujeta a disponibilidad del día (consultar antes de hacer tu pedido)",
        price_cents: 10000,
        price_delta_cents: -50000,
        show_price: false,
        image: "/images/producto-11.webp",
      },
      {
        id: "caramelo-mediano",
        code: "mediano",
        label: "Pastel Mediano (~1,225 kg)",
        short_label: "Mediano (~1.225 kg)",
        weight: "~1,225 kg",
        servings: "8 a 10 porciones",
        lead_time: "Haz tu pedido al menos 2 días antes · Se confirma con 50% de anticipo",
        price_cents: 60000,
        price_delta_cents: 0,
        show_price: false,
        image: "/images/producto-03.webp",
      },
      {
        id: "caramelo-grande",
        code: "grande",
        label: "Pastel Grande (~2,45 kg)",
        short_label: "Grande (~2.45 kg)",
        weight: "~2,45 kg",
        servings: "16 a 20 porciones",
        lead_time: "Haz tu pedido al menos 2 días antes · Se confirma con 50% de anticipo",
        price_cents: 120000,
        price_delta_cents: 60000,
        show_price: false,
        image: "/images/producto-07.webp",
      },
    ],
  },
];

function buildCatalogProductFromMaster(
  def: MasterProductDefinition,
  idx: number,
  storeId = DEFAULT_STORE_ID,
): CatalogProduct {
  const mediaBySlot: MediaBySlotMap = {
    PRODUCT_PRIMARY: [
      {
        placement_id: `${def.id}-primary`,
        media_id: `${def.id}-media-primary`,
        url: def.primaryImage,
        alt: def.name,
        label: null,
        caption: def.subtitle,
        price_delta_cents: 0,
      },
    ],
    PRODUCT_GALLERY: def.galleryImages.map((imgUrl, gIdx) => ({
      placement_id: `${def.id}-gallery-${gIdx + 1}`,
      media_id: `${def.id}-media-gallery-${gIdx + 1}`,
      url: imgUrl,
      alt: `${def.name} — Vista ${gIdx + 1}`,
      label: null,
      caption: null,
      price_delta_cents: 0,
    })),
    PRODUCT_PRESENTATION: def.formats.map((fmt) => ({
      placement_id: fmt.id,
      media_id: `${fmt.id}-media`,
      url: fmt.image ?? def.primaryImage,
      alt: `${def.name} — ${fmt.label}`,
      label: fmt.label,
      caption: `${fmt.servings} · ${fmt.lead_time}`,
      price_delta_cents: fmt.price_delta_cents,
    })),
  };

  return {
    id: def.id,
    store_id: storeId,
    slug: def.slug,
    name: def.name,
    sku: def.sku,
    description: def.description,
    short_description: def.short_description,
    price_cents: def.basePriceCents,
    compare_at_price_cents: null,
    is_featured: true,
    is_available: true,
    sort_order: idx + 1,
    primary_image_url: def.primaryImage,
    media_by_slot: mediaBySlot,
    categories: [
      {
        id: `cat-${def.flavorSlug}`,
        name: def.flavorName,
        slug: def.flavorSlug,
        group: "FLAVOR",
      },
    ],
    attributes: {
      subtitle: def.subtitle,
      story_badge: def.storyBadge,
      intensity: def.intensity,
      layers_info: def.layersInfo,
      ingredients: def.ingredients,
      pairing: def.pairing,
      conservation: def.conservation,
      show_price: false,
      peso: "~180 g · ~1,225 kg · ~2,45 kg",
      porciones: "Rebanada, Mediano (8-10) o Grande (16-20)",
      formats: def.formats,
    },
  };
}

const FALLBACK_STORE: StorePublic = {
  id: DEFAULT_STORE_ID,
  slug: BRAND.storeSlug,
  name: BRAND.storeName,
  country_code: BRAND.countryCode,
  currency: BRAND.currency,
  whatsapp_number: BRAND.whatsappNumber,
  enable_whatsapp_checkout: true,
  is_active: true,
  save_orders: false,
  show_delivery_zone: false,
  payment_methods: ["WHATSAPP_COORDINATION", "TRANSFER", "CASH"],
  payment_provider: "NONE",
  auto_generate_payment_link: false,
  card_surcharge_percent: 0,
  theme_config: {
    show_prices: false,
    checkout: {
      order_mode: "HYBRID",
      business_preset: "BAKERY_GIFT",
      shipping_fee_mode: "NONE",
      fixed_shipping_fee_cents: 0,
      default_extra_fees: [],
      allow_immediate_payment_without_shipping: false,
    },
  },
};

const FALLBACK_CATEGORIES: Category[] = [
  {
    id: "cat-clasico",
    name: "Medovik Clásico",
    slug: "clasico",
    group_type: "FLAVOR",
    is_featured_filter: true,
    sort_order: 1,
  },
  {
    id: "cat-spartak",
    name: "Medovik Spartak (Cacao, Ciruela & Nuez)",
    slug: "spartak",
    group_type: "FLAVOR",
    is_featured_filter: true,
    sort_order: 2,
  },
  {
    id: "cat-caramelo-salado",
    name: "Caramelo Salado & Nuez Pecana",
    slug: "caramelo-salado",
    group_type: "FLAVOR",
    is_featured_filter: true,
    sort_order: 3,
  },
];

export const getStore = cache(async (): Promise<StorePublic> => {
  if (!supabaseEnv.isConfigured) {
    return FALLBACK_STORE;
  }
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("stores")
      .select(STORE_EXTENDED_COLUMNS)
      .eq("slug", BRAND.storeSlug)
      .eq("is_active", true)
      .maybeSingle();

    if (!error && data) {
      const storeData = data as StorePublic;
      // Ensure TropiPay is never used for Mexico and default Demo starts with show_prices=false unless explicitly enabled
      const themeObj =
        storeData.theme_config && typeof storeData.theme_config === "object"
          ? { ...(storeData.theme_config as Record<string, unknown>) }
          : {};
      if (!("show_prices" in themeObj)) {
        themeObj.show_prices = false;
      }
      return {
        ...storeData,
        payment_provider:
          storeData.payment_provider === "TROPIPAY"
            ? "NONE"
            : (storeData.payment_provider ?? "NONE"),
        theme_config: themeObj,
      };
    }

    const base = await supabase
      .from("stores")
      .select(STORE_COLUMNS)
      .eq("slug", BRAND.storeSlug)
      .eq("is_active", true)
      .maybeSingle();

    if (base.data) {
      return {
        ...(base.data as StorePublic),
        payment_provider: "NONE",
        theme_config: { show_prices: false },
      };
    }
  } catch (err) {
    console.warn("[catalog.getStore] Usando configuración local Medovik Mérida:", err);
  }
  return FALLBACK_STORE;
});

export const getActiveStore = getStore;

/**
 * Returns the 3 canonical Medovik Mérida products, each with its 3 formats
 * (Rebanada ~180 g, Mediano ~1,225 kg, Grande ~2,45 kg) and deep sensory info.
 * If Supabase returns rows for `medovik-merida`, we map/Consolidate them onto
 * the 3 canonical products while preserving real database UUIDs when available.
 */
export const getCatalogProducts = cache(async (): Promise<CatalogProduct[]> => {
  const store = await getStore();
  let dbRows: CatalogProduct[] = [];

  if (supabaseEnv.isConfigured) {
    try {
      const supabase = createPublicClient();
      const { data } = await supabase
        .from("v_catalog_products")
        .select(PRODUCT_COLUMNS)
        .eq("store_id", store.id)
        .eq("is_available", true)
        .order("sort_order", { ascending: true });

      if (data && data.length > 0) {
        dbRows = data as CatalogProduct[];
      }
    } catch (err) {
      console.warn("[catalog.getCatalogProducts] Usando 3 productos maestros locales:", err);
    }
  }

  return MASTER_MEDOVIK_PRODUCTS.map((def, idx) => {
    const built = buildCatalogProductFromMaster(def, idx, store.id);
    // Match against Supabase row if present so DB UUIDs and custom uploaded primary images work seamlessly
    const matchingRow = dbRows.find(
      (r) =>
        r.slug === def.slug ||
        r.slug === `${def.flavorSlug}-mediano` ||
        r.sku === def.sku,
    );
    if (!matchingRow) {
      return built;
    }
    return {
      ...built,
      id: matchingRow.id,
      store_id: matchingRow.store_id,
      primary_image_url: matchingRow.primary_image_url || built.primary_image_url,
      attributes: {
        ...built.attributes,
        ...(matchingRow.attributes ?? {}),
        formats: def.formats,
        ingredients: def.ingredients,
        subtitle: def.subtitle,
        story_badge: def.storyBadge,
        intensity: def.intensity,
        layers_info: def.layersInfo,
        pairing: def.pairing,
        conservation: def.conservation,
      },
    };
  });
});

export const getFeaturedProducts = cache(async (): Promise<CatalogProduct[]> => {
  return getCatalogProducts();
});

export const getCategories = cache(async (): Promise<Category[]> => {
  return FALLBACK_CATEGORIES;
});

export const getDeliveryZones = cache(async (): Promise<DeliveryZone[]> => {
  const store = await getStore();
  if (!store.show_delivery_zone || !supabaseEnv.isConfigured) return [];

  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("delivery_zones")
      .select(ZONE_COLUMNS)
      .eq("store_id", store.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (!error && data) {
      return data as DeliveryZone[];
    }
  } catch (err) {
    console.warn("[catalog.getDeliveryZones] Error:", err);
  }
  return [];
});

const FALLBACK_BILLBOARD_ITEMS: BillboardItem[] = [
  {
    id: "00000000-0000-0000-0000-000000000101",
    store_id: DEFAULT_STORE_ID,
    media_id: null,
    image_url: "/assets/triptico-sabores.webp",
    image_alt: "Las 3 recetas artesanales de Medovik Mérida en 3 formatos",
    kicker: "PASTELERÍA ARTESANAL EN MÉRIDA · 3 RECETAS × 3 FORMATOS",
    title: "Clásico, Spartak y Caramelo Salado: elige Rebanada, Mediano o Grande",
    subtitle:
      "Finas capas de miel natural horneadas una por una y ensambladas con cremas suaves sin conservadores. Conforma tu pedido en línea y coordínalo por WhatsApp.",
    cta_label: "Explorar los 3 pasteles",
    target_type: "LINK",
    target_value: "#catalogo",
    placement: "BOTH",
    is_active: true,
    sort_order: 1,
  },
  {
    id: "00000000-0000-0000-0000-000000000102",
    store_id: DEFAULT_STORE_ID,
    media_id: null,
    image_url: "/images/producto-02.webp",
    image_alt: "Medovik Spartak - Miel, Cacao, Ciruela y Nuez",
    kicker: "ESPECIALIDAD DE CACAO REAL",
    title: "Medovik Spartak: miel, cacao, ciruela pasa y nuez tostada",
    subtitle:
      "Disponible en Rebanada individual (~180 g), Pastel Mediano (~1,225 kg) y Pastel Grande (~2,45 kg).",
    cta_label: "Ver ficha y formatos",
    target_type: "PRODUCT",
    target_value: "medovik-spartak",
    placement: "BOTH",
    is_active: true,
    sort_order: 2,
  },
  {
    id: "00000000-0000-0000-0000-000000000103",
    store_id: DEFAULT_STORE_ID,
    media_id: null,
    image_url: "/assets/como-pedir.webp",
    image_alt: "Tu Medovik con entrega a domicilio en Mérida",
    kicker: "ENTREGA A DOMICILIO EN MÉRIDA",
    title: "Tu Medovik será aún más delicioso si lo pides con anticipación ♡",
    subtitle:
      "Pasteles completos con mínimo 2 días de anticipación (rebanadas sujetas a disponibilidad). Confirmación con 50% de anticipo.",
    cta_label: "Ver los 5 pasos para pedir",
    target_type: "LINK",
    target_value: "#como-pedir",
    placement: "BOTH",
    is_active: true,
    sort_order: 3,
  },
];

export const getBillboardItems = cache(
  async (placement: "HOME" | "PEDIDOS" = "HOME"): Promise<BillboardItem[]> => {
    return FALLBACK_BILLBOARD_ITEMS.filter(
      (i) => i.placement === "BOTH" || i.placement === placement,
    );
  },
);

export interface HomeCatalogData {
  store: StorePublic;
  products: CatalogProduct[];
  categories: Category[];
  deliveryZones: DeliveryZone[];
  billboard: BillboardItem[];
}

export const getHomeCatalogData = cache(async (): Promise<HomeCatalogData> => {
  const [store, products, categories, deliveryZones, billboard] = await Promise.all([
    getStore(),
    getCatalogProducts(),
    getCategories(),
    getDeliveryZones(),
    getBillboardItems("HOME"),
  ]);

  return {
    store,
    products,
    categories,
    deliveryZones,
    billboard,
  };
});
