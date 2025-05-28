import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  UserGroupIcon, 
  EyeIcon, 
  ClockIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  ChevronRightIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import { socialSentimentApi } from '../services/socialSentimentApi';
// Twitter OAuth removed - using basic search by default

interface TwitterAccount {
  id: string;
  username: string;
  displayName: string;
  bio?: string;
  followersCount: number;
  isVerified: boolean;
  profileImageUrl?: string;
  influenceScore: number;
  relevanceScore: number;
}

interface SentimentSummary {
  coinSymbol: string;
  timeframe: string;
  totalPosts: number;
  sentimentDistribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
  avgSentimentScore: number;
  impactDistribution: {
    low: number;
    medium: number;
    high: number;
  };
  avgImpactScore: number;
  significantPosts: any[];
  trendingKeywords: {
    word: string;
    count: number;
    sentiment: number;
  }[];
}

interface SocialSentimentDashboardProps {
  selectedCoin?: string;
  coinName?: string;
}

const SocialSentimentDashboard: React.FC<SocialSentimentDashboardProps> = ({
  selectedCoin = 'BTC',
  coinName = 'Bitcoin'
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'monitoring' | 'analysis'>('search');
  const [searchResults, setSearchResults] = useState<TwitterAccount[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [sentimentSummary, setSentimentSummary] = useState<SentimentSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timeframe, setTimeframe] = useState<'1h' | '4h' | '24h' | '7d'>('24h');
  const [searchMethod, setSearchMethod] = useState<string>('Basic Search');

  useEffect(() => {
    if (activeTab === 'analysis') {
      loadSentimentSummary();
    }
  }, [activeTab, selectedCoin, timeframe]);

  const searchAccounts = async () => {
    setIsLoading(true);
    try {
      const searchParams = {
        limit: 20,
        minFollowers: 1000,
        includeVerified: true,
        useOAuth: false // Always use basic search
      };

      const response = await socialSentimentApi.searchAccounts(selectedCoin, coinName, searchParams);
      setSearchResults(response.data.accounts);
      setSearchMethod(response.data.searchMethod || 'Basic Search');
      
    } catch (error: any) {
      console.error('Failed to search accounts:', error);
      alert('Search failed. Please check your internet connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // OAuth search removed - using basic search only

  const setupMonitoring = async () => {
    if (selectedAccounts.size === 0) {
      alert('Please select at least one account to monitor');
      return;
    }

    setIsLoading(true);
    try {
      await socialSentimentApi.confirmAccounts(selectedCoin, Array.from(selectedAccounts));
      alert(`Successfully setup monitoring for ${selectedAccounts.size} accounts`);
      setActiveTab('monitoring');
    } catch (error) {
      console.error('Failed to setup monitoring:', error);
      alert('Failed to setup monitoring');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSentimentSummary = async () => {
    setIsLoading(true);
    try {
      const response = await socialSentimentApi.getSentimentSummary(selectedCoin, timeframe);
      setSentimentSummary(response.data);
    } catch (error) {
      console.error('Failed to load sentiment summary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAccountSelection = (accountId: string) => {
    const newSelection = new Set(selectedAccounts);
    if (newSelection.has(accountId)) {
      newSelection.delete(accountId);
    } else {
      newSelection.add(accountId);
    }
    setSelectedAccounts(newSelection);
  };

  const renderSearchTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Search Accounts for {coinName} ({selectedCoin})
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Find influential Twitter accounts related to this cryptocurrency
          </p>
        </div>
      </div>

      {/* Search Status */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-center">
          <ShieldCheckIcon className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
          <div>
            <h4 className="text-sm font-medium text-green-900 dark:text-green-100">
              Twitter Search Ready
            </h4>
            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
              Using Twitter API to find influential accounts related to {coinName}
            </p>
          </div>
        </div>
      </div>

      {/* Search Controls */}
      <div className="flex items-center space-x-4">
        <button
          onClick={searchAccounts}
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
          {isLoading ? 'Searching...' : 'Search Accounts'}
        </button>
      </div>

      {/* Search Method Indicator */}
      {searchMethod && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Last search method: {searchMethod}
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="space-y-4">
          {/* Demo Data Notice */}
          {searchMethod === 'Demo Data (Rate Limited)' && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Demo Data - Rate Limited
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Twitter API rate limit reached. Showing demo data for development purposes. 
                    Real data will be available after the rate limit resets (typically 15 minutes).
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <h4 className="text-md font-medium text-gray-900 dark:text-white">
              Found {searchResults.length} accounts
              {searchMethod && (
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                  ({searchMethod})
                </span>
              )}
            </h4>
            <button
              onClick={setupMonitoring}
              disabled={selectedAccounts.size === 0 || isLoading}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              Setup Monitoring ({selectedAccounts.size})
            </button>
          </div>
          
          <div className="grid gap-4">
            {searchResults.map((account) => (
              <div
                key={account.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedAccounts.has(account.id)
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => toggleAccountSelection(account.id)}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {account.profileImageUrl ? (
                      <img
                        src={account.profileImageUrl}
                        alt={account.displayName}
                        className="h-12 w-12 rounded-full"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                        <UserGroupIcon className="h-6 w-6 text-gray-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {account.displayName}
                      </p>
                      {account.isVerified && (
                        <ShieldCheckIcon className="h-4 w-4 text-blue-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      @{account.username}
                    </p>
                    {account.bio && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                        {account.bio}
                      </p>
                    )}
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{account.followersCount.toLocaleString()} followers</span>
                      <span>Influence: {account.influenceScore.toFixed(2)}</span>
                      <span>Relevance: {account.relevanceScore.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderMonitoringTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Monitoring Status for {coinName} ({selectedCoin})
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Real-time monitoring and alerts for selected accounts
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center">
            <EyeIcon className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                Active Monitoring
              </p>
              <p className="text-2xl font-bold text-green-600">
                {selectedAccounts.size}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Posts Today
              </p>
              <p className="text-2xl font-bold text-blue-600">
                {sentimentSummary?.totalPosts || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                Alerts
              </p>
              <p className="text-2xl font-bold text-yellow-600">
                {sentimentSummary?.impactDistribution.high || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
          Recent Activity
        </h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center space-x-3">
              <ClockIcon className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Monitoring started for {selectedAccounts.size} accounts
              </span>
            </div>
            <span className="text-xs text-gray-500">Just now</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAnalysisTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Sentiment Analysis for {coinName} ({selectedCoin})
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Historical correlation and sentiment trends
          </p>
        </div>
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value as '1h' | '4h' | '24h' | '7d')}
          className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="1h">Last Hour</option>
          <option value="4h">Last 4 Hours</option>
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
        </select>
      </div>

      {sentimentSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Total Posts</p>
              <p className="text-3xl font-bold text-blue-600">
                {sentimentSummary.totalPosts}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Avg Sentiment</p>
              <p className={`text-3xl font-bold ${
                sentimentSummary.avgSentimentScore > 0 ? 'text-green-600' : 
                sentimentSummary.avgSentimentScore < 0 ? 'text-red-600' : 'text-gray-600'
              }`}>
                {sentimentSummary.avgSentimentScore.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Positive</p>
              <p className="text-2xl font-bold text-green-600">
                {sentimentSummary.sentimentDistribution.positive}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Negative</p>
              <p className="text-2xl font-bold text-red-600">
                {sentimentSummary.sentimentDistribution.negative}
              </p>
            </div>
          </div>
        </div>
      )}

      {sentimentSummary?.trendingKeywords && sentimentSummary.trendingKeywords.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
            Trending Keywords
          </h4>
          <div className="flex flex-wrap gap-2">
            {sentimentSummary.trendingKeywords.slice(0, 20).map((keyword, index) => (
              <span
                key={index}
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  keyword.sentiment > 0 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                    : keyword.sentiment < 0
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {keyword.word} ({keyword.count})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'search', name: 'Search Accounts', icon: MagnifyingGlassIcon },
            { id: 'monitoring', name: 'Monitoring', icon: EyeIcon },
            { id: 'analysis', name: 'Analysis', icon: ChartBarIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
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

      <div className="py-6">
        {activeTab === 'search' && renderSearchTab()}
        {activeTab === 'monitoring' && renderMonitoringTab()}
        {activeTab === 'analysis' && renderAnalysisTab()}
      </div>
    </div>
  );
};

export default SocialSentimentDashboard; 