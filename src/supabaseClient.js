import { createClient } from '@supabase/supabase-js';

// TODO: Replace with your own Supabase project URL and anon key
const supabaseUrl = 'https://uiczcbezwwfhvahfdxax.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpY3pjYmV6d3dmaHZhaGZkeGF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwODc0MDMsImV4cCI6MjA2NzY2MzQwM30.kz3eYFhmLAMgI1PKFkxzHqYgfMkj0env7-BYy_RQ4Rk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
