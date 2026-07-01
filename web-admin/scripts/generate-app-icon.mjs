import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "../public/brand");
const SIZE = 1024;
const RADIUS = 230;

// Step 1: Extract Tc white symbol as clean mask from original 256px icon
const origPath = path.join(publicDir, "app-icons/app-icon-gradient-256.png");

const { data: src, info } = await sharp(origPath)
  .resize(SIZE, SIZE, { kernel: sharp.kernel.lanczos3 })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

// Build white-only mask: white pixels (R,G,B all > 200) → keep white + alpha
// Background pixels (blue/cyan) → fully transparent
const mask = Buffer.alloc(info.width * info.height * 4);
for (let i = 0; i < src.length; i += 4) {
  const r = src[i], g = src[i+1], b = src[i+2];
  // White Tc pixels: all channels bright and roughly equal
  const isWhite = r > 190 && g > 190 && b > 190;
  if (isWhite) {
    const alpha = Math.min(255, Math.round(((r + g + b) / 3) * 1.05));
    mask[i] = 255; mask[i+1] = 255; mask[i+2] = 255; mask[i+3] = alpha;
  } else {
    mask[i] = 0; mask[i+1] = 0; mask[i+2] = 0; mask[i+3] = 0;
  }
}

const tcSymbol = await sharp(mask, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .blur(0.4)
  .png()
  .toBuffer();

// Step 2: Option-1 blue gradient background with rounded corners
const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1A6FE8"/>
      <stop offset="55%" stop-color="#1255CC"/>
      <stop offset="100%" stop-color="#0D3FA6"/>
    </linearGradient>
    <linearGradient id="shine" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="white" stop-opacity="0.13"/>
      <stop offset="100%" stop-color="white" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="r"><rect width="${SIZE}" height="${SIZE}" rx="${RADIUS}"/></clipPath>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" rx="${RADIUS}" fill="url(#bg)"/>
  <rect width="${SIZE}" height="${SIZE/2}" rx="${RADIUS}" fill="url(#shine)" clip-path="url(#r)"/>
</svg>`;

// Step 3: Composite Tc on new background
const outPath = path.join(publicDir, "app-icons/trocare-app-icon-v2-1024.png");
await sharp(Buffer.from(bgSvg))
  .resize(SIZE, SIZE)
  .composite([{ input: tcSymbol, top: 0, left: 0 }])
  .png()
  .toFile(outPath);

// Also save 256px version for PWA manifest
const out256 = path.join(publicDir, "app-icons/trocare-app-icon-v2-256.png");
const composed1024 = await sharp(outPath).toBuffer();
await sharp(composed1024)
  .resize(256, 256, { kernel: sharp.kernel.lanczos3 })
  .png()
  .toFile(out256);

console.log("Done 1024px:", outPath);
console.log("Done 256px:", out256);
