import { Router } from 'express';
import priceService from '../services/priceService';
import { Asset, User } from '../models';
import logger from '../utils/logger';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

/**
 * Get dashboard data for user's selected assets only
 */
router.get('/data', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Get user's selected assets
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // If user has no selected assets, return empty data
    if (!user.selectedAssets || user.selectedAssets.length === 0) {
      return res.json({
        success: true,
        data: {
          assets: [],
          lastUpdate: new Date(),
          hasRealData: false,
          message: 'No assets selected. Please add cryptocurrencies from the sidebar.'
        }
      });
    }

    // Get only user's selected assets
    const assets = await Asset.findAll({
      where: {
        symbol: user.selectedAssets
      }
    });
    
    // Get current price history data
    const priceHistory = priceService.getPriceHistory();
    
    // Build dashboard data for selected assets only
    const dashboardData = assets.map(asset => {
      const priceData = priceHistory[asset.symbol];
      
      return {
        id: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        logo: asset.logo,
        currentPrice: priceData ? priceData.currentPrice : null,
        priceChange24h: priceData ? priceData.priceChangePercentage24h : null,
        lastUpdated: priceData ? priceData.lastUpdated : null
      };
    });
    
    logger.info(`Returning dashboard data for ${dashboardData.length} selected assets for user ${userId}`);
    
    res.json({
      success: true,
      data: {
        assets: dashboardData,
        selectedAssetsCount: user.selectedAssets.length,
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