-- Additional tables for Wapiti reminder system
-- This adds only the missing tables (tasks and user_preferences)
-- Run this in your Supabase SQL Editor

-- Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
    id BIGSERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    completed BOOLEAN DEFAULT false,
    notes TEXT DEFAULT '',
    reminder_time TIMESTAMP WITH TIME ZONE,
    reminder_sent BOOLEAN DEFAULT false,
    list_id BIGINT REFERENCES public.lists(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security for tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create policy for tasks (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'tasks' 
        AND policyname = 'Users can manage their own tasks'
    ) THEN
        CREATE POLICY "Users can manage their own tasks" ON public.tasks
            FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create user preferences table (for notification settings)
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    notification_method TEXT DEFAULT 'push' CHECK (notification_method IN ('push', 'sms', 'email', 'push_sms')),
    phone_number TEXT,
    email TEXT,
    push_subscription JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security for user preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Create policy for user preferences (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_preferences' 
        AND policyname = 'Users can manage their own preferences'
    ) THEN
        CREATE POLICY "Users can manage their own preferences" ON public.user_preferences
            FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON public.tasks(list_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_reminder_time ON public.tasks(reminder_time) WHERE reminder_time IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_reminder_sent ON public.tasks(reminder_sent) WHERE reminder_sent = false;
CREATE INDEX IF NOT EXISTS idx_lists_user_id ON public.lists(user_id);

-- Optional: Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for user_preferences updated_at (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_user_preferences_updated_at'
    ) THEN
        CREATE TRIGGER update_user_preferences_updated_at 
            BEFORE UPDATE ON public.user_preferences 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
