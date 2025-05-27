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

export default router; 