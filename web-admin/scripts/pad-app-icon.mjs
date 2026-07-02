import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const brandDir = path.join(__dirname, "../public/brand/app-icons");
const appDir = path.join(__dirname, "../src/app");

// Source: the existing edge-to-edge T-C symbol (white bg, no padding).
const SRC = path.join(brandDir, "app-icon-white-1024.png");

// Safe-zone padding: keep the symbol inside ~66% of the canvas so Android's
// adaptive-icon mask and iOS's auto-rounding don't crop/oversize it.
const CANVAS = 1024;
const SYMBOL_SIZE = Math.round(CANVAS * 0.66);
const OFFSET = Math.round((CANVAS - SYMBOL_SIZE) / 2);

async function buildPadded() {
  const symbol = await sharp(SRC)
    .resize(SYMBOL_SIZE, SYMBOL_SIZE, { kernel: sharp.kernel.lanczos3 })
    .toBuffer();

  const canvas = sharp({
    create: {
      width: CANVAS,
      height: CANVAS,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  });

  return canvas
    .composite([{ input: symbol, top: OFFSET, left: OFFSET }])
    .png()
    .toBuffer();
}

const padded1024 = await buildPadded();

const sizes = [16, 32, 64, 120, 128, 152, 180, 256, 512, 1024];
for (const size of sizes) {
  const out = path.join(brandDir, `app-icon-white-${size}.png`);
  await sharp(padded1024).resize(size, size, { kernel: sharp.kernel.lanczos3 }).png().toFile(out);
  console.log("wrote", out);
}

// Next.js file-convention icons (favicon + apple-touch-icon)
await sharp(padded1024).resize(512, 512).png().toFile(path.join(appDir, "icon.png"));
await sharp(padded1024).resize(180, 180).png().toFile(path.join(appDir, "apple-icon.png"));
console.log("wrote", path.join(appDir, "icon.png"), path.join(appDir, "apple-icon.png"));
