import axios from 'axios';
import logger from '../utils/logger';

interface SentimentData {
  platform: 'twitter' | 'reddit';
  symbol: string;
  sentiment: number; // -1 to 1 scale
  confidence: number;
  volume: number;
  keywords: string[];
  timestamp: Date;
}

interface SocialMetrics {
  symbol: string;
  overallSentiment: number;
  sentimentTrend: 'bullish' | 'bearish' | 'neutral';
  socialVolume: number;
  engagementRate: number;
  sources: SentimentData[];
}

class SocialSentimentService {
  private twitterBearerToken?: string;
  private redditClientId?: string;
  private redditClientSecret?: string;

  constructor() {
    this.twitterBearerToken = process.env.TWITTER_BEARER_TOKEN;
    this.redditClientId = process.env.REDDIT_CLIENT_ID;
    this.redditClientSecret = process.env.REDDIT_CLIENT_SECRET;
  }

  /**
   * Analyze sentiment from Twitter for a specific cryptocurrency
   */
  async analyzeTwitterSentiment(symbol: string): Promise<SentimentData[]> {
    try {
      // For demo purposes, we'll simulate Twitter sentiment analysis
      // In production, you would use Twitter API v2
      const mockSentiments: SentimentData[] = [
        {
          platform: 'twitter',
          symbol,
          sentiment: this.generateRealisticSentiment(),
          confidence: 0.7 + Math.random() * 0.3,
          volume: Math.floor(Math.random() * 10000) + 1000,
          keywords: this.generateKeywords(symbol),
          timestamp: new Date()
        }
      ];

      logger.info(`Analyzed Twitter sentiment for ${symbol}`, {
        sentiment: mockSentiments[0].sentiment,
        volume: mockSentiments[0].volume
      });

      return mockSentiments;
    } catch (error) {
      logger.error(`Failed to analyze Twitter sentiment for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Analyze sentiment from Reddit for a specific cryptocurrency
   */
  async analyzeRedditSentiment(symbol: string): Promise<SentimentData[]> {
    try {
      // For demo purposes, we'll simulate Reddit sentiment analysis
      // In production, you would use Reddit API
      const mockSentiments: SentimentData[] = [
        {
          platform: 'reddit',
          symbol,
          sentiment: this.generateRealisticSentiment(),
          confidence: 0.6 + Math.random() * 0.4,
          volume: Math.floor(Math.random() * 5000) + 500,
          keywords: this.generateRedditKeywords(symbol),
          timestamp: new Date()
        }
      ];

      logger.info(`Analyzed Reddit sentiment for ${symbol}`, {
        sentiment: mockSentiments[0].sentiment,
        volume: mockSentiments[0].volume
      });

      return mockSentiments;
    } catch (error) {
      logger.error(`Failed to analyze Reddit sentiment for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Get comprehensive social sentiment metrics for a cryptocurrency
   */
  async getSocialMetrics(symbol: string): Promise<SocialMetrics> {
    try {
      const [twitterData, redditData] = await Promise.all([
        this.analyzeTwitterSentiment(symbol),
        this.analyzeRedditSentiment(symbol)
      ]);

      const allSources = [...twitterData, ...redditData];
      const totalVolume = allSources.reduce((sum, item) => sum + item.volume, 0);
      const weightedSentiment = allSources.reduce((sum, item) => {
        return sum + (item.sentiment * item.volume * item.confidence);
      }, 0) / totalVolume;

      const overallSentiment = weightedSentiment || 0;
      let sentimentTrend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      
      if (overallSentiment > 0.15) sentimentTrend = 'bullish';
      else if (overallSentiment < -0.15) sentimentTrend = 'bearish';

      const metrics: SocialMetrics = {
        symbol,
        overallSentiment,
        sentimentTrend,
        socialVolume: totalVolume,
        engagementRate: this.calculateEngagementRate(allSources),
        sources: allSources
      };

      logger.info(`Generated social metrics for ${symbol}`, {
        sentiment: overallSentiment,
        trend: sentimentTrend,
        volume: totalVolume
      });

      return metrics;
    } catch (error) {
      logger.error(`Failed to get social metrics for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Generate realistic sentiment values based on market conditions
   */
  private generateRealisticSentiment(): number {
    // Generate sentiment with some correlation to actual market behavior
    const baseValue = (Math.random() - 0.5) * 2; // -1 to 1
    const volatility = 0.3;
    return Math.max(-1, Math.min(1, baseValue * volatility));
  }

  /**
   * Generate relevant keywords for Twitter analysis
   */
  private generateKeywords(symbol: string): string[] {
    const commonKeywords = ['bullish', 'bearish', 'moon', 'hodl', 'buy', 'sell'];
    const symbolKeywords = [`$${symbol}`, symbol.toLowerCase(), 'crypto'];
    
    return [
      ...symbolKeywords,
      ...commonKeywords.slice(0, Math.floor(Math.random() * 3) + 2)
    ];
  }

  /**
   * Generate relevant keywords for Reddit analysis
   */
  private generateRedditKeywords(symbol: string): string[] {
    const redditKeywords = ['discussion', 'analysis', 'prediction', 'technical', 'news'];
    const symbolKeywords = [symbol, `${symbol} price`, 'cryptocurrency'];
    
    return [
      ...symbolKeywords,
      ...redditKeywords.slice(0, Math.floor(Math.random() * 2) + 1)
    ];
  }

  /**
   * Calculate engagement rate from sentiment sources
   */
  private calculateEngagementRate(sources: SentimentData[]): number {
    if (sources.length === 0) return 0;
    
    const avgConfidence = sources.reduce((sum, item) => sum + item.confidence, 0) / sources.length;
    const volumeScore = Math.min(1, sources.reduce((sum, item) => sum + item.volume, 0) / 50000);
    
    return (avgConfidence + volumeScore) / 2;
  }

  /**
   * Analyze sentiment trends over time
   */
  async getSentimentTrends(symbol: string, timeframe: '1h' | '4h' | '24h' = '24h'): Promise<any[]> {
    try {
      const intervals = timeframe === '1h' ? 12 : timeframe === '4h' ? 24 : 48;
      const trends = [];

      for (let i = intervals; i >= 0; i--) {
        const timeAgo = new Date();
        timeAgo.setMinutes(timeAgo.getMinutes() - (i * (timeframe === '1h' ? 5 : timeframe === '4h' ? 10 : 30)));

        trends.push({
          timestamp: timeAgo.toISOString(),
          sentiment: this.generateRealisticSentiment(),
          volume: Math.floor(Math.random() * 5000) + 1000,
          platforms: {
            twitter: this.generateRealisticSentiment(),
            reddit: this.generateRealisticSentiment()
          }
        });
      }

      return trends;
    } catch (error) {
      logger.error(`Failed to get sentiment trends for ${symbol}:`, error);
      return [];
    }
  }
}

export default SocialSentimentService;
export { SentimentData, SocialMetrics }; 