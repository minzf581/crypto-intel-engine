import React, { useState, useEffect } from 'react';
import { useAssets } from '@/context/AssetContext';
import SocialSentimentDashboard from '@/components/SocialSentimentDashboard';
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
      name: 'Social Dashboard',
      icon: ChartBarIcon,
      description: 'Account search, monitoring setup, and analysis overview',
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
          <SocialSentimentDashboard
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
        Social Sentiment Monitoring Settings
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
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Minimum Engagement
              </label>
              <input
                type="number"
                min="0"
                step="100"
                defaultValue="1000"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Monitoring Frequency */}
        <div>
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
            Monitoring Frequency
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Post Check Interval (minutes)
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="1">1 minute</option>
                <option value="2" selected>2 minutes</option>
                <option value="5">5 minutes</option>
                <option value="10">10 minutes</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Accounts per Coin
              </label>
              <input
                type="number"
                min="5"
                max="100"
                defaultValue="20"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Notification Preferences */}
        <div>
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
            Notification Preferences
          </h4>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                defaultChecked
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Enable email notifications for critical alerts
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                defaultChecked
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Enable browser push notifications
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Enable SMS notifications for critical alerts
              </span>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
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
              Social Sentiment Analysis
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Monitor and analyze social media sentiment for cryptocurrency markets
            </p>
          </div>
          
          {/* Coin Selector */}
          {selectedAssets.length > 0 && (
            <div className="flex items-center space-x-4">
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
            </div>
          )}
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
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.name}
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