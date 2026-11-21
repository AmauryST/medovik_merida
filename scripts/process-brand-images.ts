import path from "node:path";
import { mkdir, copyFile } from "node:fs/promises";
import sharp from "sharp";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "source-images");
const CLEAN_SRC_DIR = path.join(SRC_DIR, "clean-products");
const ASSETS_DIR = path.join(ROOT, "public", "assets");
const GALERIA_DIR = path.join(ASSETS_DIR, "galeria");
const IMAGES_DIR = path.join(ROOT, "public", "images");
const CLEAN_PNG_DIR = path.join(IMAGES_DIR, "clean");

const FILES = {
  logo: path.join(
    SRC_DIR,
    "c4fa3cc1-52ac-441b-9d26-cb41273dac61-39ff5e32-b951-4ec9-b841-542567137abb.png",
  ),
  triptych: path.join(
    SRC_DIR,
    "c4fa3cc1-52ac-441b-9d26-cb41273dac61-0952c406-881f-4a4b-9e18-68a8096e5b79.png",
  ),
  spartak: path.join(
    SRC_DIR,
    "c4fa3cc1-52ac-441b-9d26-cb41273dac61-01ec52cf-498b-4a03-a55b-026d448c626e.png",
  ),
  clasicoHigos: path.join(
    SRC_DIR,
    "c4fa3cc1-52ac-441b-9d26-cb41273dac61-b39dd75c-c405-411b-85d3-913c84e3c933.png",
  ),
  legend: path.join(
    SRC_DIR,
    "c4fa3cc1-52ac-441b-9d26-cb41273dac61-8d6f1d19-7bba-48c9-825a-7ca29c61348d.png",
  ),
  chefFaq: path.join(
    SRC_DIR,
    "c4fa3cc1-52ac-441b-9d26-cb41273dac61-917606e6-2fc5-4b53-beff-2c72ea846d02.png",
  ),
  menu1: path.join(
    SRC_DIR,
    "c4fa3cc1-52ac-441b-9d26-cb41273dac61-8ca762cc-daaa-4390-a011-cea9e24e32c6.png",
  ),
  menu3x3: path.join(SRC_DIR, "menu-3x3-clean-source.png"),
};

// High-resolution text-free studio product photos derived from menu-3x3-clean-source.png
const CLEAN_PRODUCT_SOURCES: Record<string, string> = {
  "caramelo-salado-grande": path.join(CLEAN_SRC_DIR, "caramelo-salado-grande.jpg"),
  "caramelo-salado-mediano": path.join(CLEAN_SRC_DIR, "caramelo-salado-mediano.jpg"),
  "caramelo-salado-porcion": path.join(CLEAN_SRC_DIR, "caramelo-salado-porcion.jpg"),
  "spartak-grande": path.join(CLEAN_SRC_DIR, "spartak-grande.jpg"),
  "spartak-mediano": path.join(CLEAN_SRC_DIR, "spartak-mediano.jpg"),
  "spartak-porcion": path.join(CLEAN_SRC_DIR, "spartak-porcion.jpg"),
  "clasico-grande": path.join(CLEAN_SRC_DIR, "clasico-grande.jpg"),
  "clasico-mediano": path.join(CLEAN_SRC_DIR, "clasico-mediano.jpg"),
  "clasico-porcion": path.join(CLEAN_SRC_DIR, "clasico-porcion.jpg"),
};

