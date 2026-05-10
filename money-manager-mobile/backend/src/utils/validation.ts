import type { Context } from "hono";
import { z } from "zod";

// ─────────────────────────────────────────────────────────
// JSON body parsing + Zod validation
// ─────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────
// ID utilities — UUID-first, end-to-end string IDs
// ─────────────────────────────────────────────────────────

/**
 * Extract a non-empty string ID from a route parameter.
 * Returns the trimmed string or null if empty/missing.
 * 
 * This replaces the old `toNumberId()` which tried to convert
 * string IDs to numbers — causing failures with UUID strings.
 */
export const toId = (value: string): string | null => {
  if (!value || !value.trim()) return null;
  return value.trim();
};

/** Shared Zod schema for UUID string IDs */
export const UuidSchema = z.string().min(1, "ID is required");

/** Zod schema for route params with :id */
export const IdParamSchema = z.object({
  id: UuidSchema,
});

/**
 * @deprecated Use `toId()` instead. This function is kept temporarily
 * for backward compatibility during the UUID migration.
 */
export const toNumberId = toId;
