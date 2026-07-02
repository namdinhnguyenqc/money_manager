import sharp from "sharp";
import { createWorker } from "tesseract.js";

// Free, self-hosted OCR (no external API/cost) for reading digital electricity/
// water meter displays from a photo. Accuracy is materially lower than a vision
// LLM on messy real-world photos (glare, tilt, analog dial meters) — callers
// must treat the result as a suggestion the owner confirms/edits, never as a
// trusted final value for billing.

let workerPromise: ReturnType<typeof createWorker> | null = null;

// Tesseract worker init (~1-2s, downloads/caches language data) is expensive —
// reuse a single worker across requests instead of spinning one up per image.
async function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker("eng").then(async (worker) => {
      await worker.setParameters({
        tessedit_char_whitelist: "0123456789.",
        tessedit_pageseg_mode: "7" as any, // PSM_SINGLE_LINE — meter displays are one line of digits
      });
      return worker;
    });
  }
  return workerPromise;
}

// Crude but effective preprocessing for 7-segment digital displays: upscale
// (tesseract struggles with small text), grayscale, and push contrast so the
// lit segments separate cleanly from the background.
async function preprocess(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate() // respect EXIF orientation from phone cameras
    .resize({ width: 1200, withoutEnlargement: false })
    .grayscale()
    .normalize()
    .sharpen()
    .threshold(140)
    .png()
    .toBuffer();
}

// Meter readings are pure digit runs (occasionally with a decimal point on
// water meters) — take the longest digit sequence found rather than the raw
// OCR text, which often picks up stray marks as punctuation/noise.
function extractNumber(rawText: string): string | null {
  const matches = rawText.match(/\d[\d.\s]*\d|\d/g);
  if (!matches || matches.length === 0) return null;
  const cleaned = matches.map((m) => m.replace(/\s/g, "")).sort((a, b) => b.length - a.length);
  return cleaned[0] || null;
}

export async function readMeterNumber(
  imageBuffer: Buffer
): Promise<{ rawText: string; number: string | null; confidence: number }> {
  const worker = await getWorker();
  const processed = await preprocess(imageBuffer);
  const { data } = await worker.recognize(processed);
  const rawText = (data.text || "").trim();
  return {
    rawText,
    number: extractNumber(rawText),
    confidence: Math.round(data.confidence || 0),
  };
}
