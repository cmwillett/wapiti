-- Clean Up Old Push Subscriptions - Keep Only Most Recent
-- Run this in Supabase SQL Editor

-- This will keep only the most recent push subscription per user
-- and delete all the old duplicates

WITH ranked_subscriptions AS (
  SELECT 
    id,
    user_id,
    endpoint,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
  FROM push_subscriptions
),
subscriptions_to_delete AS (
  SELECT id 
  FROM ranked_subscriptions 
  WHERE rn > 1  -- Keep only the most recent (rn = 1)
)
DELETE FROM push_subscriptions 
WHERE id IN (SELECT id FROM subscriptions_to_delete);

-- Show how many subscriptions remain
SELECT 
  user_id,
  COUNT(*) as remaining_subscriptions,
  MAX(created_at) as most_recent_registration
FROM push_subscriptions 
GROUP BY user_id;
