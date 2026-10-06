const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script.");
}

async function resetWallets() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/wallets?id=not.is.null`, {
    method: "PATCH",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ balance: 0 })
  });
  console.log(`Reset wallets to 0:`, res.status, await res.text());
}

async function run() {
  console.log("Starting DB wipe for wallets...");
  await resetWallets();
  console.log("Wipe completed successfully!");
}

run();
