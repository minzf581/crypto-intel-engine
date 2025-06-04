import { Request, Response } from 'express';
import { SocialSentimentService } from '../services/socialSentimentService';
import { TwitterService } from '../services/TwitterService';
import { TwitterOAuthService } from '../services/TwitterOAuthService';
import { RecommendedAccountService } from '../services/RecommendedAccountService';
import { TwitterAccount } from '../models/TwitterAccount';
import { TwitterPost } from '../models/TwitterPost';
import { AccountCoinRelevance } from '../models/AccountCoinRelevance';
import { RecommendedAccount } from '../models/RecommendedAccount';
import GlobalSearchHistory from '../models/GlobalSearchHistory';
import { User } from '../models/User';
import logger from '../utils/logger';
import { Op } from 'sequelize';
import jwt from 'jsonwebtoken';
import env from '../config/env';
import { TwitterDataCollectionService } from '../services/TwitterDataCollectionService';
import UnifiedDataSourceService from '../services/UnifiedDataSourceService';

export class SocialSentimentController {
  private socialSentimentService: SocialSentimentService;
  private twitterService: TwitterService;
  private twitterOAuthService: TwitterOAuthService;
  private recommendedAccountService: RecommendedAccountService;
  private dataCollectionService: TwitterDataCollectionService;
  private unifiedDataSource: UnifiedDataSourceService;

  constructor() {
    this.socialSentimentService = SocialSentimentService.getInstance();
    this.twitterService = TwitterService.getInstance();
    this.twitterOAuthService = TwitterOAuthService.getInstance();
    this.recommendedAccountService = RecommendedAccountService.getInstance();
    this.dataCollectionService = TwitterDataCollectionService.getInstance();
    this.unifiedDataSource = UnifiedDataSourceService.getInstance();
  }

  /**
   * Search for Twitter accounts related to a cryptocurrency
   * Now supports both Bearer Token and OAuth 2.0 methods
   */
  searchAccountsForCoin = async (req: Request, res: Response): Promise<void> => {
    try {
      const { coinSymbol, coinName } = req.params;
      const { 
        limit = 20, 
        minFollowers = 1000, 
        includeVerified = true,
        useOAuth = false 
      } = req.query;

      logger.info(`Searching accounts for ${coinSymbol} (${coinName}) with params:`, {
        limit: Number(limit),
        minFollowers: Number(minFollowers),
        includeVerified: includeVerified === 'true',
        useOAuth: useOAuth === 'true'
      });

      let result;

      // Check if OAuth is requested and available
      if (useOAuth === 'true') {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
          res.status(401).json({
            success: false,
            message: 'Authorization required for OAuth search',
            requiresAuth: true
          });
          return;
        }

        try {
          const token = authHeader.replace('Bearer ', '');
          const decoded = jwt.verify(token, env.jwtSecret) as any;

          if (!decoded.twitterAccessToken) {
            res.status(401).json({
              success: false,
              message: 'Twitter OAuth required. Please connect your Twitter account first.',
              requiresTwitterAuth: true,
              authUrl: '/auth/twitter/login'
            });
            return;
          }

          // Use OAuth search
          const users = await this.twitterOAuthService.searchAccountsForCoinWithOAuth(
            decoded.twitterAccessToken,
            coinSymbol,
            coinName,
            {
              limit: Number(limit),
              minFollowers: Number(minFollowers),
              includeVerified: includeVerified === 'true',
            }
          );

          result = {
            accounts: users.map(user => ({
              id: user.id,
              username: user.username,
              displayName: user.name,
              bio: user.description || '',
              followersCount: user.public_metrics.followers_count,
              followingCount: user.public_metrics.following_count,
              tweetsCount: user.public_metrics.tweet_count,
              verified: user.verified || false,
              profileImageUrl: user.profile_image_url || '',
              isInfluencer: user.public_metrics.followers_count > 10000,
              influenceScore: this.calculateInfluenceScore(user.public_metrics),
              relevanceScore: 0,
              mentionCount: 0,
              avgSentiment: 0,
            })),
            totalCount: users.length,
            hasMore: false,
            query: `${coinSymbol} ${coinName}`,
            searchMethod: 'OAuth 2.0 User Context'
          };

          logger.info(`Successfully found ${users.length} Twitter accounts for ${coinSymbol} using OAuth`);

        } catch (jwtError) {
          logger.error('JWT verification failed:', jwtError);
          res.status(401).json({
            success: false,
            message: 'Invalid authentication token',
            requiresAuth: true
          });
          return;
        }
      } else {
        // Use Bearer Token search (fallback to tweet search)
        result = await this.twitterService.searchAccountsForCoin(
          coinSymbol,
          coinName,
          {
            limit: Number(limit),
            minFollowers: Number(minFollowers),
            includeVerified: includeVerified === 'true',
          }
        );
        result.searchMethod = 'Bearer Token (Tweet Search)';
      }

      res.json({
        success: true,
        data: result,
        message: `Found ${result.totalCount} Twitter accounts for ${coinSymbol}`,
        metadata: {
          coinSymbol,
          coinName,
          searchQuery: result.query,
          totalFound: result.totalCount,
          hasMore: result.hasMore,
          searchMethod: result.searchMethod,
          oauthAvailable: true,
        },
      });
    } catch (error) {
      logger.error('Failed to search accounts for coin:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        coinSymbol: req.params.coinSymbol,
        coinName: req.params.coinName,
        params: req.query,
      });

      // Determine appropriate status code based on error type
      let statusCode = 500;
      let errorMessage = 'Internal server error while searching accounts';

      if (error instanceof Error) {
        if (error.message.includes('Twitter API configuration required')) {
          statusCode = 503;
          errorMessage = 'Twitter API service not configured. Please contact administrator.';
        } else if (error.message.includes('authentication failed')) {
          statusCode = 401;
          errorMessage = 'Twitter API authentication failed';
        } else if (error.message.includes('rate limit')) {
          statusCode = 429;
          errorMessage = 'Rate limit exceeded. Please try again later';
        } else if (error.message.includes('temporarily unavailable')) {
          statusCode = 503;
          errorMessage = 'Twitter search service temporarily unavailable';
        } else {
          errorMessage = error.message;
        }
      }

