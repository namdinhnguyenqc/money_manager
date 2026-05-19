const SUPABASE_URL = "https://eikkywprsbszsiqeuujg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpa2t5d3Byc2JzenNpcWV1dWpnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzYyMjY4MiwiZXhwIjoyMDkzMTk4NjgyfQ.4WNOtfLcGcDbxEEIXSlV07oxplFx_XV6tQCEkl-awVE";

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
