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
  ArrowTrendingDownIcon,
  StarIcon,
  AdjustmentsHorizontalIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { socialSentimentApi } from '../services/socialSentimentApi';
import RecommendedAccountsPanel from './RecommendedAccountsPanel';
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
  const [activeTab, setActiveTab] = useState<'search' | 'recommended' | 'monitoring' | 'analysis'>('search');
  const [searchResults, setSearchResults] = useState<TwitterAccount[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [sentimentSummary, setSentimentSummary] = useState<SentimentSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timeframe, setTimeframe] = useState<'1h' | '4h' | '24h' | '7d'>('24h');
  const [searchMethod, setSearchMethod] = useState<string>('Basic Search');
  const [searchError, setSearchError] = useState<string | null>(null);
  
  // Add monitoring state
  const [monitoringAccounts, setMonitoringAccounts] = useState<any[]>([]);
  const [monitoringStatus, setMonitoringStatus] = useState<any>(null);
  
  // Search form state
  const [searchQuery, setSearchQuery] = useState('');
  const [minFollowers, setMinFollowers] = useState(1000);
  const [includeVerified, setIncludeVerified] = useState(true);
  const [searchLimit, setSearchLimit] = useState(20);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  useEffect(() => {
    if (activeTab === 'analysis') {
      loadSentimentSummary();
    } else if (activeTab === 'monitoring') {
      loadMonitoringData();
    }
  }, [activeTab, selectedCoin, timeframe]);

  // Initialize search query with coin name
  useEffect(() => {
    if (!searchQuery) {
      setSearchQuery(`${coinName} ${selectedCoin}`);
    }
  }, [selectedCoin, coinName]);

  const searchAccounts = async () => {
    if (!searchQuery.trim()) {
      alert('Please enter a search query');
      return;
    }

    setIsLoading(true);
    setSearchError(null);
    setSearchResults([]);
    
    try {
      const searchParams = {
        query: searchQuery.trim(),
        limit: searchLimit,
        minFollowers: minFollowers,
        includeVerified: includeVerified,
        useOAuth: false // Always use basic search
      };

      const response = await socialSentimentApi.searchAccountsWithQuery(searchQuery.trim(), searchParams);
      setSearchResults(response.data.accounts);
      setSearchMethod(response.data.searchMethod || 'Twitter API v2 (Real Data)');
      
    } catch (error: any) {
      console.error('Failed to search accounts:', error);
      let errorMessage = 'Search failed. Please try again.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Check for specific Twitter API configuration errors
      if (errorMessage.includes('Twitter API Bearer Token is required') || 
          errorMessage.includes('Twitter API configuration required')) {
        errorMessage = 'Twitter API not configured. Please contact administrator to set up Twitter API access for real-time data.';
      } else if (errorMessage.includes('authentication failed')) {
        errorMessage = 'Twitter API authentication failed. Please contact administrator to verify API credentials.';
      } else if (errorMessage.includes('rate limit exceeded')) {
        errorMessage = 'Twitter API rate limit exceeded. Please wait a few minutes before searching again.';
      } else if (errorMessage.includes('access forbidden')) {
        errorMessage = 'Twitter API access restricted. Please contact administrator to verify API permissions.';
      }
      
      setSearchError(errorMessage);
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
      // Clear selection after successful setup
      setSelectedAccounts(new Set());
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

  const loadMonitoringData = async () => {
    setIsLoading(true);
    try {
      // Get monitoring status
      const statusResponse = await socialSentimentApi.getMonitoringStatus(selectedCoin);
      setMonitoringStatus(statusResponse.data);

      // Get correlation data which includes monitored accounts
      const correlationResponse = await socialSentimentApi.getAccountCorrelation(selectedCoin, 30);
      setMonitoringAccounts(correlationResponse.data || []);
    } catch (error) {
      console.error('Failed to load monitoring data:', error);
      setMonitoringStatus(null);
      setMonitoringAccounts([]);
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
            Search Twitter Accounts
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Find influential Twitter accounts using custom search terms
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
              Search for Twitter accounts using custom keywords and filters
            </p>
          </div>
        </div>
      </div>

      {/* Search Form */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="space-y-4">
          {/* Main Search Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search Query
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Enter keywords (e.g., Bitcoin BTC, Ethereum trading, crypto analyst)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchAccounts()}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Use specific keywords related to the cryptocurrency or trading topics you're interested in
            </p>
          </div>

          {/* Quick Search Suggestions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Quick Search Templates
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                `${coinName} ${selectedCoin}`,
                `${selectedCoin} trading`,
                `${selectedCoin} analysis`,
                `${coinName} news`,
                `crypto ${selectedCoin}`,
                `${selectedCoin} price`
              ].map((template) => (
                <button
                  key={template}
                  onClick={() => setSearchQuery(template)}
                  className="px-3 py-1 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                >
                  {template}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Options Toggle */}
          <div>
            <button
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <AdjustmentsHorizontalIcon className="h-4 w-4 mr-1" />
              Advanced Options
              <ChevronRightIcon className={`h-4 w-4 ml-1 transform transition-transform ${showAdvancedOptions ? 'rotate-90' : ''}`} />
            </button>
          </div>

          {/* Advanced Options */}
          {showAdvancedOptions && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Minimum Followers
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={minFollowers}
                  onChange={(e) => setMinFollowers(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Results Limit
                </label>
                <select
                  value={searchLimit}
                  onChange={(e) => setSearchLimit(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value={10}>10 results</option>
                  <option value={20}>20 results</option>
                  <option value={50}>50 results</option>
                  <option value={100}>100 results</option>
                </select>
              </div>
              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeVerified}
                    onChange={(e) => setIncludeVerified(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Include verified accounts
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Search Button */}
          <div className="flex items-center space-x-4">
            <button
              onClick={searchAccounts}
              disabled={isLoading || !searchQuery.trim()}
              className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
              {isLoading ? 'Searching...' : 'Search Accounts'}
            </button>
            
            {searchResults.length > 0 && (
              <button
                onClick={() => {
                  setSearchResults([]);
                  setSelectedAccounts(new Set());
                }}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Clear Results
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search Method Indicator */}
      {searchMethod && !searchError && searchResults.length > 0 && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Data source: {searchMethod}
        </div>
      )}

      {/* Error Display */}
      {searchError && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-red-900 dark:text-red-100">
                Search Failed
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {searchError}
              </p>
              {searchError.includes('Twitter API not configured') && (
                <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                  <p>For security and compliance reasons, this system only uses real Twitter data.</p>
                  <p>Demo or mock data is prohibited for financial applications.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {searchResults.length > 0 && !searchError && (
        <div className="space-y-4">
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

  const renderRecommendedTab = () => (
    <RecommendedAccountsPanel
      selectedCoin={selectedCoin}
      coinName={coinName}
      onAccountAdded={(account) => {
        // Handle account added to monitoring
        console.log('Account added to monitoring:', account);
        
        // If we're currently on the monitoring tab, refresh the data
        if (activeTab === 'monitoring') {
          loadMonitoringData();
        }
        
        // Show success notification
        // You could show a toast notification here instead of alert
      }}
    />
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
                {monitoringAccounts.length}
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
                {monitoringStatus?.totalPosts || 0}
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
                {monitoringStatus?.alertCount || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Monitored Accounts List */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h4 className="text-md font-medium text-gray-900 dark:text-white">
            Monitored Accounts ({monitoringAccounts.length})
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Accounts currently being monitored for {coinName} sentiment
          </p>
        </div>
        
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : monitoringAccounts.length === 0 ? (
            <div className="text-center py-8">
              <EyeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                No accounts are currently being monitored for {selectedCoin}
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Add accounts from the Search or Recommended tabs to start monitoring
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {monitoringAccounts.map((accountData) => (
                <div
                  key={accountData.account.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        {accountData.account.profileImageUrl ? (
                          <img
                            src={accountData.account.profileImageUrl}
                            alt={accountData.account.displayName}
                            className="h-12 w-12 rounded-full"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                            <UserGroupIcon className="h-6 w-6 text-gray-500" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {accountData.account.displayName}
                          </h4>
                          {accountData.account.verified && (
                            <ShieldCheckIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                          )}
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Active
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          @{accountData.account.username}
                        </p>
                        
                        {accountData.account.bio && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 line-clamp-2">
                            {accountData.account.bio}
                          </p>
                        )}
                        
                        {/* Monitoring Metrics */}
                        <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                          <span>{accountData.account.followersCount?.toLocaleString() || 0} followers</span>
                          <span>Relevance: {(accountData.relevance?.relevanceScore * 100 || 0).toFixed(0)}%</span>
                          <span>Mentions: {accountData.relevance?.mentionCount || 0}</span>
                          <span>Avg Sentiment: {accountData.relevance?.avgSentiment?.toFixed(2) || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <div className="flex items-center space-x-2 text-green-600">
                        <CheckCircleIcon className="h-5 w-5" />
                        <span className="text-sm font-medium">Monitoring</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
          Recent Activity
        </h4>
        <div className="space-y-3">
          {monitoringAccounts.length > 0 ? (
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <ClockIcon className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Monitoring {monitoringAccounts.length} accounts for {selectedCoin}
                </span>
              </div>
              <span className="text-xs text-gray-500">Active</span>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  No monitoring setup for {selectedCoin}
                </span>
              </div>
              <span className="text-xs text-gray-500">Inactive</span>
            </div>
          )}
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
            { id: 'recommended', name: 'Recommended', icon: StarIcon },
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
        {activeTab === 'recommended' && renderRecommendedTab()}
        {activeTab === 'monitoring' && renderMonitoringTab()}
        {activeTab === 'analysis' && renderAnalysisTab()}
      </div>
    </div>
  );
};

export default SocialSentimentDashboard; 