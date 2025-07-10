-- Update notification method constraint to include push_sms
-- Run this if you've already created the user_preferences table

-- Drop the existing constraint
ALTER TABLE public.user_preferences DROP CONSTRAINT IF EXISTS user_preferences_notification_method_check;

-- Add the new constraint with push_sms option
ALTER TABLE public.user_preferences ADD CONSTRAINT user_preferences_notification_method_check 
    CHECK (notification_method IN ('push', 'sms', 'email', 'push_sms'));

-- Verify the constraint was applied
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.user_preferences'::regclass 
AND conname = 'user_preferences_notification_method_check';
