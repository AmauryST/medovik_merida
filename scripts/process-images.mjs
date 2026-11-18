import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const SRC = 'D:/projects/dulce-delia/source-images';
const OUT = 'D:/projects/dulce-delia/public/assets';
const GAL = path.join(OUT, 'galeria');
fs.mkdirSync(GAL, { recursive: true });

const files = fs.readdirSync(SRC).filter((f) => /\.jpg$/i.test(f)).sort();
const F = (i) => path.join(SRC, files[i]);

/** Gentle, natural enhancement — lift exposure, a touch of contrast & color, mild sharpen. */
const enhance = (pipe) =>
  pipe.modulate({ brightness: 1.05, saturation: 1.1 }).linear(1.04, -4).sharpen({ sigma: 1 });

// [sourceIndex, outputSlug, category]
const GALLERY = [
  // Cakes de Nata (signature drip line)
  [34, 'nata-chocolate-1'], [42, 'nata-chocolate-2'], [44, 'nata-mocha'],
  [46, 'nata-vainilla-chips'], [47, 'nata-almendras'],
  // Bodas
  [7, 'boda-dorado'], [2, 'boda-oro-blanco'], [9, 'boda-perlas'],
  [37, 'boda-rosas-rojas'], [49, 'boda-rustico-fresas'],
  // Cumpleaños
  [28, 'cumple-dorado'], [35, 'cumple-girasoles'], [36, 'cumple-rosas-rojas'], [1, 'cumple-rosa-volados'],
  // Niños
  [16, 'nino-unicornio'], [17, 'nino-cars'], [18, 'nino-mickey'],
  [23, 'nino-spiderman'], [24, 'nino-futbol'], [50, 'nino-minnie'],
];

for (const [i, slug] of GALLERY) {
  await enhance(sharp(F(i)).resize(820, 1025, { fit: 'cover', position: 'attention' }))
    .webp({ quality: 82 })
    .toFile(path.join(GAL, `${slug}.webp`));
}

// Hero (portrait) — cascading roses wedding cake
await enhance(sharp(F(6)).resize(900, 1125, { fit: 'cover', position: 'attention' }))
  .webp({ quality: 85 })
  .toFile(path.join(OUT, 'hero.webp'));

// Brand logo (square)
await sharp(F(19)).resize(420, 420, { fit: 'cover', position: 'centre' })
  .webp({ quality: 92 })
  .toFile(path.join(OUT, 'logo.webp'));

console.log(`Processed ${GALLERY.length} gallery images + hero + logo.`);
