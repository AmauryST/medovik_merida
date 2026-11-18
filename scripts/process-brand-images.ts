import path from "node:path";
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "source-images");
const ASSETS_DIR = path.join(ROOT, "public", "assets");
const GALERIA_DIR = path.join(ASSETS_DIR, "galeria");
const IMAGES_DIR = path.join(ROOT, "public", "images");

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
  menu2: path.join(
    SRC_DIR,
    "c4fa3cc1-52ac-441b-9d26-cb41273dac61-07c3c847-2f44-4646-880c-40fa4f856124.png",
  ),
};

async function main() {
  await mkdir(ASSETS_DIR, { recursive: true });
  await mkdir(GALERIA_DIR, { recursive: true });
  await mkdir(IMAGES_DIR, { recursive: true });

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

  // 2. Hero & Full Product Photos
  // Medovik Clásico con Higos Frescos (813x827)
  await sharp(FILES.clasicoHigos)
    .resize(1000, 1000, { fit: "cover", position: "centre" })
    .webp({ quality: 88 })
    .toFile(path.join(ASSETS_DIR, "hero.webp"));

  await sharp(FILES.clasicoHigos)
    .resize(1000, 1000, { fit: "cover", position: "centre" })
    .webp({ quality: 86 })
    .toFile(path.join(GALERIA_DIR, "clasico-higos.webp"));

  // Focused crop on the golden honey cake for Clásico Grande
  await sharp(FILES.clasicoHigos)
    .extract({ left: 25, top: 40, width: 680, height: 680 })
    .resize(1000, 1000, { fit: "cover" })
    .webp({ quality: 86 })
    .toFile(path.join(GALERIA_DIR, "clasico-grande.webp"));

  // Medovik Spartak (821x850)
  await sharp(FILES.spartak)
    .resize(1000, 1000, { fit: "cover", position: "centre" })
    .webp({ quality: 88 })
    .toFile(path.join(ASSETS_DIR, "hero-spartak.webp"));

  await sharp(FILES.spartak)
    .resize(1000, 1000, { fit: "cover", position: "centre" })
    .webp({ quality: 86 })
    .toFile(path.join(GALERIA_DIR, "spartak-grande.webp"));

  // Closer crop on Spartak cocoa layers, walnuts & prunes for Spartak Mediano
  await sharp(FILES.spartak)
    .extract({ left: 75, top: 90, width: 670, height: 670 })
    .resize(1000, 1000, { fit: "cover" })
    .webp({ quality: 86 })
    .toFile(path.join(GALERIA_DIR, "spartak-mediano.webp"));

  // 3. Three Signature Flavors Triptych (863x450)
  await sharp(FILES.triptych)
    .webp({ quality: 90 })
    .toFile(path.join(ASSETS_DIR, "triptico-sabores.webp"));

  // Panel 1 (Left): Clásico with honey jar, dipper & honeycomb (x: 0..286, y: 0..450)
  await sharp(FILES.triptych)
    .extract({ left: 0, top: 0, width: 286, height: 450 })
    .resize(800, 1000, { fit: "cover", position: "centre" })
    .webp({ quality: 88 })
    .toFile(path.join(ASSETS_DIR, "linea-clasico.webp"));

  await sharp(FILES.triptych)
    .extract({ left: 0, top: 105, width: 286, height: 345 })
    .resize(1000, 1000, { fit: "cover", position: "centre" })
    .webp({ quality: 88 })
    .toFile(path.join(GALERIA_DIR, "clasico-mediano.webp"));

  // Panel 2 (Center): Spartak with dark chocolate, walnuts & prunes (x: 288..574, y: 0..450)
  await sharp(FILES.triptych)
    .extract({ left: 288, top: 0, width: 286, height: 450 })
    .resize(800, 1000, { fit: "cover", position: "centre" })
    .webp({ quality: 88 })
    .toFile(path.join(ASSETS_DIR, "linea-spartak.webp"));

  await sharp(FILES.triptych)
    .extract({ left: 288, top: 105, width: 286, height: 345 })
    .resize(1000, 1000, { fit: "cover", position: "centre" })
    .webp({ quality: 88 })
    .toFile(path.join(GALERIA_DIR, "spartak-cacao.webp"));

  // Panel 3 (Right): Caramelo Salado & Nuez Pecana (x: 576..863, y: 0..450)
  await sharp(FILES.triptych)
    .extract({ left: 576, top: 0, width: 287, height: 450 })
    .resize(800, 1000, { fit: "cover", position: "centre" })
    .webp({ quality: 88 })
    .toFile(path.join(ASSETS_DIR, "linea-caramelo.webp"));

  await sharp(FILES.triptych)
    .extract({ left: 576, top: 100, width: 287, height: 350 })
    .resize(1000, 1000, { fit: "cover", position: "centre" })
    .webp({ quality: 88 })
    .toFile(path.join(GALERIA_DIR, "caramelo-salado-grande.webp"));

  await sharp(FILES.triptych)
    .extract({ left: 582, top: 120, width: 275, height: 310 })
    .resize(1000, 1000, { fit: "cover", position: "centre" })
    .webp({ quality: 88 })
    .toFile(path.join(GALERIA_DIR, "caramelo-salado-mediano.webp"));

  // Degustación 3 Sabores (wide showcase centered crop)
  await sharp(FILES.triptych)
    .extract({ left: 0, top: 95, width: 863, height: 355 })
    .resize(1000, 1000, {
      fit: "contain",
      background: { r: 245, g: 238, b: 226, alpha: 1 },
    })
    .webp({ quality: 88 })
    .toFile(path.join(GALERIA_DIR, "degustacion-tres-sabores.webp"));

  // 4. Story / Legend Graphic (847x853)
  await sharp(FILES.legend)
    .webp({ quality: 88 })
    .toFile(path.join(ASSETS_DIR, "leyenda-medovik.webp"));

  // Close-up of the honey-layered slice on porcelain plate (bottom of legend graphic)
  await sharp(FILES.legend)
    .extract({ left: 95, top: 380, width: 670, height: 460 })
    .resize(1000, 1000, { fit: "cover", position: "centre" })
    .webp({ quality: 88 })
    .toFile(path.join(GALERIA_DIR, "clasico-porcion.webp"));

  // 5. Chef & FAQ Graphic (852x851)
  await sharp(FILES.chefFaq)
    .webp({ quality: 88 })
    .toFile(path.join(ASSETS_DIR, "chef-faq.webp"));

  // Portrait of the pastry chef in Medovik Mérida chef jacket
  await sharp(FILES.chefFaq)
    .extract({ left: 0, top: 155, width: 350, height: 515 })
    .resize(700, 1030, { fit: "cover", position: "top" })
    .webp({ quality: 88 })
    .toFile(path.join(ASSETS_DIR, "chef-portrait.webp"));

  // 6. Official Menu Graphic (638x851 / 673x842)
  await sharp(FILES.menu1)
    .webp({ quality: 90 })
    .toFile(path.join(ASSETS_DIR, "menu-oficial.webp"));

  // Slices from the menu graphic for Porción Caramelo Salado & Porción Spartak
  // Menu1 is 638x851:
  // Row 1 (Caramelo Salado): y ~ 205..395, left side has whole cake + slice (x: 18..270)
  await sharp(FILES.menu1)
    .extract({ left: 15, top: 205, width: 255, height: 195 })
    .resize(1000, 1000, { fit: "cover", position: "centre" })
    .webp({ quality: 88 })
    .toFile(path.join(GALERIA_DIR, "caramelo-salado-porcion.webp"));

  // Row 2 (Spartak): y ~ 405..590, right side has whole cake + slice (x: 375..625)
  await sharp(FILES.menu1)
    .extract({ left: 375, top: 400, width: 250, height: 195 })
    .resize(1000, 1000, { fit: "cover", position: "centre" })
    .webp({ quality: 88 })
    .toFile(path.join(GALERIA_DIR, "spartak-porcion.webp"));

  // Also copy all galeria images into public/images for the Supabase migration script
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
    await sharp(path.join(GALERIA_DIR, f))
      .webp({ quality: 86 })
      .toFile(path.join(IMAGES_DIR, f));
  }

  console.log("✅ All Medovik Mérida brand & product WebP images generated successfully.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
