import { Router } from 'express';
import priceService from '../services/priceService';
import { Asset } from '../models';
import logger from '../utils/logger';

const router = Router();

/**
 * Get dashboard data
 */
router.get('/data', async (req, res) => {
  try {
    // Get all assets
    const assets = await Asset.findAll();
    
    // Get current price history data
    const priceHistory = priceService.getPriceHistory();
    
    // Build dashboard data
    const dashboardData = assets.map(asset => {
      const priceData = priceHistory[asset.symbol];
      
      return {
        symbol: asset.symbol,
        name: asset.name,
        logo: asset.logo,
        currentPrice: priceData ? priceData.currentPrice : null,
        priceChange24h: priceData ? priceData.priceChangePercentage24h : null,
        lastUpdated: priceData ? priceData.lastUpdated : null
      };
    });
    
    logger.info(`Returning dashboard data for ${dashboardData.length} assets`);
    
    res.json({
      success: true,
      data: {
        assets: dashboardData,
        lastUpdate: new Date(),
        hasRealData: Object.keys(priceHistory).length > 0
      }
    });
    
  } catch (error) {
    logger.error('Failed to get dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard data'
    });
  }
});

/**
 * Manual trigger price check (only for testing)
 */
router.post('/trigger-price-check', async (req, res) => {
  try {
    logger.info('Manual trigger price check');
    await priceService.triggerPriceCheck();
    
    res.json({
      success: true,
      message: 'Price check triggered'
    });
    
  } catch (error) {
    logger.error('Manual trigger price check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger price check'
    });
  }
});

export default router; 