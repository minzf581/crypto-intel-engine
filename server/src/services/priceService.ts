import axios from 'axios';
import { Asset, Signal } from '../models';
import logger from '../utils/logger';
import notificationService from './notificationService';
import { calculateStrength } from '../utils/signalUtils';
import coinGeckoService from './coinGeckoService';
import rateLimitService from './rateLimitService';
import cacheService, { CacheService } from './cacheService';

// CoinGecko API configuration
const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';
const PRICE_UPDATE_INTERVAL = 60000; // Update every 1 minute
const PRICE_CHANGE_THRESHOLD = 2; // 2% change threshold (lowered from 5% to generate more signals)

// Price data interface
interface PriceData {
  symbol: string;
  currentPrice: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  lastUpdated: Date;
}

// Store previous price data
const priceHistory: Record<string, PriceData> = {};

class PriceService {
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Auto-resolve missing CoinGecko IDs for assets
   */
  private async autoResolveMissingCoinIds(): Promise<void> {
    try {
      const { Op } = require('sequelize');
      const assets = await Asset.findAll({
        where: {
          [Op.or]: [
            { coingeckoId: { [Op.is]: null } },
            { coingeckoId: '' }
          ]
        }
      });

      logger.info(`Found ${assets.length} assets without CoinGecko IDs, attempting to resolve...`);

      for (const asset of assets) {
        const coinId = await coinGeckoService.autoResolveCoinId(asset.symbol, asset.name);
        
        if (coinId) {
          await asset.update({ coingeckoId: coinId });
          logger.info(`✅ Resolved CoinGecko ID for ${asset.symbol}: ${coinId}`);
        } else {
          logger.warn(`❌ Could not resolve CoinGecko ID for ${asset.symbol}`);
        }
      }

    } catch (error: any) {
      logger.error('Failed to auto-resolve CoinGecko IDs:', error);
    }
  }

  /**
   * Get cryptocurrency real-time prices with rate limiting and caching
   */
  async fetchRealPrices(): Promise<PriceData[]> {
    try {
      // First, try to resolve any missing CoinGecko IDs
      await this.autoResolveMissingCoinIds();

      // Get assets with valid CoinGecko IDs
      const { Op } = require('sequelize');
      const assets = await Asset.findAll({
        where: {
          coingeckoId: {
            [Op.and]: [
              { [Op.not]: null },
              { [Op.ne]: '' }
            ]
          }
        }
      });

      if (assets.length === 0) {
        logger.warn('No assets with valid CoinGecko IDs found');
        return [];
      }

      const coinIds = assets
        .map(asset => asset.coingeckoId)
        .filter(Boolean)
        .join(',');

      if (!coinIds) {
        logger.warn('No valid CoinGecko IDs found');
        return [];
      }

      // Generate cache key
      const cacheKey = CacheService.generateCoinGeckoKey('price', {
        ids: coinIds,
        vs_currencies: 'usd',
        include_24hr_change: true,
        include_last_updated_at: true
      });

      // Try to get from cache first
      const cachedData = cacheService.get<any>(cacheKey);
      if (cachedData) {
        logger.info(`Using cached price data for ${assets.length} assets`);
        return this.processPriceResponse(cachedData, assets);
      }

      logger.info(`Fetching price data for: ${coinIds}`);

      // Use rate limiting service to make the API call
      const response = await rateLimitService.executeWithRateLimit(
        'coingecko',
        async () => {
          return await axios.get(
            `${COINGECKO_API_BASE}/simple/price`,
            {
              params: {
                ids: coinIds,
                vs_currencies: 'usd',
                include_24hr_change: true,
                include_last_updated_at: true
              },
              timeout: 10000
            }
          );
        },
        3 // max retries
      );

      // Cache the response
      cacheService.set(cacheKey, response.data);

      // Process and return the data
      return this.processPriceResponse(response.data, assets);

    } catch (error: any) {
      logger.error('Error fetching price data from CoinGecko:', error);
      
      // Check if it's a rate limit error and provide helpful message
      if (error.message.includes('Rate limit exceeded') || error.message.includes('429')) {
        logger.warn('CoinGecko API rate limit exceeded. Using cached data if available or reducing request frequency.');
        
        // Try to return any cached data as fallback
        const fallbackData = this.getFallbackPriceData();
        if (fallbackData.length > 0) {
          logger.info(`Returning ${fallbackData.length} cached price records as fallback`);
          return fallbackData;
        }
      }
      
      return [];
    }
  }

  /**
   * Process price response data
   */
  private processPriceResponse(responseData: any, assets: any[]): PriceData[] {
    const priceData: PriceData[] = assets.map(asset => {
      const coinId = asset.coingeckoId;
      const coinData = responseData[coinId!];

      if (!coinData) {
        logger.warn(`Price data not found for ${asset.symbol} (CoinGecko ID: ${coinId})`);
        return null;
      }

      return {
        symbol: asset.symbol,
        currentPrice: coinData.usd,
        priceChange24h: coinData.usd_24h_change || 0,
        priceChangePercentage24h: coinData.usd_24h_change || 0,
        lastUpdated: new Date(coinData.last_updated_at * 1000)
      };
    }).filter(Boolean) as PriceData[];

    logger.info(`Successfully processed price data for ${priceData.length} cryptocurrencies`);
    return priceData;
  }

