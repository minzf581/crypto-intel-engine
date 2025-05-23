import express from 'express';
import { protect } from '../middlewares/auth';
import logger from '../utils/logger';
import ComprehensiveAnalysisService from '../services/comprehensiveAnalysisService';
import SocialSentimentService from '../services/socialSentimentService';
import NewsSentimentService from '../services/newsSentimentService';
import TechnicalIndicatorService from '../services/technicalIndicatorService';
import OnChainAnalysisService from '../services/onChainAnalysisService';

const router = express.Router();

// Initialize services
const comprehensiveService = new ComprehensiveAnalysisService();
const socialService = new SocialSentimentService();
const newsService = new NewsSentimentService();
const technicalService = new TechnicalIndicatorService();
const onchainService = new OnChainAnalysisService();

/**
 * Get comprehensive analysis for a specific cryptocurrency
 * Combines social sentiment, news analysis, technical indicators, and on-chain data
 */
router.get('/comprehensive/:symbol', protect, async (req, res) => {
  try {
    const { symbol } = req.params;
    const analysis = await comprehensiveService.performComprehensiveAnalysis(symbol.toUpperCase());
    
    logger.info(`Comprehensive analysis served for ${symbol}`, {
      signalCount: analysis.signals.length,
      sentiment: analysis.intelligence.overallSentiment.trend
    });

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    logger.error('Failed to get comprehensive analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform comprehensive analysis'
    });
  }
});

/**
 * Get social sentiment analysis for a cryptocurrency
 */
router.get('/social/:symbol', protect, async (req, res) => {
  try {
    const { symbol } = req.params;
    const { timeframe = '24h' } = req.query;
    
    const [metrics, trends] = await Promise.all([
      socialService.getSocialMetrics(symbol.toUpperCase()),
      socialService.getSentimentTrends(symbol.toUpperCase(), timeframe as any)
    ]);

    res.json({
      success: true,
      data: {
        metrics,
        trends
      }
    });
  } catch (error) {
    logger.error('Failed to get social sentiment analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze social sentiment'
    });
  }
});

/**
 * Get news sentiment analysis for a cryptocurrency
 */
router.get('/news/:symbol', protect, async (req, res) => {
  try {
    const { symbol } = req.params;
    const { timeframe = '7d' } = req.query;
    
    const [sentiment, trends] = await Promise.all([
      newsService.analyzeNewsSentiment(symbol.toUpperCase()),
      newsService.getNewsTrends(symbol.toUpperCase(), timeframe as any)
    ]);

    res.json({
      success: true,
      data: {
        sentiment,
        trends
      }
    });
  } catch (error) {
    logger.error('Failed to get news sentiment analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze news sentiment'
    });
  }
});

/**
 * Get technical analysis for a cryptocurrency
 */
router.get('/technical/:symbol', protect, async (req, res) => {
  try {
    const { symbol } = req.params;
    const { timeframe = '1d' } = req.query;
    
    const [analysis, multiTimeframe] = await Promise.all([
      technicalService.analyzeTechnicalIndicators(symbol.toUpperCase(), timeframe as any),
      technicalService.getMultiTimeframeAnalysis(symbol.toUpperCase())
    ]);

    res.json({
      success: true,
      data: {
        analysis,
        multiTimeframe
      }
    });
  } catch (error) {
    logger.error('Failed to get technical analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform technical analysis'
    });
  }
});

/**
 * Get on-chain analysis for a cryptocurrency
 */
router.get('/onchain/:symbol', protect, async (req, res) => {
  try {
    const { symbol } = req.params;
    const { timeframe = '30d' } = req.query;
    
    const [analysis, trends] = await Promise.all([
      onchainService.analyzeOnChainData(symbol.toUpperCase()),
      onchainService.getOnChainTrends(symbol.toUpperCase(), timeframe as any)
    ]);

    res.json({
      success: true,
      data: {
        analysis,
        trends
      }
    });
  } catch (error) {
    logger.error('Failed to get on-chain analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform on-chain analysis'
    });
  }
});

/**
 * Get breaking news alerts for multiple cryptocurrencies
 */
router.get('/news/alerts', protect, async (req, res) => {
  try {
    const { symbols = 'BTC,ETH,SOL' } = req.query;
    const symbolArray = (symbols as string).split(',').map(s => s.trim().toUpperCase());
    
    const alerts = await newsService.getBreakingNews(symbolArray);

    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    logger.error('Failed to get news alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get news alerts'
    });
  }
});

/**
 * Get whale activity alerts for multiple cryptocurrencies
 */
