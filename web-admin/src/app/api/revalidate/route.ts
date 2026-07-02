import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

// Called by the backend right after any article create/update/delete/status
// change, so /tin-tuc pages reflect the change immediately instead of
// waiting out the ISR revalidate window (up to 5 minutes otherwise).
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-revalidate-secret");
  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { slug, categorySlug, authorSlug, tagSlug } = body as {
    slug?: string;
    categorySlug?: string;
    authorSlug?: string;
    tagSlug?: string;
  };

  const revalidated: string[] = [];

  revalidatePath("/tin-tuc");
  revalidated.push("/tin-tuc");

  if (slug) {
    revalidatePath(`/tin-tuc/${slug}`);
    revalidated.push(`/tin-tuc/${slug}`);
  }
  if (categorySlug) {
    revalidatePath(`/tin-tuc/danh-muc/${categorySlug}`);
    revalidated.push(`/tin-tuc/danh-muc/${categorySlug}`);
  }
  if (authorSlug) {
    revalidatePath(`/tin-tuc/tac-gia/${authorSlug}`);
    revalidated.push(`/tin-tuc/tac-gia/${authorSlug}`);
  }
  if (tagSlug) {
    revalidatePath(`/tin-tuc/tag/${tagSlug}`);
    revalidated.push(`/tin-tuc/tag/${tagSlug}`);
  }

  return NextResponse.json({ revalidated: true, paths: revalidated });
}
