import { supabaseAdmin } from "./lib/supabase.js";

async function cleanupDupTransactions() {
  const dupIds = [
    "f09340c8-7d79-429d-8dff-bd38a373dff9",
    "e80af600-fa83-4a4e-979e-86dec66da06f"
  ];
  
  console.log("Cleaning up duplicate transactions...");
  const { error } = await supabaseAdmin
    .from("transactions")
    .delete()
    .in("id", dupIds);

  if (error) {
    console.error("Cleanup failed:", error.message);
  } else {
    console.log("Successfully deleted 2 duplicate transactions.");
  }
}

cleanupDupTransactions();
