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
  CheckCircleIcon,
  ChevronLeftIcon,
  DocumentArrowUpIcon,
  BookmarkIcon,
  FireIcon,
  InformationCircleIcon,
  QuestionMarkCircleIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
  ArrowPathIcon,
  PlusIcon,
  TrashIcon,
  EllipsisHorizontalIcon,
  FunnelIcon,
  ArrowPathRoundedSquareIcon
} from '@heroicons/react/24/outline';
import { socialSentimentApi } from '../services/socialSentimentApi';
import { 
  TwitterAccount, 
  SearchResults, 
  SearchFilters, 
  SearchHistory, 
  SavedSearch, 
  PopularSearch, 
  PopularAccount,
  BulkImportResult,
  AccountCategory,
  SocialSentimentDashboardProps,
  SentimentSummary
} from '../types/socialSentiment';
import RecommendedAccountsPanel from './RecommendedAccountsPanel';
import SentimentScoreTooltip from './SentimentScoreTooltip';
import SearchHistoryPanel from './SearchHistoryPanel';
import BulkImportModal from './BulkImportModal';
import AccountPreviewCard from './AccountPreviewCard';
import RealTimeTweets from './RealTimeTweets';

const safeToFixed = (value: number | null | undefined, decimals: number = 2): string => {
  if (value === null || value === undefined || isNaN(value)) return '--';
  return Number(value).toFixed(decimals);
};

// Default account categories
const DEFAULT_ACCOUNT_CATEGORIES: AccountCategory[] = [
  { id: 'influencer', name: 'Crypto Influencer', description: 'High-follower crypto personalities', color: 'bg-purple-100 text-purple-800', icon: '👑' },
  { id: 'analyst', name: 'Market Analyst', description: 'Professional market analysts', color: 'bg-blue-100 text-blue-800', icon: '📊' },
  { id: 'trader', name: 'Trader', description: 'Active cryptocurrency traders', color: 'bg-green-100 text-green-800', icon: '💹' },
  { id: 'news', name: 'News Outlet', description: 'Cryptocurrency news sources', color: 'bg-yellow-100 text-yellow-800', icon: '📰' },
  { id: 'developer', name: 'Developer', description: 'Blockchain developers and tech experts', color: 'bg-indigo-100 text-indigo-800', icon: '👨‍💻' },
  { id: 'exchange', name: 'Exchange', description: 'Cryptocurrency exchanges', color: 'bg-red-100 text-red-800', icon: '🏦' },
  { id: 'project', name: 'Project Official', description: 'Official project accounts', color: 'bg-gray-100 text-gray-800', icon: '🏢' },
  { id: 'educator', name: 'Educator', description: 'Crypto education content creators', color: 'bg-orange-100 text-orange-800', icon: '🎓' }
];

