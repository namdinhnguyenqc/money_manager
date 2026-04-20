import type { Context } from "hono";
import { z } from "zod";

export const parseJson = async <T extends z.ZodTypeAny>(
  c: Context,
  schema: T
): Promise<{ ok: true; data: z.infer<T> } | { ok: false; response: Response }> => {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return { ok: false, response: c.json({ error: "Invalid JSON body" }, 400) };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      response: c.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten(),
        },
        400
      ),
    };
  }

  return { ok: true, data: parsed.data };
};

export const toNumberId = (value: string): number | null => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
};
