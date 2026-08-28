
// Free, self-hosted OCR (no external API/cost) for reading digital electricity/
// water meter displays from a photo. Accuracy is materially lower than a vision
// LLM on messy real-world photos (glare, tilt, analog dial meters) — callers
// must treat the result as a suggestion the owner confirms/edits, never as a
// trusted final value for billing.

let workerPromise: Promise<any> | null = null;
let recognitionQueue: Promise<unknown> = Promise.resolve();

// Tesseract worker init (~1-2s, downloads/caches language data) is expensive —
// reuse a single worker across requests instead of spinning one up per image.
async function getWorker() {
  if (!workerPromise) {
    // Imported here rather than at module scope: this service is reachable from
    // routes that never OCR anything, and on a cold start the unused import was
    // still parsed.
    const { createWorker } = await import("tesseract.js");
    workerPromise = createWorker("eng").then(async (worker: any) => {
      await worker.setParameters({
        tessedit_char_whitelist: "0123456789.",
        tessedit_pageseg_mode: "7" as any, // PSM_SINGLE_LINE — meter displays are one line of digits
      });
      return worker;
    });
  }
  return workerPromise;
}

// One fixed threshold can erase otherwise clear digits depending on lighting,
// display colour and glare. Generate complementary variants and keep the best
// OCR candidate instead of assuming every meter photo has the same contrast.
async function preprocessVariants(buffer: Buffer): Promise<Buffer[]> {
  const { default: sharp } = await import("sharp");
  const base = sharp(buffer)
    .rotate() // respect EXIF orientation from phone cameras
    .resize({ width: 1200, withoutEnlargement: false })
    .grayscale()
    .normalize()
    .sharpen();
  return Promise.all([
    base.clone().png().toBuffer(),
    base.clone().threshold(105).png().toBuffer(),
    base.clone().threshold(140).png().toBuffer(),
    base.clone().threshold(175).png().toBuffer(),
  ]);
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
  const run = async () => {
    const worker = await getWorker();
    const variants = await preprocessVariants(imageBuffer);
    const candidates: Array<{ rawText: string; number: string | null; confidence: number }> = [];
    for (const processed of variants) {
      const { data } = await worker.recognize(processed);
      const rawText = (data.text || "").trim();
      candidates.push({
        rawText,
        number: extractNumber(rawText),
        confidence: Math.round(data.confidence || 0),
      });
    }
    return candidates.sort((a, b) => {
      if (Boolean(a.number) !== Boolean(b.number)) return a.number ? -1 : 1;
      const aDigits = (a.number || "").replace(/\D/g, "").length;
      const bDigits = (b.number || "").replace(/\D/g, "").length;
      const aScore = a.confidence + Math.min(aDigits, 8) * 3;
      const bScore = b.confidence + Math.min(bDigits, 8) * 3;
      return bScore - aScore;
    })[0] || { rawText: "", number: null, confidence: 0 };
  };
  // A Tesseract worker is stateful. Serialize recognitions so simultaneous
  // rooms cannot corrupt each other's results; keep the queue alive on errors.
  const result = recognitionQueue.then(run, run);
  recognitionQueue = result.then(() => undefined, () => undefined);
  return result;
}
