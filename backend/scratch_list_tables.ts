import { supabaseAdmin } from './src/lib/supabase.js';

async function listTables() {
  // Get all tables in public schema
  const { data, error } = await supabaseAdmin.rpc('exec_sql', {
    query: `
      SELECT table_name, 
             (SELECT string_agg(column_name || ' ' || data_type || CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END, ', ' ORDER BY ordinal_position) 
              FROM information_schema.columns c 
              WHERE c.table_schema = 'public' AND c.table_name = t.table_name) as columns
      FROM information_schema.tables t
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `
  });
  
  if (error) {
    // Fallback: just list tables
    console.log("RPC not available, using direct query...");
    const { data: tables, error: err2 } = await supabaseAdmin
      .from('information_schema.tables' as any)
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE');
    
    if (err2) {
      // Final fallback: query each known table
      console.log("Listing known tables by probing...");
      const knownTables = [
        'users', 'user_profiles', 'social_accounts', 'refresh_tokens', 'login_logs',
        'boarding_houses', 'rooms', 'tenants', 'contracts', 'contract_services',
        'services', 'invoices', 'invoice_items', 'meter_readings',
        'wallets', 'transactions', 'categories', 'trading_items', 'trading_categories',
        'bank_config', 'system_settings',
        'rental_buildings', 'rental_rooms', 'rental_room_availability', 'rental_room_media',
        'rental_leads', 'rental_bookings', 'rental_conversations',
      ];
      
      for (const t of knownTables) {
        const { data: sample, error: tErr } = await supabaseAdmin.from(t).select('*').limit(0);
        if (!tErr) {
          console.log(`✅ ${t} — exists`);
        } else {
          console.log(`❌ ${t} — ${tErr.message}`);
        }
      }
    } else {
      console.log("Tables:", tables);
    }
  } else {
    console.log("Tables:", JSON.stringify(data, null, 2));
  }
}

listTables();
