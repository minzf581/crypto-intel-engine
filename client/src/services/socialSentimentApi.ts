import axios from 'axios';
import { API_BASE_URL } from '../config/api';

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
  searchAccounts: async (
    coinSymbol: string,
    coinName: string,
    options: SearchAccountsOptions = {}
  ) => {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.minFollowers) params.append('minFollowers', options.minFollowers.toString());
    if (options.includeVerified !== undefined) params.append('includeVerified', options.includeVerified.toString());
    if (options.useOAuth !== undefined) params.append('useOAuth', options.useOAuth.toString());

    const response = await api.get(`/search-accounts/${coinSymbol}/${coinName}?${params}`);
    return response.data;
  },

  // Search accounts with custom query
  searchAccountsWithQuery: async (
    query: string,
    options: SearchAccountsOptions = {}
  ) => {
    const params = new URLSearchParams();
    params.append('query', query);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.minFollowers) params.append('minFollowers', options.minFollowers.toString());
    if (options.includeVerified !== undefined) params.append('includeVerified', options.includeVerified.toString());
    if (options.useOAuth !== undefined) params.append('useOAuth', options.useOAuth.toString());

    const response = await api.get(`/search-accounts-query?${params}`);
    return response.data;
  },

  // Setup monitoring for a cryptocurrency
  setupMonitoring: async (
    coinSymbol: string,
    coinName: string,
    options: SetupMonitoringOptions = {}
  ) => {
    const response = await api.post(`/setup-monitoring/${coinSymbol}/${coinName}`, options);
    return response.data;
  },

  // Confirm accounts for monitoring
  confirmAccounts: async (coinSymbol: string, accountIds: string[]) => {
    const response = await api.post(`/confirm-monitoring/${coinSymbol}`, { accountIds });
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
  getAccountPosts: async (accountId: string, options: { limit?: number; sinceId?: string } = {}) => {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.sinceId) params.append('sinceId', options.sinceId);

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

  // Get sentiment trend analysis
  getSentimentTrend: async (coinSymbol: string, timeframe: '1h' | '4h' | '24h' | '7d' = '24h') => {
    const response = await api.get(`/trend/${coinSymbol}?timeframe=${timeframe}`);
    return response.data;
  },

  // Get enhanced keyword analysis
  getEnhancedKeywords: async (coinSymbol: string, options: { timeframe?: string; limit?: number } = {}) => {
    const params = new URLSearchParams();
    if (options.timeframe) params.append('timeframe', options.timeframe);
    if (options.limit) params.append('limit', options.limit.toString());

    const response = await api.get(`/keywords/${coinSymbol}?${params}`);
    return response.data;
  },

  // Get sentiment alerts
  getSentimentAlerts: async (coinSymbol: string, options: { limit?: number; severity?: string } = {}) => {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.severity) params.append('severity', options.severity);

    const response = await api.get(`/alerts/${coinSymbol}?${params}`);
    return response.data;
  },

  // Get account influence metrics
  getAccountInfluenceMetrics: async (accountId: string, options: { coinSymbol?: string; days?: number } = {}) => {
    const params = new URLSearchParams();
    if (options.coinSymbol) params.append('coinSymbol', options.coinSymbol);
    if (options.days) params.append('days', options.days.toString());

    const response = await api.get(`/influence/${accountId}?${params}`);
    return response.data;
  },

  // Get recommended accounts for a specific coin
  getRecommendedAccounts: async (coinSymbol: string, options: { 
    category?: string; 
    limit?: number; 
    includeInactive?: boolean 
  } = {}) => {
    const params = new URLSearchParams();
    if (options.category) params.append('category', options.category);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.includeInactive !== undefined) params.append('includeInactive', options.includeInactive.toString());

    const response = await api.get(`/recommended-accounts/${coinSymbol}?${params}`);
    return response.data;
  },

  // Add recommended account to monitoring list
  addRecommendedAccountToMonitoring: async (data: { accountId: string; coinSymbol: string }) => {
    const response = await api.post('/add-recommended-account', data);
    return response.data;
  },
};

export default socialSentimentApi; 