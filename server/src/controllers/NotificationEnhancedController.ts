import { Request, Response } from 'express';
import notificationService from '../services/notificationService';
import { VolumeAnalysisService } from '../services/VolumeAnalysisService';
import { NewsAnalysisService } from '../services/NewsAnalysisService';
import logger from '../utils/logger';

export class NotificationEnhancedController {
  /**
   * Get notification history with enhanced features
   */
  static async getHistory(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const type = req.query.type as string;
      const priority = req.query.priority as string;

      const result = await notificationService.getNotificationHistory(
        userId,
        page,
        limit,
        type,
        priority
      );

      res.json(result);
    } catch (error) {
      logger.error('Failed to get notification history:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get grouped notifications
   */
  static async getGrouped(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const groups = await notificationService.getGroupedNotifications(userId);
      res.json(groups);
    } catch (error) {
      logger.error('Failed to get grouped notifications:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Update notification settings
   */
  static async updateSettings(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const settings = await notificationService.updateNotificationSettings(userId, req.body);
      res.json(settings);
    } catch (error) {
      logger.error('Failed to update notification settings:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Register FCM token for push notifications
   */
  static async registerFCMToken(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { fcmToken } = req.body;
      if (!fcmToken) {
        return res.status(400).json({ error: 'FCM token is required' });
      }

      logger.info(`FCM token registered for user ${userId}`);
      res.json({ success: true, message: 'FCM token registered successfully' });
    } catch (error) {
      logger.error('Failed to register FCM token:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get volume analysis data
   */
  static async getVolumeAnalysis(req: Request, res: Response) {
    try {
      const { symbol } = req.params;
      const days = parseInt(req.query.days as string) || 7;

      const volumeService = VolumeAnalysisService.getInstance();
      const history = await volumeService.getVolumeHistory(symbol, days);
      const anomaly = await volumeService.detectVolumeAnomalies(symbol);

      res.json({
        symbol,
        history,
        anomaly,
      });
    } catch (error) {
      logger.error('Failed to get volume analysis:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get unusual volume symbols
   */
  static async getUnusualVolumeSymbols(req: Request, res: Response) {
    try {
      const timeframe = parseInt(req.query.timeframe as string) || 24;

      const volumeService = VolumeAnalysisService.getInstance();
      const symbols = await volumeService.getUnusualVolumeSymbols(timeframe);

      res.json(symbols);
    } catch (error) {
      logger.error('Failed to get unusual volume symbols:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get news analysis data
   */
  static async getNewsAnalysis(req: Request, res: Response) {
    try {
      const hours = parseInt(req.query.hours as string) || 24;
      const sentiment = req.query.sentiment as string;
      const impact = req.query.impact as string;
      const coin = req.query.coin as string;

      const newsService = NewsAnalysisService.getInstance();
      const summary = await newsService.getNewsSummary(hours);
      const recentNews = await newsService.getRecentNews(20, sentiment, impact, coin);

      res.json({
        summary,
        recentNews,
      });
    } catch (error) {
      logger.error('Failed to get news analysis:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get sentiment trends for portfolio
   */
  static async getSentimentTrends(req: Request, res: Response) {
    try {
      const coins = req.query.coins as string;
      const days = parseInt(req.query.days as string) || 7;

      if (!coins) {
        return res.status(400).json({ error: 'Coins parameter is required' });
      }

      const coinList = coins.split(',');
      const newsService = NewsAnalysisService.getInstance();
      const trends = await newsService.analyzeSentimentTrends(coinList, days);

      res.json(trends);
    } catch (error) {
      logger.error('Failed to get sentiment trends:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get portfolio news impact
   */
  static async getPortfolioNewsImpact(req: Request, res: Response) {
    try {
      const symbols = req.query.symbols as string;

      if (!symbols) {
        return res.status(400).json({ error: 'Symbols parameter is required' });
      }

      const symbolList = symbols.split(',');
      const newsService = NewsAnalysisService.getInstance();
      const impact = await newsService.getPortfolioNewsImpact(symbolList);

      res.json(impact);
    } catch (error) {
      logger.error('Failed to get portfolio news impact:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Test notification with push
   */
  static async testNotification(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { title, message, type, priority, fcmToken } = req.body;

      const notification = await notificationService.createNotification(
        userId,
        title || 'Test Notification',
        message || 'This is a test notification with push support',
        type || 'system',
        priority || 'medium',
        { test: true, timestamp: new Date() },
        fcmToken,
        [
          { id: '1', label: 'View', action: 'view', icon: 'eye' },
          { id: '2', label: 'Dismiss', action: 'dismiss', icon: 'x' },
        ]
      );

      res.json({
        success: true,
        notification,
        message: 'Test notification sent successfully',
      });
    } catch (error) {
      logger.error('Failed to send test notification:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Trigger manual news analysis
   */
  static async triggerNewsAnalysis(req: Request, res: Response) {
    try {
      const newsService = NewsAnalysisService.getInstance();
      const analyzedNews = await newsService.fetchAndAnalyzeNews();

      res.json({
        success: true,
        analyzedCount: analyzedNews.length,
        message: 'News analysis completed successfully',
      });
    } catch (error) {
      logger.error('Failed to trigger news analysis:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Trigger manual volume analysis
   */
  static async triggerVolumeAnalysis(req: Request, res: Response) {
    try {
      const symbols = req.body.symbols || ['BTC', 'ETH', 'ADA', 'SOL'];

      const volumeService = VolumeAnalysisService.getInstance();
      const analyses = await volumeService.analyzeMultipleSymbols(symbols);

      res.json({
        success: true,
        analyses,
        message: 'Volume analysis completed successfully',
      });
    } catch (error) {
      logger.error('Failed to trigger volume analysis:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
} 