import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { 
  SearchHistory, 
  SavedSearch, 
  PopularSearch, 
  PopularAccount, 
  BulkImportResult,
  SearchFilters 
} from '../types/socialSentiment';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/social-sentiment`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export interface TwitterAccount {
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

export interface SearchAccountsOptions {
  limit?: number;
  minFollowers?: number;
  includeVerified?: boolean;
  useOAuth?: boolean;
  query?: string;
}

export interface SetupMonitoringOptions {
  autoConfirm?: boolean;
  minRelevanceScore?: number;
  maxAccounts?: number;
}

export const socialSentimentApi = {
  // Search accounts for a cryptocurrency
  searchAccountsForCoin: async (coinSymbol: string, coinName: string, options: any = {}) => {
    const params = new URLSearchParams();
    Object.keys(options).forEach(key => {
      if (options[key] !== undefined && options[key] !== null) {
        params.append(key, options[key].toString());
      }
    });

    const response = await api.get(`/search-accounts/${coinSymbol}/${coinName}?${params}`);
    return response.data;
  },

  // Enhanced search with pagination and filters
  searchAccountsWithQuery: async (query: string, options: {
    page?: number;
    limit?: number;
    minFollowers?: number;
    maxFollowers?: number;
    includeVerified?: boolean;
    accountCategories?: string[];
    minEngagementRate?: number;
    language?: string;
    location?: string;
    hasRecentActivity?: boolean;
    useOAuth?: boolean;
  } = {}) => {
    const params = new URLSearchParams();
    params.append('query', query);
    
    // Add all other options except query (which is already added)
    Object.keys(options).forEach(key => {
      const value = options[key as keyof typeof options];
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(item => params.append(`${key}[]`, item.toString()));
        } else {
          params.append(key, value.toString());
        }
      }
    });

    const response = await api.get(`/search-accounts-query?${params}`);
    return response.data;
  },

  // Setup monitoring for selected accounts
  setupMonitoring: async (coinSymbol: string, coinName: string, accountIds: string[]) => {
    const response = await api.post(`/setup-monitoring/${coinSymbol}/${coinName}`, {
      accountIds
    });
    return response.data;
  },

  // Confirm accounts for monitoring
  confirmAccounts: async (coinSymbol: string, accountIds: string[]) => {
    const response = await api.post(`/confirm-monitoring/${coinSymbol}`, {
      accountIds
    });
    return response.data;
  },

  // Get sentiment summary for a coin
  getSentimentSummary: async (coinSymbol: string, timeframe: string = '24h') => {
    const response = await api.get(`/sentiment-summary/${coinSymbol}?timeframe=${timeframe}`);
    return response.data;
  },

  // Get account correlation data
  getAccountCorrelation: async (coinSymbol: string, days: number = 30) => {
    const response = await api.get(`/correlation/${coinSymbol}?days=${days}`);
    return response.data;
  },

  // Get posts for specific account
  getAccountPosts: async (accountId: string, options: { 
    limit?: number; 
    sinceId?: string;
    coinSymbol?: string;
  } = {}) => {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.sinceId) params.append('sinceId', options.sinceId);
    if (options.coinSymbol) params.append('coinSymbol', options.coinSymbol);

    const response = await api.get(`/account-posts/${accountId}?${params}`);
    return response.data;
  },

  // Analyze post sentiment
  analyzePostSentiment: async (text: string, coinSymbol: string) => {
    const response = await api.post('/analyze-sentiment', { text, coinSymbol });
    return response.data;
  },

  // Get monitoring status
  getMonitoringStatus: async (coinSymbol: string) => {
    const response = await api.get(`/monitoring-status/${coinSymbol}`);
    return response.data;
  },

  // Get monitored accounts for a specific coin
  getMonitoredAccounts: async (coinSymbol: string) => {
    const response = await api.get(`/monitored-accounts/${coinSymbol}`);
    return response.data;
  },

  // Get sentiment trend analysis
  getSentimentTrend: async (coinSymbol: string, timeframe: '1h' | '4h' | '24h' | '7d' = '24h') => {
    const response = await api.get(`/trend/${coinSymbol}?timeframe=${timeframe}`);
    return response.data;
  },

  // Get enhanced keyword analysis
  getEnhancedKeywords: async (coinSymbol: string, timeframe: string = '24h') => {
    const response = await api.get(`/keywords/${coinSymbol}?timeframe=${timeframe}`);
    return response.data;
  },

  // Get sentiment alerts
  getSentimentAlerts: async (coinSymbol: string) => {
    const response = await api.get(`/alerts/${coinSymbol}`);
    return response.data;
  },

  // Get account influence metrics
  getAccountInfluenceMetrics: async (accountId: string) => {
    const response = await api.get(`/influence/${accountId}`);
    return response.data;
  },

  // Get recommended accounts
  getRecommendedAccounts: async (coinSymbol: string) => {
    const response = await api.get(`/recommended-accounts/${coinSymbol}`);
    return response.data;
  },

  // Add recommended account to monitoring
  addRecommendedAccountToMonitoring: async (accountId: string, coinSymbol: string) => {
    const response = await api.post('/add-recommended-account', {
      accountId,
      coinSymbol
    });
    return response.data;
  },

  // === NEW ENHANCED FEATURES ===

  // Search History Management
  saveSearchHistory: async (searchHistory: SearchHistory) => {
    const response = await api.post('/search-history', searchHistory);
    return response.data;
  },

  getSearchHistory: async (coinSymbol: string) => {
    const response = await api.get(`/search-history/${coinSymbol}`);
    return response.data;
  },

  deleteSearchHistory: async (historyId: string) => {
    const response = await api.delete(`/search-history/${historyId}`);
    return response.data;
  },

  // Saved Searches Management
  saveSearch: async (savedSearch: Omit<SavedSearch, 'id' | 'createdAt' | 'lastUsed' | 'useCount'>) => {
    const response = await api.post('/saved-searches', savedSearch);
    return response.data;
  },

  getSavedSearches: async (coinSymbol: string) => {
    const response = await api.get(`/saved-searches/${coinSymbol}`);
    return response.data;
  },

  updateSavedSearch: async (searchId: string, updates: Partial<SavedSearch>) => {
    const response = await api.put(`/saved-searches/${searchId}`, updates);
    return response.data;
  },

  deleteSavedSearch: async (searchId: string) => {
    const response = await api.delete(`/saved-searches/${searchId}`);
    return response.data;
  },

  // Popular Searches and Accounts
  getPopularSearches: async (coinSymbol: string, limit: number = 10) => {
    const response = await api.get(`/popular-searches/${coinSymbol}?limit=${limit}`);
    return response.data;
  },

  getPopularAccounts: async (coinSymbol: string, limit: number = 10) => {
    const response = await api.get(`/popular-accounts/${coinSymbol}?limit=${limit}`);
    return response.data;
  },

  // Bulk Import Accounts
  bulkImportAccounts: async (usernames: string[], coinSymbol: string): Promise<{ data: BulkImportResult }> => {
    const response = await api.post('/bulk-import-accounts', {
      usernames,
      coinSymbol
    });
    return response.data;
  },

  // Account Categories
  getAccountCategories: async () => {
    const response = await api.get('/account-categories');
    return response.data;
  },

  updateAccountCategory: async (accountId: string, categoryId: string) => {
    const response = await api.put(`/account-category/${accountId}`, {
      categoryId
    });
    return response.data;
  },

  // Enhanced Account Details
  getAccountDetails: async (accountId: string, coinSymbol?: string) => {
    const params = coinSymbol ? `?coinSymbol=${coinSymbol}` : '';
    const response = await api.get(`/account-details/${accountId}${params}`);
    return response.data;
  },

  getAccountEngagementMetrics: async (accountId: string, days: number = 30) => {
    const response = await api.get(`/account-engagement/${accountId}?days=${days}`);
    return response.data;
  },

  // Search Analytics
  getSearchAnalytics: async (coinSymbol: string, timeframe: string = '7d') => {
    const response = await api.get(`/search-analytics/${coinSymbol}?timeframe=${timeframe}`);
    return response.data;
  },

  // Account Performance Tracking
  getAccountPerformance: async (accountId: string, coinSymbol: string, timeframe: string = '7d') => {
    const response = await api.get(`/account-performance/${accountId}?coinSymbol=${coinSymbol}&timeframe=${timeframe}`);
    return response.data;
  },

  // Sentiment Score Explanations
  getSentimentScoreExplanation: async (score: number) => {
    const response = await api.get(`/sentiment-explanation?score=${score}`);
    return response.data;
  },

  // Export Data
  exportSearchResults: async (searchId: string, format: 'csv' | 'json' = 'csv') => {
    const response = await api.get(`/export-search-results/${searchId}?format=${format}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  exportMonitoringData: async (coinSymbol: string, timeframe: string = '7d', format: 'csv' | 'json' = 'csv') => {
    const response = await api.get(`/export-monitoring-data/${coinSymbol}?timeframe=${timeframe}&format=${format}`, {
      responseType: 'blob'
    });
    return response.data;
  }
};

export default socialSentimentApi; 