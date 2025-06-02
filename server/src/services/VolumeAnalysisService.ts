import { VolumeAnalysis } from '../models/VolumeAnalysis';
import logger from '../utils/logger';
import axios from 'axios';
import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import rateLimitService from './rateLimitService';
import cacheService, { CacheService } from './cacheService';

export class VolumeAnalysisService {
  private static instance: VolumeAnalysisService;

  public static getInstance(): VolumeAnalysisService {
    if (!VolumeAnalysisService.instance) {
      VolumeAnalysisService.instance = new VolumeAnalysisService();
    }
    return VolumeAnalysisService.instance;
  }

  /**
   * Analyze volume for a specific symbol with rate limiting and caching
   */
  async analyzeVolume(symbol: string): Promise<VolumeAnalysis | null> {
    try {
      // Fetch volume data from CoinGecko with rate limiting
      const volumeData = await this.fetchVolumeData(symbol);
      if (!volumeData) {
        logger.warn(`No volume data available for ${symbol}`);
        return null;
      }

      // Calculate volume metrics
      const analysis = await this.calculateVolumeMetrics(symbol, volumeData);
      
      // Save analysis to database
      const volumeAnalysis = await VolumeAnalysis.create({
        id: uuidv4(),
        symbol,
        timestamp: new Date(),
        volume24h: analysis.volume24h,
        volumeChange: analysis.volumeChange,
        volumeAvg7d: analysis.volumeAvg7d,
        volumeRatio: analysis.volumeRatio,
        unusualVolumeDetected: analysis.unusualVolumeDetected,
        volumeSpike: analysis.volumeSpike,
      });

      logger.info(`Volume analysis completed for ${symbol}: ${analysis.unusualVolumeDetected ? 'Unusual volume detected' : 'Normal volume'}`);
      return volumeAnalysis;
    } catch (error) {
      logger.error(`Failed to analyze volume for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Analyze volume for multiple symbols with improved rate limiting
   */
  async analyzeMultipleSymbols(symbols: string[]): Promise<VolumeAnalysis[]> {
    const results: VolumeAnalysis[] = [];
    
    logger.info(`Starting volume analysis for ${symbols.length} symbols with rate limiting`);
    
    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      
      try {
        // Check rate limit status before each request
        const rateLimitStatus = rateLimitService.getRateLimitStatus('coingecko');
        logger.debug(`Processing ${symbol} (${i + 1}/${symbols.length}). Rate limit: ${rateLimitStatus.requestsInWindow}/${rateLimitStatus.maxRequests}`);
        
        const analysis = await this.analyzeVolume(symbol);
        if (analysis) {
          results.push(analysis);
        }
        
        // Add progressive delay to avoid overwhelming the API
        const delay = Math.min(500 + (i * 100), 2000); // Increase delay progressively, max 2 seconds
        await this.delay(delay);
        
      } catch (error) {
        logger.error(`Failed to analyze volume for ${symbol}:`, error);
        
        // If rate limit error, wait longer before continuing
        if (error instanceof Error && error.message.includes('rate limit')) {
          logger.warn(`Rate limit hit during volume analysis, waiting 60 seconds...`);
          await this.delay(60000);
        }
      }
    }

    logger.info(`Volume analysis completed for ${results.length}/${symbols.length} symbols`);
    return results;
  }

  /**
   * Get volume history for a symbol
   */
  async getVolumeHistory(symbol: string, days: number): Promise<VolumeAnalysis[]> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const history = await VolumeAnalysis.findAll({
        where: {
          symbol,
          timestamp: {
            [Op.gte]: startDate,
          },
        },
        order: [['timestamp', 'DESC']],
      });

      return history;
    } catch (error) {
      logger.error(`Failed to get volume history for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Get volume statistics for multiple symbols
   */
  async getVolumeStatistics(symbols: string[]): Promise<any[]> {
    const statistics = [];
    
    for (const symbol of symbols) {
      const recentAnalysis = await VolumeAnalysis.findAll({
        where: {
          symbol,
          timestamp: {
            [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        order: [['timestamp', 'DESC']],
        limit: 50,
      });

      if (recentAnalysis.length > 0) {
        const stats = this.calculateVolumeStatistics(symbol, recentAnalysis);
        statistics.push(stats);
      }
    }

    return statistics;
  }

  /**
   * Detect volume anomalies using statistical methods
   */
  async detectVolumeAnomalies(symbol: string): Promise<{
    isAnomaly: boolean;
    confidence: number;
    reason: string;
    currentVolume: number;
    averageVolume: number;
  }> {
    const historicalData = await this.getVolumeHistory(symbol, 30);
    
    if (historicalData.length < 7) {
      return {
        isAnomaly: false,
        confidence: 0,
        reason: 'Insufficient historical data',
        currentVolume: 0,
        averageVolume: 0,
      };
    }

    const volumes = historicalData.map(d => d.volume24h);
    const currentVolume = volumes[volumes.length - 1];
    const mean = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
    const variance = volumes.reduce((sum, vol) => sum + Math.pow(vol - mean, 2), 0) / volumes.length;
    const stdDev = Math.sqrt(variance);

    // Calculate z-score
    const zScore = Math.abs((currentVolume - mean) / stdDev);
    
    // Anomaly detection thresholds
    const moderateThreshold = 2.0; // 2 standard deviations
    const severeThreshold = 3.0;   // 3 standard deviations

    let isAnomaly = false;
    let confidence = 0;
    let reason = '';

    if (zScore > severeThreshold) {
      isAnomaly = true;
      confidence = Math.min(95, 70 + (zScore - severeThreshold) * 10);
      reason = `Severe volume anomaly detected (${zScore.toFixed(2)} standard deviations)`;
    } else if (zScore > moderateThreshold) {
      isAnomaly = true;
      confidence = Math.min(80, 50 + (zScore - moderateThreshold) * 20);
      reason = `Moderate volume anomaly detected (${zScore.toFixed(2)} standard deviations)`;
    } else {
      reason = 'Volume within normal range';
    }

    return {
      isAnomaly,
      confidence,
      reason,
      currentVolume,
      averageVolume: mean,
    };
  }

  /**
   * Get volume overview statistics
   */
  async getVolumeOverview(): Promise<{
    totalVolume: number;
    avgVolumeChange: number;
    spikesDetected: number;
    activeAssets: number;
  }> {
    try {
      // Get recent volume analyses
      const recentAnalyses = await VolumeAnalysis.findAll({
        where: {
          timestamp: {
            [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
        order: [['timestamp', 'DESC']],
      });

      if (recentAnalyses.length === 0) {
        return {
          totalVolume: 0,
          avgVolumeChange: 0,
          spikesDetected: 0,
          activeAssets: 0,
        };
      }

      // Calculate overview metrics
      const totalVolume = recentAnalyses.reduce((sum, analysis) => sum + analysis.volume24h, 0);
      const avgVolumeChange = recentAnalyses.reduce((sum, analysis) => sum + analysis.volumeChange, 0) / recentAnalyses.length;
      const spikesDetected = recentAnalyses.filter(analysis => analysis.volumeSpike || analysis.unusualVolumeDetected).length;
      const activeAssets = new Set(recentAnalyses.map(analysis => analysis.symbol)).size;

      return {
        totalVolume,
        avgVolumeChange,
        spikesDetected,
        activeAssets,
      };
    } catch (error) {
      logger.error('Failed to get volume overview:', error);
      return {
        totalVolume: 0,
        avgVolumeChange: 0,
        spikesDetected: 0,
        activeAssets: 0,
      };
    }
  }

  /**
   * Fetch volume data with rate limiting and caching
   */
  private async fetchVolumeData(symbol: string): Promise<any> {
    try {
      // Get coin ID from symbol with caching
      const coinId = await this.getCoinId(symbol);
      if (!coinId) return null;

      // Generate cache key for volume data
      const cacheKey = CacheService.generateCoinGeckoKey('market_chart', {
        coinId,
        vs_currency: 'usd',
        days: 30,
        interval: 'daily'
      });

      // Try to get from cache first
      const cachedData = cacheService.get<any>(cacheKey);
      if (cachedData) {
        logger.debug(`Using cached volume data for ${symbol}`);
        return cachedData;
      }

      // Fetch market data including volume with rate limiting
      const response = await rateLimitService.executeWithRateLimit(
        'coingecko',
        async () => {
          return await axios.get(
            `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart`,
            {
              params: {
                vs_currency: 'usd',
                days: 30,
                interval: 'daily',
              },
              timeout: 10000,
            }
          );
        },
        3 // max retries
      );

      // Cache the response
      cacheService.set(cacheKey, response.data);

      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch volume data for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get coin ID with caching
   */
  private async getCoinId(symbol: string): Promise<string | null> {
    try {
      // Generate cache key for coin list
      const cacheKey = 'coingecko:coinlist:all';

      // Try to get from cache first
      let coinList = cacheService.get<any[]>(cacheKey);
      
      if (!coinList) {
        // Fetch coin list with rate limiting
        const response = await rateLimitService.executeWithRateLimit(
          'coingecko',
          async () => {
            return await axios.get(
              'https://api.coingecko.com/api/v3/coins/list',
              { timeout: 10000 }
            );
          },
          3 // max retries
        );

        coinList = response.data;
        
        // Cache for 24 hours
        cacheService.set(cacheKey, coinList, 24 * 60 * 60 * 1000);
      }

      const coin = coinList?.find((c: any) => 
        c.symbol.toLowerCase() === symbol.toLowerCase()
      );

      return coin ? coin.id : null;
    } catch (error) {
      logger.error(`Failed to get coin ID for ${symbol}:`, error);
      return null;
    }
  }

  private async calculateVolumeMetrics(symbol: string, volumeData: any): Promise<{
    volume24h: number;
    volumeChange: number;
    volumeAvg7d: number;
    volumeRatio: number;
    unusualVolumeDetected: boolean;
    volumeSpike: boolean;
  }> {
    const volumes = volumeData.total_volumes || [];
    
    if (volumes.length === 0) {
      return {
        volume24h: 0,
        volumeChange: 0,
        volumeAvg7d: 0,
        volumeRatio: 0,
        unusualVolumeDetected: false,
        volumeSpike: false,
      };
    }

    // Get current and previous day volumes
    const currentVolume = volumes[volumes.length - 1][1];
    const previousVolume = volumes.length > 1 ? volumes[volumes.length - 2][1] : currentVolume;
    
    // Calculate 7-day average
    const last7Days = volumes.slice(-7);
    const volumeAvg7d = last7Days.reduce((sum: number, vol: any) => sum + vol[1], 0) / last7Days.length;
    
    // Calculate metrics
    const volumeChange = previousVolume > 0 ? ((currentVolume - previousVolume) / previousVolume) * 100 : 0;
    const volumeRatio = volumeAvg7d > 0 ? currentVolume / volumeAvg7d : 0;
    
    // Detect unusual volume (more than 200% of 7-day average)
    const unusualVolumeDetected = volumeRatio > 2.0;
    
    // Detect volume spike (more than 50% increase from previous day)
    const volumeSpike = Math.abs(volumeChange) > 50;

    return {
      volume24h: currentVolume,
      volumeChange,
      volumeAvg7d,
      volumeRatio,
      unusualVolumeDetected,
      volumeSpike,
    };
  }

  private calculateVolumeStatistics(symbol: string, analyses: VolumeAnalysis[]): any {
    const volumes = analyses.map(a => a.volume24h);
    const volumeChanges = analyses.map(a => a.volumeChange);
    
    const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
    const maxVolume = Math.max(...volumes);
    const minVolume = Math.min(...volumes);
    
    const avgVolumeChange = volumeChanges.reduce((sum, change) => sum + change, 0) / volumeChanges.length;
    const volatility = Math.sqrt(
      volumeChanges.reduce((sum, change) => sum + Math.pow(change - avgVolumeChange, 2), 0) / volumeChanges.length
    );

    const unusualVolumeCount = analyses.filter(a => a.unusualVolumeDetected).length;
    const volumeSpikeCount = analyses.filter(a => a.volumeSpike).length;

    return {
      symbol,
      avgVolume,
      maxVolume,
      minVolume,
      avgVolumeChange,
      volatility,
      unusualVolumeCount,
      volumeSpikeCount,
      totalAnalyses: analyses.length,
      lastUpdated: analyses[0].timestamp,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get symbols with unusual volume activity
   */
  async getUnusualVolumeSymbols(timeframe: number = 24): Promise<VolumeAnalysis[]> {
    try {
      const startDate = new Date(Date.now() - timeframe * 60 * 60 * 1000);
      
      const unusualVolumes = await VolumeAnalysis.findAll({
        where: {
          timestamp: {
            [Op.gte]: startDate,
          },
          [Op.or]: [
            { unusualVolumeDetected: true },
            { volumeSpike: true },
          ],
        },
        order: [['timestamp', 'DESC']],
      });

      return unusualVolumes;
    } catch (error) {
      logger.error(`Failed to get unusual volume symbols:`, error);
      return [];
    }
  }

  /**
   * Get service statistics
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
} 