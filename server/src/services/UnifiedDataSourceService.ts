import { TwitterPost, TwitterAccount, AccountCoinRelevance } from '../models';
import { Op } from 'sequelize';
import logger from '../utils/logger';

/**
 * Unified data source for all social sentiment modules
 * Ensures consistency across dashboard widgets, analysis pages, and alerts
 */
export class UnifiedDataSourceService {
  private static instance: UnifiedDataSourceService;
  private cache: Map<string, any> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  public static getInstance(): UnifiedDataSourceService {
    if (!UnifiedDataSourceService.instance) {
      UnifiedDataSourceService.instance = new UnifiedDataSourceService();
    }
    return UnifiedDataSourceService.instance;
  }

  /**
   * Get unified tweet data for a coin with caching
   */
  async getTweetDataForCoin(
    coinSymbol: string, 
    timeframe: '1h' | '4h' | '24h' | '7d' = '24h'
  ): Promise<{
    totalPosts: number;
    posts: TwitterPost[];
    monitoredAccounts: number;
    alertCount: number;
    sentimentDistribution: {
      positive: number;
      negative: number;
      neutral: number;
    };
    impactDistribution: {
      low: number;
      medium: number;
      high: number;
    };
    avgSentimentScore: number;
    lastUpdate: Date;
    dataSource: 'database' | 'sandbox';
  }> {
    const cacheKey = `tweet_data_${coinSymbol}_${timeframe}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for tweet data: ${cacheKey}`);
      return cached;
    }

    try {
      // Check if we're in sandbox mode
      const { getSandboxConfig } = await import('../config/sandboxConfig');
      const sandboxConfig = getSandboxConfig();

      if (sandboxConfig.isEnabled && sandboxConfig.twitterMockEnabled) {
        return this.getSandboxTweetData(coinSymbol, timeframe, cacheKey);
      }

      // Production data retrieval
      const result = await this.getRealTweetData(coinSymbol, timeframe, cacheKey);
      return result;

    } catch (error) {
      logger.error(`Failed to get tweet data for ${coinSymbol}:`, error);
      throw error;
    }
  }

  /**
   * Get monitoring statistics for dashboard consistency
   */
  async getMonitoringStats(coinSymbol: string): Promise<{
    totalPosts: number;
    alertCount: number;
    monitoredAccounts: number;
    lastUpdate: Date;
    dataSource: 'database' | 'sandbox';
  }> {
    const tweetData = await this.getTweetDataForCoin(coinSymbol, '24h');
    
    return {
      totalPosts: tweetData.totalPosts,
      alertCount: tweetData.alertCount,
      monitoredAccounts: tweetData.monitoredAccounts,
      lastUpdate: tweetData.lastUpdate,
      dataSource: tweetData.dataSource
    };
  }

  /**
   * Get sentiment analysis data ensuring consistency
   */
  async getSentimentAnalysisData(
    coinSymbol: string, 
    timeframe: '1h' | '4h' | '24h' | '7d' = '24h'
  ): Promise<{
    totalPosts: number;
    sentimentDistribution: {
      positive: number;
      negative: number;
      neutral: number;
    };
    impactDistribution: {
      low: number;
      medium: number;
      high: number;
    };
    avgSentimentScore: number;
    significantPosts: any[];
    trendingKeywords: any[];
    dataSource: 'database' | 'sandbox';
  }> {
    const tweetData = await this.getTweetDataForCoin(coinSymbol, timeframe);
    
    // Extract trending keywords and significant posts
    const significantPosts = tweetData.posts
      .filter(post => post.impact === 'high' || Math.abs(post.sentimentScore) > 0.7)
      .slice(0, 10);
    
    const trendingKeywords = this.extractTrendingKeywords(tweetData.posts);

    return {
      totalPosts: tweetData.totalPosts,
      sentimentDistribution: tweetData.sentimentDistribution,
      impactDistribution: tweetData.impactDistribution,
      avgSentimentScore: tweetData.avgSentimentScore,
      significantPosts,
      trendingKeywords,
      dataSource: tweetData.dataSource
    };
  }

  /**
   * Get data collection status ensuring consistency
   */
  async getDataCollectionStatus(): Promise<{
    isRunning: boolean;
    totalPosts: number;
    totalAccounts: number;
    lastCollection: Date | null;
    coinBreakdown: { [coinSymbol: string]: number };
    dataSource: 'database' | 'sandbox';
  }> {
    try {
      const { getSandboxConfig } = await import('../config/sandboxConfig');
      const sandboxConfig = getSandboxConfig();

      if (sandboxConfig.isEnabled && sandboxConfig.twitterMockEnabled) {
        return {
          isRunning: true,
          totalPosts: Math.floor(Math.random() * 200) + 100, // 100-299 posts
          totalAccounts: Math.floor(Math.random() * 20) + 15, // 15-34 accounts
          lastCollection: new Date(Date.now() - Math.random() * 3600000), // Within last hour
          coinBreakdown: {
            'BTC': Math.floor(Math.random() * 50) + 20,
            'ETH': Math.floor(Math.random() * 40) + 15,
            'SOL': Math.floor(Math.random() * 30) + 10,
            'ADA': Math.floor(Math.random() * 20) + 5,
          },
          dataSource: 'sandbox'
        };
      }

      // Production data collection status
      const monitoredCoins = await AccountCoinRelevance.findAll({
        where: { isConfirmed: true },
        attributes: ['coinSymbol'],
        group: ['coinSymbol'],
        raw: true,
      });

      const totalAccounts = await AccountCoinRelevance.count({
        where: { isConfirmed: true }
      });

      // Get recent posts for breakdown
      const coinBreakdown: { [coinSymbol: string]: number } = {};
      let totalPosts = 0;

      for (const coin of monitoredCoins) {
        const postCount = await TwitterPost.count({
          where: {
            content: { [Op.like]: `%${coin.coinSymbol}%` },
            publishedAt: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        });
        coinBreakdown[coin.coinSymbol] = postCount;
        totalPosts += postCount;
      }

      // Get last collection time from most recent post
      const lastPost = await TwitterPost.findOne({
        order: [['createdAt', 'DESC']],
        attributes: ['createdAt']
      });

      return {
        isRunning: true, // Assume running if we have data
        totalPosts,
        totalAccounts,
        lastCollection: lastPost ? lastPost.createdAt : null,
        coinBreakdown,
        dataSource: 'database'
      };

    } catch (error) {
      logger.error('Failed to get data collection status:', error);
      throw error;
    }
  }

  /**
   * Get real tweet data from database
   */
  private async getRealTweetData(
    coinSymbol: string, 
    timeframe: string, 
    cacheKey: string
  ): Promise<any> {
    const timeframeDuration = this.getTimeframeDuration(timeframe);
    const startDate = new Date(Date.now() - timeframeDuration);

    // Get posts from database
    const posts = await TwitterPost.findAll({
      where: {
        content: { [Op.like]: `%${coinSymbol}%` },
        publishedAt: { [Op.gte]: startDate },
      },
      include: [{ model: TwitterAccount, as: 'account' }],
      order: [['publishedAt', 'DESC']],
    });

    // Get monitored accounts count
    const monitoredAccounts = await AccountCoinRelevance.count({
      where: {
        coinSymbol: coinSymbol.toUpperCase(),
        isConfirmed: true,
      },
    });

    // Calculate distributions
    const sentimentDistribution = { positive: 0, negative: 0, neutral: 0 };
    const impactDistribution = { low: 0, medium: 0, high: 0 };
    let totalSentimentScore = 0;

    posts.forEach(post => {
      sentimentDistribution[post.sentiment]++;
      impactDistribution[post.impact]++;
      totalSentimentScore += post.sentimentScore;
    });

    const avgSentimentScore = posts.length > 0 ? totalSentimentScore / posts.length : 0;
    
    // Count high-impact posts as alerts
    const alertCount = impactDistribution.high;

    const result = {
      totalPosts: posts.length,
      posts,
      monitoredAccounts,
      alertCount,
      sentimentDistribution,
      impactDistribution,
      avgSentimentScore,
      lastUpdate: new Date(),
      dataSource: 'database' as const
    };

    this.setCachedData(cacheKey, result);
    return result;
  }

  /**
   * Get sandbox tweet data with consistent logic
   */
  private async getSandboxTweetData(
    coinSymbol: string, 
    timeframe: string, 
    cacheKey: string
  ): Promise<any> {
    // Import sandbox service
    const TwitterSandboxService = (await import('./sandbox/TwitterSandboxService')).default;
    const twitterSandbox = TwitterSandboxService.getInstance();

    // Generate consistent sandbox data
    const basePostCount = this.getBasePostCountForTimeframe(timeframe);
    const totalPosts = Math.floor(basePostCount * (0.8 + Math.random() * 0.4)); // ±20% variation

    // Generate mock tweets using existing sandbox service
    const mockTweets = twitterSandbox.generateMockTweets(`${coinSymbol} crypto`, totalPosts);

    // Convert mock tweets to TwitterPost format with sentiment analysis
    const posts = mockTweets.map((tweet, index) => {
      // Use the existing sentiment from mock tweet or analyze the text
      const sentimentScore = this.convertSentimentToScore(tweet.sentiment || 'neutral');
      const sentiment = tweet.sentiment || 'neutral';
      const impact = this.calculateImpactFromMetrics(tweet.public_metrics, sentimentScore);

      return {
        id: tweet.id,
        twitterPostId: tweet.id,
        twitterAccountId: tweet.author_id,
        content: tweet.text,
        publishedAt: new Date(tweet.created_at),
        likeCount: tweet.public_metrics.like_count,
        retweetCount: tweet.public_metrics.retweet_count,
        replyCount: tweet.public_metrics.reply_count,
        quoteTweetCount: tweet.public_metrics.quote_count,
        sentiment: sentiment as 'positive' | 'negative' | 'neutral',
        sentimentScore: sentimentScore,
        impact: impact as 'low' | 'medium' | 'high',
        impactScore: Math.abs(sentimentScore) * (tweet.public_metrics.like_count + tweet.public_metrics.retweet_count) / 100,
        keywords: this.extractKeywordsFromText(tweet.text),
        influenceScore: Math.random() * 0.5 + 0.5, // 0.5-1.0
        createdAt: new Date(tweet.created_at),
        updatedAt: new Date(),
        // Mock account data
        account: {
          id: tweet.author_id,
          username: `user_${index + 1}`,
          displayName: `Crypto User ${index + 1}`,
          followersCount: Math.floor(Math.random() * 50000) + 1000,
          verified: Math.random() > 0.8,
          influenceScore: Math.random() * 0.5 + 0.5
        }
      };
    });

    // Calculate distributions using the same logic as real data
    const sentimentDistribution = { positive: 0, negative: 0, neutral: 0 };
    const impactDistribution = { low: 0, medium: 0, high: 0 };
    let totalSentimentScore = 0;

    posts.forEach(post => {
      sentimentDistribution[post.sentiment]++;
      impactDistribution[post.impact]++;
      totalSentimentScore += post.sentimentScore;
    });

    const avgSentimentScore = posts.length > 0 ? totalSentimentScore / posts.length : 0;
    
    // Count high-impact posts as alerts
    const alertCount = impactDistribution.high;

    const result = {
      totalPosts,
      posts,
      monitoredAccounts: Math.floor(Math.random() * 10) + 8, // 8-17 accounts
      alertCount,
      sentimentDistribution,
      impactDistribution,
      avgSentimentScore,
      lastUpdate: new Date(),
      dataSource: 'sandbox' as const
    };

    this.setCachedData(cacheKey, result);
    return result;
  }

  /**
   * Convert sentiment string to numerical score
   */
  private convertSentimentToScore(sentiment: string): number {
    switch (sentiment) {
      case 'positive':
        return Math.random() * 0.5 + 0.5; // 0.5 to 1.0
      case 'negative':
        return Math.random() * 0.5 - 0.5; // -0.5 to 0.0
      default: // neutral
        return (Math.random() - 0.5) * 0.4; // -0.2 to 0.2
    }
  }

  /**
   * Calculate impact level from metrics and sentiment
   */
  private calculateImpactFromMetrics(metrics: any, sentimentScore: number): string {
    const totalEngagement = metrics.like_count + metrics.retweet_count + metrics.reply_count + metrics.quote_count;
    const sentimentMagnitude = Math.abs(sentimentScore);
    
    // High impact: strong sentiment + high engagement
    if (sentimentMagnitude > 0.7 && totalEngagement > 100) return 'high';
    
    // Medium impact: moderate sentiment or engagement
    if (sentimentMagnitude > 0.3 || totalEngagement > 50) return 'medium';
    
    // Low impact: everything else
    return 'low';
  }

  /**
   * Extract keywords from tweet text
   */
  private extractKeywordsFromText(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s#@]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !this.isStopWord(word))
      .slice(0, 5); // Limit to 5 keywords
  }

  private getBasePostCountForTimeframe(timeframe: string): number {
    switch (timeframe) {
      case '1h': return 8;
      case '4h': return 25;
      case '24h': return 120;
      case '7d': return 600;
      default: return 120;
    }
  }

  private getTimeframeDuration(timeframe: string): number {
    switch (timeframe) {
      case '1h': return 60 * 60 * 1000;
      case '4h': return 4 * 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }

  private extractTrendingKeywords(posts: any[]): any[] {
    const keywordCounts: { [key: string]: { count: number; sentiment: number } } = {};
    
    posts.forEach(post => {
      const words = post.content
        .toLowerCase()
        .split(/\s+/)
        .filter((word: string) => 
          word.length > 3 && 
          !this.isStopWord(word) &&
          /^[a-zA-Z]/.test(word)
        );

      words.forEach((word: string) => {
        if (!keywordCounts[word]) {
          keywordCounts[word] = { count: 0, sentiment: 0 };
        }
        keywordCounts[word].count++;
        keywordCounts[word].sentiment += post.sentimentScore || 0;
      });
    });

    return Object.entries(keywordCounts)
      .map(([word, data]) => ({
        word,
        count: data.count,
        sentiment: data.count > 0 ? data.sentiment / data.count : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could',
      'can', 'may', 'might', 'must', 'this', 'that', 'these', 'those'
    ]);
    return stopWords.has(word.toLowerCase());
  }

  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache for specific coin or all data
   */
  clearCache(coinSymbol?: string): void {
    if (coinSymbol) {
      const keysToDelete = Array.from(this.cache.keys())
        .filter(key => key.includes(coinSymbol));
      keysToDelete.forEach(key => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }

  /**
   * Force refresh data for a specific coin
   */
  async refreshData(coinSymbol: string): Promise<void> {
    this.clearCache(coinSymbol);
    // Pre-load fresh data
    await this.getTweetDataForCoin(coinSymbol, '24h');
    logger.info(`Refreshed unified data for ${coinSymbol}`);
  }
}

export default UnifiedDataSourceService; 