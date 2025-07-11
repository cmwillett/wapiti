-- Quick RLS Fix for 403 Errors
-- Copy and paste this into Supabase SQL Editor

-- Enable RLS and create policies for lists table
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own lists" ON public.lists;
CREATE POLICY "Users can manage their own lists" ON public.lists
    FOR ALL USING (auth.uid() = user_id);

-- Enable RLS and create policies for tasks table  
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own tasks" ON public.tasks;
CREATE POLICY "Users can manage their own tasks" ON public.tasks
    FOR ALL USING (auth.uid() = user_id);

-- Ensure user_id columns exist (run this safely)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name='lists' AND column_name='user_id') THEN
        ALTER TABLE public.lists ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name='tasks' AND column_name='user_id') THEN
        ALTER TABLE public.tasks ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;
