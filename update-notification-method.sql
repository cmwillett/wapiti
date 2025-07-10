-- Update user preferences to support hybrid notification method
-- Run this in your Supabase SQL Editor

-- Update the check constraint to include the new push_sms option
ALTER TABLE public.user_preferences 
DROP CONSTRAINT IF EXISTS user_preferences_notification_method_check;

ALTER TABLE public.user_preferences 
ADD CONSTRAINT user_preferences_notification_method_check 
CHECK (notification_method IN ('push', 'sms', 'push_sms', 'email'));

-- Set default to the recommended hybrid approach for new users
ALTER TABLE public.user_preferences 
ALTER COLUMN notification_method SET DEFAULT 'push_sms';
