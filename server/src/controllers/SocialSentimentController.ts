import { Request, Response } from 'express';
import { SocialSentimentService } from '../services/socialSentimentService';
import { TwitterService } from '../services/TwitterService';
import { TwitterAccount } from '../models/TwitterAccount';
import { TwitterPost } from '../models/TwitterPost';
import { AccountCoinRelevance } from '../models/AccountCoinRelevance';
import logger from '../utils/logger';
import { Op } from 'sequelize';

export class SocialSentimentController {
  private socialSentimentService: SocialSentimentService;
  private twitterService: TwitterService;

  constructor() {
    this.socialSentimentService = SocialSentimentService.getInstance();
    this.twitterService = TwitterService.getInstance();
  }

  /**
   * Search for Twitter accounts related to a cryptocurrency
   */
  searchAccountsForCoin = async (req: Request, res: Response): Promise<void> => {
    try {
      const { coinSymbol, coinName } = req.params;
      const { 
        limit = 20, 
        minFollowers = 1000, 
        includeVerified = true 
      } = req.query;

      logger.info(`Searching accounts for ${coinSymbol} (${coinName})`);

      const result = await this.twitterService.searchAccountsForCoin(
        coinSymbol,
        coinName,
        {
          limit: Number(limit),
          minFollowers: Number(minFollowers),
          includeVerified: includeVerified === 'true',
        }
      );

      res.json({
        success: true,
        data: result,
        message: `Found ${result.accounts.length} accounts for ${coinSymbol}`,
      });
    } catch (error) {
      logger.error('Failed to search accounts for coin:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search accounts',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Setup monitoring for a specific cryptocurrency
   */
  setupCoinMonitoring = async (req: Request, res: Response): Promise<void> => {
    try {
      const { coinSymbol, coinName } = req.params;
      const { 
        autoConfirm = false, 
        minRelevanceScore = 0.5, 
        maxAccounts = 20 
      } = req.body;

      logger.info(`Setting up monitoring for ${coinSymbol}`);

      const result = await this.socialSentimentService.setupCoinMonitoring(
        coinSymbol,
        coinName,
        {
          autoConfirm: Boolean(autoConfirm),
          minRelevanceScore: Number(minRelevanceScore),
          maxAccounts: Number(maxAccounts),
        }
      );

      res.json({
        success: true,
        data: result,
        message: `Setup monitoring for ${coinSymbol} with ${result.suggestedAccounts.length} suggested accounts`,
      });
    } catch (error) {
      logger.error('Failed to setup coin monitoring:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to setup monitoring',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Confirm accounts for monitoring
   */
  confirmAccountsForMonitoring = async (req: Request, res: Response): Promise<void> => {
    try {
      const { coinSymbol } = req.params;
      const { accountIds } = req.body;

      if (!Array.isArray(accountIds) || accountIds.length === 0) {
        res.status(400).json({
          success: false,
          message: 'accountIds must be a non-empty array',
        });
        return;
      }

      await this.socialSentimentService.confirmAccountsForMonitoring(coinSymbol, accountIds);

      res.json({
        success: true,
        message: `Confirmed ${accountIds.length} accounts for monitoring ${coinSymbol}`,
      });
    } catch (error) {
      logger.error('Failed to confirm accounts for monitoring:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to confirm accounts',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Get sentiment summary for a coin
   */
  getCoinSentimentSummary = async (req: Request, res: Response): Promise<void> => {
    try {
      const { coinSymbol } = req.params;
      const { timeframe = '24h' } = req.query;

      const validTimeframes = ['1h', '4h', '24h', '7d'];
      if (!validTimeframes.includes(timeframe as string)) {
        res.status(400).json({
          success: false,
          message: 'Invalid timeframe. Must be one of: 1h, 4h, 24h, 7d',
        });
        return;
      }

      // Get posts for the timeframe
      const timeframeDuration = this.getTimeframeDuration(timeframe as string);
      const startDate = new Date(Date.now() - timeframeDuration);

      const posts = await TwitterPost.findAll({
        where: {
          relevantCoins: { [Op.contains]: [coinSymbol] },
          publishedAt: { [Op.gte]: startDate },
        },
        include: [TwitterAccount],
        order: [['publishedAt', 'DESC']],
      });

      // Calculate sentiment distribution
      const sentimentDistribution = { positive: 0, negative: 0, neutral: 0 };
      const impactDistribution = { low: 0, medium: 0, high: 0 };
      let totalSentimentScore = 0;
      let totalImpactScore = 0;

      posts.forEach(post => {
        sentimentDistribution[post.sentiment]++;
        impactDistribution[post.impact]++;
        totalSentimentScore += post.sentimentScore;
        totalImpactScore += post.impactScore;
      });

      // Get significant posts
      const significantPosts = posts
        .filter(post => post.impact === 'high' || Math.abs(post.sentimentScore) > 0.7)
        .slice(0, 10);

      // Extract trending keywords
      const trendingKeywords = this.extractTrendingKeywords(posts);

      const summary = {
        coinSymbol,
        timeframe,
        totalPosts: posts.length,
        sentimentDistribution,
        avgSentimentScore: posts.length > 0 ? totalSentimentScore / posts.length : 0,
        impactDistribution,
        avgImpactScore: posts.length > 0 ? totalImpactScore / posts.length : 0,
        significantPosts,
        trendingKeywords,
      };

      res.json({
        success: true,
        data: summary,
        message: `Sentiment summary for ${coinSymbol} (${timeframe})`,
      });
    } catch (error) {
      logger.error('Failed to get sentiment summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get sentiment summary',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Get account correlation data
   */
  getAccountCorrelationData = async (req: Request, res: Response): Promise<void> => {
    try {
      const { coinSymbol } = req.params;
      const { days = 30 } = req.query;

      const startDate = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

      // Get monitored accounts with relevance data
      const relevanceRecords = await AccountCoinRelevance.findAll({
        where: {
          coinSymbol,
          isConfirmed: true,
        },
        include: [TwitterAccount],
        order: [['relevanceScore', 'DESC']],
      });

      const correlationData = [];

      for (const relevance of relevanceRecords) {
        const account = (relevance as any).TwitterAccount as TwitterAccount;
        
        if (!account) {
          continue; // Skip if account is not loaded
        }
        
        // Get recent activity
        const recentActivity = await TwitterPost.findAll({
          where: {
            twitterAccountId: account.id,
            relevantCoins: { [Op.contains]: [coinSymbol] },
            publishedAt: { [Op.gte]: startDate },
          },
          order: [['publishedAt', 'DESC']],
          limit: 20,
        });

        // Generate keyword cloud
        const keywordCloud = this.generateKeywordCloud(recentActivity);

        correlationData.push({
          account,
          relevance,
          historicalCorrelation: relevance.historicalData || [],
          recentActivity,
          keywordCloud,
          predictionAccuracy: relevance.avgSentiment || 0, // Use avgSentiment as prediction accuracy placeholder
        });
      }

      res.json({
        success: true,
        data: correlationData.sort((a, b) => b.relevance.relevanceScore - a.relevance.relevanceScore),
        message: `Correlation data for ${coinSymbol}`,
      });
    } catch (error) {
      logger.error('Failed to get correlation data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get correlation data',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Get account posts with sentiment analysis
   */
  getAccountPosts = async (req: Request, res: Response): Promise<void> => {
    try {
      const { accountId } = req.params;
      const { limit = 20, coinSymbol } = req.query;

      const posts = await TwitterPost.findAll({
        where: {
          twitterAccountId: accountId,
          ...(coinSymbol && {
            relevantCoins: { [Op.contains]: [coinSymbol as string] },
          }),
        },
        include: [TwitterAccount],
        order: [['publishedAt', 'DESC']],
        limit: Number(limit),
      });

      res.json({
        success: true,
        data: posts,
        message: `Retrieved ${posts.length} posts for account ${accountId}`,
      });
    } catch (error) {
      logger.error('Failed to get account posts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get account posts',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Manually trigger sentiment analysis for a post
   */
  analyzePostSentiment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { text, coinSymbol } = req.body;

      if (!text || !coinSymbol) {
        res.status(400).json({
          success: false,
          message: 'text and coinSymbol are required',
        });
        return;
      }

      const analysis = this.twitterService.analyzeSentiment(text, coinSymbol);

      res.json({
        success: true,
        data: analysis,
        message: 'Sentiment analysis completed',
      });
    } catch (error) {
      logger.error('Failed to analyze sentiment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to analyze sentiment',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Get sentiment trend analysis
   */
  getSentimentTrend = async (req: Request, res: Response): Promise<void> => {
    try {
      const { coinSymbol } = req.params;
      const { timeframe = '24h' } = req.query;

      const validTimeframes = ['1h', '4h', '24h', '7d'];
      if (!validTimeframes.includes(timeframe as string)) {
        res.status(400).json({
          success: false,
          message: 'Invalid timeframe. Must be one of: 1h, 4h, 24h, 7d',
        });
        return;
      }

      const trendData = await this.socialSentimentService.getSentimentTrend(
        coinSymbol,
        timeframe as '1h' | '4h' | '24h' | '7d'
      );

      res.json({
        success: true,
        data: trendData,
        message: `Sentiment trend for ${coinSymbol}`,
      });
    } catch (error) {
      logger.error('Failed to get sentiment trend:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get sentiment trend',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Get enhanced keyword analysis
   */
  getEnhancedKeywords = async (req: Request, res: Response): Promise<void> => {
    try {
      const { coinSymbol } = req.params;
      const { timeframe = '24h', limit = 50 } = req.query;

      const timeframeDuration = this.getTimeframeDuration(timeframe as string);
      const startDate = new Date(Date.now() - timeframeDuration);

      const posts = await TwitterPost.findAll({
        where: {
          relevantCoins: { [Op.contains]: [coinSymbol] },
          publishedAt: { [Op.gte]: startDate },
        },
        order: [['publishedAt', 'DESC']],
        limit: Number(limit),
      });

      const enhancedKeywords = this.extractEnhancedKeywords(posts);

      res.json({
        success: true,
        data: {
          keywords: enhancedKeywords,
          totalPosts: posts.length,
          timeframe,
          generatedAt: new Date(),
        },
        message: `Enhanced keywords for ${coinSymbol}`,
      });
    } catch (error) {
      logger.error('Failed to get enhanced keywords:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get enhanced keywords',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Get real-time sentiment alerts
   */
  getSentimentAlerts = async (req: Request, res: Response): Promise<void> => {
    try {
      const { coinSymbol } = req.params;
      const { limit = 20, severity } = req.query;

      // TODO: Implement real alert fetching from database
      // This would typically query a SentimentAlert table
      // For now, return empty array to indicate no real alerts are available
      
      const alerts: any[] = [];

      const filteredAlerts = severity 
        ? alerts.filter(alert => alert.alertLevel === severity)
        : alerts;

      res.json({
        success: true,
        data: filteredAlerts.slice(0, Number(limit)),
        message: `No sentiment alerts available for ${coinSymbol}. Real-time alert system requires Twitter API configuration.`,
      });
    } catch (error) {
      logger.error('Failed to get sentiment alerts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get sentiment alerts',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Get account influence metrics
   */
  getAccountInfluenceMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { accountId } = req.params;
      const { coinSymbol, days = 30 } = req.query;

      const account = await TwitterAccount.findByPk(accountId);
      if (!account) {
        res.status(404).json({
          success: false,
          message: 'Account not found',
        });
        return;
      }

      const startDate = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

      const posts = await TwitterPost.findAll({
        where: {
          twitterAccountId: accountId,
          ...(coinSymbol && {
            relevantCoins: { [Op.contains]: [coinSymbol as string] },
          }),
          publishedAt: { [Op.gte]: startDate },
        },
        order: [['publishedAt', 'DESC']],
      });

      // Calculate influence metrics
      const totalEngagement = posts.reduce((sum, post) => 
        sum + post.likeCount + post.retweetCount + post.replyCount, 0
      );
      const avgSentiment = posts.length > 0 
        ? posts.reduce((sum, post) => sum + post.sentimentScore, 0) / posts.length 
        : 0;
      const highImpactPosts = posts.filter(post => post.impact === 'high').length;
      const engagementRate = posts.length > 0 ? totalEngagement / posts.length : 0;

      const metrics = {
        account: {
          id: account.id,
          username: account.username,
          displayName: account.displayName,
          followersCount: account.followersCount,
          isVerified: account.verified,
          influenceScore: account.influenceScore,
        },
        period: {
          days: Number(days),
          startDate,
          endDate: new Date(),
        },
        activity: {
          totalPosts: posts.length,
          avgPostsPerDay: posts.length / Number(days),
          highImpactPosts,
          highImpactRate: posts.length > 0 ? highImpactPosts / posts.length : 0,
        },
        engagement: {
          totalEngagement,
          avgEngagementPerPost: engagementRate,
          engagementRate: account.followersCount > 0 ? totalEngagement / account.followersCount : 0,
        },
        sentiment: {
          avgSentiment,
          sentimentConsistency: this.calculateSentimentConsistency(posts),
          positivePostsRatio: posts.length > 0 
            ? posts.filter(post => post.sentiment === 'positive').length / posts.length 
            : 0,
        },
        influence: {
          reachEstimate: totalEngagement * 3, // Rough estimate
          viralityScore: this.calculateViralityScore(posts),
          marketImpactScore: this.calculateMarketImpactScore(posts),
        },
      };

      res.json({
        success: true,
        data: metrics,
        message: `Influence metrics for @${account.username}`,
      });
    } catch (error) {
      logger.error('Failed to get account influence metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get account influence metrics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Get monitoring status
   */
  getMonitoringStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get all monitored coins and their account counts
      const monitoredCoins = await AccountCoinRelevance.findAll({
        where: { isConfirmed: true },
        attributes: ['coinSymbol'],
        group: ['coinSymbol'],
        raw: true,
      });

      const status = [];
      for (const coin of monitoredCoins) {
        const accountCount = await AccountCoinRelevance.count({
          where: {
            coinSymbol: coin.coinSymbol,
            isConfirmed: true,
          },
        });

        const recentPostCount = await TwitterPost.count({
          where: {
            relevantCoins: { [Op.contains]: [coin.coinSymbol] },
            publishedAt: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        });

        status.push({
          coinSymbol: coin.coinSymbol,
          accountCount,
          recentPostCount,
        });
      }

      res.json({
        success: true,
        data: {
          isMonitoring: true,
          monitoredCoins: status,
          totalMonitoredCoins: status.length,
        },
        message: 'Monitoring status retrieved',
      });
    } catch (error) {
      logger.error('Failed to get monitoring status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get monitoring status',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Private helper methods
   */
  private getTimeframeDuration(timeframe: string): number {
    switch (timeframe) {
      case '1h': return 60 * 60 * 1000;
      case '4h': return 4 * 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }

  private extractTrendingKeywords(posts: TwitterPost[]): any[] {
    const wordCount: Record<string, { count: number; totalSentiment: number }> = {};
    
    posts.forEach(post => {
      const words = post.content.toLowerCase()
        .replace(/[^\w\s#@]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3);

      words.forEach(word => {
        if (!wordCount[word]) {
          wordCount[word] = { count: 0, totalSentiment: 0 };
        }
        wordCount[word].count++;
        wordCount[word].totalSentiment += post.sentimentScore;
      });
    });

    return Object.entries(wordCount)
      .map(([word, data]) => ({
        word,
        count: data.count,
        sentiment: data.totalSentiment / data.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }

  private generateKeywordCloud(posts: TwitterPost[]): any[] {
    const wordFreq: Record<string, { frequency: number; totalSentiment: number }> = {};
    
    posts.forEach(post => {
      const words = post.content.toLowerCase()
        .replace(/[^\w\s#@]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 2);

      words.forEach(word => {
        if (!wordFreq[word]) {
          wordFreq[word] = { frequency: 0, totalSentiment: 0 };
        }
        wordFreq[word].frequency++;
        wordFreq[word].totalSentiment += post.sentimentScore;
      });
    });

    return Object.entries(wordFreq)
      .map(([word, data]) => ({
        word,
        frequency: data.frequency,
        sentiment: data.totalSentiment / data.frequency,
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 50);
  }

  private extractEnhancedKeywords(posts: TwitterPost[]): {
    word: string;
    count: number;
    sentiment: number;
    impact: number;
    trend: 'rising' | 'falling' | 'stable';
  }[] {
    const wordData: Record<string, {
      count: number;
      totalSentiment: number;
      totalImpact: number;
      recentCount: number;
      oldCount: number;
    }> = {};
    
    const midpoint = Math.floor(posts.length / 2);
    
    posts.forEach((post, index) => {
      const words = post.content.toLowerCase()
        .replace(/[^\w\s#@]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3 && !this.isStopWord(word));

      const isRecent = index < midpoint;

      words.forEach(word => {
        if (!wordData[word]) {
          wordData[word] = {
            count: 0,
            totalSentiment: 0,
            totalImpact: 0,
            recentCount: 0,
            oldCount: 0,
          };
        }
        
        wordData[word].count++;
        wordData[word].totalSentiment += post.sentimentScore;
        wordData[word].totalImpact += post.impactScore;
        
        if (isRecent) {
          wordData[word].recentCount++;
        } else {
          wordData[word].oldCount++;
        }
      });
    });

    return Object.entries(wordData)
      .map(([word, data]) => {
        const trend: 'rising' | 'falling' | 'stable' = data.recentCount > data.oldCount ? 'rising' : 
                     data.recentCount < data.oldCount ? 'falling' : 'stable';
        
        return {
          word,
          count: data.count,
          sentiment: data.totalSentiment / data.count,
          impact: data.totalImpact / data.count,
          trend,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'man', 'men', 'put', 'say', 'she', 'too', 'use'
    ]);
    return stopWords.has(word.toLowerCase());
  }

  private calculateSentimentConsistency(posts: TwitterPost[]): number {
    if (posts.length === 0) return 0;
    
    const sentiments = posts.map(post => post.sentimentScore);
    const mean = sentiments.reduce((sum, score) => sum + score, 0) / sentiments.length;
    const variance = sentiments.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / sentiments.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Return consistency as inverse of standard deviation (0-1 scale)
    return Math.max(0, 1 - standardDeviation);
  }

  private calculateViralityScore(posts: TwitterPost[]): number {
    if (posts.length === 0) return 0;
    
    const totalEngagement = posts.reduce((sum, post) => 
      sum + post.likeCount + post.retweetCount + post.replyCount, 0
    );
    const avgEngagement = totalEngagement / posts.length;
    
    // Normalize to 0-1 scale (assuming 1000 engagement is high)
    return Math.min(1, avgEngagement / 1000);
  }

  private calculateMarketImpactScore(posts: TwitterPost[]): number {
    if (posts.length === 0) return 0;
    
    const highImpactPosts = posts.filter(post => post.impact === 'high').length;
    const mediumImpactPosts = posts.filter(post => post.impact === 'medium').length;
    
    // Weighted score: high impact = 1, medium = 0.5, low = 0.1
    const weightedScore = (highImpactPosts * 1) + (mediumImpactPosts * 0.5) + 
                         (posts.length - highImpactPosts - mediumImpactPosts) * 0.1;
    
    return weightedScore / posts.length;
  }
} 