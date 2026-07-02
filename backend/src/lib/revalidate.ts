import { env } from "../config/env.js";

// Tells the public site (web-admin) to drop its cached HTML for the given
// /tin-tuc paths right away, instead of waiting out the ISR revalidate
// window. Best-effort: never throws, never blocks the calling request.
export async function triggerRevalidate(paths: {
  slug?: string;
  categorySlug?: string;
  authorSlug?: string;
  tagSlug?: string;
}) {
  if (!env.REVALIDATE_SECRET) return;
  try {
    await fetch(`${env.SITE_URL}/api/revalidate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-revalidate-secret": env.REVALIDATE_SECRET,
      },
      body: JSON.stringify(paths),
    });
  } catch (err: any) {
    console.error("[revalidate] Failed to notify site:", err.message);
  }
}
