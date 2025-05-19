import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAssets } from '@/context/AssetContext';
import { 
  EnvelopeIcon, 
  KeyIcon, 
  UserIcon, 
  BellIcon, 
  MoonIcon,
  SunIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';

const SettingsPage = () => {
  const { user, updateUser } = useAuth();
  const { saveAssetPreferences } = useAssets();
  
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true' || 
        window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    document.documentElement.classList.toggle('dark', newDarkMode);
    localStorage.setItem('darkMode', String(newDarkMode));
  };

  // Save notification preferences
  const saveNotificationPreferences = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);
    
    try {
      // For the prototype, we'll just simulate an API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real implementation, this would save to the backend
      setSaveSuccess(true);
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      setSaveError('Failed to save notification preferences');
    } finally {
      setIsSaving(false);
    }
  };

  // Submit feedback
  const submitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!feedbackMessage.trim()) {
      return;
    }
    
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);
    
    try {
      // For the prototype, we'll just simulate an API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real implementation, this would send the feedback to the backend
      setFeedbackSubmitted(true);
      setFeedbackMessage('');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setSaveError('Failed to submit feedback');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Settings</h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-1">
          Manage your account preferences and settings
        </p>
      </div>

      {saveSuccess && (
        <div className="mb-6 p-4 bg-success/10 text-success rounded-md">
          Your changes have been saved successfully.
        </div>
      )}

      {saveError && (
        <div className="mb-6 p-4 bg-danger/10 text-danger rounded-md">
          {saveError}
        </div>
      )}

      <div className="space-y-8">
        {/* Account Settings */}
        <div className="bg-white dark:bg-neutral-800 shadow-sm rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
            <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">Account Settings</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Full Name
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-neutral-400" />
                  </div>
                  <input
                    type="text"
                    value={user?.name || ''}
                    disabled
                    className="form-input pl-10 bg-neutral-50 dark:bg-neutral-900"
                  />
                </div>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  Name editing is not available in the beta version
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Email Address
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <EnvelopeIcon className="h-5 w-5 text-neutral-400" />
                  </div>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="form-input pl-10 bg-neutral-50 dark:bg-neutral-900"
                  />
                </div>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  Email changing is not available in the beta version
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Password
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyIcon className="h-5 w-5 text-neutral-400" />
                  </div>
                  <input
                    type="password"
                    value="••••••••"
                    disabled
                    className="form-input pl-10 bg-neutral-50 dark:bg-neutral-900"
                  />
                </div>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  Password changing is not available in the beta version
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white dark:bg-neutral-800 shadow-sm rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
            <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">Preferences</h2>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              {/* Dark Mode Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-md font-medium text-neutral-900 dark:text-neutral-100">
                    Dark Mode
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Toggle between light and dark themes
                  </p>
                </div>
                <button
                  onClick={toggleDarkMode}
                  className="inline-flex items-center px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md shadow-sm text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700"
                >
                  {darkMode ? (
                    <>
                      <SunIcon className="h-5 w-5 mr-2" />
                      Light Mode
                    </>
                  ) : (
                    <>
                      <MoonIcon className="h-5 w-5 mr-2" />
                      Dark Mode
                    </>
                  )}
                </button>
              </div>

              {/* Notification Settings */}
              <div className="pt-6 border-t border-neutral-200 dark:border-neutral-700">
                <h3 className="text-md font-medium text-neutral-900 dark:text-neutral-100 mb-4">
                  Notification Settings
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        Email Notifications
                      </h4>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        Receive important alerts and signal summaries via email
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEmailNotifications(!emailNotifications)}
                      className={`${
                        emailNotifications ? 'bg-primary-600' : 'bg-neutral-200 dark:bg-neutral-700'
                      } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2`}
                    >
                      <span className="sr-only">Toggle email notifications</span>
                      <span
                        className={`${
                          emailNotifications ? 'translate-x-5' : 'translate-x-0'
                        } pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                      />
                    </button>
                  </div>
                  
                  <div className="pt-4">
                    <button
                      onClick={saveNotificationPreferences}
                      disabled={isSaving}
                      className="btn-primary relative"
                    >
                      {isSaving && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="animate-spin h-5 w-5 border-t-2 border-b-2 border-white rounded-full" />
                        </span>
                      )}
                      <span className={isSaving ? 'opacity-0' : ''}>
                        <BellIcon className="h-5 w-5 mr-1 inline" />
                        Save Notification Preferences
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Beta Feedback */}
        <div className="bg-white dark:bg-neutral-800 shadow-sm rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
            <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">Beta Feedback</h2>
          </div>
          <div className="p-6">
            {feedbackSubmitted ? (
              <div className="p-4 bg-success/10 text-success rounded-md">
                <p className="font-medium">Thank you for your feedback!</p>
                <p className="text-sm mt-1">
                  Your input helps us improve the platform for everyone. We appreciate your contribution to making our product better.
                </p>
                <button
                  onClick={() => setFeedbackSubmitted(false)}
                  className="text-sm font-medium text-success mt-2 hover:underline focus:outline-none"
                >
                  Submit another feedback
                </button>
              </div>
            ) : (
              <form onSubmit={submitFeedback}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Share your thoughts, suggestions, or report issues
                  </label>
                  <textarea
                    rows={4}
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    placeholder="Your feedback helps us improve the platform..."
                    className="form-input"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSaving || !feedbackMessage.trim()}
                  className="btn-primary relative"
                >
                  {isSaving && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="animate-spin h-5 w-5 border-t-2 border-b-2 border-white rounded-full" />
                    </span>
                  )}
                  <span className={isSaving ? 'opacity-0' : ''}>
                    <ChatBubbleLeftRightIcon className="h-5 w-5 mr-1 inline" />
                    Submit Feedback
                  </span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage; 