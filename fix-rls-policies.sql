-- Fix RLS policies for tasks and lists tables
-- Run this in Supabase SQL Editor if you're getting 403/RLS errors

-- First, let's check what policies currently exist
-- You can run these queries to see current policies:
-- SELECT * FROM pg_policies WHERE tablename = 'tasks';
-- SELECT * FROM pg_policies WHERE tablename = 'lists';

-- Ensure the lists table has proper RLS policies
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;

-- Drop and recreate lists policies to ensure they work correctly
DROP POLICY IF EXISTS "Users can manage their own lists" ON public.lists;
CREATE POLICY "Users can manage their own lists" ON public.lists
    FOR ALL USING (auth.uid() = user_id);

-- Drop and recreate tasks policies to ensure they work correctly  
DROP POLICY IF EXISTS "Users can manage their own tasks" ON public.tasks;
CREATE POLICY "Users can manage their own tasks" ON public.tasks
    FOR ALL USING (auth.uid() = user_id);

-- Also create more specific policies for better performance
CREATE POLICY "Users can insert their own tasks" ON public.tasks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own tasks" ON public.tasks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks" ON public.tasks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks" ON public.tasks
    FOR DELETE USING (auth.uid() = user_id);

-- Ensure the lists table has specific policies too
CREATE POLICY "Users can insert their own lists" ON public.lists
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own lists" ON public.lists
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own lists" ON public.lists
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lists" ON public.lists
    FOR DELETE USING (auth.uid() = user_id);

-- Add user_id column to lists table if it doesn't exist
-- (This might already exist, but just in case)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name='lists' AND column_name='user_id') THEN
        ALTER TABLE public.lists ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_lists_user_id ON public.lists(user_id);
    END IF;
END $$;

-- Ensure that push_subscriptions table has proper RLS (from our previous migration)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Verify RLS policies exist for push_subscriptions
CREATE POLICY IF NOT EXISTS "Users can view their own push subscriptions" 
  ON public.push_subscriptions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own push subscriptions" 
  ON public.push_subscriptions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own push subscriptions" 
  ON public.push_subscriptions FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete their own push subscriptions" 
  ON public.push_subscriptions FOR DELETE 
  USING (auth.uid() = user_id);

-- Check that all necessary columns exist in tasks table
DO $$ 
BEGIN
    -- Add user_id to tasks if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name='tasks' AND column_name='user_id') THEN
        ALTER TABLE public.tasks ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
    END IF;
    
    -- Add list_id to tasks if missing (for organizing tasks into lists)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name='tasks' AND column_name='list_id') THEN
        ALTER TABLE public.tasks ADD COLUMN list_id BIGINT REFERENCES public.lists(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON public.tasks(list_id);
    END IF;
END $$;

-- Update any existing tasks/lists to have the current user's ID (if needed)
-- This is safe to run even if data is already correct
-- UPDATE public.tasks SET user_id = auth.uid() WHERE user_id IS NULL;
-- UPDATE public.lists SET user_id = auth.uid() WHERE user_id IS NULL;

-- Test that RLS policies are working by checking if we can select from tables
-- These should return data only for the authenticated user:
-- SELECT COUNT(*) FROM public.tasks;
-- SELECT COUNT(*) FROM public.lists;
-- SELECT COUNT(*) FROM public.push_subscriptions;
