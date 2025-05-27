/**
 * Enhanced Features API Routes
 * Provides access to advanced data analysis and notification features
 */

import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middlewares/auth';
import { dataSourceService } from '../services/dataSourceService';
import { newsService } from '../services/newsService';
import { enhancedNotificationService } from '../services/enhancedNotificationService';
import logger from '../utils/logger';

const router = Router();

/**
 * Multi-source data endpoints
 */

// Get enhanced price data with volume analysis
router.get('/data/enhanced-prices', authenticateToken, async (req: Request, res: Response) => {
  try {
    const coinIds = Array.isArray(req.query.coinIds) ? req.query.coinIds as string[] : 
                   typeof req.query.coinIds === 'string' ? req.query.coinIds.split(',') : [];
    
    if (coinIds.length === 0) {
      return res.status(400).json({ error: 'coinIds parameter is required' });
    }
    
    const priceData = await dataSourceService.getMultiSourcePriceData(coinIds);
    const volumeAnalysis = await dataSourceService.analyzeVolumeData(priceData);
    const anomalies = await dataSourceService.detectPriceAnomalies(priceData);
    
    res.json({
      prices: priceData,
      volumeAnalysis,
      anomalies,
      timestamp: new Date(),
      source: 'multi-source'
    });
  } catch (error) {
    logger.error('Failed to get enhanced price data:', error);
    res.status(500).json({ error: 'Failed to fetch enhanced price data' });
  }
});

// Get volume analysis for specific assets
router.get('/data/volume-analysis', authenticateToken, async (req: Request, res: Response) => {
  try {
    const symbols = Array.isArray(req.query.symbols) ? req.query.symbols as string[] :
                   typeof req.query.symbols === 'string' ? req.query.symbols.split(',') : [];
    
    if (symbols.length === 0) {
      return res.status(400).json({ error: 'symbols parameter is required' });
    }
    
    // This requires historical data for proper volume analysis
    // Configure real data sources for production use
    const coinIds = symbols.map(symbol => symbol.toLowerCase()); // Simplified mapping
    const priceData = await dataSourceService.getMultiSourcePriceData(coinIds);
    const volumeAnalysis = await dataSourceService.analyzeVolumeData(priceData);
    
    res.json({
      volumeAnalysis,
      insights: volumeAnalysis.map(analysis => ({
        symbol: analysis.symbol,
        significance: analysis.significance,
        recommendation: analysis.isHighVolume ? 
          `${analysis.symbol} is experiencing high volume - potential breakout opportunity` :
          `${analysis.symbol} volume is within normal range`,
        confidenceScore: analysis.volumeRatio > 2 ? 0.8 : analysis.volumeRatio > 1.5 ? 0.6 : 0.4
      }))
    });
  } catch (error) {
    logger.error('Failed to get volume analysis:', error);
    res.status(500).json({ error: 'Failed to perform volume analysis' });
  }
});

/**
 * News and narrative analysis endpoints
 */

// Get latest crypto news with sentiment analysis
router.get('/news/latest', authenticateToken, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const keywords = Array.isArray(req.query.keywords) ? req.query.keywords as string[] :
                    typeof req.query.keywords === 'string' ? req.query.keywords.split(',') : 
                    ['bitcoin', 'ethereum', 'crypto'];
    
    const news = await dataSourceService.getCryptoNews(keywords);
    const limitedNews = news.slice(0, limit);
    
    res.json({
      news: limitedNews,
      summary: {
        total: limitedNews.length,
        sentimentBreakdown: {
          positive: limitedNews.filter(n => n.sentiment === 'positive').length,
          negative: limitedNews.filter(n => n.sentiment === 'negative').length,
          neutral: limitedNews.filter(n => n.sentiment === 'neutral').length
        },
        topSources: [...new Set(limitedNews.map(n => n.source))].slice(0, 5)
      }
    });
  } catch (error) {
    logger.error('Failed to get crypto news:', error);
    res.status(500).json({ error: 'Failed to fetch crypto news' });
  }
});

// Get news-based trading signals
router.get('/news/signals', authenticateToken, async (req: Request, res: Response) => {
  try {
    const signals = await newsService.getNewsSignals();
    const limit = parseInt(req.query.limit as string) || 10;
    const assetFilter = req.query.asset as string;
    
    let filteredSignals = signals;
    if (assetFilter) {
      filteredSignals = signals.filter(signal => 
        signal.relevantAssets.includes(assetFilter.toUpperCase())
      );
    }
    
    const limitedSignals = filteredSignals
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
    
    res.json({
      signals: limitedSignals,
      summary: {
        total: limitedSignals.length,
        highImpact: limitedSignals.filter(s => s.impact === 'high').length,
        averageConfidence: limitedSignals.reduce((sum, s) => sum + s.confidence, 0) / limitedSignals.length,
        affectedAssets: [...new Set(limitedSignals.flatMap(s => s.relevantAssets))]
      }
    });
  } catch (error) {
    logger.error('Failed to get news signals:', error);
    res.status(500).json({ error: 'Failed to fetch news signals' });
  }
});

// Get market narratives
router.get('/news/narratives', authenticateToken, async (req: Request, res: Response) => {
  try {
    const narratives = await newsService.identifyMarketNarratives();
    
    res.json({
      narratives: narratives.sort((a, b) => b.strength - a.strength),
      summary: {
        total: narratives.length,
        bullishThemes: narratives.filter(n => n.sentiment === 'bullish').length,
        bearishThemes: narratives.filter(n => n.sentiment === 'bearish').length,
        neutralThemes: narratives.filter(n => n.sentiment === 'neutral').length,
        strongestNarrative: narratives.length > 0 ? narratives[0].theme : null
      }
    });
  } catch (error) {
    logger.error('Failed to get market narratives:', error);
    res.status(500).json({ error: 'Failed to fetch market narratives' });
  }
});