  /**
   * Get fallback price data from cache or previous history
   */
  private getFallbackPriceData(): PriceData[] {
    const fallbackData: PriceData[] = [];
    
    // Try to get data from price history
    for (const [symbol, data] of Object.entries(priceHistory)) {
      // Only use data that's less than 10 minutes old
      const dataAge = Date.now() - data.lastUpdated.getTime();
      if (dataAge < 10 * 60 * 1000) {
        fallbackData.push(data);
      }
    }
    
    return fallbackData;
  }

  /**
   * Analyze price changes and generate signals
   */
  async analyzePriceChanges(priceData: PriceData[]): Promise<void> {
    for (const data of priceData) {
      const previousData = priceHistory[data.symbol];
      
      // If there is no historical data, save current data and skip
      if (!previousData) {
        priceHistory[data.symbol] = data;
        continue;
      }

      // Calculate price change percentage
      const priceChangePercent = Math.abs(data.priceChangePercentage24h);
      
      // Only generate signal when price change exceeds threshold
      if (priceChangePercent >= PRICE_CHANGE_THRESHOLD) {
        await this.createPriceSignal(data, previousData);
      }

      // Update historical data
      priceHistory[data.symbol] = data;
    }
  }

  /**
   * Create price signal
   */
  private async createPriceSignal(currentData: PriceData, previousData: PriceData): Promise<void> {
    try {
      // Get asset information
      const asset = await Asset.findOne({ where: { symbol: currentData.symbol } });
      if (!asset) {
        logger.warn(`Asset not found: ${currentData.symbol}`);
        return;
      }

      const changePercent = currentData.priceChangePercentage24h;
      const isPositive = changePercent > 0;
      
      // Generate signal description
      const description = isPositive 
        ? `${asset.name} price increased by ${changePercent.toFixed(2)}% in the last 24 hours, current price $${currentData.currentPrice.toLocaleString()}`
        : `${asset.name} price decreased by ${Math.abs(changePercent).toFixed(2)}% in the last 24 hours, current price $${currentData.currentPrice.toLocaleString()}`;

      // Calculate signal strength (based on price change magnitude)
      const strength = calculateStrength(Math.abs(changePercent), 'price');

      // Create signal
      const signal = await Signal.create({
        assetId: asset.id,
        assetSymbol: asset.symbol,
        assetName: asset.name,
        assetLogo: asset.logo,
        type: 'price',
        strength,
        description,
        sources: [{
          platform: 'price',
          priceChange: changePercent,
          currentPrice: currentData.currentPrice,
          previousPrice: previousData.currentPrice,
          timeframe: '24h'
        }],
        timestamp: new Date()
      });

      logger.info(`Generated price signal: ${asset.symbol} (${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%, strength: ${strength})`);

      // Send notification
      await notificationService.processSignal(signal);

    } catch (error) {
      logger.error(`Failed to create price signal:`, error);
    }
  }

  /**
   * Start price monitoring
   */
  startPriceMonitoring(): void {
    if (this.intervalId) {
      logger.warn('Price monitoring is already running');
      return;
    }

    logger.info('Starting real-time price monitoring service with rate limiting');

    // Execute immediately
    this.monitorPrices();

    // Set up scheduled monitoring
    this.intervalId = setInterval(() => {
      this.monitorPrices();
    }, PRICE_UPDATE_INTERVAL);

    // Set up cache cleanup interval
    setInterval(() => {
      cacheService.cleanupExpired();
    }, 5 * 60 * 1000); // Clean up every 5 minutes
  }

  /**
   * Stop price monitoring
   */
  stopPriceMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Price monitoring stopped');
    }
  }

  /**
   * Execute price monitoring
   */
  private async monitorPrices(): Promise<void> {
    try {
      logger.info('Starting price monitoring check...');
      
      // Check rate limit status
      const rateLimitStatus = rateLimitService.getRateLimitStatus('coingecko');
      logger.debug(`CoinGecko rate limit status: ${rateLimitStatus.requestsInWindow}/${rateLimitStatus.maxRequests} requests in window`);
      
      const priceData = await this.fetchRealPrices();
      
      if (priceData.length > 0) {
        await this.analyzePriceChanges(priceData);
        logger.info(`Price monitoring completed, processed ${priceData.length} cryptocurrencies`);
      } else {
        logger.warn('No price data fetched');
      }
    } catch (error) {
      logger.error('Error occurred during price monitoring:', error);
    }
  }

  /**
   * Get current price history data
   */
  getPriceHistory(): Record<string, PriceData> {
    return { ...priceHistory };
  }

  /**
   * Get cache and rate limit statistics
   */
  getServiceStats(): {
    cache: any;
    rateLimit: any;
  } {
    return {
      cache: cacheService.getStats(),
      rateLimit: rateLimitService.getRateLimitStatus('coingecko')
    };
  }

  /**
   * Initialize price monitoring service
   */
  initialize(): void {
    logger.info('Initializing real-time price monitoring service');
    this.startPriceMonitoring();
  }

  /**
   * Manually trigger price check (for testing)
   */
  async triggerPriceCheck(): Promise<void> {
    await this.monitorPrices();
  }
}

export default new PriceService();

/**
 * Initialize price monitoring service
 */
export const initializePriceMonitor = () => {
  logger.info('Initializing real-time price monitoring service');
  const priceService = new PriceService();
  priceService.startPriceMonitoring();
  return priceService;
}; 