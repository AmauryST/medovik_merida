import { BRAND } from "./brand";

/** Datos de contacto de Medovik Mérida (tomados del menú oficial e Instagram @medovik_merida). */
export const BAKERY = {
  name: BRAND.storeName,
  tagline: "Pastel Ruso de Miel · Repostería Artesanal",
  /** Número de WhatsApp en formato internacional México, SIN '+' ni espacios. */
  whatsappNumber: BRAND.whatsappNumber,
  whatsapp: BRAND.whatsapp,
  phone: BRAND.phone,
  phoneInternational: BRAND.phoneInternational,
  email: BRAND.email,
  city: BRAND.city,
  shortCity: BRAND.shortCity,
  address: "Mérida, Yucatán, México",
  instagramHandle: BRAND.instagramHandle,
  instagram: BRAND.instagram,
  facebook: BRAND.facebook,
} as const;

export interface MedovikSizeSpec {
  label: string;
  weight: string;
  servings: string;
  priceCents: number;
  priceDisplay: string;
}

export interface MedovikLineSpec {
  slug: "clasico" | "spartak" | "caramelo-salado";
  name: string;
  tagline: string;
  highlight: string;
  description: string;
  ingredients: string[];
  image: string;
  sizes: {
    porcion: MedovikSizeSpec;
    mediano: MedovikSizeSpec;
    grande: MedovikSizeSpec;
  };
}

export const MEDOVIK_MENU: MedovikLineSpec[] = [
  {
    slug: "clasico",
    name: "Medovik Clásico",
    tagline: "Receta Imperial Rusa",
    highlight: "8 a 10 capas de miel natural con crema tradicional suave.",
    description:
      "Finas capas de galleta de miel horneadas artesanalmente una por una, intercaladas con una suave crema tradicional de vainilla y crema ácida que funde cada capa tras su reposo en frío.",
    ingredients: ["Miel natural", "Crema suave", "Mantequilla", "Vainilla"],
    image: "/images/producto-01.webp",
    sizes: {
      porcion: {
        label: "Rebanada (~180 g)",
        weight: "~180 g",
        servings: "1 porción generosa",
        priceCents: 10000,
        priceDisplay: "$100 MXN",
      },
      mediano: {
        label: "Pastel Mediano (~1,225 kg)",
        weight: "~1,225 kg",
        servings: "8 a 10 porciones",
        priceCents: 50000,
        priceDisplay: "$500 MXN",
      },
      grande: {
        label: "Pastel Grande (~2,45 kg)",
        weight: "~2,45 kg",
        servings: "16 a 20 porciones",
        priceCents: 100000,
        priceDisplay: "$1,000 MXN",
      },
    },
  },
  {
    slug: "spartak",
    name: "Medovik Spartak",
    tagline: "Miel, Cacao, Ciruela & Nuez",
    highlight: "Cacao real, ciruela pasa seleccionada y nuez tostada crujiente.",
    description:
      "Capas de miel y cacao natural puro con crema suave, trozos de ciruela pasa seleccionada y nuez tostada crujiente para un contraste profundo y elegante.",
    ingredients: ["Miel & Cacao", "Ciruela pasa", "Nuez tostada", "Crema suave"],
    image: "/images/producto-02.webp",
    sizes: {
      porcion: {
        label: "Rebanada (~180 g)",
        weight: "~180 g",
        servings: "1 porción generosa",
        priceCents: 10000,
        priceDisplay: "$100 MXN",
      },
      mediano: {
        label: "Pastel Mediano (~1,225 kg)",
        weight: "~1,225 kg",
        servings: "8 a 10 porciones",
        priceCents: 60000,
        priceDisplay: "$600 MXN",
      },
      grande: {
        label: "Pastel Grande (~2,45 kg)",
        weight: "~2,45 kg",
        servings: "16 a 20 porciones",
        priceCents: 120000,
        priceDisplay: "$1,200 MXN",
      },
    },
  },
  {
    slug: "caramelo-salado",
    name: "Medovik Caramelo Salado",
    tagline: "Caramelo Artesanal & Pecana",
    highlight: "Caramelo salado cocinado en casa y nuez pecana tostada.",
    description:
      "Capas de miel rellenas de crema batida con caramelo salado cocinado en cazo de cobre, mantequilla real y nuez pecana tostada.",
    ingredients: ["Caramelo salado", "Nuez pecana", "Miel natural", "Crema batida"],
    image: "/images/producto-03.webp",
    sizes: {
      porcion: {
        label: "Rebanada (~180 g)",
        weight: "~180 g",
        servings: "1 porción generosa",
        priceCents: 10000,
        priceDisplay: "$100 MXN",
      },
      mediano: {
        label: "Pastel Mediano (~1,225 kg)",
        weight: "~1,225 kg",
        servings: "8 a 10 porciones",
        priceCents: 60000,
        priceDisplay: "$600 MXN",
      },
      grande: {
        label: "Pastel Grande (~2,45 kg)",
        weight: "~2,45 kg",
        servings: "16 a 20 porciones",
        priceCents: 120000,
        priceDisplay: "$1,200 MXN",
      },
    },
  },
];

/** Categorías principales de sabores de Medovik Mérida. */
export const CATEGORIES = [
  { id: "todos", label: "Todos" },
  { id: "clasico", label: "Medovik Clásico" },
  { id: "spartak", label: "Spartak (Miel & Cacao)" },
  { id: "caramelo-salado", label: "Caramelo Salado & Pecana" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];
