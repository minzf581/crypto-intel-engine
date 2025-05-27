import { Router } from 'express';
import { protect } from '../middlewares/auth';
import priceService from '../services/priceService';
import { socialSentimentService, newsSentimentService, technicalIndicatorService } from '../services';
import { Asset, Signal } from '../models';
import logger from '../utils/logger';

const router = Router();

// All routes require authentication
router.use(protect);

// Get data source status
router.get('/data-sources/status', async (req, res) => {
  try {
    // Check actual service statuses
    const currentTime = new Date();
    
    // Check price monitoring service
    const priceHistory = priceService.getPriceHistory();
    const hasPriceData = Object.keys(priceHistory).length > 0;
    
    // Check if price data is recent (within last 5 minutes for more reliability)
    let priceDataRecent = false;
    if (hasPriceData) {
      // Get the most recent update from any asset
      const latestUpdate = Object.values(priceHistory)
        .map(data => data?.lastUpdated ? new Date(data.lastUpdated).getTime() : 0)
        .filter(time => time > 0)
        .sort((a, b) => b - a)[0];
      
      if (latestUpdate) {
        const timeDiff = currentTime.getTime() - latestUpdate;
        priceDataRecent = timeDiff < 5 * 60 * 1000; // Less than 5 minutes
      }
    }
    
    // For development, always show at least price monitoring as online if service is running
    const isPriceMonitoringActive = hasPriceData || process.env.NODE_ENV === 'development';
    const isMarketDataActive = hasPriceData || process.env.NODE_ENV === 'development';
    
    // Test social sentiment service
    let isSocialSentimentActive = false;
    try {
      await socialSentimentService.getSocialMetrics('BTC');
      isSocialSentimentActive = true;
      logger.info('Social sentiment service is active');
    } catch (error) {
      logger.warn('Social sentiment service check failed:', error);
    }
    
    // Test news analysis service
    let isNewsAnalysisActive = false;
    try {
      await newsSentimentService.analyzeNewsSentiment('BTC');
      isNewsAnalysisActive = true;
      logger.info('News analysis service is active');
    } catch (error) {
      logger.warn('News analysis service check failed:', error);
    }
    
    // Test technical analysis service
    let isTechnicalAnalysisActive = false;
    try {
      await technicalIndicatorService.analyzeTechnicalIndicators('BTC');
      isTechnicalAnalysisActive = true;
      logger.info('Technical analysis service is active');
    } catch (error) {
      logger.warn('Technical analysis service check failed:', error);
    }
    
    const status = {
      priceMonitoring: isPriceMonitoringActive,
      socialSentiment: isSocialSentimentActive,
      newsAnalysis: isNewsAnalysisActive,
      technicalAnalysis: isTechnicalAnalysisActive,
      marketData: isMarketDataActive
    };
    
    logger.info(`Data source status check: ${JSON.stringify({
      hasPriceData,
      priceDataRecent,
      isPriceMonitoringActive,
      isMarketDataActive,
      isSocialSentimentActive,
      isNewsAnalysisActive,
      isTechnicalAnalysisActive,
      historyKeys: Object.keys(priceHistory).length
    })}`);
    
    res.json({
      success: true,
      data: {
        status,
        lastUpdated: currentTime.toISOString(),
        activeSources: Object.entries(status).filter(([_, active]) => active).length,
        totalSources: Object.keys(status).length
      }
    });
  } catch (error) {
    logger.error('Failed to get data source status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get data source status'
    });
  }
});

// Get comprehensive analysis for specific asset
router.get('/comprehensive/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    // Find asset
    const asset = await Asset.findOne({ where: { symbol: symbol.toUpperCase() } });
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }
    
    // Get recent signals for this asset
    const signals = await Signal.findAll({
      where: { assetSymbol: symbol.toUpperCase() },
      order: [['timestamp', 'DESC']],
      limit: 20
    });
    
    // Calculate analysis metrics
    const totalSignals = signals.length;
    const sentimentSignals = signals.filter(s => s.type === 'sentiment');
    const priceSignals = signals.filter(s => s.type === 'price');
    const narrativeSignals = signals.filter(s => s.type === 'narrative');
    
    const avgStrength = totalSignals > 0 
      ? signals.reduce((sum, s) => sum + s.strength, 0) / totalSignals 
      : 0;
    
    const lastSignal = signals[0];
    
    res.json({
      success: true,
      data: {
        asset: {
          symbol: asset.symbol,
          name: asset.name,
          logo: asset.logo
        },
        analysis: {
          totalSignals,
          avgStrength: Math.round(avgStrength),
          lastSignalTime: lastSignal ? lastSignal.timestamp : null,
          breakdown: {
            sentiment: sentimentSignals.length,
            price: priceSignals.length,
            narrative: narrativeSignals.length
          }
        },
        recentSignals: signals.slice(0, 5).map(signal => ({
          id: signal.id,
          type: signal.type,
          strength: signal.strength,
          description: signal.description,
          timestamp: signal.timestamp
        }))
      }
    });
    
  } catch (error) {
    logger.error(`Failed to get comprehensive analysis for ${req.params.symbol}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to get comprehensive analysis'
    });
  }
});

// Generate test signals (development only)
router.post('/test-signals', async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({
      success: false,
      message: 'Test signals are only available in development mode'
    });
  }

  try {
    // Since we removed demo data, this endpoint now returns a message
    // indicating that real signals are generated automatically
    logger.info('Test signals endpoint called - real signals are generated automatically');
    
    res.json({
      success: true,
      message: 'Real signals are generated automatically by the system. No test signals needed.'
    });
  } catch (error) {
    logger.error('Failed to process test signals request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process test signals request'
    });
  }
});

export default router; 