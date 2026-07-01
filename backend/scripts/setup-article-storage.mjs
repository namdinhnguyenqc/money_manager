// One-off: create the public "article-images" Supabase Storage bucket.
// Run once after applying migration 030:  node scripts/setup-article-storage.mjs
// Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in backend/.env
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const BUCKET = "article-images";

const { data: buckets } = await supabase.storage.listBuckets();
if (buckets?.some((b) => b.name === BUCKET)) {
  console.log(`✓ Bucket "${BUCKET}" already exists.`);
  process.exit(0);
}

const { error } = await supabase.storage.createBucket(BUCKET, {
  public: true,
  fileSizeLimit: "5MB",
  allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
});

if (error) {
  console.error("Failed to create bucket:", error.message);
  process.exit(1);
}
console.log(`✓ Created public bucket "${BUCKET}".`);
