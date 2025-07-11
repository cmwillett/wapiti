-- Gentler RLS Fix (No DROP statements)
-- This version only creates policies if they don't exist

-- Enable RLS for lists table
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;

-- Create policy for lists (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'lists' AND policyname = 'Users can manage their own lists v2'
    ) THEN
        CREATE POLICY "Users can manage their own lists v2" ON public.lists
            FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Enable RLS for tasks table  
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create policy for tasks (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'tasks' AND policyname = 'Users can manage their own tasks v2'
    ) THEN
        CREATE POLICY "Users can manage their own tasks v2" ON public.tasks
            FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Ensure user_id columns exist (safe to run multiple times)
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