async function main() {
  await mkdir(ASSETS_DIR, { recursive: true });
  await mkdir(GALERIA_DIR, { recursive: true });
  await mkdir(IMAGES_DIR, { recursive: true });
  await mkdir(CLEAN_PNG_DIR, { recursive: true });

  // 1. Official Logo (856x850)
  await sharp(FILES.logo)
    .resize(600, 600, { fit: "cover" })
    .webp({ quality: 90 })
    .toFile(path.join(ASSETS_DIR, "logo.webp"));

  // Tighter emblem crop for navbar/avatar
  await sharp(FILES.logo)
    .extract({ left: 90, top: 55, width: 676, height: 676 })
    .resize(400, 400, { fit: "cover" })
    .webp({ quality: 90 })
    .toFile(path.join(ASSETS_DIR, "logo-emblem.webp"));

  // 2. Hero & Full Product Photos (Text-Free)
  // Medovik Clásico con Higos Frescos (813x827 - already text-free)
  await sharp(FILES.clasicoHigos)
    .resize(1000, 1000, { fit: "cover", position: "centre" })
    .webp({ quality: 88 })
    .toFile(path.join(ASSETS_DIR, "hero.webp"));

  await sharp(FILES.clasicoHigos)
    .resize(1000, 1000, { fit: "cover", position: "centre" })
    .webp({ quality: 88 })
    .toFile(path.join(GALERIA_DIR, "clasico-higos.webp"));

  // Medovik Spartak Hero (821x850 - already text-free)
  await sharp(FILES.spartak)
    .resize(1000, 1000, { fit: "cover", position: "centre" })
    .webp({ quality: 88 })
    .toFile(path.join(ASSETS_DIR, "hero-spartak.webp"));

  // Spartak Cacao close-up (text-free crop from Spartak hero)
  await sharp(FILES.spartak)
    .extract({ left: 75, top: 90, width: 670, height: 670 })
    .resize(1000, 1000, { fit: "cover" })
    .webp({ quality: 88 })
    .toFile(path.join(GALERIA_DIR, "spartak-cacao.webp"));

  // 3. Process the 9 core 3x3 Product Images (3 flavors x 3 formats) — 100% Text-Free
  for (const [slug, srcPath] of Object.entries(CLEAN_PRODUCT_SOURCES)) {
    // Save 1000x1000 WebP in public/assets/galeria/
    await sharp(srcPath)
      .resize(1000, 1000, { fit: "cover", position: "centre" })
      .webp({ quality: 90 })
      .toFile(path.join(GALERIA_DIR, `${slug}.webp`));

    // Save 1000x1000 clean PNG in public/images/clean/
    await sharp(srcPath)
      .resize(1000, 1000, { fit: "cover", position: "centre" })
      .png({ compressionLevel: 8 })
      .toFile(path.join(CLEAN_PNG_DIR, `${slug}.png`));
  }

  // 4. Text-Free Signature Line Cards (linea-clasico, linea-spartak, linea-caramelo)
  await sharp(CLEAN_PRODUCT_SOURCES["clasico-grande"])
    .resize(800, 1000, { fit: "cover", position: "centre" })
    .webp({ quality: 90 })
    .toFile(path.join(ASSETS_DIR, "linea-clasico.webp"));

  await sharp(CLEAN_PRODUCT_SOURCES["spartak-grande"])
    .resize(800, 1000, { fit: "cover", position: "centre" })
    .webp({ quality: 90 })
    .toFile(path.join(ASSETS_DIR, "linea-spartak.webp"));

  await sharp(CLEAN_PRODUCT_SOURCES["caramelo-salado-grande"])
    .resize(800, 1000, { fit: "cover", position: "centre" })
    .webp({ quality: 90 })
    .toFile(path.join(ASSETS_DIR, "linea-caramelo.webp"));

  // 5. Clean Text-Free 3-Flavor Triptych & Degustación 3 Sabores
  // Compose a clean 3-panel showcase from the 3 clean Grande hero cakes (zero text)
  const panelW = 390;
  const panelH = 650;
  const gap = 15;
  const pad = 30;
  const canvasW = pad * 2 + panelW * 3 + gap * 2; // 1260
  const canvasH = pad * 2 + panelH; // 710

  const [pClasico, pSpartak, pCaramelo] = await Promise.all([
    sharp(CLEAN_PRODUCT_SOURCES["clasico-grande"])
      .resize(panelW, panelH, { fit: "cover", position: "centre" })
      .toBuffer(),
    sharp(CLEAN_PRODUCT_SOURCES["spartak-grande"])
      .resize(panelW, panelH, { fit: "cover", position: "centre" })
      .toBuffer(),
    sharp(CLEAN_PRODUCT_SOURCES["caramelo-salado-grande"])
      .resize(panelW, panelH, { fit: "cover", position: "centre" })
      .toBuffer(),
  ]);

  const cleanTriptychBuffer = await sharp({
    create: {
      width: canvasW,
      height: canvasH,
      channels: 4,
      background: { r: 251, g: 247, b: 239, alpha: 1 }, // #FBF7EF
    },
  })
    .composite([
      { input: pCaramelo, left: pad, top: pad },
      { input: pSpartak, left: pad + panelW + gap, top: pad },
      { input: pClasico, left: pad + (panelW + gap) * 2, top: pad },
    ])
    .png()
    .toBuffer();

  await sharp(cleanTriptychBuffer)
    .webp({ quality: 90 })
    .toFile(path.join(ASSETS_DIR, "triptico-sabores.webp"));

  await sharp(cleanTriptychBuffer)
    .resize(1000, 1000, {
      fit: "contain",
      background: { r: 251, g: 247, b: 239, alpha: 1 },
    })
    .webp({ quality: 90 })
    .toFile(path.join(GALERIA_DIR, "degustacion-tres-sabores.webp"));

  // 6. Story / Legend & Chef Graphics
  await sharp(FILES.legend)
    .webp({ quality: 88 })
    .toFile(path.join(ASSETS_DIR, "leyenda-medovik.webp"));

  await sharp(FILES.chefFaq)
    .webp({ quality: 88 })
    .toFile(path.join(ASSETS_DIR, "chef-faq.webp"));

  await sharp(FILES.chefFaq)
    .extract({ left: 0, top: 155, width: 350, height: 515 })
    .resize(700, 1030, { fit: "cover", position: "top" })
    .webp({ quality: 88 })
    .toFile(path.join(ASSETS_DIR, "chef-portrait.webp"));

  // 7. Official Menu Graphic (updated to the new 3x3 menu source)
  await sharp(FILES.menu3x3)
    .webp({ quality: 92 })
    .toFile(path.join(ASSETS_DIR, "menu-oficial.webp"));

  // 8. Mirror all 12 galeria WebP images into public/images/
  const galeriaFiles = [
    "caramelo-salado-grande.webp",
    "caramelo-salado-mediano.webp",
    "caramelo-salado-porcion.webp",
    "spartak-grande.webp",
    "spartak-mediano.webp",
    "spartak-porcion.webp",
    "spartak-cacao.webp",
    "clasico-grande.webp",
    "clasico-mediano.webp",
    "clasico-porcion.webp",
    "clasico-higos.webp",
    "degustacion-tres-sabores.webp",
  ];

  for (const f of galeriaFiles) {
    await copyFile(path.join(GALERIA_DIR, f), path.join(IMAGES_DIR, f));
  }

  console.log("✅ All Medovik Mérida clean text-free product WebP & PNG images generated successfully.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
