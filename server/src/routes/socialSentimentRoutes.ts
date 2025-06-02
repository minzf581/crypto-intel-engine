import { Router } from 'express';
import { SocialSentimentController } from '../controllers/SocialSentimentController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();
const socialSentimentController = new SocialSentimentController();

// Search accounts for a specific cryptocurrency
router.get('/search-accounts/:coinSymbol/:coinName', 
  authenticateToken, 
  socialSentimentController.searchAccountsForCoin
);

// Search accounts with custom query
router.get('/search-accounts-query',
  authenticateToken,
  socialSentimentController.searchAccountsWithQuery
);

// Setup monitoring for a cryptocurrency
router.post('/setup-monitoring/:coinSymbol/:coinName',
  authenticateToken,
  socialSentimentController.setupCoinMonitoring
);

// Confirm accounts for monitoring
router.post('/confirm-monitoring/:coinSymbol',
  authenticateToken,
  socialSentimentController.confirmAccountsForMonitoring
);

// Get sentiment summary for a coin
router.get('/sentiment-summary/:coinSymbol',
  authenticateToken,
  socialSentimentController.getCoinSentimentSummary
);

// Get account correlation data
router.get('/correlation/:coinSymbol',
  authenticateToken,
  socialSentimentController.getAccountCorrelationData
);

// Get posts for specific account
router.get('/account-posts/:accountId',
  authenticateToken,
  socialSentimentController.getAccountPosts
);

// Analyze post sentiment
router.post('/analyze-sentiment',
  authenticateToken,
  socialSentimentController.analyzePostSentiment
);

// Get sentiment trend analysis
router.get('/trend/:coinSymbol',
  authenticateToken,
  socialSentimentController.getSentimentTrend
);

// Get enhanced keyword analysis
router.get('/keywords/:coinSymbol',
  authenticateToken,
  socialSentimentController.getEnhancedKeywords
);

// Get sentiment alerts
router.get('/alerts/:coinSymbol',
  authenticateToken,
  socialSentimentController.getSentimentAlerts
);

// Get account influence metrics
router.get('/influence/:accountId',
  authenticateToken,
  socialSentimentController.getAccountInfluenceMetrics
);

// Get monitoring status
router.get('/monitoring-status/:coinSymbol',
  authenticateToken,
  socialSentimentController.getMonitoringStatus
);

// Get monitored accounts list for a coin
router.get('/monitored-accounts/:coinSymbol',
  authenticateToken,
  socialSentimentController.getMonitoredAccounts
);

// Get recommended accounts for a specific coin
router.get('/recommended-accounts/:coinSymbol',
  authenticateToken,
  socialSentimentController.getRecommendedAccounts
);

// Add recommended account to monitoring list
router.post('/add-recommended-account',
  authenticateToken,
  socialSentimentController.addRecommendedAccountToMonitoring
);

// === NEW ENHANCED FEATURES ROUTES ===

// Search History Management
router.post('/search-history',
  authenticateToken,
  socialSentimentController.saveSearchHistory
);

router.get('/search-history/:coinSymbol',
  authenticateToken,
  socialSentimentController.getSearchHistory
);

router.delete('/search-history/:historyId',
  authenticateToken,
  socialSentimentController.deleteSearchHistory
);

// Saved Searches Management
router.post('/saved-searches',
  authenticateToken,
  socialSentimentController.saveSearch
);

router.get('/saved-searches/:coinSymbol',
  authenticateToken,
  socialSentimentController.getSavedSearches
);

router.put('/saved-searches/:searchId',
  authenticateToken,
  socialSentimentController.updateSavedSearch
);

router.delete('/saved-searches/:searchId',
  authenticateToken,
  socialSentimentController.deleteSavedSearch
);

// Popular Searches and Accounts
router.get('/popular-searches/:coinSymbol',
  authenticateToken,
  socialSentimentController.getPopularSearches
);

router.get('/popular-accounts/:coinSymbol',
  authenticateToken,
  socialSentimentController.getPopularAccounts
);

// Bulk Import Accounts
router.post('/bulk-import-accounts',
  authenticateToken,
  socialSentimentController.bulkImportAccounts
);

// Account Categories
router.get('/account-categories',
  authenticateToken,
  socialSentimentController.getAccountCategories
);

router.put('/account-category/:accountId',
  authenticateToken,
  socialSentimentController.updateAccountCategory
);

// Enhanced Account Details
router.get('/account-details/:accountId',
  authenticateToken,
  socialSentimentController.getAccountDetails
);

router.get('/account-engagement/:accountId',
  authenticateToken,
  socialSentimentController.getAccountEngagementMetrics
);

// Search Analytics
router.get('/search-analytics/:coinSymbol',
  authenticateToken,
  socialSentimentController.getSearchAnalytics
);

// Account Performance Tracking
router.get('/account-performance/:accountId',
  authenticateToken,
  socialSentimentController.getAccountPerformance
);

// Sentiment Score Explanations
router.get('/sentiment-explanation',
  authenticateToken,
  socialSentimentController.getSentimentScoreExplanation
);

// Export Data
router.get('/export-search-results/:searchId',
  authenticateToken,
  socialSentimentController.exportSearchResults
);

router.get('/export-monitoring-data/:coinSymbol',
  authenticateToken,
  socialSentimentController.exportMonitoringData
);

export default router; 