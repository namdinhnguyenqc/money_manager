import { createClient } from '@supabase/supabase-js';
import { env } from './src/config/env.js';

async function test() {
  console.log("Connecting to Supabase...");
  const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  
  const start = Date.now();
  const { data, error } = await sb.from("users").select("id").limit(1);
  const end = Date.now();
  
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Success! Time taken:", end - start, "ms", data);
  }
}
test();
