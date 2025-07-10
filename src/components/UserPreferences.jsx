import { useState, useEffect } from 'react';
import { userPreferencesService } from '../services/supabaseService';

export default function UserPreferences({ user }) {
  const [preferences, setPreferences] = useState({
    notification_method: 'push',
    phone_number: '',
    email: '',
    push_subscription: null
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      console.log('Current user:', user);
      console.log('User ID:', user?.id);
      const prefs = await userPreferencesService.getUserPreferences();
      console.log('Loaded preferences:', prefs);
      if (prefs) {
        setPreferences(prefs);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      console.log('Saving preferences:', preferences);
      const result = await userPreferencesService.updateUserPreferences(preferences);
      console.log('Save result:', result);
      alert('Preferences saved successfully!');
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert(`Failed to save preferences: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setPreferences(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return <div className="text-center">Loading preferences...</div>;
  }

  return (
    <div className="max-w-md mx-auto">
      <h3 className="text-2xl font-bold mb-6 text-gray-900 text-center">Notification Preferences</h3>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-3">
            Notification Method
          </label>
          <select
            value={preferences.notification_method}
            onChange={(e) => handleInputChange('notification_method', e.target.value)}
            className="w-full border-2 border-gray-400 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
          >
            <option value="push">Push Notifications Only (Free)</option>
            <option value="sms">SMS Text Messages Only</option>
            <option value="push_sms">Push + SMS Fallback (Recommended)</option>
            <option value="email">Email Notifications</option>
          </select>
          <p className="text-sm text-gray-800 mt-2 p-2 bg-gray-50 rounded border">
            {preferences.notification_method === 'push' && '✅ Free browser notifications. Works when device is on and app is closed.'}
            {preferences.notification_method === 'sms' && '📱 Reliable text messages. Works even when device is off. Small cost per message.'}
            {preferences.notification_method === 'push_sms' && '🚀 Best reliability: Push notifications first, SMS backup if needed.'}
            {preferences.notification_method === 'email' && '📧 Email reminders in your inbox. May end up in spam folder.'}
          </p>
        </div>

        {(preferences.notification_method === 'sms' || preferences.notification_method === 'push_sms') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={preferences.phone_number || ''}
              onChange={(e) => handleInputChange('phone_number', e.target.value)}
              placeholder="+1234567890"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Include country code (e.g., +1 for US)
            </p>
          </div>
        )}

        {preferences.notification_method === 'email' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={preferences.email || ''}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {preferences.notification_method === 'push' && (
          <div className="bg-blue-50 p-3 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Push Notifications:</strong> Make sure to allow notifications when prompted by your browser. 
              These work even when the app is closed!
            </p>
          </div>
        )}

        <button
          onClick={savePreferences}
          disabled={saving}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg shadow-lg"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}
