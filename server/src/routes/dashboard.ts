import { Router } from 'express';
import priceService from '../services/priceService';
import { Asset } from '../models';
import logger from '../utils/logger';

const router = Router();

/**
 * 获取仪表板数据
 */
router.get('/data', async (req, res) => {
  try {
    // 获取所有资产
    const assets = await Asset.findAll();
    
    // 获取当前价格历史数据
    const priceHistory = priceService.getPriceHistory();
    
    // 构建仪表板数据
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
    
    logger.info(`返回 ${dashboardData.length} 个资产的仪表板数据`);
    
    res.json({
      success: true,
      data: {
        assets: dashboardData,
        lastUpdate: new Date(),
        hasRealData: Object.keys(priceHistory).length > 0
      }
    });
    
  } catch (error) {
    logger.error('获取仪表板数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取仪表板数据失败'
    });
  }
});

/**
 * 手动触发价格检查（仅用于测试）
 */
router.post('/trigger-price-check', async (req, res) => {
  try {
    logger.info('手动触发价格检查');
    await priceService.triggerPriceCheck();
    
    res.json({
      success: true,
      message: '价格检查已触发'
    });
    
  } catch (error) {
    logger.error('手动触发价格检查失败:', error);
    res.status(500).json({
      success: false,
      message: '触发价格检查失败'
    });
  }
});

export default router; 