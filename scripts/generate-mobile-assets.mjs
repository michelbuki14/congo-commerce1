// One-off generator: renders store-ready PNGs from public/brand/logo-icon.svg.
// Re-run with: node scripts/generate-mobile-assets.mjs
// Outputs land in assets/ (consumed by `@capacitor/assets generate`).
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const brand = path.join(root, 'public', 'brand', 'logo-icon.svg');
const outDir = path.join(root, 'assets');
const BG = '#07110D';

// Inner "C" artwork from logo-icon.svg (64x64 grid, no background rect),
// scaled to ~62% and centered on a 1024 canvas for adaptive-icon foregrounds.
const foregroundSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <g transform="translate(194.6 194.6) scale(9.92)">
    <path d="M33.03 43.47 A14 14 0 1 1 33.03 20.53" fill="none" stroke="#12A87A" stroke-width="7" stroke-linecap="round"/>
    <path d="M30.97 43.47 A14 14 0 1 0 30.97 20.53" fill="none" stroke="#EDF2EE" stroke-width="7" stroke-linecap="round"/>
    <circle cx="32" cy="32" r="3.6" fill="#19C48D"/>
  </g>
</svg>`;

await sharp(brand).resize(1024, 1024).png().toFile(path.join(outDir, 'icon.png'));

await sharp({
  create: { width: 1024, height: 1024, channels: 4, background: BG },
})
  .png()
  .toFile(path.join(outDir, 'icon-background.png'));

await sharp(Buffer.from(foregroundSvg)).png().toFile(path.join(outDir, 'icon-foreground.png'));

// Splash base: dark canvas with the full logo centered (logo occupies ~30%).
const logo = await sharp(brand).resize(820, 820).png().toBuffer();
await sharp({
  create: { width: 2732, height: 2732, channels: 4, background: BG },
})
  .composite([{ input: logo, gravity: 'center' }])
  .png()
  .toFile(path.join(outDir, 'splash.png'));

console.log('wrote assets/icon.png, icon-background.png, icon-foreground.png, splash.png');
