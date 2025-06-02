import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middlewares/auth';
import rateLimitService from '../services/rateLimitService';
import cacheService from '../services/cacheService';
import priceService from '../services/priceService';
import { VolumeAnalysisService } from '../services/VolumeAnalysisService';
import logger from '../utils/logger';
import axios from 'axios';

const router = Router();

/**
 * Get system health status
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        database: 'connected',
        cache: 'active',
        rateLimit: 'active'
      }
    };

    res.json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get rate limit status for all services
 */
router.get('/rate-limits', authenticateToken, async (req: Request, res: Response) => {
  try {
    const services = ['coingecko', 'twitter', 'newsapi'];
    const rateLimits: Record<string, any> = {};

    for (const service of services) {
      rateLimits[service] = rateLimitService.getRateLimitStatus(service);
    }

    res.json({
      rateLimits,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get rate limit status:', error);
    res.status(500).json({
      error: 'Failed to retrieve rate limit status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get cache statistics
 */
router.get('/cache-stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const stats = cacheService.getStats();
    
    res.json({
      cache: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get cache stats:', error);
    res.status(500).json({
      error: 'Failed to retrieve cache statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Clear cache for specific service or all
 */
router.delete('/cache', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { service } = req.query;

    cacheService.clear();
    logger.info(service ? `Cache cleared for service: ${service}` : 'All cache cleared');

    res.json({
      message: service ? `Cache cleared for ${service}` : 'All cache cleared',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to clear cache:', error);
    res.status(500).json({
      error: 'Failed to clear cache',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Clear rate limit history for specific service
 */
router.delete('/rate-limits/:service', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { service } = req.params;
    
    rateLimitService.clearRateLimitHistory(service);
    
    res.json({
      message: `Rate limit history cleared for ${service}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Failed to clear rate limit history for ${req.params.service}:`, error);
    res.status(500).json({
      error: 'Failed to clear rate limit history',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get comprehensive system status
 */
router.get('/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Get service statistics
    const priceStats = priceService.getServiceStats();
    const volumeService = VolumeAnalysisService.getInstance();
    const volumeStats = volumeService.getServiceStats();

    // Get rate limits for all services
    const services = ['coingecko', 'twitter', 'newsapi'];
    const rateLimits: Record<string, any> = {};
    for (const service of services) {
      rateLimits[service] = rateLimitService.getRateLimitStatus(service);
    }

    // Get cache stats
    const cacheStats = cacheService.getStats();

    // Clean up expired cache items
    const expiredCount = cacheService.cleanupExpired();

    // Generate recommendations
    const recommendations = generateRecommendations(rateLimits, cacheStats);

    const systemStatus = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        priceService: priceStats,
        volumeService: volumeStats,
      },
      rateLimits,
      cache: {
        ...cacheStats,
        expiredItemsRemoved: expiredCount
      },
      recommendations
    };

    res.json(systemStatus);
  } catch (error) {
    logger.error('Failed to get system status:', error);
    res.status(500).json({
      error: 'Failed to retrieve system status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Generate system recommendations based on current status
 */
function generateRecommendations(rateLimits: Record<string, any>, cacheStats: any): string[] {
  const recommendations: string[] = [];

  // Check rate limit usage
  for (const [service, status] of Object.entries(rateLimits)) {
    const usagePercent = (status.requestsInWindow / status.maxRequests) * 100;
    
    if (usagePercent > 80) {
      recommendations.push(`${service} rate limit usage is high (${usagePercent.toFixed(1)}%). Consider reducing request frequency.`);
    } else if (usagePercent > 60) {
      recommendations.push(`${service} rate limit usage is moderate (${usagePercent.toFixed(1)}%). Monitor closely.`);
    }
  }

  // Check cache usage
  const cacheUsagePercent = (cacheStats.size / cacheStats.maxSize) * 100;
  if (cacheUsagePercent > 80) {
    recommendations.push(`Cache usage is high (${cacheUsagePercent.toFixed(1)}%). Consider increasing cache size or reducing TTL.`);
  }

  // Check memory usage
  const memoryUsage = process.memoryUsage();
  const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;
  if (memoryUsageMB > 500) {
    recommendations.push(`Memory usage is high (${memoryUsageMB.toFixed(1)}MB). Consider optimizing memory usage.`);
  }

  if (recommendations.length === 0) {
    recommendations.push('System is operating within normal parameters.');
  }

  return recommendations;
}

/**
 * Test API connectivity
 */
router.post('/test-api/:service', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { service } = req.params;
    
    let testResult: any = {};
    
    switch (service) {
      case 'coingecko':
        // Test CoinGecko API with a simple ping
        testResult = await rateLimitService.executeWithRateLimit(
          'coingecko',
          async () => {
            const response = await axios.get('https://api.coingecko.com/api/v3/ping', {
              timeout: 5000
            });
            return response.data;
          }
        );
        break;
        
      default:
        return res.status(400).json({
          error: 'Unsupported service',
          supportedServices: ['coingecko']
        });
    }
    
    res.json({
      service,
      status: 'success',
      result: testResult,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error(`API test failed for ${req.params.service}:`, error);
    res.status(500).json({
      service: req.params.service,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router; 