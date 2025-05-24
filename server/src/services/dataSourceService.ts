/**
 * Multi-Source Data Service
 * Integrates multiple data sources for enhanced reliability
 */

import axios from 'axios';
import logger from '../utils/logger';

export interface PriceData {
  symbol: string;
  price: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  volume24h: number;
  marketCap: number;
  source: string;
  timestamp: Date;
}

export interface VolumeAnalysis {
  symbol: string;
  volume24h: number;
  volumeChange24h: number;
  volumeRatio: number; // Volume relative to historical average
  isHighVolume: boolean;
  significance: 'low' | 'medium' | 'high';
}

export interface NewsData {
  title: string;
  description: string;
  url: string;
  publishedAt: Date;
  source: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  relevanceScore?: number;
}

class DataSourceService {
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;
  
  /**
   * Get price data from multiple sources with fallback
   */
  async getMultiSourcePriceData(coinIds: string[]): Promise<PriceData[]> {
    const sources = [
      this.getCoinGeckoPrices.bind(this),
      // Add more sources here in the future
    ];
    
    for (const source of sources) {
      try {
        const data = await source(coinIds);
        if (data && data.length > 0) {
          return data;
        }
      } catch (error) {
        logger.warn(`Data source failed, trying next source:`, error);
      }
    }
    
    throw new Error('All data sources failed');
  }
  
  /**
   * Get price data from CoinGecko
   */
  private async getCoinGeckoPrices(coinIds: string[]): Promise<PriceData[]> {
    if (coinIds.length === 0) {
      return [];
    }
    
    const url = 'https://api.coingecko.com/api/v3/simple/price';
    const params = {
      ids: coinIds.join(','),
      vs_currencies: 'usd',
      include_24hr_change: 'true',
      include_24hr_vol: 'true',
      include_market_cap: 'true'
    };
    
    const response = await axios.get(url, { params, timeout: 10000 });
    const data = response.data;
    
    return Object.entries(data).map(([coinId, priceInfo]: [string, any]) => ({
      symbol: this.getSymbolFromCoinId(coinId),
      price: priceInfo.usd || 0,
      priceChange24h: priceInfo.usd_24h_change || 0,
      priceChangePercentage24h: priceInfo.usd_24h_change || 0,
      volume24h: priceInfo.usd_24h_vol || 0,
      marketCap: priceInfo.usd_market_cap || 0,
      source: 'coingecko',
      timestamp: new Date()
    }));
  }
  
  /**
   * Analyze volume patterns and anomalies
   */
  async analyzeVolumeData(priceData: PriceData[]): Promise<VolumeAnalysis[]> {
    return priceData.map(data => {
      // Simple volume analysis - can be enhanced with historical data
      const volumeThresholds = {
        low: 1000000,    // $1M
        medium: 10000000, // $10M
        high: 100000000   // $100M
      };
      
      let significance: 'low' | 'medium' | 'high' = 'low';
      if (data.volume24h > volumeThresholds.high) {
        significance = 'high';
      } else if (data.volume24h > volumeThresholds.medium) {
        significance = 'medium';
      }
      
      // Estimate if volume is unusual (simplified)
      const isHighVolume = data.volume24h > volumeThresholds.medium;
      const volumeRatio = data.volume24h / volumeThresholds.medium;
      
      return {
        symbol: data.symbol,
        volume24h: data.volume24h,
        volumeChange24h: 0, // Would need historical data
        volumeRatio,
        isHighVolume,
        significance
      };
    });
  }
  
  /**
   * Get cryptocurrency news from multiple sources
   */
  async getCryptoNews(keywords: string[] = ['bitcoin', 'ethereum', 'crypto']): Promise<NewsData[]> {
    try {
      // Using CryptoCompare news API as example
      const url = 'https://min-api.cryptocompare.com/data/v2/news/';
      const params = {
        lang: 'EN',
        sortOrder: 'latest',
        categories: 'BTC,ETH,Trading'
      };
      
      const response = await axios.get(url, { params, timeout: 10000 });
      const newsItems = response.data.Data || [];
      
      return newsItems.slice(0, 20).map((item: any) => ({
        title: item.title,
        description: item.body,
        url: item.url,
        publishedAt: new Date(item.published_on * 1000),
        source: item.source_info?.name || 'CryptoCompare',
        sentiment: this.analyzeSentiment(item.title + ' ' + item.body),
        relevanceScore: this.calculateRelevance(item.title, keywords)
      }));
    } catch (error) {
      logger.warn('Failed to fetch crypto news:', error);
      return [];
    }
  }
  
  /**
   * Simple sentiment analysis (can be enhanced with ML)
   */
  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['bull', 'surge', 'rally', 'gain', 'rise', 'up', 'growth', 'increase'];
    const negativeWords = ['bear', 'crash', 'fall', 'drop', 'decline', 'down', 'loss', 'decrease'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }
  
  /**
   * Calculate relevance score for news
   */
  private calculateRelevance(title: string, keywords: string[]): number {
    const lowerTitle = title.toLowerCase();
    const matches = keywords.filter(keyword => lowerTitle.includes(keyword.toLowerCase()));
    return matches.length / keywords.length;
  }
  
  /**
   * Get symbol from CoinGecko coin ID (simplified mapping)
   */
  private getSymbolFromCoinId(coinId: string): string {
    const mapping: { [key: string]: string } = {
      'bitcoin': 'BTC',
      'ethereum': 'ETH',
      'binancecoin': 'BNB',
      'solana': 'SOL',
      'cardano': 'ADA',
      'polkadot': 'DOT',
      'dogecoin': 'DOGE',
      'bridged-maga-wormhole': 'TRUMP'
    };
    
    return mapping[coinId] || coinId.toUpperCase();
  }
  
  /**
   * Detect price anomalies using statistical methods
   */
  async detectPriceAnomalies(priceData: PriceData[]): Promise<{
    symbol: string;
    anomalyType: 'price_spike' | 'volume_spike' | 'unusual_movement';
    severity: 'low' | 'medium' | 'high';
    description: string;
  }[]> {
    const anomalies: any[] = [];
    
    for (const data of priceData) {
      // Detect significant price changes
      if (Math.abs(data.priceChangePercentage24h) > 20) {
        anomalies.push({
          symbol: data.symbol,
          anomalyType: 'price_spike',
          severity: Math.abs(data.priceChangePercentage24h) > 50 ? 'high' : 'medium',
          description: `${data.symbol} experienced a ${data.priceChangePercentage24h.toFixed(2)}% price change in 24h`
        });
      }
      
      // Detect volume anomalies (simplified)
      const volumeAnalysis = await this.analyzeVolumeData([data]);
      if (volumeAnalysis[0].isHighVolume) {
        anomalies.push({
          symbol: data.symbol,
          anomalyType: 'volume_spike',
          severity: volumeAnalysis[0].significance,
          description: `${data.symbol} showing unusual trading volume: $${(data.volume24h / 1000000).toFixed(2)}M`
        });
      }
    }
    
    return anomalies;
  }
}

export const dataSourceService = new DataSourceService(); 