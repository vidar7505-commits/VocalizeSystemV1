import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tcyinufbeqrvnntmyydf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjeWludWZiZXFydm5udG15eWRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjQ0MzcsImV4cCI6MjA3NjIwMDQzN30.T9qq_sQ2zVNGBsBCR6z7OvNObZQ4CmhZS7REDeGahdk';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
