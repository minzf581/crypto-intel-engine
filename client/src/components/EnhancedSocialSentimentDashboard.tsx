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
  ChatBubbleLeftRightIcon,
  ArrowPathIcon,
  PlusIcon,
  TrashIcon,
  EllipsisHorizontalIcon
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
  const [sentimentSummary, setSentimentSummary] = useState<SentimentSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timeframe, setTimeframe] = useState<'1h' | '4h' | '24h' | '7d'>('24h');
  const [searchError, setSearchError] = useState<string | null>(null);
  
  // Enhanced search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    minFollowers: 1000,
    maxFollowers: undefined,
    includeVerified: true,
    accountCategories: [],
    minEngagementRate: undefined,
    language: undefined,
    location: undefined,
    hasRecentActivity: true
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  
  // Search history and saved searches
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [popularSearches, setPopularSearches] = useState<PopularSearch[]>([]);
  const [popularAccounts, setPopularAccounts] = useState<PopularAccount[]>([]);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  
  // Bulk import
  const [showBulkImport, setShowBulkImport] = useState(false);
  
  // Monitoring state
  const [monitoringAccounts, setMonitoringAccounts] = useState<any[]>([]);
  const [monitoringStatus, setMonitoringStatus] = useState<any>(null);

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    // Check authentication status
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token && token !== 'undefined' && token !== 'null');
    
    if (activeTab === 'analysis') {
      loadSentimentSummary();
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

  const loadMonitoringData = async () => {
    setIsLoading(true);
    try {
      const statusResponse = await socialSentimentApi.getMonitoringStatus(selectedCoin);
      setMonitoringStatus(statusResponse.data);

      const accountsResponse = await socialSentimentApi.getMonitoredAccounts(selectedCoin);
      setMonitoringAccounts(accountsResponse.data || []);
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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Sentiment Analysis for {coinName} ({selectedCoin})
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Historical correlation and sentiment trends with enhanced explanations
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

      {/* Sentiment Score Explanation */}
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

      {monitoringAccounts.length === 0 ? (
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {monitoringAccounts.map((accountData) => (
            <div key={accountData.account.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <img
                  src={accountData.account.profileImageUrl || '/default-avatar.png'}
                  alt={accountData.account.displayName}
                  className="h-10 w-10 rounded-full"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {accountData.account.displayName}
                    </h4>
                    {accountData.account.verified && (
                      <ShieldCheckIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    @{accountData.account.username}
                  </p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>{accountData.account.followersCount?.toLocaleString() || 0} followers</span>
                    <span>Sentiment: {safeToFixed(accountData.relevance?.avgSentiment, 2) || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

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