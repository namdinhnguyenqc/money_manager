const GEMINI_API_KEY = (process.env.EXPO_PUBLIC_GEMINI_API_KEY || '').trim();

const buildGeminiUrl = () =>
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${GEMINI_API_KEY}`;

const parseJsonArrayFromText = (text) => {
  if (!text) return null;
  const cleaned = text.replace(/```json|```/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

/**
 * Extract meter readings from multiple images.
 * @param {Array<{uri: string, base64?: string}>} images
 * @returns {Promise<Array<{value: number | null, type: string}>>}
 */
export const extractMeterReadings = async (images) => {
  if (!GEMINI_API_KEY) {
    throw new Error('EXPO_PUBLIC_GEMINI_API_KEY is not configured.');
  }

  if (!Array.isArray(images) || images.length === 0) {
    return [];
  }

  const missingBase64 = images.some((img) => !img?.base64);
  if (missingBase64) {
    throw new Error('Missing image base64 data for AI request.');
  }

  const parts = images.map((img) => ({
    inline_data: {
      mime_type: 'image/jpeg',
      data: img.base64,
    },
  }));

  parts.push({
    text: 'Review every image and extract CURRENT meter reading. Return ONLY JSON array: [{"value":1234,"type":"electricity"}]. If unreadable, value must be null.',
  });

  let result;
  try {
    const response = await fetch(buildGeminiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }] }),
    });
    result = await response.json();
  } catch (error) {
    console.error('AI request error:', error);
    throw new Error('Cannot connect to AI service.');
  }

  if (result?.error) {
    throw new Error(`AI Error: ${result.error.message || 'Unknown error'}`);
  }

  const textResult = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  const parsed = parseJsonArrayFromText(textResult);
  if (parsed) {
    return parsed;
  }

  console.log('Unexpected AI response:', JSON.stringify(result));
  throw new Error('AI did not return valid data from the image.');
};
