import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wzolgvpxxfarqlbghdll.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6b2xndnB4eGZhcnFsYmdoZGxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5Mjk1NDYsImV4cCI6MjA2ODUwNTU0Nn0.ZesQSB2oXgLVexXYRabH0DhiZwBfgStGaoiSKaiMX6E';

export const supabase = createClient(supabaseUrl, supabaseKey);
