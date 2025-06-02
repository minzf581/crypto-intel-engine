import React, { useState, useEffect } from 'react';
import { useAssets } from '@/context/AssetContext';
import EnhancedSocialSentimentDashboard from '@/components/EnhancedSocialSentimentDashboard';
import AccountCorrelationView from '@/components/AccountCorrelationView';
import SentimentTrendChart from '@/components/SentimentTrendChart';
import SentimentAlertsPanel from '@/components/SentimentAlertsPanel';
import { useSocialSentimentSocket } from '@/hooks/useSocialSentimentSocket';
import {
  ChartBarIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  CogIcon,
  MagnifyingGlassIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

type TabType = 'dashboard' | 'correlation' | 'trends' | 'alerts' | 'settings';

const SocialSentimentPage: React.FC = () => {
  const { selectedAssets } = useAssets();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedCoin, setSelectedCoin] = useState<string>('BTC');
  const [coinName, setCoinName] = useState<string>('Bitcoin');
  const [timeframe, setTimeframe] = useState<'1h' | '4h' | '24h' | '7d'>('24h');
  const [newAlertsCount, setNewAlertsCount] = useState(0);

  // WebSocket integration for real-time updates
  const { connected } = useSocialSentimentSocket({
    coinSymbol: selectedCoin,
    onAlert: (alert) => {
      setNewAlertsCount(prev => prev + 1);
    },
    enableToastNotifications: true, // Enable toast notifications for the main page
  });

  // Initialize with first asset if available
  useEffect(() => {
    if (selectedAssets.length > 0) {
      setSelectedCoin(selectedAssets[0].symbol);
      setCoinName(selectedAssets[0].name);
    }
  }, [selectedAssets]);

  const tabs = [
    {
      id: 'dashboard' as TabType,
      name: 'Enhanced Search',
      icon: MagnifyingGlassIcon,
      description: 'Advanced account search with pagination, filters, categories, and bulk import',
    },
    {
      id: 'correlation' as TabType,
      name: 'Account Correlation',
      icon: UserGroupIcon,
      description: 'Historical correlation between accounts and price movements',
    },
    {
      id: 'trends' as TabType,
      name: 'Sentiment Trends',
      icon: ArrowTrendingUpIcon,
      description: 'Real-time sentiment analysis and momentum tracking',
    },
    {
      id: 'alerts' as TabType,
      name: 'Sentiment Alerts',
      icon: ExclamationTriangleIcon,
      description: 'Real-time alerts for significant sentiment changes',
      badge: newAlertsCount > 0 ? newAlertsCount : undefined,
    },
    {
      id: 'settings' as TabType,
      name: 'Settings',
      icon: CogIcon,
      description: 'Configure monitoring parameters and alert thresholds',
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <EnhancedSocialSentimentDashboard
            selectedCoin={selectedCoin}
            coinName={coinName}
          />
        );
      case 'correlation':
        return (
          <AccountCorrelationView
            coinSymbol={selectedCoin}
            coinName={coinName}
          />
        );
      case 'trends':
        return (
          <SentimentTrendChart
            coinSymbol={selectedCoin}
            coinName={coinName}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
          />
        );
      case 'alerts':
        return (
          <SentimentAlertsPanel
            coinSymbol={selectedCoin}
            coinName={coinName}
            onAlertRead={() => setNewAlertsCount(0)}
          />
        );
      case 'settings':
        return renderSettingsTab();
      default:
        return null;
    }
  };

  const renderSettingsTab = () => (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
        Enhanced Social Sentiment Settings
      </h3>
      
      <div className="space-y-6">
        {/* Alert Thresholds */}
        <div>
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
            Alert Thresholds
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Critical Sentiment Score
              </label>
              <input
                type="number"
                min="-1"
                max="1"
                step="0.1"
                defaultValue="0.8"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Trigger critical alerts when sentiment exceeds this threshold
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Warning Sentiment Score
              </label>
              <input
                type="number"
                min="-1"
                max="1"
                step="0.1"
                defaultValue="0.6"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Trigger warning alerts when sentiment exceeds this threshold
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Volume Threshold
              </label>
              <input
                type="number"
                min="1"
                step="1"
                defaultValue="100"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Minimum number of posts required to trigger alerts
              </p>
            </div>
          </div>
        </div>

        {/* Search Preferences */}
        <div>
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
            Search Preferences
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Default Results Per Page
              </label>
              <select
                defaultValue="20"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="10">10 results</option>
                <option value="20">20 results</option>
                <option value="50">50 results</option>
                <option value="100">100 results</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Auto-save Search History
              </label>
              <select
                defaultValue="enabled"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Monitoring Settings */}
        <div>
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
            Monitoring Settings
          </h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Real-time Updates
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Enable real-time sentiment updates via WebSocket
                </p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email Notifications
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Receive email alerts for critical sentiment changes
                </p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Browser Notifications
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Show browser notifications for alerts
                </p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div>
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
            Data Management
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
              Export Search History
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
              Clear Search History
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
              Export Monitoring Data
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-red-300 dark:border-red-600 rounded-md shadow-sm text-sm font-medium text-red-700 dark:text-red-300 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20">
              Reset All Settings
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Enhanced Social Sentiment Analysis
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Advanced monitoring and analysis of social media sentiment with enhanced search capabilities
            </p>
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {connected ? 'Live Updates' : 'Disconnected'}
              </span>
            </div>
            
            {/* Coin Selector */}
            {selectedAssets.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Analyzing:
                </span>
                <select
                  value={selectedCoin}
                  onChange={(e) => {
                    const asset = selectedAssets.find(a => a.symbol === e.target.value);
                    if (asset) {
                      setSelectedCoin(asset.symbol);
                      setCoinName(asset.name);
                    }
                  }}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {selectedAssets.map((asset) => (
                    <option key={asset.symbol} value={asset.symbol}>
                      {asset.name} ({asset.symbol})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Features Notice */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start">
          <InformationCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Enhanced Features Available
            </h4>
            <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              <p>This enhanced version includes:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Paginated search results with up to 100 accounts per search</li>
                <li>Advanced filtering by account categories and engagement metrics</li>
                <li>Search history and saved searches for quick access</li>
                <li>Popular searches and trending accounts discovery</li>
                <li>Bulk import via CSV upload or text paste</li>
                <li>Recent tweet previews with engagement metrics</li>
                <li>Enhanced sentiment score explanations and tooltips</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm relative ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.name}
                {tab.badge && (
                  <span className="ml-2 bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300 py-0.5 px-2 rounded-full text-xs font-medium">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Description */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {tabs.find(tab => tab.id === activeTab)?.description}
          </p>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default SocialSentimentPage; 