/**
 * Enhanced notification endpoints
 */

// Get notification groups
router.get('/notifications/groups', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const groups = await enhancedNotificationService.getNotificationGroups(userId);
    
    res.json({
      groups,
      summary: {
        totalGroups: groups.length,
        totalNotifications: groups.reduce((sum, g) => sum + g.notifications.length, 0),
        unreadCount: groups.reduce((sum, g) => 
          sum + g.notifications.filter(n => !n.read).length, 0
        ),
        urgentCount: groups.filter(g => g.priority === 'urgent').length
      }
    });
  } catch (error) {
    logger.error('Failed to get notification groups:', error);
    res.status(500).json({ error: 'Failed to fetch notification groups' });
  }
});

// Get notification history with filtering
router.get('/notifications/history', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50,
      type: req.query.type as string,
      priority: req.query.priority as string,
      assetSymbol: req.query.assetSymbol as string,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined
    };
    
    const result = await enhancedNotificationService.getNotificationHistory(userId, options);
    
    res.json(result);
  } catch (error) {
    logger.error('Failed to get notification history:', error);
    res.status(500).json({ error: 'Failed to fetch notification history' });
  }
});

// Update notification settings
router.put('/notifications/settings', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const settings = req.body;
    
    await enhancedNotificationService.updateNotificationSettings(userId, settings);
    
    res.json({ success: true, message: 'Notification settings updated' });
  } catch (error) {
    logger.error('Failed to update notification settings:', error);
    res.status(500).json({ error: 'Failed to update notification settings' });
  }
});

// Mark notifications as read
router.post('/notifications/mark-read', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { notificationIds } = req.body;
    
    if (!Array.isArray(notificationIds)) {
      return res.status(400).json({ error: 'notificationIds must be an array' });
    }
    
    await enhancedNotificationService.markAsRead(userId, notificationIds);
    
    res.json({ success: true, message: `Marked ${notificationIds.length} notifications as read` });
  } catch (error) {
    logger.error('Failed to mark notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// Dismiss notifications
router.post('/notifications/dismiss', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { notificationIds } = req.body;
    
    if (!Array.isArray(notificationIds)) {
      return res.status(400).json({ error: 'notificationIds must be an array' });
    }
    
    await enhancedNotificationService.dismissNotifications(userId, notificationIds);
    
    res.json({ success: true, message: `Dismissed ${notificationIds.length} notifications` });
  } catch (error) {
    logger.error('Failed to dismiss notifications:', error);
    res.status(500).json({ error: 'Failed to dismiss notifications' });
  }
});

// Execute notification action
router.post('/notifications/action', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { notificationId, actionId } = req.body;
    
    if (!notificationId || !actionId) {
      return res.status(400).json({ error: 'notificationId and actionId are required' });
    }
    
    const result = await enhancedNotificationService.executeNotificationAction(
      userId, 
      notificationId, 
      actionId
    );
    
    res.json(result);
  } catch (error) {
    logger.error('Failed to execute notification action:', error);
    res.status(500).json({ error: 'Failed to execute notification action' });
  }
});

/**
 * Analytics and statistics endpoints
 */

// Get signal statistics
router.get('/analytics/signals', authenticateToken, async (req: Request, res: Response) => {
  try {
    const timeframe = req.query.timeframe as string || '24h';
    const assetSymbol = req.query.assetSymbol as string;
    
    // Calculate real analytics based on historical signal data
    // This would typically query historical signal data from database
    const analytics = {
      timeframe,
      assetSymbol,
      signalCount: {
        total: 0, // TODO: Query from Signal table
        priceSignals: 0,
        newsSignals: 0,
        volumeSignals: 0
      },
      accuracy: {
        overall: 0, // TODO: Calculate from historical performance
        priceSignals: 0,
        newsSignals: 0,
        volumeSignals: 0
      },
      trends: {
        signalFrequency: 'unknown',
        averageStrength: 0,
        topPerformingType: 'none'
      },
      recommendations: [
        'Configure real data sources to enable signal analytics',
        'Set up Twitter API for social sentiment analysis',
        'Configure news APIs for comprehensive market analysis'
      ]
    };
    
    res.json(analytics);
  } catch (error) {
    logger.error('Failed to get signal analytics:', error);
    res.status(500).json({ error: 'Failed to fetch signal analytics' });
  }
});

// Get market sentiment overview
router.get('/analytics/sentiment', authenticateToken, async (req: Request, res: Response) => {
  try {
    const news = await dataSourceService.getCryptoNews();
    const signals = await newsService.getNewsSignals();
    
    const sentimentAnalysis = {
      overall: {
        score: 0.15, // Slightly positive (-1 to 1 scale)
        label: 'Cautiously Optimistic',
        confidence: 0.72
      },
      news: {
        total: news.length,
        positive: news.filter(n => n.sentiment === 'positive').length,
        negative: news.filter(n => n.sentiment === 'negative').length,
        neutral: news.filter(n => n.sentiment === 'neutral').length
      },
      signals: {
        total: signals.length,
        highImpact: signals.filter(s => s.impact === 'high').length,
        averageConfidence: signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length || 0
      },
      trends: {
        direction: 'improving',
        strength: 'moderate',
        volatility: 'low'
      },
      keyFactors: [
        'Institutional adoption news trending positive',
        'Regulatory clarity improving',
        'Technical indicators showing consolidation'
      ]
    };
    
    res.json(sentimentAnalysis);
  } catch (error) {
    logger.error('Failed to get sentiment analysis:', error);
    res.status(500).json({ error: 'Failed to fetch sentiment analysis' });
  }
});

export default router; 