router.get('/onchain/whale-alerts', protect, async (req, res) => {
  try {
    const { symbols = 'BTC,ETH,SOL' } = req.query;
    const symbolArray = (symbols as string).split(',').map(s => s.trim().toUpperCase());
    
    const alerts = await onchainService.getWhaleActivityAlerts(symbolArray);

    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    logger.error('Failed to get whale alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get whale activity alerts'
    });
  }
});

/**
 * Get network health summary for multiple cryptocurrencies
 */
router.get('/onchain/health-summary', protect, async (req, res) => {
  try {
    const { symbols = 'BTC,ETH,SOL,BNB,ADA,DOT,DOGE' } = req.query;
    const symbolArray = (symbols as string).split(',').map(s => s.trim().toUpperCase());
    
    const summary = await onchainService.getNetworkHealthSummary(symbolArray);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    logger.error('Failed to get network health summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get network health summary'
    });
  }
});

/**
 * Get portfolio analysis for multiple cryptocurrencies
 */
router.get('/portfolio', protect, async (req, res) => {
  try {
    const { symbols = 'BTC,ETH,SOL' } = req.query;
    const symbolArray = (symbols as string).split(',').map(s => s.trim().toUpperCase());
    
    const portfolio = await comprehensiveService.getPortfolioAnalysis(symbolArray);

    res.json({
      success: true,
      data: portfolio
    });
  } catch (error) {
    logger.error('Failed to get portfolio analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform portfolio analysis'
    });
  }
});

/**
 * Get market overview with sentiment and risk analysis
 */
router.get('/market-overview', protect, async (req, res) => {
  try {
    const symbols = ['BTC', 'ETH', 'SOL', 'BNB', 'ADA'];
    
    // Get quick analysis for all major cryptocurrencies
    const overviewData = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const analysis = await comprehensiveService.performComprehensiveAnalysis(symbol);
          return {
            symbol,
            sentiment: analysis.intelligence.overallSentiment,
            risk: analysis.intelligence.riskAssessment,
            recommendation: analysis.intelligence.investmentRecommendation,
            signalCount: analysis.signals.length,
            lastUpdated: analysis.lastUpdated
          };
        } catch (error) {
          logger.warn(`Failed to get analysis for ${symbol}:`, error);
          return {
            symbol,
            sentiment: { score: 0, trend: 'neutral', confidence: 0 },
            risk: { level: 'medium', factors: [], score: 50 },
            recommendation: { action: 'hold', reasoning: [], confidence: 0.5, timeHorizon: 'medium' },
            signalCount: 0,
            lastUpdated: new Date()
          };
        }
      })
    );

    // Calculate market-wide metrics
    const marketMetrics = {
      averageSentiment: overviewData.reduce((sum, item) => sum + item.sentiment.score, 0) / overviewData.length,
      riskDistribution: {
        low: overviewData.filter(item => item.risk.level === 'low').length,
        medium: overviewData.filter(item => item.risk.level === 'medium').length,
        high: overviewData.filter(item => item.risk.level === 'high').length
      },
      totalSignals: overviewData.reduce((sum, item) => sum + item.signalCount, 0),
      bullishAssets: overviewData.filter(item => item.sentiment.trend === 'bullish').length,
      bearishAssets: overviewData.filter(item => item.sentiment.trend === 'bearish').length,
      lastUpdated: new Date()
    };

    res.json({
      success: true,
      data: {
        marketMetrics,
        assetOverview: overviewData
      }
    });
  } catch (error) {
    logger.error('Failed to get market overview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get market overview'
    });
  }
});

/**
 * Get analysis data sources status
 */
router.get('/data-sources/status', protect, async (req, res) => {
  try {
    const testSymbol = 'BTC';
    const status = {
      social: { available: true, lastCheck: new Date(), latency: 0 },
      news: { available: true, lastCheck: new Date(), latency: 0 },
      technical: { available: true, lastCheck: new Date(), latency: 0 },
      onchain: { available: true, lastCheck: new Date(), latency: 0 }
    };

    // Test each service
    const tests = await Promise.allSettled([
      socialService.getSocialMetrics(testSymbol),
      newsService.analyzeNewsSentiment(testSymbol),
      technicalService.analyzeTechnicalIndicators(testSymbol),
      onchainService.analyzeOnChainData(testSymbol)
    ]);

    const services = ['social', 'news', 'technical', 'onchain'];
    tests.forEach((result, index) => {
      const service = services[index] as keyof typeof status;
      status[service].available = result.status === 'fulfilled';
      if (result.status === 'rejected') {
        logger.warn(`Service ${service} is not available:`, result.reason);
      }
    });

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Failed to check data sources status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check data sources status'
    });
  }
});

export default router; 