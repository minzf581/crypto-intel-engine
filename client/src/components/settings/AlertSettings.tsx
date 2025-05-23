import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Switch } from '@headlessui/react';
import { 
  BellIcon, 
  BellSlashIcon,
  BellAlertIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { useAssets } from '@/context/AssetContext';

interface AlertSetting {
  id?: string;
  assetSymbol?: string;
  isGlobal: boolean;
  sentimentThreshold: number;
  priceChangeThreshold: number;
  enableSentimentAlerts: boolean;
  enablePriceAlerts: boolean;
  enableNarrativeAlerts: boolean;
  alertFrequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  emailNotifications: boolean;
  pushNotifications: boolean;
}

const AlertSettings: React.FC = () => {
  const { selectedAssets } = useAssets();
  const [settings, setSettings] = useState<AlertSetting[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedAsset, setExpandedAsset] = useState<string | null>(null);
  
  // Fetch alert settings
  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await axios.get('/api/notifications/settings');
      
      if (response.data && response.data.success) {
        setSettings(response.data.data.settings || []);
      }
    } catch (error) {
      console.error('Failed to fetch alert settings:', error);
      setError('Unable to load alert settings, please try again later');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update settings
  const updateSetting = async (setting: AlertSetting) => {
    try {
      setError(null);
      
      const response = await axios.post('/api/notifications/settings', setting);
      
      if (response.data && response.data.success) {
        // Refresh list after successfully updating settings
        await fetchSettings();
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
      setError('Failed to save settings, please try again later');
    }
  };
  
  // Delete settings
  const deleteSetting = async (id: string) => {
    if (!id) return; // Ignore settings without ID (may be default settings)
    
    try {
      setError(null);
      
      const response = await axios.delete(`/api/notifications/settings/${id}`);
      
      if (response.data && response.data.success) {
        // Refresh list after successful deletion
        await fetchSettings();
      }
    } catch (error) {
      console.error('Failed to delete settings:', error);
      setError('Failed to delete settings, please try again later');
    }
  };
  
  // Handle settings change
  const handleSettingChange = (setting: AlertSetting, field: keyof AlertSetting, value: any) => {
    // Create a copy of settings and update
    const updatedSetting = { ...setting, [field]: value };
    
    // Send update request
    updateSetting(updatedSetting);
  };
  
  // Initial load
  useEffect(() => {
    fetchSettings();
  }, []);
  
  // Toggle expand/collapse state of assets
  const toggleExpandAsset = (symbol: string) => {
    if (expandedAsset === symbol) {
      setExpandedAsset(null);
    } else {
      setExpandedAsset(symbol);
    }
  };
  
  // Get asset settings
  const getAssetSetting = (assetSymbol: string): AlertSetting | null => {
    return settings.find(s => s.assetSymbol === assetSymbol) || null;
  };
  
  // Get global settings
  const getGlobalSetting = (): AlertSetting => {
    return settings.find(s => s.isGlobal) || {
      isGlobal: true,
      sentimentThreshold: 20,
      priceChangeThreshold: 5.0,
      enableSentimentAlerts: true,
      enablePriceAlerts: true,
      enableNarrativeAlerts: true,
      alertFrequency: 'immediate',
      emailNotifications: false,
      pushNotifications: true
    };
  };
  
  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm p-6 border border-neutral-200 dark:border-neutral-700">
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
        Notification and Alert Settings
      </h2>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4 text-sm">
          {error}
        </div>
      )}
      
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin inline-block w-8 h-8 border-2 border-t-primary-500 border-neutral-200 rounded-full"></div>
          <p className="mt-2 text-neutral-500 dark:text-neutral-400">Loading settings...</p>
        </div>
      ) : (
        <>
          {/* Global settings */}
          <div className="mb-6 p-4 bg-neutral-50 dark:bg-neutral-750 rounded-lg border border-neutral-200 dark:border-neutral-700">
            <h3 className="text-md font-medium text-neutral-900 dark:text-neutral-100 mb-4 flex items-center">
              <BellAlertIcon className="h-5 w-5 mr-2" />
              Global Alert Settings
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Sentiment Signal Threshold
                  </label>
                  <div className="flex items-center">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={getGlobalSetting().sentimentThreshold}
                      onChange={(e) => handleSettingChange(
                        getGlobalSetting(), 
                        'sentimentThreshold', 
                        parseInt(e.target.value)
                      )}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-neutral-200 dark:bg-neutral-700"
                    />
                    <span className="ml-2 text-sm text-neutral-700 dark:text-neutral-300 min-w-[2.5rem] text-center">
                      {getGlobalSetting().sentimentThreshold}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    Minimum strength to trigger sentiment change notifications
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Price Change Threshold (%)
                  </label>
                  <div className="flex items-center">
                    <input
                      type="range"
                      min="0.1"
                      max="20"
                      step="0.5"
                      value={getGlobalSetting().priceChangeThreshold}
                      onChange={(e) => handleSettingChange(
                        getGlobalSetting(), 
                        'priceChangeThreshold', 
                        parseFloat(e.target.value)
                      )}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-neutral-200 dark:bg-neutral-700"
                    />
                    <span className="ml-2 text-sm text-neutral-700 dark:text-neutral-300 min-w-[2.5rem] text-center">
                      {getGlobalSetting().priceChangeThreshold}%
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    Minimum percentage to trigger price change notifications
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="flex items-center justify-between">
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Sentiment Signals
                    </span>
                    <Switch
                      checked={getGlobalSetting().enableSentimentAlerts}
                      onChange={(checked) => handleSettingChange(
                        getGlobalSetting(), 
                        'enableSentimentAlerts', 
                        checked
                      )}
                      className={`${
                        getGlobalSetting().enableSentimentAlerts ? 'bg-primary-600' : 'bg-neutral-300 dark:bg-neutral-700'
                      } relative inline-flex items-center h-6 rounded-full w-11 transition-colors`}
                    >
                      <span className={`${
                        getGlobalSetting().enableSentimentAlerts ? 'translate-x-6' : 'translate-x-1'
                      } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`} />
                    </Switch>
                  </label>
                </div>
                
                <div>
                  <label className="flex items-center justify-between">
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Price Changes
                    </span>
                    <Switch
                      checked={getGlobalSetting().enablePriceAlerts}
                      onChange={(checked) => handleSettingChange(
                        getGlobalSetting(), 
                        'enablePriceAlerts', 
                        checked
                      )}
                      className={`${
                        getGlobalSetting().enablePriceAlerts ? 'bg-primary-600' : 'bg-neutral-300 dark:bg-neutral-700'
                      } relative inline-flex items-center h-6 rounded-full w-11 transition-colors`}
                    >
                      <span className={`${
                        getGlobalSetting().enablePriceAlerts ? 'translate-x-6' : 'translate-x-1'
                      } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`} />
                    </Switch>
                  </label>
                </div>
                
                <div>
                  <label className="flex items-center justify-between">
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Narrative Changes
                    </span>
                    <Switch
                      checked={getGlobalSetting().enableNarrativeAlerts}
                      onChange={(checked) => handleSettingChange(
                        getGlobalSetting(), 
                        'enableNarrativeAlerts', 
                        checked
                      )}
                      className={`${
                        getGlobalSetting().enableNarrativeAlerts ? 'bg-primary-600' : 'bg-neutral-300 dark:bg-neutral-700'
                      } relative inline-flex items-center h-6 rounded-full w-11 transition-colors`}
                    >
                      <span className={`${
                        getGlobalSetting().enableNarrativeAlerts ? 'translate-x-6' : 'translate-x-1'
                      } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`} />
                    </Switch>
                  </label>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center justify-between">
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Real-Time Notifications
                    </span>
                    <Switch
                      checked={getGlobalSetting().pushNotifications}
                      onChange={(checked) => handleSettingChange(
                        getGlobalSetting(), 
                        'pushNotifications', 
                        checked
                      )}
                      className={`${
                        getGlobalSetting().pushNotifications ? 'bg-primary-600' : 'bg-neutral-300 dark:bg-neutral-700'
                      } relative inline-flex items-center h-6 rounded-full w-11 transition-colors`}
                    >
                      <span className={`${
                        getGlobalSetting().pushNotifications ? 'translate-x-6' : 'translate-x-1'
                      } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`} />
                    </Switch>
                  </label>
                </div>
                
                <div>
                  <label className="flex items-center justify-between">
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Email Notifications
                    </span>
                    <Switch
                      checked={getGlobalSetting().emailNotifications}
                      onChange={(checked) => handleSettingChange(
                        getGlobalSetting(), 
                        'emailNotifications', 
                        checked
                      )}
                      className={`${
                        getGlobalSetting().emailNotifications ? 'bg-primary-600' : 'bg-neutral-300 dark:bg-neutral-700'
                      } relative inline-flex items-center h-6 rounded-full w-11 transition-colors`}
                    >
                      <span className={`${
                        getGlobalSetting().emailNotifications ? 'translate-x-6' : 'translate-x-1'
                      } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`} />
                    </Switch>
                  </label>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    Please verify your email address
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Asset-specific settings */}
          <h3 className="text-md font-medium text-neutral-900 dark:text-neutral-100 mb-2">
            Asset-Specific Settings
          </h3>
          
          {selectedAssets.length === 0 ? (
            <div className="py-6 text-center text-neutral-500 dark:text-neutral-400">
              <InformationCircleIcon className="h-10 w-10 mx-auto mb-2" />
              <p>No assets selected</p>
              <p className="text-sm mt-1">Please select assets from the sidebar to configure specific notifications</p>
            </div>
          ) : (
            <ul className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {selectedAssets.map(asset => {
                const assetSetting = getAssetSetting(asset.symbol);
                const isExpanded = expandedAsset === asset.symbol;
                
                return (
                  <li key={asset.id} className="py-3">
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleExpandAsset(asset.symbol)}
                    >
                      <div className="flex items-center">
                        <img 
                          src={asset.logo} 
                          alt={asset.symbol} 
                          className="w-6 h-6 mr-2 rounded-full"
                        />
                        <span className="font-medium text-neutral-800 dark:text-neutral-200">
                          {asset.symbol}
                        </span>
                        <span className="ml-2 text-sm text-neutral-500 dark:text-neutral-400">
                          {asset.name}
                        </span>
                        
                        {assetSetting && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-800 dark:text-primary-100">
                            Custom
                          </span>
                        )}
                      </div>
                      
                      {isExpanded ? (
                        <ChevronUpIcon className="h-5 w-5 text-neutral-400" />
                      ) : (
                        <ChevronDownIcon className="h-5 w-5 text-neutral-400" />
                      )}
                    </div>
                    
                    {isExpanded && (
                      <div className="mt-3 pl-8 space-y-4">
                        {!assetSetting ? (
                          <div className="flex justify-between items-center">
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                              Using global settings
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateSetting({
                                  assetSymbol: asset.symbol,
                                  isGlobal: false,
                                  sentimentThreshold: getGlobalSetting().sentimentThreshold,
                                  priceChangeThreshold: getGlobalSetting().priceChangeThreshold,
                                  enableSentimentAlerts: getGlobalSetting().enableSentimentAlerts,
                                  enablePriceAlerts: getGlobalSetting().enablePriceAlerts,
                                  enableNarrativeAlerts: getGlobalSetting().enableNarrativeAlerts,
                                  alertFrequency: getGlobalSetting().alertFrequency,
                                  emailNotifications: getGlobalSetting().emailNotifications,
                                  pushNotifications: getGlobalSetting().pushNotifications
                                });
                              }}
                              className="px-3 py-1 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                            >
                              Customize Settings
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                  Sentiment Signal Threshold
                                </label>
                                <div className="flex items-center">
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="5"
                                    value={assetSetting.sentimentThreshold}
                                    onChange={(e) => handleSettingChange(
                                      assetSetting,
                                      'sentimentThreshold',
                                      parseInt(e.target.value)
                                    )}
                                    className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-neutral-200 dark:bg-neutral-700"
                                  />
                                  <span className="ml-2 text-sm text-neutral-700 dark:text-neutral-300 min-w-[2.5rem] text-center">
                                    {assetSetting.sentimentThreshold}
                                  </span>
                                </div>
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                  Price Change Threshold (%)
                                </label>
                                <div className="flex items-center">
                                  <input
                                    type="range"
                                    min="0.1"
                                    max="20"
                                    step="0.5"
                                    value={assetSetting.priceChangeThreshold}
                                    onChange={(e) => handleSettingChange(
                                      assetSetting,
                                      'priceChangeThreshold',
                                      parseFloat(e.target.value)
                                    )}
                                    className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-neutral-200 dark:bg-neutral-700"
                                  />
                                  <span className="ml-2 text-sm text-neutral-700 dark:text-neutral-300 min-w-[2.5rem] text-center">
                                    {assetSetting.priceChangeThreshold}%
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                    Sentiment Signals
                                  </span>
                                  <Switch
                                    checked={assetSetting.enableSentimentAlerts}
                                    onChange={(checked) => handleSettingChange(
                                      assetSetting,
                                      'enableSentimentAlerts',
                                      checked
                                    )}
                                    className={`${
                                      assetSetting.enableSentimentAlerts ? 'bg-primary-600' : 'bg-neutral-300 dark:bg-neutral-700'
                                    } relative inline-flex items-center h-6 rounded-full w-11 transition-colors`}
                                  >
                                    <span className={`${
                                      assetSetting.enableSentimentAlerts ? 'translate-x-6' : 'translate-x-1'
                                    } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`} />
                                  </Switch>
                                </label>
                              </div>
                              
                              <div>
                                <label className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                    Price Changes
                                  </span>
                                  <Switch
                                    checked={assetSetting.enablePriceAlerts}
                                    onChange={(checked) => handleSettingChange(
                                      assetSetting,
                                      'enablePriceAlerts',
                                      checked
                                    )}
                                    className={`${
                                      assetSetting.enablePriceAlerts ? 'bg-primary-600' : 'bg-neutral-300 dark:bg-neutral-700'
                                    } relative inline-flex items-center h-6 rounded-full w-11 transition-colors`}
                                  >
                                    <span className={`${
                                      assetSetting.enablePriceAlerts ? 'translate-x-6' : 'translate-x-1'
                                    } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`} />
                                  </Switch>
                                </label>
                              </div>
                              
                              <div>
                                <label className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                    Narrative Changes
                                  </span>
                                  <Switch
                                    checked={assetSetting.enableNarrativeAlerts}
                                    onChange={(checked) => handleSettingChange(
                                      assetSetting,
                                      'enableNarrativeAlerts',
                                      checked
                                    )}
                                    className={`${
                                      assetSetting.enableNarrativeAlerts ? 'bg-primary-600' : 'bg-neutral-300 dark:bg-neutral-700'
                                    } relative inline-flex items-center h-6 rounded-full w-11 transition-colors`}
                                  >
                                    <span className={`${
                                      assetSetting.enableNarrativeAlerts ? 'translate-x-6' : 'translate-x-1'
                                    } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`} />
                                  </Switch>
                                </label>
                              </div>
                            </div>
                            
                            <div className="flex justify-end">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (assetSetting.id) {
                                    deleteSetting(assetSetting.id);
                                  }
                                }}
                                className="px-3 py-1 text-sm font-medium text-red-600 hover:text-red-700"
                              >
                                Reset to Global Settings
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
};

export default AlertSettings; 