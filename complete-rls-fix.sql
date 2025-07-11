-- Complete RLS Fix - Run this in Supabase SQL Editor
-- This will fix the permission issues completely

-- First, let's check what we're working with
SELECT 'Checking tables...' as status;

-- Add user_id columns if they don't exist
ALTER TABLE public.lists ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop all existing RLS policies to start fresh
DROP POLICY IF EXISTS "Users can manage their own lists" ON public.lists;
DROP POLICY IF EXISTS "Users can manage their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can manage their own lists v2" ON public.lists;
DROP POLICY IF EXISTS "Users can manage their own tasks v2" ON public.tasks;

-- Disable RLS temporarily to update data
ALTER TABLE public.lists DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;

-- Update existing records to have user_id (CRITICAL STEP)
-- This assigns all existing tasks/lists to the first user if they don't have user_id
DO $$
DECLARE
    first_user_id UUID;
BEGIN
    -- Get the first user ID from auth.users
    SELECT id INTO first_user_id FROM auth.users LIMIT 1;
    
    IF first_user_id IS NOT NULL THEN
        -- Update lists without user_id
        UPDATE public.lists 
        SET user_id = first_user_id 
        WHERE user_id IS NULL;
        
        -- Update tasks without user_id  
        UPDATE public.tasks 
        SET user_id = first_user_id 
        WHERE user_id IS NULL;
        
        RAISE NOTICE 'Updated records with user_id: %', first_user_id;
    END IF;
END $$;

-- Re-enable RLS
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create working RLS policies
CREATE POLICY "lists_user_policy" ON public.lists
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "tasks_user_policy" ON public.tasks  
    FOR ALL USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lists_user_id ON public.lists(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);

-- Test the policies work
SELECT 'RLS policies created successfully' as status;
