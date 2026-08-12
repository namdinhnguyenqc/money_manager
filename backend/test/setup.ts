// Unit tests mock Supabase at the route/service boundary. These inert values
// only let supabase-js construct a client while a test module is being loaded;
// they are never production credentials and no request is made to this URL.
process.env.SUPABASE_URL ||= "http://127.0.0.1:54321";
process.env.SUPABASE_ANON_KEY ||= "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY ||= "test-service-role-key";
