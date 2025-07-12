#!/bin/bash

echo "🧹 Starting major cleanup..."

# Remove all test JS files from root directory
echo "Removing test JS files from root..."
rm -f ./check-devices.js
rm -f ./check-reminders-script.js
rm -f ./cleaned-edge-function.js
rm -f ./console-test-script.js
rm -f ./corrected-test-script.js
rm -f ./create-fresh-reminder-script.js
rm -f ./debug-push.js
rm -f ./desktop-cleanup.js
rm -f ./fcm-v1-edge-function.js
rm -f ./fixed-console-test.js
rm -f ./generate-vapid-keys.js
rm -f ./hybrid-edge-function-sendFCMNotification.js
rm -f ./reset-push.js
rm -f ./reset-reminder-script.js
rm -f ./test-both-devices.js
rm -f ./test-edge-function-direct.js
rm -f ./test-notification-visibility.js
rm -f ./test-timing-fix.js
rm -f ./test-updated-system.js
rm -f ./updated-edge-function-sendFCMNotification.js
rm -f ./verify-fcm-v1-env.js

# Remove test SQL files from root directory
echo "Removing test SQL files from root..."
rm -f ./additional-tables.sql
rm -f ./cleanup-old-subscriptions.sql
rm -f ./complete-database-schema.sql
rm -f ./complete-rls-fix.sql
rm -f ./fix-rls-policies.sql
rm -f ./gentle-rls-fix.sql
rm -f ./multi-device-push-schema.sql
rm -f ./quick-rls-fix.sql
rm -f ./quick-schema.sql
rm -f ./safe-rls-fix.sql
rm -f ./supabase-schema.sql
rm -f ./test-database.sql
rm -f ./update-notification-method-push-sms.sql
rm -f ./update-notification-method.sql

# Keep only essential public JS files, remove all test scripts
echo "Cleaning up public directory..."
cd public
# Keep only these essential files:
# - sw.js (service worker)
# - smart-token-manager-v2.js (current token manager)

# Remove all other JS files (they are all test/debug scripts)
for file in *.js; do
  if [[ "$file" != "sw.js" && "$file" != "smart-token-manager-v2.js" ]]; then
    echo "Removing $file"
    rm -f "$file"
  fi
done

cd ..

# Remove cleanup plan file
rm -f ./cleanup-plan.md

echo "✅ Cleanup complete!"
echo "📁 Kept essential files:"
echo "  - All src/ files (main app)"
echo "  - public/sw.js (service worker)"
echo "  - public/smart-token-manager-v2.js (token manager)"
echo "  - supabase/ directory (Edge Functions)"
echo "  - Configuration files (vite, tailwind, etc.)"
echo ""
echo "🗑️ Removed:"
echo "  - 20+ test JS files from root"
echo "  - 14+ test SQL files from root"
echo "  - 100+ test scripts from public/"
