import { detectFrontendEnvironment } from '../utils/environment';

// Get environment configuration
const envConfig = detectFrontendEnvironment();

// Export API base URL for use in services
export const API_BASE_URL = envConfig.apiUrl;

// Export other API-related constants
export const API_TIMEOUT = 10000;
export const API_RETRY_ATTEMPTS = 3;

// API endpoints configuration
export const API_ENDPOINTS = {
  // Authentication
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
  },
  
  // Price monitoring
  price: {
    base: '/price',
    alerts: '/price/alerts',
    signals: '/price/signals',
    history: '/price/history',
  },
  
  // Social sentiment
  socialSentiment: {
    base: '/social-sentiment',
    searchAccounts: '/social-sentiment/search-accounts',
    setupMonitoring: '/social-sentiment/setup-monitoring',
    sentimentSummary: '/social-sentiment/sentiment-summary',
    correlation: '/social-sentiment/correlation',
  },
  
  // News sentiment
  news: {
    base: '/news',
    sentiment: '/news/sentiment',
    trends: '/news/trends',
    breaking: '/news/breaking',
  },
  
  // Technical analysis
  technical: {
    base: '/technical',
    indicators: '/technical/indicators',
    signals: '/technical/signals',
  },
  
  // On-chain analysis
  onChain: {
    base: '/on-chain',
    analysis: '/on-chain/analysis',
    whale: '/on-chain/whale-alerts',
    metrics: '/on-chain/metrics',
  },
  
  // User management
  user: {
    profile: '/user/profile',
    settings: '/user/settings',
    preferences: '/user/preferences',
  },
};

export default {
  API_BASE_URL,
  API_TIMEOUT,
  API_RETRY_ATTEMPTS,
  API_ENDPOINTS,
}; 