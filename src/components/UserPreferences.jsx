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
      const prefs = await userPreferencesService.getUserPreferences();
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
      await userPreferencesService.updateUserPreferences(preferences);
      alert('Preferences saved successfully!');
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Failed to save preferences. Please try again.');
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
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h3 className="text-lg font-bold mb-4">Notification Preferences</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notification Method
          </label>
          <select
            value={preferences.notification_method}
            onChange={(e) => handleInputChange('notification_method', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="push">Push Notifications Only (Free)</option>
            <option value="sms">SMS Text Messages Only</option>
            <option value="push_sms">Push + SMS Fallback (Recommended)</option>
            <option value="email">Email Notifications</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {preferences.notification_method === 'push' && 'Free browser notifications. Works when device is on and app is closed.'}
            {preferences.notification_method === 'sms' && 'Reliable text messages. Works even when device is off. Small cost per message.'}
            {preferences.notification_method === 'push_sms' && 'Best reliability: Push notifications first, SMS backup if needed.'}
            {preferences.notification_method === 'email' && 'Email reminders in your inbox. May end up in spam folder.'}
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
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}
