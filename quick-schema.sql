-- Minimal schema to get list creation working
-- Run this in your Supabase SQL Editor

-- Create lists table
CREATE TABLE IF NOT EXISTS public.lists (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to manage their own lists
CREATE POLICY "Users can manage their own lists" ON public.lists
    FOR ALL USING (auth.uid() = user_id);

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

-- Create policy for tasks
CREATE POLICY "Users can manage their own tasks" ON public.tasks
    FOR ALL USING (auth.uid() = user_id);

-- Create user preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    notification_method TEXT DEFAULT 'push' CHECK (notification_method IN ('push', 'sms', 'email')),
    phone_number TEXT,
    email TEXT,
    push_subscription JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security for user preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Create policy for user preferences
CREATE POLICY "Users can manage their own preferences" ON public.user_preferences
    FOR ALL USING (auth.uid() = user_id);
