-- Test script to check if tables exist and create them if they don't
-- You can run this in your Supabase SQL editor

-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('lists', 'tasks', 'user_preferences');

-- If the above query returns no results, you need to run the schema creation script
-- Here's a simplified version for quick testing:

-- Enable Row Level Security but create permissive policies for testing
CREATE TABLE IF NOT EXISTS public.lists (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;

-- Create a permissive policy for testing (you can make this more restrictive later)
DROP POLICY IF EXISTS "Users can manage their own lists" ON public.lists;
CREATE POLICY "Users can manage their own lists" ON public.lists
    FOR ALL USING (auth.uid() = user_id);

-- Test insert to verify it works
-- You can uncomment this line and replace 'your-user-id' with an actual user ID from auth.users
-- INSERT INTO public.lists (name, user_id) VALUES ('Test List', 'your-user-id');