const EnhancedSocialSentimentDashboard: React.FC<SocialSentimentDashboardProps> = ({
  selectedCoin = 'BTC',
  coinName = 'Bitcoin'
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'recommended' | 'monitoring' | 'analysis'>('search');
  const [monitoringSubTab, setMonitoringSubTab] = useState<'overview' | 'tweets'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    minFollowers: 1000,
    includeVerified: false,
    sortBy: 'relevance'
  });
  const [searchResults, setSearchResults] = useState<SearchResults>({
    accounts: [],
    totalCount: 0,
    hasMore: false,
    currentPage: 1,
    totalPages: 1,
    query: '',
    searchMethod: ''
  });
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sentimentSummary, setSentimentSummary] = useState<any>(null);
  const [monitoringAccounts, setMonitoringAccounts] = useState<any[]>([]);
  const [monitoringStatus, setMonitoringStatus] = useState<any>(null);
  const [accountMonitoringStatuses, setAccountMonitoringStatuses] = useState<{ [key: string]: boolean }>({});
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [searchHistory, setSearchHistory] = useState<any[]>([]);
  const [popularSearches, setPopularSearches] = useState<any[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [timeframe, setTimeframe] = useState<'1h' | '4h' | '24h' | '7d'>('24h');
  
  // Enhanced search state
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  
  // Search history and saved searches
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [popularAccounts, setPopularAccounts] = useState<PopularAccount[]>([]);
  const [showSearchHistory, setShowSearchHistory] = useState(false);

  // Data collection state
  const [dataCollectionStatus, setDataCollectionStatus] = useState<any>(null);
  const [isCollectingData, setIsCollectingData] = useState(false);
  const [collectionResult, setCollectionResult] = useState<any>(null);

  // Add tweets list state for analysis page
  const [tweetsList, setTweetsList] = useState<any[]>([]);
  const [isLoadingTweets, setIsLoadingTweets] = useState(false);
  const [tweetsError, setTweetsError] = useState<string | null>(null);

  useEffect(() => {
    // Check authentication status
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token && token !== 'undefined' && token !== 'null');
    
    if (activeTab === 'analysis') {
      loadSentimentSummary();
      loadTweetsList();
    } else if (activeTab === 'monitoring') {
      loadMonitoringData();
    }
    loadSearchHistory();
    loadPopularData();
  }, [activeTab, selectedCoin, timeframe]);

  // Initialize search query with coin name
  useEffect(() => {
    if (!searchQuery) {
      setSearchQuery(`${coinName} ${selectedCoin}`);
    }
  }, [selectedCoin, coinName]);

  const searchAccounts = async (page: number = 1) => {
    if (!searchQuery.trim()) {
      alert('Please enter a search query');
      return;
    }

    setIsLoading(true);
    setSearchError(null);
    
    try {
      const searchParams = {
        page,
        limit: 20, // Fixed limit per page
        ...searchFilters,
        useOAuth: false
      };

      const response = await socialSentimentApi.searchAccountsWithQuery(searchQuery.trim(), searchParams);
      
      if (page === 1) {
        setSearchResults(response.data);
      } else {
        // Append results for pagination
        setSearchResults(prev => ({
          ...response.data,
          accounts: [...prev.accounts, ...response.data.accounts]
        }));
      }
      
      setCurrentPage(page);
      
      // Check monitoring status for the new accounts
      if (response.data.accounts && response.data.accounts.length > 0) {
        const accountIds = response.data.accounts.map((account: any) => account.id);
        await checkSearchResultsMonitoringStatus(accountIds);
      }
      
      // Save to search history
      await saveSearchToHistory(searchQuery, searchFilters, response.data.totalCount);
      
    } catch (error: any) {
      console.error('Failed to search accounts:', error);
      
      let errorMessage = 'Search failed. Please try again.';
      
      if (error.response?.status === 401) {
        errorMessage = 'Authentication required. Please log in to use the search feature.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Check for specific error types
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

  const loadMoreResults = () => {
    if (searchResults.hasMore && !isLoading) {
      searchAccounts(currentPage + 1);
    }
  };

  const saveSearchToHistory = async (query: string, filters: SearchFilters, resultsCount: number) => {
    try {
      const historyItem: SearchHistory = {
        id: Date.now().toString(),
        query,
        filters,
        timestamp: new Date().toISOString(),
        resultsCount,
        coinSymbol: selectedCoin,
        coinName,
        userId: 'current-user' // Replace with actual user ID
      };
      
      setSearchHistory(prev => [historyItem, ...prev.slice(0, 19)]); // Keep last 20 searches
      
      // Try to save to backend, but don't fail if API is not available
      try {
        await socialSentimentApi.saveSearchHistory(historyItem);
      } catch (apiError: any) {
        console.warn('Could not save search history to backend:', apiError.response?.status === 404 ? 'API endpoint not implemented' : apiError.message);
      }
    } catch (error) {
      console.warn('Failed to save search history:', error);
      // Don't throw error to avoid blocking search functionality
    }
  };

  const loadSearchHistory = async () => {
    try {
      const response = await socialSentimentApi.getSearchHistory(selectedCoin);
      setSearchHistory(response.data.history || []);
      setSavedSearches(response.data.savedSearches || []);
    } catch (error: any) {
      console.warn('Search history not available:', error.response?.status === 404 ? 'API endpoint not implemented' : error.message);
      // Set empty arrays as fallback
      setSearchHistory([]);
      setSavedSearches([]);
    }
  };

  const loadPopularData = async () => {
    try {
      const [searchesResponse, accountsResponse] = await Promise.all([
        socialSentimentApi.getPopularSearches(selectedCoin),
        socialSentimentApi.getPopularAccounts(selectedCoin)
      ]);
      
      setPopularSearches(searchesResponse.data || []);
      setPopularAccounts(accountsResponse.data || []);
    } catch (error: any) {
      console.warn('Popular data not available:', error.response?.status === 404 ? 'API endpoints not implemented' : error.message);
      // Set empty arrays as fallback
      setPopularSearches([]);
      setPopularAccounts([]);
    }
  };

  const handleBulkImport = async (usernames: string[]) => {
    try {
      const response = await socialSentimentApi.bulkImportAccounts(usernames, selectedCoin);
      const result: BulkImportResult = response.data;
      
      // Add successful imports to search results
      setSearchResults(prev => ({
        ...prev,
        accounts: [...prev.accounts, ...result.successful],
        totalCount: prev.totalCount + result.successCount
      }));
      
      return result;
    } catch (error) {
      console.error('Failed to bulk import accounts:', error);
      throw error;
    }
  };

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

  const loadTweetsList = async () => {
    setIsLoadingTweets(true);
    setTweetsError(null);
    try {
      // Get tweets that mention the selected coin
      const response = await socialSentimentApi.getCoinSentimentSummary(selectedCoin, timeframe);
      if (response.success && response.data.significantPosts) {
        setTweetsList(response.data.significantPosts);
      } else {
        setTweetsList([]);
      }
    } catch (error: any) {
      console.error('Failed to load tweets list:', error);
      setTweetsError(error.response?.data?.message || 'Failed to load tweets');
      setTweetsList([]);
    } finally {
      setIsLoadingTweets(false);
    }
  };

  const loadMonitoringData = async () => {
    if (!isAuthenticated) {
      console.log('User not authenticated, skipping monitoring data load');
      return;
    }

    console.log('Loading monitoring data for coin:', selectedCoin);
    
    try {
      const [statusResponse, accountsResponse] = await Promise.all([
        socialSentimentApi.getMonitoringStatus(selectedCoin),
        socialSentimentApi.getMonitoredAccounts(selectedCoin)
      ]);

      console.log('Monitoring status response:', statusResponse);
      console.log('Monitored accounts response:', accountsResponse);

      setMonitoringStatus(statusResponse.data);
      
      if (accountsResponse.success && Array.isArray(accountsResponse.data)) {
        // Filter out any invalid accounts and provide defaults
        const validAccounts = accountsResponse.data
          .filter(account => account && typeof account === 'object')
          .map(account => ({
            id: account.id || account.twitterAccountId || `unknown-${Date.now()}`,
            username: account.username || account.twitterUsername || 'unknown',
            displayName: account.displayName || account.username || account.twitterUsername || 'Unknown Account',
            bio: account.bio || '',
            followersCount: account.followersCount || 0,
            isVerified: account.isVerified || false,
            profileImageUrl: account.profileImageUrl || '/default-avatar.png',
            relevanceScore: account.relevanceScore || 0,
            addedAt: account.addedAt || new Date().toISOString(),
            // Add any other required fields with defaults
            influenceScore: account.influenceScore || 0,
            category: account.category || 'unknown',
            description: account.description || account.bio || '',
            priority: account.priority || 1,
            isMonitored: true, // These are monitored accounts
            monitoringStatus: 'active'
          }));

        console.log(`Processed ${validAccounts.length} valid monitoring accounts:`, validAccounts);
        setMonitoringAccounts(validAccounts);
      } else {
        console.warn('Invalid monitored accounts response:', accountsResponse);
        setMonitoringAccounts([]);
      }
    } catch (error) {
      console.error('Failed to load monitoring data:', error);
      setMonitoringAccounts([]);
      setMonitoringStatus(null);
    }
  };

  // Check monitoring status for search results
  const checkSearchResultsMonitoringStatus = async (accountIds: string[]) => {
    if (!isAuthenticated || accountIds.length === 0) return;

    try {
      const response = await socialSentimentApi.checkAccountsMonitoringStatus(selectedCoin, accountIds);
      
      if (response.success) {
        const statusMap: { [key: string]: boolean } = {};
        response.data.accountStatuses.forEach((status: any) => {
          statusMap[status.accountId] = status.isMonitored;
        });
        
        setAccountMonitoringStatuses(prev => ({
          ...prev,
          ...statusMap
        }));
      }
    } catch (error) {
      console.error('Failed to check monitoring status for search results:', error);
    }
  };

  // Handle monitoring status change for individual accounts
  const handleMonitoringStatusChange = (accountId: string, isMonitored: boolean) => {
    setAccountMonitoringStatuses(prev => ({
      ...prev,
      [accountId]: isMonitored
    }));
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

  const loadDataCollectionStatus = async () => {
    try {
      const response = await socialSentimentApi.getDataCollectionStatus();
      if (response.success) {
        setDataCollectionStatus(response.data);
      }
    } catch (error) {
      console.error('Failed to load data collection status:', error);
    }
  };

  const triggerDataCollection = async () => {
    setIsCollectingData(true);
    setCollectionResult(null);
    
    try {
      const response = await socialSentimentApi.triggerDataCollection(selectedCoin);
      setCollectionResult(response);
      
      if (response.success) {
        // Refresh sentiment summary and data collection status after successful collection
        setTimeout(() => {
          loadSentimentSummary();
          loadDataCollectionStatus();
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to trigger data collection:', error);
      setCollectionResult({
        success: false,
        message: 'Failed to trigger data collection. Please try again.'
      });
    } finally {
      setIsCollectingData(false);
    }
  };

  const renderSearchTab = () => (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Enhanced Twitter Account Search
            </h3>
            {/* Authentication Status Indicator */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isAuthenticated ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`text-xs font-medium ${isAuthenticated ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
              </span>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Advanced search with pagination, filters, and account categories
            {!isAuthenticated && (
              <span className="text-red-600 dark:text-red-400 ml-2">
                (Login required for search functionality)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSearchHistory(!showSearchHistory)}
            disabled={!isAuthenticated}
            className={`inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <ClockIcon className="h-4 w-4 mr-2" />
            History
          </button>
          <button
            onClick={() => setShowBulkImport(true)}
            disabled={!isAuthenticated}
            className={`inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
            Bulk Import
          </button>
          {!isAuthenticated && (
            <button
              onClick={() => window.location.href = '/login'}
              className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Login
            </button>
          )}
        </div>
      </div>

      {/* Search History Panel */}
      {showSearchHistory && (
        <SearchHistoryPanel
          searchHistory={searchHistory}
          savedSearches={savedSearches}
          popularSearches={popularSearches}
          popularAccounts={popularAccounts}
          onSelectSearch={(search) => {
            setSearchQuery(search.query);
            setSearchFilters(search.filters);
            setShowSearchHistory(false);
          }}
          onClose={() => setShowSearchHistory(false)}
        />
      )}

      {/* Search Form */}
      <form onSubmit={(e) => { e.preventDefault(); searchAccounts(1); }} className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for Twitter accounts (e.g., Bitcoin BTC, Ethereum ETH, crypto influencers)"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              disabled={!isAuthenticated}
            />
          </div>
          <div className="flex items-center space-x-4">
            <button
              type="submit"
              disabled={isLoading || !searchQuery.trim() || !isAuthenticated}
              className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 ${!isAuthenticated ? 'bg-gray-400 hover:bg-gray-400' : ''}`}
            >
              {isLoading ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
              ) : (
                <MagnifyingGlassIcon className="h-4 w-4" />
              )}
              <span>{isLoading ? 'Searching...' : 'Search'}</span>
            </button>
            
            <button
              type="button"
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              disabled={!isAuthenticated}
              className={`inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2" />
              Filters
            </button>
          </div>
        </div>
      </form>

      {/* Advanced Filters */}
      {showAdvancedOptions && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Advanced Search Filters</h4>
          
          {/* Account Categories Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Account Categories
            </label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_ACCOUNT_CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    const newCategories = searchFilters.accountCategories.includes(category.id)
                      ? searchFilters.accountCategories.filter(id => id !== category.id)
                      : [...searchFilters.accountCategories, category.id];
                    setSearchFilters(prev => ({ ...prev, accountCategories: newCategories }));
                  }}
                  disabled={!isAuthenticated}
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    searchFilters.accountCategories.includes(category.id)
                      ? category.color
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  } ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="mr-1">{category.icon}</span>
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* Numeric Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Minimum Followers
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={searchFilters.minFollowers}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, minFollowers: parseInt(e.target.value) || 0 }))}
                disabled={!isAuthenticated}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Maximum Followers
              </label>
              <input
                type="number"
                min="0"
                step="10000"
                value={searchFilters.maxFollowers || ''}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, maxFollowers: e.target.value ? parseInt(e.target.value) : undefined }))}
                placeholder="No limit"
                disabled={!isAuthenticated}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Min Engagement Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={searchFilters.minEngagementRate || ''}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, minEngagementRate: e.target.value ? parseFloat(e.target.value) : undefined }))}
                placeholder="Any"
                disabled={!isAuthenticated}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
              />
            </div>
          </div>

          {/* Boolean Filters */}
          <div className="flex items-center space-x-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={searchFilters.includeVerified}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, includeVerified: e.target.checked }))}
                disabled={!isAuthenticated}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Include verified accounts
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={searchFilters.hasRecentActivity || false}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, hasRecentActivity: e.target.checked }))}
                disabled={!isAuthenticated}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Recent activity only
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Search Results */}
      {searchError && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400 mr-3 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-900 dark:text-red-100">
                Search Failed
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {searchError}
              </p>
              {searchError.includes('Authentication required') && (
                <div className="mt-3">
                  <button
                    onClick={() => window.location.href = '/login'}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Go to Login
                  </button>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                    Demo credentials: demo@example.com / demo123
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {searchResults.accounts.length > 0 && (
        <div className="space-y-4">
          {/* Results Header */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-md font-medium text-gray-900 dark:text-white">
                Search Results ({searchResults.totalCount} total)
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Page {currentPage} of {searchResults.totalPages} • {searchResults.searchMethod}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {selectedAccounts.size > 0 && (
                <button
                  onClick={setupMonitoring}
                  disabled={isLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add {selectedAccounts.size} to Monitoring
                </button>
              )}
              <button
                onClick={() => {
                  setSearchResults({
                    accounts: [],
                    totalCount: 0,
                    hasMore: false,
                    currentPage: 1,
                    totalPages: 1,
                    query: '',
                    searchMethod: ''
                  });
                  setSelectedAccounts(new Set());
                  setCurrentPage(1);
                  setSearchError(null);
                }}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                Clear Results
              </button>
            </div>
          </div>

          {/* Account Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchResults.accounts.map((account) => (
              <AccountPreviewCard
                key={account.id}
                account={account}
                isSelected={selectedAccounts.has(account.id)}
                onToggleSelect={() => toggleAccountSelection(account.id)}
                coinSymbol={selectedCoin}
                isMonitored={accountMonitoringStatuses[account.id] || false}
                onMonitoringStatusChange={handleMonitoringStatusChange}
              />
            ))}
          </div>

          {/* Load More Button */}
          {searchResults.hasMore && (
            <div className="text-center">
              <button
                onClick={loadMoreResults}
                disabled={isLoading}
                className="inline-flex items-center px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <ChevronRightIcon className="h-4 w-4 mr-2" />
                    Load More Results
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <BulkImportModal
          onImport={handleBulkImport}
          onClose={() => setShowBulkImport(false)}
          coinSymbol={selectedCoin}
          coinName={coinName}
        />
      )}
    </div>
  );

  const renderAnalysisTab = () => (
    <div className="space-y-6">
      {/* Header with timeframe selector and data collection controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Sentiment Analysis for {coinName} ({selectedCoin})
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Real-time sentiment analysis from monitored Twitter accounts
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Timeframe Selector */}
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as '1h' | '4h' | '24h' | '7d')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="1h">Last Hour</option>
            <option value="4h">Last 4 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>

          {/* Data Collection Button */}
          <button
            onClick={triggerDataCollection}
            disabled={isCollectingData || !isAuthenticated}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCollectingData ? (
              <>
                <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                Collecting...
              </>
            ) : (
              <>
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Collect Data
              </>
            )}
          </button>
        </div>
      </div>

      {/* Data Collection Status */}
      {dataCollectionStatus && (
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Data Collection Status
            </h4>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              dataCollectionStatus.isRunning 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
            }`}>
              {dataCollectionStatus.isRunning ? 'Running' : 'Stopped'}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Total Accounts:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {dataCollectionStatus.totalAccounts}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Total Posts:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {dataCollectionStatus.totalPosts}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Last Collection:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {dataCollectionStatus.lastCollection 
                  ? new Date(dataCollectionStatus.lastCollection).toLocaleString()
                  : 'Never'
                }
              </span>
            </div>
          </div>

          {dataCollectionStatus.coinBreakdown && dataCollectionStatus.coinBreakdown[selectedCoin] && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
              <div className="text-sm">
                <span className="text-gray-500 dark:text-gray-400">For {selectedCoin}:</span>
                <span className="ml-2 text-gray-900 dark:text-white">
                  {dataCollectionStatus.coinBreakdown[selectedCoin].accounts} accounts, {dataCollectionStatus.coinBreakdown[selectedCoin].posts} posts
                </span>
              </div>
            </div>
          )}

          {dataCollectionStatus.recommendations && dataCollectionStatus.recommendations.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
              <div className="text-sm space-y-1">
                {dataCollectionStatus.recommendations.map((rec: string, index: number) => (
                  <div key={index} className="text-gray-600 dark:text-gray-400">
                    {rec}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Collection Result */}
      {collectionResult && (
        <div className={`border rounded-lg p-4 ${
          collectionResult.success 
            ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
            : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
        }`}>
          <div className="flex items-start">
            {collectionResult.success ? (
              <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400 mr-3 flex-shrink-0 mt-0.5" />
            ) : (
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400 mr-3 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <h4 className={`text-sm font-medium ${
                collectionResult.success 
                  ? 'text-green-900 dark:text-green-100'
                  : 'text-red-900 dark:text-red-100'
              }`}>
                {collectionResult.success ? 'Data Collection Successful' : 'Data Collection Failed'}
              </h4>
              <div className={`text-sm mt-1 ${
                collectionResult.success 
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-red-700 dark:text-red-300'
              }`}>
                <p>{collectionResult.message}</p>
                {collectionResult.success && collectionResult.data && (
                  <div className="mt-2 space-y-1">
                    <p>• Processed {collectionResult.data.accountsProcessed} accounts</p>
                    <p>• Collected {collectionResult.data.postsCollected} new posts</p>
                    {collectionResult.data.errors && collectionResult.data.errors.length > 0 && (
                      <p>• {collectionResult.data.errors.length} errors occurred</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No Data Warning */}
      {sentimentSummary && sentimentSummary.totalPosts === 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                No Tweet Data Available
              </h4>
              <div className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                <p>There are no tweets available for analysis. This could be because:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>No accounts are being monitored for {selectedCoin}</li>
                  <li>Data collection hasn't been run recently</li>
                  <li>Twitter API rate limits are preventing data collection</li>
                </ul>
                <p className="mt-2">
                  Try clicking the "Collect Data" button above to gather recent tweets from monitored accounts.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sentiment Score Information */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start">
          <InformationCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Understanding Sentiment Scores
            </h4>
            <div className="text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1">
              <p><strong>Score Range:</strong> -1.0 (Very Negative) to +1.0 (Very Positive)</p>
              <p><strong>Interpretation:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>+0.8 to +1.0: Extremely bullish sentiment</li>
                <li>+0.4 to +0.8: Positive sentiment</li>
                <li>-0.4 to +0.4: Neutral sentiment</li>
                <li>-0.8 to -0.4: Negative sentiment</li>
                <li>-1.0 to -0.8: Extremely bearish sentiment</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Sentiment Analysis Results */}
      {sentimentSummary && sentimentSummary.totalPosts > 0 && (
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
            <div className="text-center relative">
              <div className="flex items-center justify-center">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Avg Sentiment</p>
                <SentimentScoreTooltip score={sentimentSummary.avgSentimentScore} />
              </div>
              <p className={`text-3xl font-bold ${
                sentimentSummary.avgSentimentScore > 0 ? 'text-green-600' : 
                sentimentSummary.avgSentimentScore < 0 ? 'text-red-600' : 'text-gray-600'
              }`}>
                {safeToFixed(sentimentSummary.avgSentimentScore, 2)}
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

      {/* Trending Keywords */}
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

      {/* Recent Tweets */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-medium text-gray-900 dark:text-white">
            Recent Tweets ({tweetsList.length})
          </h4>
          <button
            onClick={loadTweetsList}
            disabled={isLoadingTweets}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 mr-2 ${isLoadingTweets ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {isLoadingTweets ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Loading tweets...</span>
          </div>
        ) : tweetsError ? (
          <div className="text-center py-8">
            <ExclamationTriangleIcon className="mx-auto h-8 w-8 text-red-400" />
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{tweetsError}</p>
            <button
              onClick={loadTweetsList}
              className="mt-3 inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        ) : tweetsList.length === 0 ? (
          <div className="text-center py-8">
            <ChatBubbleLeftIcon className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              No tweets found for {selectedCoin} in the selected timeframe
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Try collecting data or changing the timeframe
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {tweetsList.slice(0, 10).map((tweet, index) => (
              <div key={tweet.id || index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <img
                    src={tweet.account?.profileImageUrl || '/default-avatar.png'}
                    alt={tweet.account?.displayName || 'Unknown'}
                    className="h-10 w-10 rounded-full"
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      if (target.src !== '/default-avatar.png') {
                        target.src = '/default-avatar.png';
                      }
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                        {tweet.account?.displayName || 'Unknown User'}
                      </h5>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        @{tweet.account?.username || 'unknown'}
                      </span>
                      <span className="text-sm text-gray-400">•</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(tweet.publishedAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-900 dark:text-white mb-3 leading-relaxed">
                      {tweet.content}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          tweet.sentiment === 'positive' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                            : tweet.sentiment === 'negative'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {tweet.sentiment} ({tweet.sentimentScore?.toFixed(2) || 'N/A'})
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          tweet.impact === 'high' 
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300'
                            : tweet.impact === 'medium'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {tweet.impact} impact
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <HeartIcon className="h-4 w-4" />
                          <span>{tweet.likeCount || 0}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <ArrowPathRoundedSquareIcon className="h-4 w-4" />
                          <span>{tweet.retweetCount || 0}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <ChatBubbleLeftIcon className="h-4 w-4" />
                          <span>{tweet.replyCount || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {tweetsList.length > 10 && (
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Showing 10 of {tweetsList.length} tweets
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Render other tabs (monitoring, recommended) similar to original implementation
  const renderMonitoringTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Monitoring Dashboard
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Track sentiment from your selected accounts
          </p>
        </div>
      </div>

      {/* Sub-tab navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8" aria-label="Monitoring tabs">
          {[
            { id: 'overview', name: 'Account Overview', icon: UserGroupIcon },
            { id: 'tweets', name: 'Real-Time Tweets', icon: ChatBubbleLeftIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMonitoringSubTab(tab.id as any)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                monitoringSubTab === tab.id
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

      {/* Sub-tab content */}
      <div>
        {monitoringSubTab === 'overview' && renderAccountOverview()}
        {monitoringSubTab === 'tweets' && (
          <RealTimeTweets 
            coinSymbol={selectedCoin} 
            monitoredAccounts={monitoringAccounts} 
          />
        )}
      </div>
    </div>
  );

  const renderAccountOverview = () => {
    if (!monitoringAccounts || monitoringAccounts.length === 0) {
      return (
        <div className="text-center py-12">
          <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No accounts being monitored</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Search and add accounts to start monitoring their sentiment.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setActiveTab('search')}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Accounts
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Monitoring stats */}
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
              <ClockIcon className="h-8 w-8 text-yellow-600" />
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

        {/* Monitored accounts grid */}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {monitoringAccounts
                .filter(account => {
                  return account && 
                         typeof account === 'object' && 
                         (account.id || account.username) &&
                         account.id !== null &&
                         account.id !== undefined;
                })
                .map((account) => {
                  const safeAccount = {
                    id: account.id || account.username || `unknown-${Math.random()}`,
                    username: account.username || 'unknown',
                    displayName: account.displayName || account.username || 'Unknown Account',
                    profileImageUrl: account.profileImageUrl || '/default-avatar.png',
                    isVerified: Boolean(account.isVerified),
                    followersCount: Number(account.followersCount) || 0,
                    relevanceScore: Number(account.relevanceScore) || 0,
                    addedAt: account.addedAt || null
                  };

                  return (
                    <div key={safeAccount.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <img
                          src={safeAccount.profileImageUrl}
                          alt={safeAccount.displayName}
                          className="h-10 w-10 rounded-full"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            if (target.src !== '/default-avatar.png') {
                              target.src = '/default-avatar.png';
                            }
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {safeAccount.displayName}
                            </h4>
                            {safeAccount.isVerified && (
                              <ShieldCheckIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            @{safeAccount.username}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                            <span>{safeAccount.followersCount.toLocaleString()} followers</span>
                            <span>Relevance: {safeToFixed(safeAccount.relevanceScore, 2)}</span>
                          </div>
                          {safeAccount.addedAt && (
                            <p className="text-xs text-gray-400 mt-1">
                              Added: {new Date(safeAccount.addedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRecommendedTab = () => (
    <RecommendedAccountsPanel
      selectedCoin={selectedCoin}
      coinName={coinName}
      onAccountsSelected={(accounts) => {
        // Add selected recommended accounts to monitoring
        setupMonitoring();
      }}
    />
  );

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {[
            { id: 'search', name: 'Enhanced Search', icon: MagnifyingGlassIcon },
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

      {/* Tab Content */}
      <div>
        {activeTab === 'search' && renderSearchTab()}
        {activeTab === 'recommended' && renderRecommendedTab()}
        {activeTab === 'monitoring' && renderMonitoringTab()}
        {activeTab === 'analysis' && renderAnalysisTab()}
      </div>
    </div>
  );
};

export default EnhancedSocialSentimentDashboard; 