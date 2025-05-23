import axios from 'axios';
import { Asset, Signal } from '../models';
import logger from '../utils/logger';
import notificationService from './notificationService';
import { calculateStrength } from '../utils/signalUtils';

// CoinGecko API configuration
const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';
const PRICE_UPDATE_INTERVAL = 60000; // Update every 1 minute
const PRICE_CHANGE_THRESHOLD = 5; // 5% change threshold

// Cryptocurrency ID mapping (IDs used by CoinGecko API)
const COIN_ID_MAP: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum', 
  'BNB': 'binancecoin',
  'SOL': 'solana',
  'ADA': 'cardano',
  'DOT': 'polkadot',
  'DOGE': 'dogecoin'
};

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
   * Get cryptocurrency real-time prices
   */
  async fetchRealPrices(): Promise<PriceData[]> {
    try {
      const assets = await Asset.findAll();
      const coinIds = assets
        .map(asset => COIN_ID_MAP[asset.symbol])
        .filter(Boolean)
        .join(',');

      if (!coinIds) {
        logger.warn('No supported cryptocurrency IDs found');
        return [];
      }

      logger.info(`Fetching price data: ${coinIds}`);

      const response = await axios.get(`${COINGECKO_API_BASE}/simple/price`, {
        params: {
          ids: coinIds,
          vs_currencies: 'usd',
          include_24hr_change: true,
          include_last_updated_at: true
        },
        timeout: 10000
      });

      const priceData: PriceData[] = [];

      for (const asset of assets) {
        const coinId = COIN_ID_MAP[asset.symbol];
        if (!coinId || !response.data[coinId]) {
          logger.warn(`No price data found for ${asset.symbol}`);
          continue;
        }

        const data = response.data[coinId];
        priceData.push({
          symbol: asset.symbol,
          currentPrice: data.usd || 0,
          priceChange24h: data.usd_24h_change || 0,
          priceChangePercentage24h: data.usd_24h_change || 0,
          lastUpdated: new Date(data.last_updated_at * 1000 || Date.now())
        });
      }

      logger.info(`Successfully fetched price data for ${priceData.length} cryptocurrencies`);
      return priceData;

    } catch (error: any) {
      if (error.response?.status === 429) {
        logger.error('CoinGecko API rate limit exceeded');
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        logger.error('Network connection failed, unable to fetch price data');
      } else {
        logger.error('Failed to fetch price data:', error.message);
      }
      throw new Error(`Failed to fetch price data: ${error.message}`);
    }
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

    logger.info('Starting real-time price monitoring service');

    // Execute immediately
    this.monitorPrices();

    // Set up scheduled monitoring
    this.intervalId = setInterval(() => {
      this.monitorPrices();
    }, PRICE_UPDATE_INTERVAL);
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
   * Manually trigger price check (for testing)
   */
  async triggerPriceCheck(): Promise<void> {
    await this.monitorPrices();
  }
}

// Export singleton
const priceService = new PriceService();

/**
 * Initialize price monitoring service
 */
export const initializePriceMonitor = () => {
  logger.info('Initializing real-time price monitoring service');
  priceService.startPriceMonitoring();
};

export default priceService; 