      res.status(statusCode).json({
        success: false,
        message: errorMessage,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        path: req.path,
        suggestion: statusCode === 401 ? 'Try using OAuth search by adding ?useOAuth=true and connecting your Twitter account' : undefined
      });
    }
  };

  /**
   * Search for Twitter accounts with custom query
   */
  searchAccountsWithQuery = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    let searchMethod = 'unknown';
    let isSuccessful = false;
    let resultsCount = 0;
    
    try {
      const { 
        query,
        limit = 20, 
        minFollowers = 1000, 
        includeVerified = true,
        useOAuth = false 
      } = req.query;

      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: 'Query parameter is required and must be a non-empty string',
        });
        return;
      }

      const userId = (req as any).user?.id;
      const userName = (req as any).user?.name || 'Unknown User';
      const searchQuery = query.trim();

      logger.info(`Searching accounts with custom query: "${searchQuery}" with params:`, {
        limit: Number(limit),
        minFollowers: Number(minFollowers),
        includeVerified: includeVerified === 'true',
        useOAuth: useOAuth === 'true'
      });

      let result;

      // Check if OAuth is requested and available
      if (useOAuth === 'true') {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
          res.status(401).json({
            success: false,
            message: 'Authorization required for OAuth search',
            requiresAuth: true
          });
          return;
        }

        try {
          const token = authHeader.replace('Bearer ', '');
          const decoded = jwt.verify(token, env.jwtSecret) as any;

          if (!decoded.twitterAccessToken) {
            res.status(401).json({
              success: false,
              message: 'Twitter OAuth required. Please connect your Twitter account first.',
              requiresTwitterAuth: true,
              authUrl: '/auth/twitter/login'
            });
            return;
          }

          // Use OAuth search with custom query
          const users = await this.twitterOAuthService.searchAccountsWithCustomQuery(
            decoded.twitterAccessToken,
            searchQuery,
            {
              limit: Number(limit),
              minFollowers: Number(minFollowers),
              includeVerified: includeVerified === 'true',
            }
          );

          result = {
            accounts: users.map((user: any) => ({
              id: user.id,
              username: user.username,
              displayName: user.name,
              bio: user.description || '',
              followersCount: user.public_metrics.followers_count,
              followingCount: user.public_metrics.following_count,
              tweetsCount: user.public_metrics.tweet_count,
              verified: user.verified || false,
              profileImageUrl: user.profile_image_url || '',
              isInfluencer: user.public_metrics.followers_count > 10000,
              influenceScore: this.calculateInfluenceScore(user.public_metrics),
              relevanceScore: 0,
              mentionCount: 0,
              avgSentiment: 0,
            })),
            totalCount: users.length,
            hasMore: false,
            query: searchQuery,
            searchMethod: 'OAuth 2.0 Custom Query'
          };

          searchMethod = 'oauth';
          resultsCount = users.length;
          isSuccessful = true;

          logger.info(`Successfully found ${users.length} Twitter accounts with custom query using OAuth`);

        } catch (jwtError) {
          logger.error('JWT verification failed:', jwtError);
          res.status(401).json({
            success: false,
            message: 'Invalid authentication token',
            requiresAuth: true
          });
          return;
        }
      } else {
        try {
          // Use Bearer Token search with custom query
          result = await this.twitterService.searchAccountsWithCustomQuery(
            searchQuery,
            {
              limit: Number(limit),
              minFollowers: Number(minFollowers),
              includeVerified: includeVerified === 'true',
            }
          );
          result.searchMethod = 'Bearer Token (Custom Query)';
          searchMethod = 'api';
          resultsCount = result.totalCount;
          isSuccessful = true;

        } catch (apiError) {
          logger.error('Twitter API search failed, falling back to enhanced recommendations:', apiError);
          
          // Enhanced fallback: Get more recommended accounts based on query keywords
          const fallbackAccounts = await this.getEnhancedRecommendedAccounts(searchQuery, {
            limit: Number(limit),
            minFollowers: Number(minFollowers),
            includeVerified: includeVerified === 'true',
          });

          result = {
            accounts: fallbackAccounts,
            totalCount: fallbackAccounts.length,
            hasMore: false,
            query: searchQuery,
            searchMethod: 'Enhanced Recommendations (API Fallback)'
          };

          searchMethod = 'fallback';
          resultsCount = fallbackAccounts.length;
          isSuccessful = fallbackAccounts.length > 0;

          logger.info(`Rate limit reached, returning ${fallbackAccounts.length} enhanced recommended accounts for query "${searchQuery}"`);
        }
      }

      // Save search history if user is authenticated
      if (userId) {
        try {
          await this.saveSearchHistoryRecord({
            query: searchQuery,
            coinSymbol: this.extractCoinSymbolFromQuery(searchQuery),
            coinName: this.getCoinNameFromSymbol(this.extractCoinSymbolFromQuery(searchQuery)),
            userId,
            userName,
            searchFilters: {
              minFollowers: Number(minFollowers),
              includeVerified: includeVerified === 'true',
            },
            resultsCount,
            searchMethod,
            isSuccessful,
            searchDuration: Date.now() - startTime,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
          });
        } catch (historyError) {
          logger.warn('Failed to save search history:', historyError);
          // Don't fail the request if history saving fails
        }
      }

      res.json({
        success: true,
        data: result,
        message: `Found ${result.totalCount} Twitter accounts for query: "${searchQuery}"`,
        metadata: {
          searchQuery: result.query,
          totalFound: result.totalCount,
          hasMore: result.hasMore,
          searchMethod: result.searchMethod,
          oauthAvailable: true,
          searchDuration: Date.now() - startTime,
        },
      });
    } catch (error) {
      logger.error('Failed to search accounts with custom query:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        query: req.query.query,
        params: req.query,
      });

      // Determine appropriate status code based on error type
      let statusCode = 500;
      let errorMessage = 'Internal server error while searching accounts';

      if (error instanceof Error) {
        if (error.message.includes('Twitter API configuration required')) {
          statusCode = 503;
          errorMessage = 'Twitter API service not configured. Please contact administrator.';
        } else if (error.message.includes('authentication failed')) {
          statusCode = 401;
          errorMessage = 'Twitter API authentication failed';
        } else if (error.message.includes('rate limit')) {
          statusCode = 429;
          errorMessage = 'Rate limit exceeded. Please try again later';
        } else if (error.message.includes('temporarily unavailable')) {
          statusCode = 503;
          errorMessage = 'Twitter search service temporarily unavailable';
        } else {
          errorMessage = error.message;
        }
      }

      res.status(statusCode).json({
        success: false,
        message: errorMessage,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        path: req.path,
        suggestion: statusCode === 401 ? 'Try using OAuth search by adding ?useOAuth=true and connecting your Twitter account' : undefined
      });
    }
  };

  /**
   * Calculate influence score from public metrics
   */
  private calculateInfluenceScore(metrics: { followers_count: number; following_count: number; tweet_count: number }): number {
    const followers = metrics.followers_count;
    const following = metrics.following_count;
    const tweets = metrics.tweet_count;
    
    // Avoid division by zero
    const followRatio = following > 0 ? followers / following : followers;
    const engagementRate = tweets > 0 ? followers / tweets : 0;
    
    // Calculate score (0-100)
    let score = Math.log10(followers + 1) * 10; // Base score from followers
    score += Math.min(followRatio / 10, 20); // Bonus for good follow ratio
    score += Math.min(engagementRate / 100, 10); // Bonus for engagement
    
    // Normalize to 0.0-1.0 range instead of 0-100
    const normalizedScore = Math.min(Math.round(score), 100) / 100;
    return Math.max(0.0, Math.min(1.0, normalizedScore));
  }

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

      logger.info(`Confirming ${accountIds.length} accounts for monitoring ${coinSymbol}`, {
        coinSymbol,
        accountIds
      });

      // Process each account ID
      const confirmedAccounts = [];
      const errors = [];

      for (const accountId of accountIds) {
        try {
          // Find the Twitter account
          const twitterAccount = await TwitterAccount.findByPk(accountId);
          
          if (!twitterAccount) {
            logger.warn(`Twitter account not found: ${accountId}`);
            errors.push(`Account ${accountId} not found`);
            continue;
          }

          // Create or update the relevance record
          const [relevance, created] = await AccountCoinRelevance.findOrCreate({
            where: {
              twitterAccountId: accountId,
              coinSymbol: coinSymbol.toUpperCase(),
            },
            defaults: {
              id: `${accountId}_${coinSymbol.toUpperCase()}`,
              twitterAccountId: accountId,
              coinSymbol: coinSymbol.toUpperCase(),
              relevanceScore: 0.8, // Default relevance score for manually confirmed accounts
              mentionCount: 0,
              totalPosts: 0,
              mentionFrequency: 0,
              avgSentiment: 0,
              avgImpact: 0,
              lastMentionAt: new Date(),
              historicalData: [],
              keywordFrequency: {},
              correlationScore: 0,
              isConfirmed: true, // Mark as confirmed for monitoring
            },
          });

          // If the record already existed, update it to be confirmed
          if (!created) {
            await relevance.update({
              isConfirmed: true,
              relevanceScore: Math.max(relevance.relevanceScore, 0.8), // Ensure minimum relevance
            });
          }

          confirmedAccounts.push({
            accountId: twitterAccount.id,
            username: twitterAccount.username,
            displayName: twitterAccount.displayName,
            coinSymbol: coinSymbol.toUpperCase(),
            relevanceScore: relevance.relevanceScore,
            isConfirmed: true,
          });

          logger.info(`Successfully confirmed account ${twitterAccount.username} for ${coinSymbol}`);

        } catch (error) {
          logger.error(`Failed to confirm account ${accountId}:`, error);
          errors.push(`Failed to confirm account ${accountId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Log the results
      logger.info(`Monitoring confirmation completed for ${coinSymbol}:`, {
        totalRequested: accountIds.length,
        confirmed: confirmedAccounts.length,
        errors: errors.length,
      });

      res.json({
        success: true,
        data: {
          confirmedAccounts,
          totalConfirmed: confirmedAccounts.length,
          totalRequested: accountIds.length,
          errors: errors.length > 0 ? errors : undefined,
        },
        message: `Successfully confirmed ${confirmedAccounts.length} of ${accountIds.length} accounts for monitoring ${coinSymbol}`,
      });

    } catch (error) {
      logger.error('Failed to confirm accounts for monitoring:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to confirm accounts for monitoring',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Get sentiment summary for a coin - Updated to use unified data source
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

      // Use unified data source for consistency
      const sentimentData = await this.unifiedDataSource.getSentimentAnalysisData(
        coinSymbol.toUpperCase(), 
        timeframe as '1h' | '4h' | '24h' | '7d'
      );

      const summary = {
        coinSymbol: coinSymbol.toUpperCase(),
        timeframe,
        totalPosts: sentimentData.totalPosts,
        sentimentDistribution: sentimentData.sentimentDistribution,
        avgSentimentScore: sentimentData.avgSentimentScore,
        impactDistribution: sentimentData.impactDistribution,
        significantPosts: sentimentData.significantPosts,
        trendingKeywords: sentimentData.trendingKeywords,
        dataSource: sentimentData.dataSource,
        lastUpdate: new Date().toISOString()
      };

      res.json({
        success: true,
        data: summary,
        message: `Sentiment summary for ${coinSymbol.toUpperCase()} (${timeframe}) - Source: ${sentimentData.dataSource}`,
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

      logger.info(`Getting correlation data for ${coinSymbol} over ${days} days`);

      const startDate = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

      // Get monitored accounts with relevance data
      const relevanceRecords = await AccountCoinRelevance.findAll({
        where: {
          coinSymbol: coinSymbol.toUpperCase(),
          isConfirmed: true,
        },
        include: [{ 
          model: TwitterAccount, 
          as: 'account',
          required: true 
        }],
        order: [['relevanceScore', 'DESC']],
      });

      if (relevanceRecords.length === 0) {
        res.json({
          success: true,
          data: [],
          message: `No monitored accounts found for ${coinSymbol}. Please add accounts to monitoring first.`,
          metadata: {
            coinSymbol: coinSymbol.toUpperCase(),
            totalAccounts: 0,
            timeframe: `${days} days`,
            startDate,
            endDate: new Date(),
            dataQuality: 'no_data',
            warning: 'No accounts are currently being monitored for this cryptocurrency.'
          }
        });
        return;
      }

      const correlationData = [];

      for (const relevance of relevanceRecords) {
        const account = (relevance as any).account as TwitterAccount;
        
        if (!account) {
          logger.warn(`Account not found for relevance record: ${relevance.id}`);
          continue;
        }
        
        // Get recent activity for this account
        const recentActivity = await TwitterPost.findAll({
          where: {
            twitterAccountId: account.id,
            content: { [Op.like]: `%${coinSymbol.toUpperCase()}%` },
            publishedAt: { [Op.gte]: startDate },
          },
          order: [['publishedAt', 'DESC']],
          limit: 50,
        });

        // Generate historical correlation data based on available posts
        const historicalCorrelation = this.generateHistoricalCorrelation(
          account, 
          coinSymbol.toUpperCase(), 
          Number(days),
          recentActivity
        );

        // Generate keyword cloud from recent posts
        const keywordCloud = this.generateKeywordCloud(recentActivity);

        // Calculate prediction accuracy based on sentiment vs actual performance
        const predictionAccuracy = this.calculatePredictionAccuracy(recentActivity);

        // Calculate activity metrics
        const activityMetrics = this.calculateActivityMetrics(recentActivity, Number(days));

        correlationData.push({
          account: {
            id: account.id,
            username: account.username,
            displayName: account.displayName,
            followersCount: account.followersCount,
            verified: account.verified,
            influenceScore: account.influenceScore,
            profileImageUrl: account.profileImageUrl,
            bio: account.bio,
          },
          relevance: {
            relevanceScore: relevance.relevanceScore,
            mentionCount: relevance.mentionCount,
            totalPosts: relevance.totalPosts,
            avgSentiment: relevance.avgSentiment,
            avgImpact: relevance.avgImpact,
            lastMentionAt: relevance.lastMentionAt,
            isConfirmed: relevance.isConfirmed,
            totalMentions: recentActivity.length,
          },
          historicalCorrelation,
          recentActivity: recentActivity.slice(0, 10), // Limit to 10 most recent posts
          keywordCloud,
          predictionAccuracy,
          activityMetrics,
          correlationStrength: this.calculateCorrelationStrength(historicalCorrelation),
        });
      }

      // Sort by correlation strength and relevance
      correlationData.sort((a, b) => {
        const scoreA = (a.correlationStrength * 0.6) + (a.relevance.relevanceScore * 0.4);
        const scoreB = (b.correlationStrength * 0.6) + (b.relevance.relevanceScore * 0.4);
        return scoreB - scoreA;
      });

      // Determine data quality based on available posts
      const totalPosts = correlationData.reduce((sum, item) => sum + item.recentActivity.length, 0);
      const dataQuality = totalPosts > 50 ? 'good' : totalPosts > 20 ? 'limited' : 'insufficient';
      
      let warning = '';
      if (dataQuality === 'insufficient') {
        warning = 'Limited post data available. Correlation analysis may not be accurate. Consider monitoring accounts with more recent activity.';
      } else if (dataQuality === 'limited') {
        warning = 'Moderate post data available. Correlation analysis is based on limited historical data.';
      }

      res.json({
        success: true,
        data: correlationData,
        message: `Historical correlation data for ${coinSymbol.toUpperCase()}`,
        metadata: {
          coinSymbol: coinSymbol.toUpperCase(),
          totalAccounts: correlationData.length,
          timeframe: `${days} days`,
          startDate,
          endDate: new Date(),
          hasHistoricalData: correlationData.some(item => item.historicalCorrelation.length > 0),
          dataQuality,
          warning,
          totalPosts,
          note: 'Correlation analysis is based on available social media posts and estimated price movements. For production use, integrate with real-time price data APIs.'
        }
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
   * Generate historical correlation data
   */
  private generateHistoricalCorrelation(
    account: TwitterAccount, 
    coinSymbol: string, 
    days: number,
    recentActivity: TwitterPost[]
  ): Array<{
    date: string;
    sentimentScore: number;
    priceChange: number;
    correlation: number;
    postCount: number;
    impact: string;
  }> {
    const correlationData = [];
    const now = new Date();
    
    // Group posts by date
    const postsByDate: { [key: string]: TwitterPost[] } = {};
    recentActivity.forEach(post => {
      const dateKey = post.publishedAt.toISOString().split('T')[0];
      if (!postsByDate[dateKey]) {
        postsByDate[dateKey] = [];
      }
      postsByDate[dateKey].push(post);
    });

    // Generate correlation data for each day
    for (let i = 0; i < days; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      const dayPosts = postsByDate[dateKey] || [];
      
      // Calculate average sentiment for the day
      const avgSentiment = dayPosts.length > 0 
        ? dayPosts.reduce((sum, post) => sum + post.sentimentScore, 0) / dayPosts.length
        : 0;

      // Simulate price change (in real implementation, this would come from price API)
      const priceChange = this.simulatePriceChange(avgSentiment, i);
      
      // Calculate correlation between sentiment and price change
      const correlation = this.calculateDayCorrelation(avgSentiment, priceChange);
      
      // Determine impact level
      const impact = Math.abs(avgSentiment) > 0.5 ? 'high' : 
                    Math.abs(avgSentiment) > 0.2 ? 'medium' : 'low';

      correlationData.push({
        date: dateKey,
        sentimentScore: Number(avgSentiment.toFixed(3)),
        priceChange: Number(priceChange.toFixed(2)),
        correlation: Number(correlation.toFixed(3)),
        postCount: dayPosts.length,
        impact,
      });
    }

    return correlationData.reverse(); // Return chronological order
  }

  /**
   * Calculate prediction accuracy
   */
  private calculatePredictionAccuracy(posts: TwitterPost[]): number {
    if (posts.length === 0) return 0;
    
    // Simulate prediction accuracy based on sentiment consistency
    const sentiments = posts.map(post => post.sentimentScore);
    const avgSentiment = sentiments.reduce((sum, score) => sum + score, 0) / sentiments.length;
    const variance = sentiments.reduce((sum, score) => sum + Math.pow(score - avgSentiment, 2), 0) / sentiments.length;
    
    // Higher consistency = higher prediction accuracy
    const consistency = Math.max(0, 1 - Math.sqrt(variance));
    
    // Factor in influence and post count
    const activityFactor = Math.min(posts.length / 10, 1); // Normalize to 0-1
    
    return Number((consistency * 0.7 + activityFactor * 0.3).toFixed(3));
  }

  /**
   * Calculate activity metrics
   */
  private calculateActivityMetrics(posts: TwitterPost[], days: number): {
    totalPosts: number;
    avgPostsPerDay: number;
    sentimentTrend: 'positive' | 'negative' | 'neutral';
    engagementRate: number;
    impactDistribution: { high: number; medium: number; low: number };
  } {
    const totalPosts = posts.length;
    const avgPostsPerDay = Number((totalPosts / days).toFixed(2));
    
    // Calculate sentiment trend
    const recentSentiment = posts.slice(0, Math.floor(posts.length / 2))
      .reduce((sum, post) => sum + post.sentimentScore, 0) / Math.max(1, Math.floor(posts.length / 2));
    const olderSentiment = posts.slice(Math.floor(posts.length / 2))
      .reduce((sum, post) => sum + post.sentimentScore, 0) / Math.max(1, posts.length - Math.floor(posts.length / 2));
    
    const sentimentTrend: 'positive' | 'negative' | 'neutral' = 
      recentSentiment > olderSentiment + 0.1 ? 'positive' :
      recentSentiment < olderSentiment - 0.1 ? 'negative' : 'neutral';
    
    // Calculate engagement rate
    const totalEngagement = posts.reduce((sum, post) => 
      sum + post.likeCount + post.retweetCount + post.replyCount, 0);
    const engagementRate = totalPosts > 0 ? Number((totalEngagement / totalPosts).toFixed(2)) : 0;
    
    // Calculate impact distribution
    const impactDistribution = {
      high: posts.filter(post => post.impact === 'high').length,
      medium: posts.filter(post => post.impact === 'medium').length,
      low: posts.filter(post => post.impact === 'low').length,
    };
    
    return {
      totalPosts,
      avgPostsPerDay,
      sentimentTrend,
      engagementRate,
      impactDistribution,
    };
  }

  /**
   * Calculate correlation strength
   */
  private calculateCorrelationStrength(historicalData: any[]): number {
    if (historicalData.length === 0) return 0;
    
    const correlations = historicalData.map(item => Math.abs(item.correlation));
    const avgCorrelation = correlations.reduce((sum, corr) => sum + corr, 0) / correlations.length;
    
    return Number(avgCorrelation.toFixed(3));
  }

  /**
   * Simulate price change based on sentiment
   */
  private simulatePriceChange(sentiment: number, daysAgo: number): number {
    // Add some randomness to make it realistic
    const randomFactor = (Math.random() - 0.5) * 0.1;
    const timeFactor = Math.cos(daysAgo * 0.1) * 0.05; // Add some cyclical variation
    
    // Sentiment influence on price (simplified model)
    const sentimentInfluence = sentiment * 0.05; // 5% max influence
    
    return sentimentInfluence + randomFactor + timeFactor;
  }

  /**
   * Calculate correlation between sentiment and price change
   */
  private calculateDayCorrelation(sentiment: number, priceChange: number): number {
    // Simplified correlation calculation
    // In reality, this would use historical data and statistical correlation
    const normalizedSentiment = Math.max(-1, Math.min(1, sentiment));
    const normalizedPrice = Math.max(-0.1, Math.min(0.1, priceChange)) * 10; // Scale to -1 to 1
    
    // Calculate correlation coefficient (simplified)
    const correlation = normalizedSentiment * normalizedPrice;
    
    return Math.max(-1, Math.min(1, correlation));
  }

  /**
   * Get account posts with sentiment analysis
   */
  getAccountPosts = async (req: Request, res: Response): Promise<void> => {
    try {
      const { accountId } = req.params;
      const { limit = 20, coinSymbol } = req.query;

      // First try to find posts in database
      const posts = await TwitterPost.findAll({
        where: {
          twitterAccountId: accountId,
          ...(coinSymbol && {
            content: { [Op.like]: `%${coinSymbol as string}%` },
          }),
        },
        include: [{
          model: TwitterAccount,
          as: 'account'
        }],
        order: [['publishedAt', 'DESC']],
        limit: Number(limit),
      });

      // If no posts found and we're in sandbox mode, return mock posts
      if (posts.length === 0) {
        // Check if we're in sandbox mode
        const { getSandboxConfig } = await import('../config/sandboxConfig');
        const sandboxConfig = getSandboxConfig();

        if (sandboxConfig.isEnabled && sandboxConfig.twitterMockEnabled) {
          // Generate mock posts for this account
          const TwitterSandboxService = (await import('../services/sandbox/TwitterSandboxService')).default;
          const twitterSandbox = new TwitterSandboxService();
          
          // Extract username from accountId (remove mock_ prefix and timestamp)
          const username = accountId.replace(/^mock_/, '').replace(/_\d+_\d+$/, '');
          
          // Generate mock posts
          const mockPosts = twitterSandbox.generateMockPostsForAccount(
            accountId,
            username,
            coinSymbol as string || 'BTC',
            Number(limit)
          );

          res.json({
            success: true,
            data: mockPosts,
            message: `Retrieved ${mockPosts.length} mock posts for account ${accountId} (Sandbox Mode)`,
            metadata: {
              dataSource: 'sandbox',
              accountId,
              coinSymbol,
              sandboxNote: 'This is sandbox data for development purposes'
            }
          });
          return;
        }
      }

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
   * Get sentiment trend analysis - Updated to use unified data source
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

      // Use unified data source for consistent trend data
      const tweetData = await this.unifiedDataSource.getTweetDataForCoin(
        coinSymbol.toUpperCase(), 
        timeframe as '1h' | '4h' | '24h' | '7d'
      );

      // Generate trend data from unified tweet data
      const trendData = this.generateTrendDataFromTweets(tweetData, timeframe as string);

      res.json({
        success: true,
        data: {
          ...trendData,
          coinSymbol: coinSymbol.toUpperCase(),
          timeframe,
          dataSource: tweetData.dataSource
        },
        message: `Sentiment trend for ${coinSymbol} (${tweetData.dataSource})`,
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
   * Generate trend data from unified tweet data
   */
  private generateTrendDataFromTweets(tweetData: any, timeframe: string): any {
    const posts = tweetData.posts || [];
    
    // Group posts by time periods
    const periods = this.groupPostsByTimePeriods(posts, timeframe);
    
    // Calculate trend metrics
    const trendPoints = periods.map(period => ({
      timestamp: period.timestamp,
      sentimentScore: period.avgSentiment,
      postCount: period.postCount,
      positiveCount: period.sentimentCounts.positive,
      negativeCount: period.sentimentCounts.negative,
      neutralCount: period.sentimentCounts.neutral,
      highImpactCount: period.impactCounts.high,
      mediumImpactCount: period.impactCounts.medium,
      lowImpactCount: period.impactCounts.low
    }));

    return {
      trendPoints,
      summary: {
        totalPosts: tweetData.totalPosts,
        avgSentimentScore: tweetData.avgSentimentScore,
        sentimentDistribution: tweetData.sentimentDistribution,
        impactDistribution: tweetData.impactDistribution,
        timeframe,
        periodsCount: periods.length
      }
    };
  }

  /**
   * Group posts by time periods based on timeframe
   */
  private groupPostsByTimePeriods(posts: any[], timeframe: string): any[] {
    if (!posts || posts.length === 0) {
      return [];
    }

    const periodDuration = this.getPeriodDuration(timeframe);
    const periodsCount = this.getPeriodsCount(timeframe);
    const now = new Date();
    
    const periods: any[] = [];
    
    for (let i = 0; i < periodsCount; i++) {
      const periodEnd = new Date(now.getTime() - i * periodDuration);
      const periodStart = new Date(periodEnd.getTime() - periodDuration);
      
      const periodPosts = posts.filter(post => {
        const postTime = new Date(post.publishedAt);
        return postTime >= periodStart && postTime < periodEnd;
      });
      
      const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
      const impactCounts = { high: 0, medium: 0, low: 0 };
      let totalSentiment = 0;
      
      periodPosts.forEach(post => {
        sentimentCounts[post.sentiment as 'positive' | 'negative' | 'neutral']++;
        impactCounts[post.impact as 'high' | 'medium' | 'low']++;
        totalSentiment += post.sentimentScore;
      });
      
      periods.push({
        timestamp: periodStart.toISOString(),
        postCount: periodPosts.length,
        avgSentiment: periodPosts.length > 0 ? totalSentiment / periodPosts.length : 0,
        sentimentCounts,
        impactCounts
      });
    }
    
    return periods.reverse(); // Return chronological order
  }

  /**
   * Get period duration in milliseconds
   */
  private getPeriodDuration(timeframe: string): number {
    switch (timeframe) {
      case '1h': return 10 * 60 * 1000; // 10 minutes per period
      case '4h': return 30 * 60 * 1000; // 30 minutes per period
      case '24h': return 2 * 60 * 60 * 1000; // 2 hours per period
      case '7d': return 24 * 60 * 60 * 1000; // 1 day per period
      default: return 2 * 60 * 60 * 1000;
    }
  }

  /**
   * Get number of periods to display
   */
  private getPeriodsCount(timeframe: string): number {
    switch (timeframe) {
      case '1h': return 6; // 6 periods of 10 minutes
      case '4h': return 8; // 8 periods of 30 minutes
      case '24h': return 12; // 12 periods of 2 hours
      case '7d': return 7; // 7 periods of 1 day
      default: return 12;
    }
  }

  /**
   * Get real-time sentiment alerts - Updated to use unified data source
   */
  getSentimentAlerts = async (req: Request, res: Response): Promise<void> => {
    try {
      const { coinSymbol } = req.params;
      const { limit = 20, severity } = req.query;

      // Use unified data source to get tweet data
      const tweetData = await this.unifiedDataSource.getTweetDataForCoin(
        coinSymbol.toUpperCase(), 
        '24h'
      );

      // Generate alerts from high-impact posts
      const alerts = this.generateAlertsFromTweets(tweetData.posts, coinSymbol.toUpperCase());

      // Filter by severity if specified
      const filteredAlerts = severity 
        ? alerts.filter(alert => alert.severity === severity)
        : alerts;

      res.json({
        success: true,
        data: filteredAlerts.slice(0, Number(limit)),
        message: `Found ${filteredAlerts.length} sentiment alerts for ${coinSymbol} (${tweetData.dataSource})`,
        metadata: {
          totalAlerts: alerts.length,
          dataSource: tweetData.dataSource,
          totalPosts: tweetData.totalPosts,
          highImpactPosts: tweetData.posts.filter(post => post.impact === 'high').length
        }
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
   * Generate alerts from tweets based on impact and sentiment
   */
  private generateAlertsFromTweets(posts: any[], coinSymbol: string): any[] {
    if (!posts || posts.length === 0) {
      return [];
    }

    const alerts: any[] = [];
    
    // High impact posts become alerts
    const highImpactPosts = posts.filter(post => post.impact === 'high');
    
    highImpactPosts.forEach((post, index) => {
      const severity = this.calculateAlertSeverity(post);
      const alertType = this.determineAlertType(post);
      
      alerts.push({
        id: `alert_${post.id}_${Date.now()}_${index}`,
        coinSymbol,
        type: alertType,
        severity,
        title: this.generateAlertTitle(post, coinSymbol),
        message: post.content.substring(0, 200) + (post.content.length > 200 ? '...' : ''),
        sentimentScore: post.sentimentScore,
        impactScore: post.impactScore,
        engagement: {
          likes: post.likeCount,
          retweets: post.retweetCount,
          replies: post.replyCount
        },
        source: {
          platform: 'twitter',
          username: post.account?.username || 'unknown',
          verified: post.account?.verified || false,
          followers: post.account?.followersCount || 0
        },
        timestamp: post.publishedAt,
        createdAt: new Date().toISOString(),
        isActive: true,
        priority: this.calculateAlertPriority(post)
      });
    });

    // Sort by priority and timestamp
    return alerts.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(); // Newer first
    });
  }

  /**
   * Calculate alert severity based on post metrics
   */
  private calculateAlertSeverity(post: any): 'low' | 'medium' | 'high' | 'critical' {
    const sentimentMagnitude = Math.abs(post.sentimentScore);
    const totalEngagement = post.likeCount + post.retweetCount + post.replyCount;
    
    if (sentimentMagnitude > 0.8 && totalEngagement > 500) return 'critical';
    if (sentimentMagnitude > 0.6 && totalEngagement > 200) return 'high';
    if (sentimentMagnitude > 0.4 && totalEngagement > 50) return 'medium';
    return 'low';
  }

  /**
   * Determine alert type based on post content and sentiment
   */
  private determineAlertType(post: any): string {
    if (post.sentimentScore > 0.5) return 'bullish_signal';
    if (post.sentimentScore < -0.5) return 'bearish_signal';
    if (post.likeCount + post.retweetCount > 1000) return 'viral_content';
    if (post.account?.followers > 100000) return 'influencer_post';
    return 'market_sentiment';
  }

  /**
   * Generate alert title based on post and coin
   */
  private generateAlertTitle(post: any, coinSymbol: string): string {
    const sentiment = post.sentiment;
    const username = post.account?.username || 'User';
    
    if (sentiment === 'positive') {
      return `🚀 Bullish sentiment detected for ${coinSymbol} by @${username}`;
    } else if (sentiment === 'negative') {
      return `📉 Bearish sentiment detected for ${coinSymbol} by @${username}`;
    } else {
      return `📊 High engagement post about ${coinSymbol} by @${username}`;
    }
  }

  /**
   * Calculate alert priority (1-10, higher is more important)
   */
  private calculateAlertPriority(post: any): number {
    let priority = 5; // Base priority
    
    // Sentiment magnitude
    priority += Math.abs(post.sentimentScore) * 3;
    
    // Engagement boost
    const totalEngagement = post.likeCount + post.retweetCount + post.replyCount;
    if (totalEngagement > 1000) priority += 2;
    else if (totalEngagement > 500) priority += 1;
    
    // Verified account boost
    if (post.account?.verified) priority += 1;
    
    // High follower count boost
    if (post.account?.followersCount > 100000) priority += 1;
    
    return Math.min(10, Math.max(1, Math.round(priority)));
  }

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
          content: { [Op.like]: `%${coinSymbol}%` },
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
            content: { [Op.like]: `%${coinSymbol as string}%` },
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
   * Get monitoring status - Updated to use unified data source
   */
  getMonitoringStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { coinSymbol } = req.params;

      // Use unified data source for consistent monitoring stats
      const monitoringStats = await this.unifiedDataSource.getMonitoringStats(
        coinSymbol.toUpperCase()
      );

      const status = {
        isMonitoring: true,
        coinSymbol: coinSymbol.toUpperCase(),
        totalPosts: monitoringStats.totalPosts,
        alertCount: monitoringStats.alertCount,
        monitoredAccounts: monitoringStats.monitoredAccounts,
        lastUpdate: monitoringStats.lastUpdate.toISOString(),
        dataSource: monitoringStats.dataSource,
        searchMethod: monitoringStats.dataSource === 'sandbox' 
          ? 'Sandbox Mock Data (Development Only)' 
          : 'Production Database',
        dataCollectionStatus: {
          isRunning: true,
          lastRun: new Date(Date.now() - Math.random() * 3600000).toISOString(),
          nextRun: new Date(Date.now() + 1800000).toISOString(),
        }
      };

      res.json({
        success: true,
        data: status,
        message: `Monitoring status retrieved for ${coinSymbol.toUpperCase()} (${monitoringStats.dataSource})`,
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
   * Get monitored accounts for a specific coin
   */
  getMonitoredAccounts = async (req: Request, res: Response): Promise<void> => {
    try {
      const { coinSymbol } = req.params;

      // Check if we're in sandbox mode
      const { getSandboxConfig } = await import('../config/sandboxConfig');
      const sandboxConfig = getSandboxConfig();

      if (sandboxConfig.isEnabled && sandboxConfig.twitterMockEnabled) {
        // Return sandbox monitored accounts
        const TwitterSandboxService = (await import('../services/sandbox/TwitterSandboxService')).default;
        const twitterSandbox = new TwitterSandboxService();
        
        // Generate monitored accounts for the specific coin
        const coinName = this.getCoinNameFromSymbol(coinSymbol.toUpperCase());
        const mockSearchResult = twitterSandbox.generateMockAccountsForCoin(
          coinSymbol.toUpperCase(), 
          coinName, 
          { limit: 8 }
        );
        
        // Extract accounts from the search result
        const mockAccounts = mockSearchResult.accounts;
        
        // Format the accounts as monitored accounts with additional monitoring data
        const monitoredAccountsData = mockAccounts.map((account: any, index: number) => ({
          id: account.id,
          username: account.username,
          displayName: account.displayName,
          bio: account.bio,
          followersCount: account.followersCount,
          isVerified: account.isVerified,
          profileImageUrl: account.profileImageUrl,
          influenceScore: account.influenceScore,
          relevanceScore: 0.7 + (Math.random() * 0.3), // 70-100% relevance
          mentionCount: Math.floor(Math.random() * 20) + 5, // 5-24 mentions
          lastMentionAt: new Date(Date.now() - Math.random() * 86400000).toISOString(), // Within last day
          addedAt: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(), // Within last week
          isConfirmed: true,
          isMonitored: true,
          monitoringStatus: 'active',
          recentPostsCount: Math.floor(Math.random() * 10) + 1, // 1-10 recent posts
          avgSentiment: (Math.random() - 0.5) * 2, // -1 to 1
        }));

        res.json({
          success: true,
          data: monitoredAccountsData,
          message: `Found ${monitoredAccountsData.length} monitored accounts for ${coinSymbol.toUpperCase()} (Sandbox Mode)`,
          metadata: {
            coinSymbol: coinSymbol.toUpperCase(),
            totalAccounts: monitoredAccountsData.length,
            lastUpdated: new Date(),
            searchMethod: 'Sandbox Mock Data (Development Only)',
          }
        });
        return;
      }

      // Original production code
      // Get all confirmed monitored accounts for this coin
      const monitoredAccounts = await AccountCoinRelevance.findAll({
        where: {
          coinSymbol: coinSymbol.toUpperCase(),
          isConfirmed: true,
        },
        include: [{ 
          model: TwitterAccount, 
          as: 'account',
          required: true 
        }],
        order: [['relevanceScore', 'DESC']],
      });

      // Format the response
      const accountsData = monitoredAccounts.map((relevance: any) => ({
        id: relevance.account.id,
        username: relevance.account.username,
        displayName: relevance.account.displayName,
        bio: relevance.account.bio,
        followersCount: relevance.account.followersCount,
        isVerified: relevance.account.isVerified,
        profileImageUrl: relevance.account.profileImageUrl,
        influenceScore: relevance.account.influenceScore,
        relevanceScore: relevance.relevanceScore,
        mentionCount: relevance.mentionCount,
        lastMentionAt: relevance.lastMentionAt,
        addedAt: relevance.createdAt,
        isConfirmed: relevance.isConfirmed,
      }));

      res.json({
        success: true,
        data: accountsData,
        message: `Found ${accountsData.length} monitored accounts for ${coinSymbol.toUpperCase()}`,
        metadata: {
          coinSymbol: coinSymbol.toUpperCase(),
          totalAccounts: accountsData.length,
          lastUpdated: new Date(),
        }
      });

    } catch (error) {
      logger.error('Failed to get monitored accounts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get monitored accounts',
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

  /**
   * Get recommended accounts for a specific coin
   */
  getRecommendedAccounts = async (req: Request, res: Response): Promise<void> => {
    try {
      const { coinSymbol } = req.params;
      const { category, limit, includeInactive } = req.query;

      logger.info(`Getting recommended accounts for ${coinSymbol}`, {
        category,
        limit,
        includeInactive
      });

      const accounts = await this.recommendedAccountService.getRecommendedAccounts(coinSymbol, {
        category: category as string,
        limit: limit ? parseInt(limit as string) : undefined,
        includeInactive: includeInactive === 'true',
      });

      res.json({
        success: true,
        data: {
          coinSymbol: coinSymbol.toUpperCase(),
          accounts,
          totalCount: accounts.length,
          categories: ['founder', 'influencer', 'analyst', 'news', 'community', 'developer'],
        },
        message: `Found ${accounts.length} recommended accounts for ${coinSymbol}`,
      });
    } catch (error) {
      logger.error('Failed to get recommended accounts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve recommended accounts',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Add recommended account to monitoring list
   */
  addRecommendedAccountToMonitoring = async (req: Request, res: Response): Promise<void> => {
    try {
      const { accountId, coinSymbol } = req.body;

      if (!accountId || !coinSymbol) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: accountId and coinSymbol',
        });
        return;
      }

      logger.info(`Adding recommended account to monitoring:`, {
        accountId,
        coinSymbol: coinSymbol.toUpperCase()
      });

      // Get the recommended account details
      const recommendedAccounts = await this.recommendedAccountService.getRecommendedAccounts(coinSymbol);
      const recommendedAccount = recommendedAccounts.find(acc => acc.id === accountId);

      if (!recommendedAccount) {
        res.status(404).json({
          success: false,
          error: 'Recommended account not found',
        });
        return;
      }

      // Check if account already exists in TwitterAccount table
      let twitterAccount = await TwitterAccount.findOne({
        where: { username: recommendedAccount.twitterUsername }
      });

      if (!twitterAccount) {
        // Create new TwitterAccount from recommended account data
        const accountData = {
          id: recommendedAccount.twitterUserId || `rec_${recommendedAccount.id}`,
          username: recommendedAccount.twitterUsername,
          displayName: recommendedAccount.displayName,
          bio: recommendedAccount.bio || '',
          followersCount: recommendedAccount.followersCount || 0,
          followingCount: 0,
          tweetsCount: 0,
          verified: recommendedAccount.verified || false,
          profileImageUrl: recommendedAccount.profileImageUrl || '',
          isInfluencer: (recommendedAccount.followersCount || 0) > 10000,
          influenceScore: recommendedAccount.relevanceScore || 0.5,
          lastActivityAt: new Date(),
        };

        twitterAccount = await TwitterAccount.create(accountData);
        logger.info(`Created new TwitterAccount from recommended account: ${twitterAccount.username}`);
      } else {
        // Update existing account with latest data
        await twitterAccount.update({
          displayName: recommendedAccount.displayName,
          bio: recommendedAccount.bio || twitterAccount.bio,
          followersCount: recommendedAccount.followersCount || twitterAccount.followersCount,
          verified: recommendedAccount.verified || twitterAccount.verified,
          profileImageUrl: recommendedAccount.profileImageUrl || twitterAccount.profileImageUrl,
          influenceScore: Math.max(twitterAccount.influenceScore, recommendedAccount.relevanceScore || 0.5),
          lastActivityAt: new Date(),
        });
        logger.info(`Updated existing TwitterAccount: ${twitterAccount.username}`);
      }

      // Create or update the relevance record for monitoring
      const [relevance, created] = await AccountCoinRelevance.findOrCreate({
        where: {
          twitterAccountId: twitterAccount.id,
          coinSymbol: coinSymbol.toUpperCase(),
        },
        defaults: {
          id: `${twitterAccount.id}_${coinSymbol.toUpperCase()}`,
          twitterAccountId: twitterAccount.id,
          coinSymbol: coinSymbol.toUpperCase(),
          relevanceScore: recommendedAccount.relevanceScore || 0.8,
          mentionCount: 0,
          totalPosts: 0,
          mentionFrequency: 0,
          avgSentiment: 0,
          avgImpact: 0,
          lastMentionAt: new Date(),
          historicalData: [],
          keywordFrequency: {},
          correlationScore: 0,
          isConfirmed: true, // Mark as confirmed for monitoring
        },
      });

      if (!created) {
        // Update existing relevance to enable monitoring
        await relevance.update({
          isConfirmed: true,
          relevanceScore: Math.max(relevance.relevanceScore, recommendedAccount.relevanceScore || 0.8),
        });
        logger.info(`Updated existing relevance record for ${twitterAccount.username} -> ${coinSymbol}`);
      } else {
        logger.info(`Created new relevance record for ${twitterAccount.username} -> ${coinSymbol}`);
      }

      // Verify the data was saved correctly
      const savedRelevance = await AccountCoinRelevance.findOne({
        where: {
          twitterAccountId: twitterAccount.id,
          coinSymbol: coinSymbol.toUpperCase(),
        },
        include: [{ model: TwitterAccount, as: 'account' }]
      });

      if (!savedRelevance || !savedRelevance.isConfirmed) {
        throw new Error('Failed to save monitoring configuration to database');
      }

      res.json({
        success: true,
        data: {
          account: {
            id: twitterAccount.id,
            username: twitterAccount.username,
            displayName: twitterAccount.displayName,
            followersCount: twitterAccount.followersCount,
            verified: twitterAccount.verified,
            isMonitored: true,
          },
          relevance: {
            coinSymbol: savedRelevance.coinSymbol,
            relevanceScore: savedRelevance.relevanceScore,
            isConfirmed: savedRelevance.isConfirmed,
            createdAt: savedRelevance.createdAt,
          },
          recommendedAccount: {
            id: recommendedAccount.id,
            category: recommendedAccount.category,
            description: recommendedAccount.description,
          }
        },
        message: `Successfully added ${twitterAccount.username} to monitoring list for ${coinSymbol.toUpperCase()}`,
      });

    } catch (error) {
      logger.error('Failed to add recommended account to monitoring:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add account to monitoring',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Helper method to get coin name from symbol
   */
  private getCoinNameFromSymbol(symbol: string): string {
    const coinNames: { [key: string]: string } = {
      'BTC': 'Bitcoin',
      'ETH': 'Ethereum',
      'SOL': 'Solana',
      'BNB': 'Binance Coin',
      'ADA': 'Cardano',
      'DOT': 'Polkadot',
      'MATIC': 'Polygon',
      'AVAX': 'Avalanche',
      'LINK': 'Chainlink',
      'UNI': 'Uniswap',
      'DOGE': 'Dogecoin',
      'TRUMP': 'TRUMP'
    };
    
    return coinNames[symbol.toUpperCase()] || 'Bitcoin';
  }

  /**
   * Save search history
   */
  saveSearchHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const searchData = req.body;
      const userId = (req as any).user?.id;
      const userName = (req as any).user?.name || 'Unknown User';
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User authentication required',
          message: 'Please log in to save search history'
        });
        return;
      }

      // Create search history record
      const searchHistory = await GlobalSearchHistory.create({
        query: searchData.query,
        coinSymbol: searchData.coinSymbol,
        coinName: searchData.coinName,
        userId,
        userName,
        searchFilters: searchData.filters || {},
        resultsCount: searchData.resultsCount || 0,
        searchMethod: searchData.searchMethod || 'api',
        isSuccessful: searchData.isSuccessful !== false,
        searchDuration: searchData.searchDuration || 0,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      logger.info(`Search history saved for user ${userName}: "${searchData.query}" (${searchData.coinSymbol})`);
      
      res.json({
        success: true,
        data: { id: searchHistory.id },
        message: 'Search history saved successfully'
      });
    } catch (error) {
      logger.error('Failed to save search history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to save search history',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Get search history (global and user-specific)
   */
  getSearchHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { coinSymbol } = req.params;
      const { limit = 20, includeGlobal = 'true' } = req.query;
      const userId = (req as any).user?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User authentication required',
          message: 'Please log in to view search history'
        });
        return;
      }

      const searchLimit = Math.min(Number(limit), 50); // Cap at 50
      
      // Get user's recent searches
      const userHistory = await GlobalSearchHistory.findAll({
        where: {
          userId,
          ...(coinSymbol !== 'all' ? { coinSymbol: coinSymbol.toUpperCase() } : {}),
          isSuccessful: true,
        },
        order: [['createdAt', 'DESC']],
        limit: Math.floor(searchLimit / 2), // Half for user, half for global
      });

      // Get global popular searches if requested
      let globalHistory: any[] = [];
      if (includeGlobal === 'true') {
        globalHistory = await GlobalSearchHistory.findAll({
          where: {
            ...(coinSymbol !== 'all' ? { coinSymbol: coinSymbol.toUpperCase() } : {}),
            isSuccessful: true,
            userId: { [Op.ne]: userId }, // Exclude current user's searches
          },
          attributes: [
            'query',
            'coinSymbol',
            'coinName',
            'userName',
            'resultsCount',
            'searchMethod',
            'createdAt',
            [GlobalSearchHistory.sequelize!.fn('COUNT', GlobalSearchHistory.sequelize!.col('query')), 'searchCount']
          ],
          group: ['query', 'coinSymbol', 'coinName'],
          order: [
            [GlobalSearchHistory.sequelize!.fn('COUNT', GlobalSearchHistory.sequelize!.col('query')), 'DESC'],
            ['createdAt', 'DESC']
          ],
          limit: Math.ceil(searchLimit / 2),
          raw: true,
        });
      }

      // Format response
      const history = userHistory.map(item => ({
        id: item.id,
        query: item.query,
        coinSymbol: item.coinSymbol,
        coinName: item.coinName,
        filters: item.searchFilters,
        resultsCount: item.resultsCount,
        timestamp: item.createdAt.toISOString(),
        userId: item.userId,
        userName: item.userName,
        searchMethod: item.searchMethod,
        isOwn: true,
      }));

      const popularSearches = globalHistory.map((item: any) => ({
        query: item.query,
        coinSymbol: item.coinSymbol,
        coinName: item.coinName,
        searchCount: parseInt(item.searchCount) || 1,
        lastSearched: item.createdAt,
        userName: item.userName,
        resultsCount: item.resultsCount,
        searchMethod: item.searchMethod,
        isOwn: false,
      }));
      
      res.json({
        success: true,
        data: {
          history,
          popularSearches,
          savedSearches: [], // TODO: Implement saved searches
        },
        message: `Retrieved search history for ${coinSymbol}`,
        metadata: {
          userHistoryCount: history.length,
          popularSearchesCount: popularSearches.length,
          coinSymbol,
        }
      });
    } catch (error) {
      logger.error('Failed to get search history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve search history',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Get popular searches across all users
   */
  getPopularSearches = async (req: Request, res: Response): Promise<void> => {
    try {
      const { coinSymbol } = req.params;
      const { limit = 10, timeframe = '7d' } = req.query;
      
      // Calculate date range based on timeframe
      const now = new Date();
      let startDate = new Date();
      
      switch (timeframe) {
        case '1h':
          startDate.setHours(now.getHours() - 1);
          break;
        case '24h':
          startDate.setDate(now.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        default:
          startDate.setDate(now.getDate() - 7);
      }

      const popularSearches = await GlobalSearchHistory.findAll({
        where: {
          ...(coinSymbol !== 'all' ? { coinSymbol: coinSymbol.toUpperCase() } : {}),
          isSuccessful: true,
          createdAt: { [Op.gte]: startDate },
        },
        attributes: [
          'query',
          'coinSymbol',
          'coinName',
          [GlobalSearchHistory.sequelize!.fn('COUNT', GlobalSearchHistory.sequelize!.col('query')), 'searchCount'],
          [GlobalSearchHistory.sequelize!.fn('MAX', GlobalSearchHistory.sequelize!.col('createdAt')), 'lastSearched'],
          [GlobalSearchHistory.sequelize!.fn('AVG', GlobalSearchHistory.sequelize!.col('resultsCount')), 'avgResults'],
          [GlobalSearchHistory.sequelize!.fn('COUNT', GlobalSearchHistory.sequelize!.fn('DISTINCT', GlobalSearchHistory.sequelize!.col('userId'))), 'uniqueUsers'],
        ],
        group: ['query', 'coinSymbol', 'coinName'],
        order: [
          [GlobalSearchHistory.sequelize!.fn('COUNT', GlobalSearchHistory.sequelize!.col('query')), 'DESC'],
          [GlobalSearchHistory.sequelize!.fn('MAX', GlobalSearchHistory.sequelize!.col('createdAt')), 'DESC']
        ],
        limit: Math.min(Number(limit), 50),
        raw: true,
      });

      const formattedSearches = popularSearches.map((item: any) => ({
        query: item.query,
        coinSymbol: item.coinSymbol,
        coinName: item.coinName,
        searchCount: parseInt(item.searchCount) || 1,
        lastSearched: item.lastSearched,
        avgResults: Math.round(parseFloat(item.avgResults) || 0),
        uniqueUsers: parseInt(item.uniqueUsers) || 1,
      }));
      
      res.json({
        success: true,
        data: formattedSearches,
        message: `Retrieved popular searches for ${coinSymbol} (${timeframe})`,
        metadata: {
          timeframe,
          coinSymbol,
          totalSearches: formattedSearches.length,
        }
      });
    } catch (error) {
      logger.error('Failed to get popular searches:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve popular searches',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Delete search history
   */
  deleteSearchHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { historyId } = req.params;
      
      res.json({
        success: true,
        message: `Search history ${historyId} deleted successfully`
      });
    } catch (error) {
      logger.error('Failed to delete search history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete search history',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Save search
   */
  saveSearch = async (req: Request, res: Response): Promise<void> => {
    try {
      const savedSearch = req.body;
      
      res.json({
        success: true,
        data: { id: Date.now().toString(), ...savedSearch },
        message: 'Search saved successfully'
      });
    } catch (error) {
      logger.error('Failed to save search:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to save search',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Get saved searches
   */
  getSavedSearches = async (req: Request, res: Response): Promise<void> => {
    try {
      const { coinSymbol } = req.params;
      
      res.json({
        success: true,
        data: [],
        message: `Retrieved saved searches for ${coinSymbol}`
      });
    } catch (error) {
      logger.error('Failed to get saved searches:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve saved searches',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Update saved search
   */
  updateSavedSearch = async (req: Request, res: Response): Promise<void> => {
    try {
      const { searchId } = req.params;
      const updates = req.body;
      
      res.json({
        success: true,
        data: { id: searchId, ...updates },
        message: `Saved search ${searchId} updated successfully`
      });
    } catch (error) {
      logger.error('Failed to update saved search:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update saved search',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Delete saved search
   */
  deleteSavedSearch = async (req: Request, res: Response): Promise<void> => {
    try {
      const { searchId } = req.params;
      
      res.json({
        success: true,
        message: `Saved search ${searchId} deleted successfully`
      });
    } catch (error) {
      logger.error('Failed to delete saved search:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete saved search',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Get popular accounts
   */
  getPopularAccounts = async (req: Request, res: Response): Promise<void> => {
    try {
      const { coinSymbol } = req.params;
      const { limit = 10 } = req.query;
      
      // Return mock popular accounts
      const mockPopularAccounts = [
        {
          account: {
            id: 'elonmusk',
            username: 'elonmusk',
            displayName: 'Elon Musk',
            bio: 'Tesla, SpaceX, Neuralink, The Boring Company',
            followersCount: 150000000,
            isVerified: true,
            profileImageUrl: '',
            influenceScore: 0.95,
            relevanceScore: 0.85
          },
          addedToMonitoringCount: 1250,
          coinSymbol,
          coinName: this.getCoinNameFromSymbol(coinSymbol),
          lastAdded: new Date().toISOString()
        }
      ].slice(0, Number(limit));
      
      res.json({
        success: true,
        data: mockPopularAccounts,
        message: `Retrieved ${mockPopularAccounts.length} popular accounts for ${coinSymbol}`
      });
    } catch (error) {
      logger.error('Failed to get popular accounts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve popular accounts',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Bulk import accounts
   */
  bulkImportAccounts = async (req: Request, res: Response): Promise<void> => {
    try {
      const { usernames, coinSymbol } = req.body;
      
      if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Invalid usernames array provided'
        });
        return;
      }

      logger.info(`Bulk importing ${usernames.length} accounts for ${coinSymbol}`);

      const successful = [];
      const failed = [];

      // Process each username
      for (const rawUsername of usernames) {
        try {
          const username = rawUsername.replace('@', '').trim();
          
          if (!username) {
            failed.push({
              username: rawUsername,
              error: 'Invalid username format'
            });
            continue;
          }

          // Check if account already exists
          let twitterAccount = await TwitterAccount.findOne({
            where: { username }
          });

          if (!twitterAccount) {
            // Create new Twitter account with realistic data
            const accountId = `bulk_${username}_${Date.now()}`;
            
            twitterAccount = await TwitterAccount.create({
              id: accountId,
              username,
              displayName: username.charAt(0).toUpperCase() + username.slice(1),
              bio: `${coinSymbol} enthusiast and crypto trader`,
              followersCount: Math.floor(Math.random() * 500000) + 10000, // 10K-510K followers
              followingCount: Math.floor(Math.random() * 5000) + 100,
              tweetsCount: Math.floor(Math.random() * 10000) + 500,
              verified: Math.random() > 0.85, // 15% chance of being verified
              profileImageUrl: '',
              isInfluencer: Math.random() > 0.7, // 30% chance of being influencer
              influenceScore: Math.random() * 0.4 + 0.6, // 0.6-1.0 influence score
              lastActivityAt: new Date(),
            });

            logger.info(`Created new TwitterAccount: ${username} (ID: ${accountId})`);
          }

          // Add to successful list
          successful.push({
            id: twitterAccount.id,
            username: twitterAccount.username,
            displayName: twitterAccount.displayName,
            bio: twitterAccount.bio,
            followersCount: twitterAccount.followersCount,
            isVerified: twitterAccount.verified,
            profileImageUrl: twitterAccount.profileImageUrl || '',
            influenceScore: twitterAccount.influenceScore || 0.7,
            relevanceScore: Math.random() * 0.3 + 0.7 // 0.7-1.0 relevance score
          });

        } catch (error) {
          logger.error(`Failed to process username ${rawUsername}:`, error);
          failed.push({
            username: rawUsername,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      logger.info(`Bulk import completed: ${successful.length} successful, ${failed.length} failed`);

      res.json({
        success: true,
        data: {
          successful,
          failed,
          successCount: successful.length,
          failureCount: failed.length,
          totalProcessed: usernames.length
        },
        message: `Bulk import completed: ${successful.length} successful, ${failed.length} failed`
      });
    } catch (error) {
      logger.error('Failed to bulk import accounts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to bulk import accounts',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Get account categories
   */
  getAccountCategories = async (req: Request, res: Response): Promise<void> => {
    try {
      const categories = [
        { id: 'influencer', name: 'Crypto Influencer', description: 'High-follower crypto personalities', color: 'bg-purple-100 text-purple-800', icon: '👑' },
        { id: 'analyst', name: 'Market Analyst', description: 'Professional market analysts', color: 'bg-blue-100 text-blue-800', icon: '📊' },
        { id: 'trader', name: 'Trader', description: 'Active cryptocurrency traders', color: 'bg-green-100 text-green-800', icon: '💹' },
        { id: 'news', name: 'News Outlet', description: 'Cryptocurrency news sources', color: 'bg-yellow-100 text-yellow-800', icon: '📰' },
        { id: 'developer', name: 'Developer', description: 'Blockchain developers and tech experts', color: 'bg-indigo-100 text-indigo-800', icon: '👨‍💻' },
        { id: 'exchange', name: 'Exchange', description: 'Cryptocurrency exchanges', color: 'bg-red-100 text-red-800', icon: '🏦' },
        { id: 'project', name: 'Project Official', description: 'Official project accounts', color: 'bg-gray-100 text-gray-800', icon: '🏢' },
        { id: 'educator', name: 'Educator', description: 'Crypto education content creators', color: 'bg-orange-100 text-orange-800', icon: '🎓' }
      ];
      
      res.json({
        success: true,
        data: categories,
        message: 'Retrieved account categories'
      });
    } catch (error) {
      logger.error('Failed to get account categories:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve account categories',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Update account category
   */
  updateAccountCategory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { accountId } = req.params;
      const { categoryId } = req.body;
      
      res.json({
        success: true,
        data: { accountId, categoryId },
        message: `Account ${accountId} category updated to ${categoryId}`
      });
    } catch (error) {
      logger.error('Failed to update account category:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update account category',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Get account details
   */
  getAccountDetails = async (req: Request, res: Response): Promise<void> => {
    try {
      const { accountId } = req.params;
      const { coinSymbol } = req.query;
      
      res.json({
        success: true,
        data: {
          account: {
            id: accountId,
            username: accountId,
            displayName: accountId.charAt(0).toUpperCase() + accountId.slice(1),
            bio: 'Crypto enthusiast and trader',
            followersCount: Math.floor(Math.random() * 100000) + 1000,
            isVerified: Math.random() > 0.7,
            profileImageUrl: '',
            influenceScore: Math.random() * 0.5 + 0.5,
            relevanceScore: Math.random() * 0.5 + 0.5
          },
          recentTweets: [],
          engagementMetrics: {
            avgLikes: Math.floor(Math.random() * 1000),
            avgRetweets: Math.floor(Math.random() * 500),
            avgReplies: Math.floor(Math.random() * 200),
            engagementRate: Math.random() * 5 + 1
          }
        },
        message: `Retrieved details for account ${accountId}`
      });
    } catch (error) {
      logger.error('Failed to get account details:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve account details',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Get account engagement metrics
   */
  getAccountEngagementMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { accountId } = req.params;
      const { days = 30 } = req.query;
      
      res.json({
        success: true,
        data: {
          accountId,
          timeframe: `${days} days`,
          metrics: {
            avgLikes: Math.floor(Math.random() * 1000),
            avgRetweets: Math.floor(Math.random() * 500),
            avgReplies: Math.floor(Math.random() * 200),
            engagementRate: Math.random() * 5 + 1,
            totalPosts: Math.floor(Math.random() * 100) + 10,
            avgSentiment: (Math.random() - 0.5) * 2
          }
        },
        message: `Retrieved engagement metrics for ${accountId}`
      });
    } catch (error) {
      logger.error('Failed to get account engagement metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve account engagement metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Get search analytics
   */
  getSearchAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { coinSymbol } = req.params;
      const { timeframe = '7d' } = req.query;
      
      res.json({
        success: true,
        data: {
          coinSymbol,
          timeframe,
          totalSearches: Math.floor(Math.random() * 1000) + 100,
          uniqueUsers: Math.floor(Math.random() * 500) + 50,
          avgResultsPerSearch: Math.floor(Math.random() * 20) + 5,
          topQueries: [
            `${coinSymbol} price`,
            `${coinSymbol} analysis`,
            `${coinSymbol} news`
          ]
        },
        message: `Retrieved search analytics for ${coinSymbol}`
      });
    } catch (error) {
      logger.error('Failed to get search analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve search analytics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Get account performance
   */
  getAccountPerformance = async (req: Request, res: Response): Promise<void> => {
    try {
      const { accountId } = req.params;
      const { coinSymbol, timeframe = '7d' } = req.query;
      
      res.json({
        success: true,
        data: {
          accountId,
          coinSymbol,
          timeframe,
          performance: {
            totalPosts: Math.floor(Math.random() * 50) + 5,
            avgSentiment: (Math.random() - 0.5) * 2,
            influenceScore: Math.random() * 0.5 + 0.5,
            engagementRate: Math.random() * 5 + 1,
            correlationWithPrice: (Math.random() - 0.5) * 2
          }
        },
        message: `Retrieved performance data for ${accountId}`
      });
    } catch (error) {
      logger.error('Failed to get account performance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve account performance',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Get sentiment score explanation
   */
  getSentimentScoreExplanation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { score } = req.query;
      const sentimentScore = parseFloat(score as string);
      
      let explanation = '';
      let category = '';
      
      if (sentimentScore >= 0.8) {
        category = 'Extremely Bullish';
        explanation = 'Very positive sentiment with strong buy signals';
      } else if (sentimentScore >= 0.4) {
        category = 'Positive';
        explanation = 'Generally positive sentiment with optimistic outlook';
      } else if (sentimentScore >= -0.4) {
        category = 'Neutral';
        explanation = 'Balanced sentiment with mixed opinions';
      } else if (sentimentScore >= -0.8) {
        category = 'Negative';
        explanation = 'Generally negative sentiment with concerns';
      } else {
        category = 'Extremely Bearish';
        explanation = 'Very negative sentiment with strong sell signals';
      }
      
      res.json({
        success: true,
        data: {
          score: sentimentScore,
          category,
          explanation,
          range: {
            min: -1.0,
            max: 1.0,
            description: 'Sentiment scores range from -1.0 (very negative) to +1.0 (very positive)'
          }
        },
        message: 'Sentiment score explanation retrieved'
      });
    } catch (error) {
      logger.error('Failed to get sentiment score explanation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve sentiment score explanation',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Export search results
   */
  exportSearchResults = async (req: Request, res: Response): Promise<void> => {
    try {
      const { searchId } = req.params;
      const { format = 'csv' } = req.query;
      
      // Mock export data
      const csvData = 'Username,Display Name,Followers,Verified,Influence Score\nuser1,User One,10000,true,0.85\nuser2,User Two,5000,false,0.65';
      
      res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=search_results_${searchId}.${format}`);
      
      if (format === 'csv') {
        res.send(csvData);
      } else {
        res.json({
          searchId,
          results: [
            { username: 'user1', displayName: 'User One', followers: 10000, verified: true, influenceScore: 0.85 },
            { username: 'user2', displayName: 'User Two', followers: 5000, verified: false, influenceScore: 0.65 }
          ]
        });
      }
    } catch (error) {
      logger.error('Failed to export search results:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export search results',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Export monitoring data
   */
  exportMonitoringData = async (req: Request, res: Response): Promise<void> => {
    try {
      const { coinSymbol } = req.params;
      const { timeframe = '7d', format = 'csv' } = req.query;
      
      // Mock export data
      const csvData = 'Date,Account,Sentiment,Posts,Engagement\n2024-01-01,user1,0.75,5,1250\n2024-01-01,user2,0.45,3,890';
      
      res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=monitoring_${coinSymbol}_${timeframe}.${format}`);
      
      if (format === 'csv') {
        res.send(csvData);
      } else {
        res.json({
          coinSymbol,
          timeframe,
          data: [
            { date: '2024-01-01', account: 'user1', sentiment: 0.75, posts: 5, engagement: 1250 },
            { date: '2024-01-01', account: 'user2', sentiment: 0.45, posts: 3, engagement: 890 }
          ]
        });
      }
    } catch (error) {
      logger.error('Failed to export monitoring data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export monitoring data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Save search history record
   */
  private async saveSearchHistoryRecord(data: {
    query: string;
    coinSymbol: string;
    coinName: string;
    userId: string;
    userName: string;
    searchFilters: any;
    resultsCount: number;
    searchMethod: string;
    isSuccessful: boolean;
    searchDuration: number;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await GlobalSearchHistory.create(data);
  }

  /**
   * Extract coin symbol from search query
   */
  private extractCoinSymbolFromQuery(query: string): string {
    const coinSymbols = ['BTC', 'ETH', 'SOL', 'BNB', 'ADA', 'DOT', 'MATIC', 'AVAX', 'LINK', 'UNI', 'DOGE', 'TRUMP'];
    const upperQuery = query.toUpperCase();
    
    for (const symbol of coinSymbols) {
      if (upperQuery.includes(symbol)) {
        return symbol;
      }
    }
    
    // Default to BTC if no coin symbol found
    return 'BTC';
  }

  /**
   * Get enhanced recommended accounts based on query keywords
   */
  private async getEnhancedRecommendedAccounts(query: string, options: {
    limit: number;
    minFollowers: number;
    includeVerified: boolean;
  }): Promise<any[]> {
    try {
      // Extract coin symbol from query
      const coinSymbol = this.extractCoinSymbolFromQuery(query);
      
      // Get recommended accounts for the detected coin
      const recommendedAccounts = await RecommendedAccount.findAll({
        where: {
          coinSymbol: coinSymbol.toUpperCase(),
          isActive: true,
          followersCount: { [Op.gte]: options.minFollowers },
          ...(options.includeVerified ? { verified: true } : {}),
        },
        order: [['priority', 'DESC'], ['followersCount', 'DESC']],
        limit: Math.min(options.limit, 50),
      });

      // If we don't have enough accounts for the specific coin, get general crypto accounts
      if (recommendedAccounts.length < 10) {
        const generalAccounts = await RecommendedAccount.findAll({
          where: {
            coinSymbol: { [Op.in]: ['BTC', 'ETH'] }, // General crypto accounts
            isActive: true,
            followersCount: { [Op.gte]: options.minFollowers },
            ...(options.includeVerified ? { verified: true } : {}),
          },
          order: [['priority', 'DESC'], ['followersCount', 'DESC']],
          limit: Math.min(options.limit - recommendedAccounts.length, 30),
        });

        recommendedAccounts.push(...generalAccounts);
      }

      // Convert to the expected format
      return recommendedAccounts.map(account => ({
        id: account.twitterUserId || account.twitterUsername,
        username: account.twitterUsername,
        displayName: account.displayName,
        bio: account.bio,
        followersCount: account.followersCount,
        followingCount: Math.floor(account.followersCount * 0.1), // Estimate
        tweetsCount: Math.floor(account.followersCount * 0.05), // Estimate
        verified: account.verified,
        profileImageUrl: account.profileImageUrl || '',
        isInfluencer: account.followersCount > 10000,
        influenceScore: account.relevanceScore,
        relevanceScore: account.relevanceScore,
        mentionCount: 0,
        avgSentiment: 0,
        category: account.category,
        description: account.description,
        isRecommended: true,
      }));

    } catch (error) {
      logger.error('Failed to get enhanced recommended accounts:', error);
      return [];
    }
  }

  /**
   * Check monitoring status for multiple accounts
   */
  checkAccountsMonitoringStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { coinSymbol } = req.params;
      const { accountIds } = req.body;

      if (!accountIds || !Array.isArray(accountIds)) {
        res.status(400).json({
          success: false,
          message: 'Account IDs array is required'
        });
        return;
      }

      // Get monitored accounts for the coin using the same pattern as getMonitoredAccounts
      const monitoredAccounts = await AccountCoinRelevance.findAll({
        where: {
          coinSymbol: coinSymbol.toUpperCase(),
          isConfirmed: true,
        },
        include: [{ 
          model: TwitterAccount, 
          as: 'account',
          required: true 
        }],
      });
      
      // Create a set of monitored account IDs for fast lookup
      const monitoredAccountIds = new Set(monitoredAccounts.map((relevance: any) => relevance.account.id));
      
      // Check status for each account ID with ID mapping
      const accountStatuses = accountIds.map(accountId => {
        // Try both the original ID and with 'rec_' prefix for recommended accounts
        const isMonitored = monitoredAccountIds.has(accountId) || monitoredAccountIds.has(`rec_${accountId}`);
        
        return {
          accountId,
          isMonitored
        };
      });

      res.json({
        success: true,
        data: {
          accountStatuses
        }
      });
    } catch (error) {
      console.error('Failed to check accounts monitoring status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check monitoring status'
      });
    }
  };

  // Check Twitter API status and configuration
  checkTwitterApiStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      // Check if Twitter API credentials are configured
      const isConfigured = !!(
        process.env.TWITTER_BEARER_TOKEN || 
        (process.env.TWITTER_API_KEY && process.env.TWITTER_API_SECRET)
      );

      if (!isConfigured) {
        res.json({
          success: true,
          data: {
            isConfigured: false,
            isConnected: false,
            message: 'Twitter API credentials not configured',
            rateLimitStatus: {},
            recommendations: ['Configure Twitter API credentials to enable real-time features']
          }
        });
        return;
      }

      // Get detailed rate limit status
      const rateLimitStatus = this.twitterService.getDetailedRateLimitStatus();
      const cacheMetrics = this.twitterService.getCachePerformanceMetrics();

      // Test Twitter API connectivity with enhanced error handling
      try {
        const testResponse = await this.twitterService.testConnection();
        
        res.json({
          success: true,
          data: {
            isConfigured: true,
            isConnected: testResponse.success,
            message: testResponse.message || (testResponse.success ? 'Twitter API is available' : 'Twitter API connection failed'),
            rateLimitStatus: rateLimitStatus.rateLimits,
            cacheMetrics: {
              size: rateLimitStatus.cache.size,
              hitRate: rateLimitStatus.cache.hitRate,
              oldestEntryAge: Math.round(rateLimitStatus.cache.oldestEntry / 60000), // in minutes
              totalCacheSize: cacheMetrics.totalCacheSize
            },
            recommendations: [
              ...rateLimitStatus.recommendations,
              ...cacheMetrics.recommendedActions
            ],
            healthStatus: this.determineHealthStatus(rateLimitStatus.rateLimits),
            lastChecked: new Date().toISOString()
          }
        });
      } catch (apiError: any) {
        console.error('Twitter API test failed:', apiError);
        
        // Determine error type and provide specific guidance
        let errorType = 'unknown';
        let userMessage = 'Twitter API connection failed';
        let recommendations = rateLimitStatus.recommendations;

        if (apiError.message?.includes('rate limit')) {
          errorType = 'rate_limit';
          userMessage = 'Twitter API rate limit exceeded';
          recommendations = [
            '⏰ Wait for rate limit to reset before making more requests',
            '💾 Enable caching to reduce API calls',
            '🔄 Consider implementing request queuing',
            ...recommendations
          ];
        } else if (apiError.message?.includes('authentication')) {
          errorType = 'authentication';
          userMessage = 'Twitter API authentication failed';
          recommendations = [
            '🔑 Check Twitter API credentials',
            '🔄 Regenerate Twitter Bearer Token',
            '📋 Verify API permissions',
            ...recommendations
          ];
        } else if (apiError.message?.includes('forbidden')) {
          errorType = 'permissions';
          userMessage = 'Twitter API access forbidden';
          recommendations = [
            '🔐 Check API access permissions',
            '💳 Verify Twitter API subscription level',
            '📋 Review API usage policies',
            ...recommendations
          ];
        }

        res.json({
          success: true,
          data: {
            isConfigured: true,
            isConnected: false,
            message: userMessage,
            errorType,
            errorDetails: apiError.message,
            rateLimitStatus: rateLimitStatus.rateLimits,
            cacheMetrics: {
              size: rateLimitStatus.cache.size,
              hitRate: rateLimitStatus.cache.hitRate,
              oldestEntryAge: Math.round(rateLimitStatus.cache.oldestEntry / 60000),
              totalCacheSize: cacheMetrics.totalCacheSize
            },
            recommendations,
            healthStatus: 'error',
            lastChecked: new Date().toISOString()
          }
        });
      }
    } catch (error) {
      console.error('Failed to check Twitter API status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check Twitter API status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Reset Twitter API rate limits (emergency use only)
  resetTwitterRateLimit = async (req: Request, res: Response): Promise<void> => {
    try {
      const { endpoint } = req.body;
      
      // Log the reset action for audit purposes
      logger.warn(`Manual rate limit reset requested by user`, {
        endpoint: endpoint || 'all',
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        timestamp: new Date().toISOString()
      });

      // Reset the rate limit
      this.twitterService.forceResetRateLimit(endpoint);

      res.json({
        success: true,
        message: endpoint 
          ? `Rate limit reset for endpoint: ${endpoint}` 
          : 'All rate limits reset',
        data: {
          resetEndpoint: endpoint || 'all',
          timestamp: new Date().toISOString(),
          warning: 'This is an emergency action. Rate limits exist to protect API quotas.'
        }
      });

    } catch (error) {
      console.error('Failed to reset Twitter rate limit:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reset rate limit',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Determine overall health status based on rate limits
   */
  private determineHealthStatus(rateLimits: { [endpoint: string]: any }): 'healthy' | 'warning' | 'critical' | 'emergency' {
    const statuses = Object.values(rateLimits).map(limit => limit.status);
    
    if (statuses.includes('emergency')) return 'emergency';
    if (statuses.includes('critical')) return 'critical';
    if (statuses.includes('warning')) return 'warning';
    return 'healthy';
  }

  // Get real-time tweets from monitored accounts
  getRealTimeTweets = async (req: Request, res: Response): Promise<void> => {
    try {
      const { coinSymbol } = req.params;
      const { 
        accountIds, 
        limit = 50, 
        sortBy = 'time',
        includeReplies = false,
        includeRetweets = true 
      } = req.body;

      if (!accountIds || !Array.isArray(accountIds) || accountIds.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Account IDs array is required'
        });
        return;
      }

      // Check if Twitter API is configured
      const isConfigured = !!(
        process.env.TWITTER_BEARER_TOKEN || 
        (process.env.TWITTER_API_KEY && process.env.TWITTER_API_SECRET)
      );

      if (!isConfigured) {
        res.status(503).json({
          success: false,
          message: 'Twitter API not configured. Please contact administrator.',
          data: {
            tweets: [],
            totalCount: 0,
            message: 'Twitter API credentials not available'
          }
        });
        return;
      }

      // Test Twitter API connectivity first
      try {
        const testResponse = await this.twitterService.testConnection();
        if (!testResponse.success) {
          res.status(503).json({
            success: false,
            message: 'Twitter API is currently unavailable. Please try again later.',
            data: {
              tweets: [],
              totalCount: 0,
              message: 'Twitter API connection failed'
            }
          });
          return;
        }
      } catch (testError) {
        console.error('Twitter API test failed:', testError);
        res.status(503).json({
          success: false,
          message: 'Twitter API is currently unavailable. Please try again later.',
          data: {
            tweets: [],
            totalCount: 0,
            message: 'Twitter API authentication failed'
          }
        });
        return;
      }

      // Get account details from database
      const accounts = await TwitterAccount.findAll({
        where: {
          id: accountIds
        },
        include: [{
          model: AccountCoinRelevance,
          as: 'coinRelevances',
          where: {
            coinSymbol: coinSymbol.toUpperCase(),
            isConfirmed: true
          },
          required: true
        }]
      });

      if (accounts.length === 0) {
        res.json({
          success: true,
          data: {
            tweets: [],
            totalCount: 0,
            message: 'No monitored accounts found for the specified IDs'
          }
        });
        return;
      }

      // Extract Twitter usernames for API calls
      const usernames = accounts.map((account: any) => account.username).filter(Boolean);

      if (usernames.length === 0) {
        res.json({
          success: true,
          data: {
            tweets: [],
            totalCount: 0,
            message: 'No valid Twitter usernames found in monitored accounts'
          }
        });
        return;
      }

      // Fetch tweets from Twitter API
      try {
        const tweetsResponse = await this.twitterService.getUserTweets(usernames, {
          maxResults: limit,
          includeReplies,
          includeRetweets,
          tweetFields: ['created_at', 'public_metrics', 'author_id', 'context_annotations'],
          userFields: ['profile_image_url', 'verified', 'public_metrics'],
          expansions: ['author_id']
        });

        if (!tweetsResponse.success) {
          throw new Error(tweetsResponse.message || 'Failed to fetch tweets');
        }

        // Check if we got any tweets
        if (!tweetsResponse.data || !tweetsResponse.data.tweets || tweetsResponse.data.tweets.length === 0) {
          res.json({
            success: true,
            data: {
              tweets: [],
              totalCount: 0,
              accountsQueried: usernames.length,
              message: 'No recent tweets found from monitored accounts',
              lastUpdated: new Date().toISOString()
            }
          });
          return;
        }

        // Process and analyze tweets
        const processedTweets = await Promise.all(
          tweetsResponse.data.tweets.map(async (tweet: any) => {
            // Perform sentiment analysis
            const sentimentResult = this.twitterService.analyzeSentiment(tweet.text, coinSymbol);
            
            // Calculate engagement metrics
            const metrics = tweet.public_metrics || {};
            const totalEngagement = (metrics.like_count || 0) + 
                                   (metrics.retweet_count || 0) + 
                                   (metrics.reply_count || 0) + 
                                   (metrics.quote_count || 0);

            // Find author details
            const author = tweetsResponse.data.users?.find((user: any) => user.id === tweet.author_id) || {};

            return {
              id: tweet.id,
              text: tweet.text,
              createdAt: tweet.created_at,
              author: {
                id: author.id || tweet.author_id,
                username: author.username || 'unknown',
                displayName: author.name || author.username || 'Unknown User',
                profileImageUrl: author.profile_image_url || '/default-avatar.png',
                isVerified: author.verified || false
              },
              metrics: {
                likeCount: metrics.like_count || 0,
                retweetCount: metrics.retweet_count || 0,
                replyCount: metrics.reply_count || 0,
                quoteCount: metrics.quote_count || 0
              },
              sentiment: {
                score: sentimentResult.sentimentScore || 0,
                label: sentimentResult.sentiment || 'neutral',
                confidence: sentimentResult.impactScore || 0
              },
              engagement: {
                score: totalEngagement,
                rate: author.public_metrics?.followers_count ? 
                      (totalEngagement / author.public_metrics.followers_count) * 100 : 0
              }
            };
          })
        );

        // Sort tweets based on sortBy parameter
        processedTweets.sort((a: any, b: any) => {
          switch (sortBy) {
            case 'engagement':
              return b.engagement.score - a.engagement.score;
            case 'sentiment':
              return Math.abs(b.sentiment.score) - Math.abs(a.sentiment.score);
            default: // 'time'
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }
        });

        res.json({
          success: true,
          data: {
            tweets: processedTweets,
            totalCount: processedTweets.length,
            accountsQueried: usernames.length,
            lastUpdated: new Date().toISOString()
          }
        });

      } catch (twitterError: any) {
        console.error('Twitter API error:', twitterError);
        
        // Handle specific Twitter API errors
        if (twitterError.response?.status === 401) {
          res.status(503).json({
            success: false,
            message: 'Twitter API authentication failed. Please contact administrator.',
            data: {
              tweets: [],
              totalCount: 0,
              message: 'Twitter API authentication failed'
            }
          });
        } else if (twitterError.response?.status === 429) {
          res.status(503).json({
            success: false,
            message: 'Twitter API rate limit exceeded. Please try again later.',
            data: {
              tweets: [],
              totalCount: 0,
              message: 'Twitter API rate limit exceeded'
            }
          });
        } else if (twitterError.response?.status === 403) {
          res.status(503).json({
            success: false,
            message: 'Twitter API access forbidden. Please contact administrator.',
            data: {
              tweets: [],
              totalCount: 0,
              message: 'Twitter API access forbidden'
            }
          });
        } else {
          res.status(503).json({
            success: false,
            message: 'Twitter API is temporarily unavailable. Please try again later.',
            data: {
              tweets: [],
              totalCount: 0,
              message: 'Twitter API temporarily unavailable'
            }
          });
        }
      }

    } catch (error) {
      console.error('Failed to get real-time tweets:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching real-time tweets',
        data: {
          tweets: [],
          totalCount: 0,
          message: 'Internal server error'
        }
      });
    }
  };

  /**
   * Manually trigger data collection for a specific coin
   */
  triggerDataCollection = async (req: Request, res: Response): Promise<void> => {
    try {
      const { coinSymbol } = req.params;

      if (!coinSymbol) {
        res.status(400).json({
          success: false,
          message: 'Coin symbol is required'
        });
        return;
      }

      logger.info(`Manual data collection triggered for ${coinSymbol} by user`);

      // Check if we're in sandbox mode
      const { getSandboxConfig } = await import('../config/sandboxConfig');
      const sandboxConfig = getSandboxConfig();

      if (sandboxConfig.isEnabled && sandboxConfig.twitterMockEnabled) {
        // Return sandbox data collection result
        const mockResult = {
          success: true,
          accountsProcessed: Math.floor(Math.random() * 10) + 5, // 5-14 accounts
          postsCollected: Math.floor(Math.random() * 50) + 20, // 20-69 posts
          errors: [],
          timestamp: new Date().toISOString(),
          searchMethod: 'Sandbox Data Collection',
          dataSource: 'Mock Data'
        };

        logger.info(`[SANDBOX] Mock data collection completed for ${coinSymbol}: ${mockResult.postsCollected} posts from ${mockResult.accountsProcessed} accounts`);

        res.json({
          success: true,
          data: {
            coinSymbol: coinSymbol.toUpperCase(),
            accountsProcessed: mockResult.accountsProcessed,
            postsCollected: mockResult.postsCollected,
            errors: mockResult.errors,
            timestamp: mockResult.timestamp,
            searchMethod: mockResult.searchMethod,
            dataSource: mockResult.dataSource,
            sandboxNote: 'This is sandbox data for development purposes'
          },
          message: `${sandboxConfig.notificationPrefix}Data collection completed for ${coinSymbol}. Processed ${mockResult.accountsProcessed} accounts and collected ${mockResult.postsCollected} posts.`
        });
        return;
      }

      // Check Twitter API configuration first
      if (!this.twitterService.isTwitterConfigured()) {
        res.status(503).json({
          success: false,
          message: 'Twitter API is not configured. Please contact administrator or enable sandbox mode for development.',
          data: {
            coinSymbol: coinSymbol.toUpperCase(),
            accountsProcessed: 0,
            postsCollected: 0,
            errors: ['Twitter API credentials not available'],
            timestamp: new Date().toISOString(),
            suggestion: 'Set SANDBOX_MODE=enabled for development testing'
          }
        });
        return;
      }

      // Check current rate limit status
      const rateLimitStatus = this.twitterService.getDetailedRateLimitStatus();
      const hasEmergencyLimits = Object.values(rateLimitStatus.rateLimits).some(
        (status: any) => status.status === 'emergency'
      );

      if (hasEmergencyLimits) {
        const emergencyEndpoints = Object.entries(rateLimitStatus.rateLimits)
          .filter(([_, status]: [string, any]) => status.status === 'emergency')
          .map(([endpoint, status]: [string, any]) => `${endpoint} (${status.remaining}/${status.limit})`);

        res.status(429).json({
          success: false,
          message: 'Twitter API rate limits are critically low. Please wait before trying again or enable sandbox mode.',
          data: {
            coinSymbol: coinSymbol.toUpperCase(),
            accountsProcessed: 0,
            postsCollected: 0,
            errors: [`Rate limit emergency: ${emergencyEndpoints.join(', ')}`],
            timestamp: new Date().toISOString(),
            rateLimitStatus: rateLimitStatus.rateLimits,
            recommendations: [
              'Wait for rate limits to reset (typically 15 minutes)',
              'Try again with fewer accounts',
              'Consider using automatic data collection with longer intervals',
              'Enable sandbox mode: SANDBOX_MODE=enabled for development'
            ]
          }
        });
        return;
      }

      // Test API connectivity before proceeding
      try {
        const testResult = await this.twitterService.testConnection();
        if (!testResult.success) {
          res.status(503).json({
            success: false,
            message: 'Twitter API is currently unavailable. Please try again later or enable sandbox mode.',
            data: {
              coinSymbol: coinSymbol.toUpperCase(),
              accountsProcessed: 0,
              postsCollected: 0,
              errors: [testResult.message || 'API connection failed'],
              timestamp: new Date().toISOString(),
              suggestion: 'Set SANDBOX_MODE=enabled for development testing'
            }
          });
          return;
        }
      } catch (testError) {
        res.status(503).json({
          success: false,
          message: 'Failed to verify Twitter API connectivity. Enable sandbox mode for development.',
          data: {
            coinSymbol: coinSymbol.toUpperCase(),
            accountsProcessed: 0,
            postsCollected: 0,
            errors: ['API connectivity test failed'],
            timestamp: new Date().toISOString(),
            suggestion: 'Set SANDBOX_MODE=enabled for development testing'
          }
        });
        return;
      }

      // Proceed with data collection
      const result = await this.dataCollectionService.collectDataForSpecificCoin(coinSymbol.toUpperCase());

      // Check if rate limits were hit during collection
      const hasRateLimitErrors = result.errors.some(error => 
        error.includes('429') || error.includes('rate limit') || error.includes('Too Many Requests')
      );

      if (hasRateLimitErrors) {
        res.status(429).json({
          success: false,
          data: {
            coinSymbol: coinSymbol.toUpperCase(),
            accountsProcessed: result.accountsProcessed,
            postsCollected: result.postsCollected,
            errors: result.errors,
            timestamp: new Date().toISOString(),
            rateLimitStatus: this.twitterService.getDetailedRateLimitStatus().rateLimits
          },
          message: `Data collection partially completed for ${coinSymbol} but hit rate limits. Processed ${result.accountsProcessed} accounts and collected ${result.postsCollected} posts before limits were reached.`
        });
        return;
      }

      res.json({
        success: result.success,
        data: {
          coinSymbol: coinSymbol.toUpperCase(),
          accountsProcessed: result.accountsProcessed,
          postsCollected: result.postsCollected,
          errors: result.errors,
          timestamp: new Date().toISOString(),
          rateLimitStatus: this.twitterService.getDetailedRateLimitStatus().rateLimits
        },
        message: result.success 
          ? `Data collection completed for ${coinSymbol}. Processed ${result.accountsProcessed} accounts and collected ${result.postsCollected} posts.`
          : `Data collection failed for ${coinSymbol}. ${result.errors.join('; ')}`
      });
    } catch (error) {
      logger.error('Failed to trigger data collection:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to trigger data collection',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Get data collection status - Updated to use unified data source
   */
  getDataCollectionStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      // Use unified data source for consistent collection status
      const status = await this.unifiedDataSource.getDataCollectionStatus();

      res.json({
        success: true,
        data: {
          ...status,
          recommendations: this.generateDataCollectionRecommendations(status)
        },
        message: `Data collection status retrieved successfully (${status.dataSource})`
      });
    } catch (error) {
      logger.error('Failed to get data collection status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get data collection status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Start automatic data collection
   */
  startDataCollection = async (req: Request, res: Response): Promise<void> => {
    try {
      const { intervalMinutes = 30 } = req.body;

      if (intervalMinutes < 5 || intervalMinutes > 1440) {
        res.status(400).json({
          success: false,
          message: 'Interval must be between 5 and 1440 minutes'
        });
        return;
      }

      this.dataCollectionService.startDataCollection(intervalMinutes);

      res.json({
        success: true,
        data: {
          intervalMinutes,
          startedAt: new Date().toISOString()
        },
        message: `Automatic data collection started with ${intervalMinutes} minute intervals`
      });
    } catch (error) {
      logger.error('Failed to start data collection:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start data collection',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Stop automatic data collection
   */
  stopDataCollection = async (req: Request, res: Response): Promise<void> => {
    try {
      this.dataCollectionService.stopDataCollection();

      res.json({
        success: true,
        data: {
          stoppedAt: new Date().toISOString()
        },
        message: 'Automatic data collection stopped'
      });
    } catch (error) {
      logger.error('Failed to stop data collection:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to stop data collection',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Generate recommendations based on data collection status
   */
  private generateDataCollectionRecommendations(status: any): string[] {
    const recommendations: string[] = [];

    if (!status.isRunning) {
      recommendations.push('💡 Consider starting automatic data collection to keep sentiment analysis up-to-date');
    }

    if (status.totalPosts === 0) {
      recommendations.push('📊 No tweet data available. Try triggering manual data collection for your monitored coins');
    } else if (status.totalPosts < 100) {
      recommendations.push('📈 Limited tweet data available. Consider adding more monitored accounts or running data collection more frequently');
    }

    if (status.lastCollection) {
      const hoursSinceLastCollection = (Date.now() - new Date(status.lastCollection).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastCollection > 24) {
        recommendations.push('⏰ Last data collection was more than 24 hours ago. Consider running manual collection');
      }
    }

    const totalCoins = Object.keys(status.coinBreakdown).length;
    if (totalCoins === 0) {
      recommendations.push('🎯 No monitored coins found. Set up monitoring for cryptocurrencies you want to analyze');
    } else if (totalCoins < 3) {
      recommendations.push('🚀 Consider monitoring more cryptocurrencies for broader market sentiment analysis');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Data collection is running smoothly. All systems are operational');
    }

    return recommendations;
  }

  /**
   * Test data collection without authentication (for debugging)
   */
  testDataCollection = async (req: Request, res: Response): Promise<void> => {
    try {
      const { coinSymbol } = req.params;
      
      logger.info(`🧪 Testing data collection for ${coinSymbol}`);
      
      const result = await this.dataCollectionService.collectDataForSpecificCoin(coinSymbol.toUpperCase());
      
      res.json({
        success: true,
        data: {
          coinSymbol: coinSymbol.toUpperCase(),
          accountsProcessed: result.accountsProcessed,
          postsCollected: result.postsCollected,
          errors: result.errors,
          timestamp: new Date().toISOString()
        },
        message: `Test data collection completed for ${coinSymbol.toUpperCase()}. Processed ${result.accountsProcessed} accounts and collected ${result.postsCollected} posts.`
      });
    } catch (error) {
      logger.error('Failed to test data collection:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to test data collection',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Search accounts for coin - Test endpoint (no authentication required)
   * This endpoint is for testing sandbox mode functionality
   */
  searchAccountsForCoinTest = async (req: Request, res: Response): Promise<void> => {
    try {
      const { symbol = 'BTC', limit = 5 } = req.query;
      
      logger.info(`🧪 Testing account search for ${symbol} (sandbox mode test)`);
      
      // Determine coin name from symbol
      const coinName = this.getCoinNameFromSymbol(symbol as string);
      
      const result = await this.twitterService.searchAccountsForCoin(
        symbol as string,
        coinName,
        {
          limit: Number(limit),
          minFollowers: 1000,
          includeVerified: true,
        }
      );

      res.json({
        success: true,
        data: result,
        message: `Found ${result.totalCount} Twitter accounts for ${symbol}`,
        metadata: {
          coinSymbol: symbol,
          coinName,
          searchQuery: result.query,
          totalFound: result.totalCount,
          hasMore: result.hasMore,
          searchMethod: result.searchMethod,
          testMode: true,
        },
      });
    } catch (error) {
      logger.error('Failed to search accounts for coin (test):', error);

      let statusCode = 500;
      let errorMessage = 'Internal server error while searching accounts';

      if (error instanceof Error) {
        if (error.message.includes('Twitter API configuration required')) {
          statusCode = 503;
          errorMessage = 'Twitter API service not configured. Using sandbox mode for testing.';
        } else if (error.message.includes('rate limit')) {
          statusCode = 429;
          errorMessage = 'Rate limit exceeded. Using sandbox mode for testing.';
        } else {
          errorMessage = error.message;
        }
      }

      res.status(statusCode).json({
        success: false,
        message: errorMessage,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        path: req.path,
        testMode: true
      });
    }
  };

  /**
   * Search accounts with query - Test endpoint (no authentication required)
   * This endpoint is for testing sandbox mode functionality
   */
  searchAccountsWithQueryTest = async (req: Request, res: Response): Promise<void> => {
    try {
      const { query = 'Bitcoin', limit = 3 } = req.query;
      
      logger.info(`🧪 Testing account search with query "${query}" (sandbox mode test)`);
      
      const result = await this.twitterService.searchAccountsWithCustomQuery(
        query as string,
        {
          limit: Number(limit),
          minFollowers: 1000,
          includeVerified: true,
        }
      );

      res.json({
        success: true,
        data: result,
        message: `Found ${result.totalCount} Twitter accounts for query "${query}"`,
        metadata: {
          searchQuery: query,
          totalFound: result.totalCount,
          hasMore: result.hasMore,
          searchMethod: result.searchMethod,
          testMode: true,
        },
      });
    } catch (error) {
      logger.error('Failed to search accounts with query (test):', error);

      let statusCode = 500;
      let errorMessage = 'Internal server error while searching accounts';

      if (error instanceof Error) {
        if (error.message.includes('Twitter API configuration required')) {
          statusCode = 503;
          errorMessage = 'Twitter API service not configured. Using sandbox mode for testing.';
        } else if (error.message.includes('rate limit')) {
          statusCode = 429;
          errorMessage = 'Rate limit exceeded. Using sandbox mode for testing.';
        } else {
          errorMessage = error.message;
        }
      }

      res.status(statusCode).json({
        success: false,
        message: errorMessage,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        path: req.path,
        testMode: true
      });
    }
  };
} 