import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRightIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';
import { useAssets } from '@/context/AssetContext';

enum OnboardingStep {
  WELCOME,
  ASSET_SELECTION,
  NOTIFICATION_PREFERENCES,
  COMPLETED
}

const OnboardingPage = () => {
  const [currentStep, setCurrentStep] = useState(OnboardingStep.WELCOME);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const { user, updateUser } = useAuth();
  const { availableAssets, toggleAssetSelection, selectedAssets, saveAssetPreferences } = useAssets();
  const navigate = useNavigate();

  const goToNextStep = () => {
    setCurrentStep(prevStep => prevStep + 1);
  };

  const handleAssetSelectionNext = () => {
    if (selectedAssets.length < 3) {
      setError('Please select at least 3 cryptocurrencies');
      return;
    }
    
    if (selectedAssets.length > 5) {
      setError('Please select at most 5 cryptocurrencies');
      return;
    }
    
    setError(null);
    goToNextStep();
  };

  const handleComplete = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Save asset preferences
      await saveAssetPreferences();
      
      // Update user onboarding status
      updateUser({ hasCompletedOnboarding: true });
      
      // Navigate to dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('Error completing onboarding:', err);
      setError('Failed to save your preferences. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 to-secondary-700 flex flex-col py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-6">
        <h1 className="text-center text-3xl font-bold text-white">
          Crypto Intelligence Engine
        </h1>
        <p className="mt-2 text-center text-sm text-white/80">
          Real-time signal extraction from cryptocurrency data
        </p>
      </div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white dark:bg-neutral-800 shadow-xl rounded-lg overflow-hidden">
          {/* Progress bar */}
          <div className="h-2 bg-neutral-100 dark:bg-neutral-700">
            <div 
              className="h-full bg-primary-600 transition-all duration-500"
              style={{ width: `${(currentStep + 1) * 25}%` }}
            ></div>
          </div>
          
          {/* Content */}
          <div className="p-6 sm:p-8">
            {/* Step 1: Welcome */}
            {currentStep === OnboardingStep.WELCOME && (
              <div>
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
                  Welcome to Crypto Intelligence Engine
                </h2>
                <p className="text-neutral-700 dark:text-neutral-300 mb-6">
                  Thank you for joining our beta program! This platform helps you track real-time signals
                  from social media platforms to identify emerging cryptocurrency trends and sentiment shifts.
                </p>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 text-primary-600">
                      <CheckCircleIcon />
                    </div>
                    <p className="ml-3 text-neutral-700 dark:text-neutral-300">
                      <span className="font-medium text-neutral-900 dark:text-neutral-100">Real-time signals</span> - 
                      Get alerts when social sentiment or narratives shift for your chosen assets
                    </p>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 text-primary-600">
                      <CheckCircleIcon />
                    </div>
                    <p className="ml-3 text-neutral-700 dark:text-neutral-300">
                      <span className="font-medium text-neutral-900 dark:text-neutral-100">Multi-source analysis</span> - 
                      Data aggregated from Twitter/X and Reddit
                    </p>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 text-primary-600">
                      <CheckCircleIcon />
                    </div>
                    <p className="ml-3 text-neutral-700 dark:text-neutral-300">
                      <span className="font-medium text-neutral-900 dark:text-neutral-100">Actionable insights</span> - 
                      Clear signal strength indicators to help inform your decisions
                    </p>
                  </div>
                </div>
                
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
                  Let's set up your account in just a few steps.
                </p>
                
                <div className="flex justify-end">
                  <button
                    onClick={goToNextStep}
                    className="btn-primary inline-flex items-center"
                  >
                    <span>Get Started</span>
                    <ChevronRightIcon className="ml-1 -mr-1 h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
            
            {/* Step 2: Asset Selection */}
            {currentStep === OnboardingStep.ASSET_SELECTION && (
              <div>
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
                  Select your cryptocurrencies
                </h2>
                <p className="text-neutral-700 dark:text-neutral-300 mb-6">
                  Choose 3-5 cryptocurrencies that you want to track. You can change this selection later.
                </p>
                
                {error && (
                  <div className="mb-4 p-3 bg-danger/10 text-danger rounded-md text-sm">
                    {error}
                  </div>
                )}
                
                <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableAssets.map(asset => (
                      <div 
                        key={asset.id}
                        onClick={() => toggleAssetSelection(asset.id)}
                        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer border ${
                          asset.isSelected 
                            ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20' 
                            : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                        }`}
                      >
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-700 mr-3">
                            <img
                              src={asset.logo}
                              alt={asset.name}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>';
                              }}
                            />
                          </div>
                          <div>
                            <div className="font-medium text-neutral-900 dark:text-neutral-100">{asset.symbol}</div>
                            <div className="text-sm text-neutral-500 dark:text-neutral-400">{asset.name}</div>
                          </div>
                        </div>
                        <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                          asset.isSelected 
                            ? 'border-primary-600 bg-primary-600' 
                            : 'border-neutral-300 dark:border-neutral-600'
                        }`}>
                          {asset.isSelected && (
                            <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
                  Selected: <span className="font-medium">{selectedAssets.length}</span> of 5 maximum
                </div>
                
                <div className="flex justify-between">
                  <button
                    onClick={() => setCurrentStep(OnboardingStep.WELCOME)}
                    className="btn-outline"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleAssetSelectionNext}
                    className="btn-primary inline-flex items-center"
                  >
                    <span>Continue</span>
                    <ChevronRightIcon className="ml-1 -mr-1 h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
            
            {/* Step 3: Notification Preferences */}
            {currentStep === OnboardingStep.NOTIFICATION_PREFERENCES && (
              <div>
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
                  Notification Preferences
                </h2>
                <p className="text-neutral-700 dark:text-neutral-300 mb-6">
                  Choose how you want to be notified about new signals.
                </p>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-md font-medium text-neutral-900 dark:text-neutral-100">Email Notifications</h3>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        Receive daily summaries and high strength signals via email
                      </p>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => setEmailNotifications(!emailNotifications)}
                        className={`${
                          emailNotifications ? 'bg-primary-600' : 'bg-neutral-200 dark:bg-neutral-700'
                        } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2`}
                      >
                        <span className="sr-only">Use setting</span>
                        <span
                          className={`${
                            emailNotifications ? 'translate-x-5' : 'translate-x-0'
                          } pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                        />
                      </button>
                    </div>
                  </div>
                  
                  <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Note: During this beta phase, only email notifications are available. Push notifications
                      and more granular controls will be added in future updates.
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <button
                    onClick={() => setCurrentStep(OnboardingStep.ASSET_SELECTION)}
                    className="btn-outline"
                  >
                    Back
                  </button>
                  <button
                    onClick={goToNextStep}
                    className="btn-primary inline-flex items-center"
                  >
                    <span>Continue</span>
                    <ChevronRightIcon className="ml-1 -mr-1 h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
            
            {/* Step 4: Completed */}
            {currentStep === OnboardingStep.COMPLETED && (
              <div className="text-center">
                <div className="h-24 w-24 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 mx-auto mb-6 flex items-center justify-center">
                  <CheckCircleIcon className="h-16 w-16" />
                </div>
                
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
                  You're all set!
                </h2>
                <p className="text-neutral-700 dark:text-neutral-300 mb-8">
                  Your account has been configured with your preferences. You're now ready to start
                  exploring real-time cryptocurrency signals.
                </p>
                
                <div className="bg-neutral-50 dark:bg-neutral-700/30 rounded-lg p-4 mb-8 text-left">
                  <h3 className="font-medium text-neutral-900 dark:text-neutral-100 mb-2">What's Next?</h3>
                  <ul className="space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
                    <li className="flex items-start">
                      <span className="flex-shrink-0 h-5 w-5 text-primary-600">
                        <CheckCircleIcon />
                      </span>
                      <span className="ml-2">Explore your personalized dashboard with signals for your selected cryptocurrencies</span>
                    </li>
                    <li className="flex items-start">
                      <span className="flex-shrink-0 h-5 w-5 text-primary-600">
                        <CheckCircleIcon />
                      </span>
                      <span className="ml-2">Filter signals by type, strength, and source</span>
                    </li>
                    <li className="flex items-start">
                      <span className="flex-shrink-0 h-5 w-5 text-primary-600">
                        <CheckCircleIcon />
                      </span>
                      <span className="ml-2">Set up specific alerts for high-impact signals</span>
                    </li>
                    <li className="flex items-start">
                      <span className="flex-shrink-0 h-5 w-5 text-primary-600">
                        <CheckCircleIcon />
                      </span>
                      <span className="ml-2">Provide feedback to help us improve the platform</span>
                    </li>
                  </ul>
                </div>
                
                <button
                  onClick={handleComplete}
                  disabled={isLoading}
                  className="btn-primary w-full py-2.5 relative"
                >
                  {isLoading && (
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                      <span className="animate-spin inline-block h-5 w-5 border-t-2 border-b-2 border-white rounded-full" />
                    </span>
                  )}
                  <span className={isLoading ? 'opacity-0' : ''}>Go to Dashboard</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage; 