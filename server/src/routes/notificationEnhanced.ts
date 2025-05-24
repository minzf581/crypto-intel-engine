import { Router } from 'express';
import { NotificationEnhancedController } from '../controllers/NotificationEnhancedController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Notification history and management
router.get('/history', NotificationEnhancedController.getHistory);
router.get('/grouped', NotificationEnhancedController.getGrouped);
router.put('/settings', NotificationEnhancedController.updateSettings);
router.post('/fcm-token', NotificationEnhancedController.registerFCMToken);
router.post('/test', NotificationEnhancedController.testNotification);

// Volume analysis endpoints
router.get('/volume/:symbol', NotificationEnhancedController.getVolumeAnalysis);
router.get('/volume-unusual', NotificationEnhancedController.getUnusualVolumeSymbols);
router.post('/volume/analyze', NotificationEnhancedController.triggerVolumeAnalysis);

// News analysis endpoints
router.get('/news', NotificationEnhancedController.getNewsAnalysis);
router.get('/news/sentiment-trends', NotificationEnhancedController.getSentimentTrends);
router.get('/news/portfolio-impact', NotificationEnhancedController.getPortfolioNewsImpact);
router.post('/news/analyze', NotificationEnhancedController.triggerNewsAnalysis);

export default router; 