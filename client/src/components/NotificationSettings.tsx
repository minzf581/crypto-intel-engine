import React, { useState, useEffect } from 'react';
import { 
  CogIcon, 
  BellIcon,
  SpeakerWaveIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  PlayIcon
} from '@heroicons/react/24/outline';
import { EnhancedNotificationService } from '../services/notificationService';
import { NotificationSettings as NotificationSettingsType } from '../types/notification';
import { useNotificationSounds } from '../hooks/useNotificationSounds';
import { requestNotificationPermission, getFirebaseToken } from '../config/firebase';
import toast from 'react-hot-toast';

export const NotificationSettings: React.FC = () => {
  const [settings, setSettings] = useState<Partial<NotificationSettingsType>>({
    pushEnabled: true,
    soundEnabled: true,
    emailEnabled: false,
    soundType: 'default',
    priority: 'medium',
    groupingEnabled: true,
    maxPerHour: 10,
  });
  const [fcmToken, setFcmToken] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [testingSound, setTestingSound] = useState<string | null>(null);
  
  const { playSound } = useNotificationSounds();

  useEffect(() => {
    loadSettings();
    setupPushNotifications();
    
    // Check email service status
    checkEmailServiceStatus().then(isConfigured => {
      if (!isConfigured) {
        console.warn('Email service is not configured');
      }
    });
  }, []);

  const loadSettings = async () => {
    try {
      // Load existing settings from API
      // For now, we'll use default settings
      console.log('Settings loaded');
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const setupPushNotifications = async () => {
    try {
      const hasPermission = await requestNotificationPermission();
      if (hasPermission) {
        const token = await getFirebaseToken();
        if (token) {
          setFcmToken(token);
          await EnhancedNotificationService.registerFCMToken(token);
        }
      }
    } catch (error) {
      console.error('Failed to setup push notifications:', error);
    }
  };

  const handleSettingChange = async (key: keyof NotificationSettingsType, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    // Debounced save to API
    try {
      await EnhancedNotificationService.updateSettings(newSettings);
      toast.success('Settings updated successfully');
    } catch (error) {
      console.error('Failed to update settings:', error);
      toast.error('Failed to update settings');
    }
  };

  const testSound = async (soundType: string) => {
    setTestingSound(soundType);
    playSound(soundType as any, settings.priority);
    setTimeout(() => setTestingSound(null), 1000);
  };

  const sendTestNotification = async () => {
    setLoading(true);
    try {
      await EnhancedNotificationService.sendTestNotification(
        'Test Notification',
        'This is a test notification to verify your settings are working correctly.',
        'system',
        settings.priority,
        fcmToken
      );
      toast.success('Test notification sent successfully');
    } catch (error) {
      console.error('Failed to send test notification:', error);
      toast.error('Failed to send test notification');
    } finally {
      setLoading(false);
    }
  };

  const sendTestEmail = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/notifications/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          testEmail: true,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Test email sent successfully! Check your inbox.');
      } else {
        toast.error(data.error || 'Failed to send test email');
      }
    } catch (error) {
      console.error('Failed to send test email:', error);
      toast.error('Failed to send test email');
    } finally {
      setLoading(false);
    }
  };

  const checkEmailServiceStatus = async () => {
    try {
      const response = await fetch('/api/notifications/email/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();
      return data.emailServiceConfigured;
    } catch (error) {
      console.error('Failed to check email service status:', error);
      return false;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <CogIcon className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notification Settings</h1>
          <p className="text-gray-600">Customize how you receive notifications</p>
        </div>
      </div>

      {/* Push Notifications */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3 mb-4">
          <DevicePhoneMobileIcon className="w-6 h-6 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Push Notifications</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Enable Push Notifications</h3>
              <p className="text-sm text-gray-500">Receive notifications on your device</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.pushEnabled}
                onChange={(e) => handleSettingChange('pushEnabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Group Similar Notifications</h3>
              <p className="text-sm text-gray-500">Bundle related notifications together</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.groupingEnabled}
                onChange={(e) => handleSettingChange('groupingEnabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Maximum Notifications per Hour
            </label>
            <select
              value={settings.maxPerHour}
              onChange={(e) => handleSettingChange('maxPerHour', Number(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-2 w-full max-w-xs"
            >
              <option value={5}>5 per hour</option>
              <option value={10}>10 per hour</option>
              <option value={20}>20 per hour</option>
              <option value={50}>50 per hour</option>
              <option value={100}>No limit</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sound Notifications */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3 mb-4">
          <SpeakerWaveIcon className="w-6 h-6 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Sound Settings</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Enable Sound Alerts</h3>
              <p className="text-sm text-gray-500">Play sound when notifications arrive</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => handleSettingChange('soundEnabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {settings.soundEnabled && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Sound Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'default', label: 'Default' },
                  { value: 'bell', label: 'Bell' },
                  { value: 'chime', label: 'Chime' },
                  { value: 'alert', label: 'Alert' },
                ].map((sound) => (
                  <div
                    key={sound.value}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                      settings.soundType === sound.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => handleSettingChange('soundType', sound.value)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{sound.label}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          testSound(sound.value);
                        }}
                        disabled={testingSound === sound.value}
                        className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                      >
                        <PlayIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Priority Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3 mb-4">
          <BellIcon className="w-6 h-6 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Priority & Delivery</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Default Priority Level
            </label>
            <select
              value={settings.priority}
              onChange={(e) => handleSettingChange('priority', e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 w-full max-w-xs"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="critical">Critical Priority</option>
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Higher priority notifications will be more prominent and may override Do Not Disturb settings
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Email Notifications</h3>
              <p className="text-sm text-gray-500">Receive important notifications via email</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.emailEnabled}
                onChange={(e) => handleSettingChange('emailEnabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Test Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Notifications</h2>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Send test notifications to verify your settings are working correctly.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={sendTestNotification}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <BellIcon className="w-4 h-4" />
              )}
              <span>Test Browser Notification</span>
            </button>

            <button
              onClick={sendTestEmail}
              disabled={loading || !settings.emailEnabled}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <EnvelopeIcon className="w-4 h-4" />
              )}
              <span>Test Email Notification</span>
            </button>
          </div>
          
          {!settings.emailEnabled && (
            <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
              ⚠️ Email notifications are disabled. Enable them above to test email functionality.
            </p>
          )}
          
          {fcmToken && (
            <p className="text-xs text-gray-500">
              Push notifications are enabled and ready to receive alerts.
            </p>
          )}
        </div>
      </div>

      {/* Device Info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Device Information</h3>
        <div className="text-xs text-gray-600 space-y-1">
          <p>Browser: {navigator.userAgent}</p>
          <p>Notification Permission: {Notification.permission}</p>
          <p>Push Token: {fcmToken ? 'Registered' : 'Not available'}</p>
        </div>
      </div>
    </div>
  );
}; 