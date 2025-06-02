import { TwitterService } from './TwitterService';
import { TwitterAccount, TwitterPost, AccountCoinRelevance } from '../models';
import logger from '../utils/logger';
import { Op } from 'sequelize';

export class TwitterDataCollectionService {
  private static instance: TwitterDataCollectionService;
  private twitterService: TwitterService;
  private isCollecting = false;
  private collectionInterval: NodeJS.Timeout | null = null;
  private lastCollectionTime: Date | null = null;

  constructor() {
    this.twitterService = TwitterService.getInstance();
  }

  public static getInstance(): TwitterDataCollectionService {
    if (!TwitterDataCollectionService.instance) {
      TwitterDataCollectionService.instance = new TwitterDataCollectionService();
    }
    return TwitterDataCollectionService.instance;
  }

  /**
   * Start automatic data collection for monitored accounts
   */
  public startDataCollection(intervalMinutes: number = 30): void {
    if (this.isCollecting) {
      logger.info('Data collection is already running');
      return;
    }

    this.isCollecting = true;
    logger.info(`Starting Twitter data collection with ${intervalMinutes} minute intervals`);

    // Run initial collection
    this.collectDataForAllMonitoredAccounts();

    // Set up recurring collection
    this.collectionInterval = setInterval(() => {
      this.collectDataForAllMonitoredAccounts();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop automatic data collection
   */
  public stopDataCollection(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
    this.isCollecting = false;
    logger.info('Twitter data collection stopped');
  }

  /**
   * Collect data for all monitored accounts
   */
  public async collectDataForAllMonitoredAccounts(): Promise<void> {
    try {
      logger.info('Starting data collection for all monitored accounts...');

      // Get all confirmed account-coin relevances
      const relevances = await AccountCoinRelevance.findAll({
        where: {
          isConfirmed: true
        },
        include: [{
          model: TwitterAccount,
          as: 'account',
          required: true
        }]
      });

      if (relevances.length === 0) {
        logger.info('No monitored accounts found for data collection');
        return;
      }

      logger.info(`Found ${relevances.length} monitored account-coin relationships`);

      // Group by coin symbol for better organization
      const coinGroups: { [coinSymbol: string]: any[] } = {};
      relevances.forEach((relevance: any) => {
        const coinSymbol = relevance.coinSymbol;
        if (!coinGroups[coinSymbol]) {
          coinGroups[coinSymbol] = [];
        }
        coinGroups[coinSymbol].push(relevance);
      });

      // Process each coin group
      for (const [coinSymbol, coinRelevances] of Object.entries(coinGroups)) {
        await this.collectDataForCoin(coinSymbol, coinRelevances);
        
        // Add delay between coin groups to respect rate limits
        await this.sleep(2000);
      }

      logger.info('Data collection completed for all monitored accounts');
    } catch (error) {
      logger.error('Failed to collect data for monitored accounts:', error);
    }
  }

  /**
   * Collect data for a specific coin's monitored accounts
   */
  private async collectDataForCoin(coinSymbol: string, relevances: any[]): Promise<void> {
    try {
      logger.info(`Collecting data for ${coinSymbol} from ${relevances.length} accounts`);

      let successCount = 0;
      let errorCount = 0;

      for (const relevance of relevances) {
        try {
          const account = relevance.account;
          await this.collectDataForAccount(account, coinSymbol);
          successCount++;
          
          // Add delay between accounts to respect rate limits
          await this.sleep(1000);
        } catch (error) {
          errorCount++;
          logger.error(`Failed to collect data for account ${relevance.account?.username}:`, error);
        }
      }

      logger.info(`Data collection for ${coinSymbol} completed: ${successCount} successful, ${errorCount} errors`);
    } catch (error) {
      logger.error(`Failed to collect data for coin ${coinSymbol}:`, error);
    }
  }

  /**
   * Collect data for a specific account with enhanced rate limit management
   */
  private async collectDataForAccount(account: TwitterAccount, coinSymbol: string): Promise<void> {
    try {
      logger.info(`🔍 Starting data collection for account: ${account.username} (${coinSymbol})`);

      // Check if Twitter API is configured
      if (!this.twitterService.isTwitterConfigured()) {
        logger.warn('Twitter API not configured, skipping data collection');
        return;
      }

      logger.info(`✅ Twitter API is configured, proceeding with data collection for ${account.username}`);

      // Check rate limit status before making any API calls
      const rateLimitStatus = this.twitterService.getDetailedRateLimitStatus();
      const userLookupStatus = rateLimitStatus.rateLimits['user_lookup'];
      
      if (userLookupStatus && userLookupStatus.status === 'emergency') {
        logger.warn(`🚨 Emergency rate limit for user_lookup. Skipping ${account.username} for now.`);
        return;
      }

      // Add delay between accounts to respect rate limits
      await this.sleep(2000); // 2 second delay between accounts

      // Get the real Twitter user ID from username with retry logic
      logger.info(`🔍 Getting Twitter user ID for username: ${account.username}`);
      let twitterUserId: string | null = null;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries && !twitterUserId) {
        try {
          twitterUserId = await this.twitterService.getUserIdByUsername(account.username);
          if (twitterUserId) {
            break;
          }
        } catch (error: any) {
          retryCount++;
          if (error.message && error.message.includes('429')) {
            logger.warn(`Rate limit hit for ${account.username}, attempt ${retryCount}/${maxRetries}`);
            if (retryCount < maxRetries) {
              // Exponential backoff: 5s, 10s, 20s
              const waitTime = Math.pow(2, retryCount) * 5000;
              logger.info(`⏰ Waiting ${waitTime/1000}s before retry...`);
              await this.sleep(waitTime);
            }
          } else {
            logger.error(`Error getting user ID for ${account.username}:`, error);
            break;
          }
        }
      }
      
      if (!twitterUserId) {
        logger.warn(`❌ Could not find Twitter user ID for username: ${account.username}`);
        return;
      }

      logger.info(`✅ Found Twitter user ID for ${account.username}: ${twitterUserId}`);

      // Check rate limit again before fetching posts
      const timelineStatus = rateLimitStatus.rateLimits['user_timeline'];
      if (timelineStatus && timelineStatus.status === 'emergency') {
        logger.warn(`🚨 Emergency rate limit for user_timeline. Skipping post collection for ${account.username}.`);
        return;
      }

      // Get the latest post timestamp for this account to avoid duplicates
      const latestPost = await TwitterPost.findOne({
        where: {
          twitterAccountId: account.id
        },
        order: [['publishedAt', 'DESC']]
      });

      const sinceId = latestPost?.id;
      logger.info(`📅 Latest post ID for ${account.username}: ${sinceId || 'None (first time collection)'}`);

      // Add another delay before fetching posts
      await this.sleep(1000);

      // Fetch recent posts from Twitter API using the real Twitter user ID
      logger.info(`🐦 Calling Twitter API to fetch posts for user ID ${twitterUserId} (${account.username})...`);
      
      let posts: any[] = [];
      try {
        posts = await this.twitterService.getAccountPosts(twitterUserId, {
          limit: 10, // Reduced from 20 to 10 to be more conservative
          sinceId: sinceId
        });
      } catch (error: any) {
        if (error.message && error.message.includes('429')) {
          logger.warn(`Rate limit hit while fetching posts for ${account.username}. Will retry later.`);
          return;
        } else {
          logger.error(`Error fetching posts for ${account.username}:`, error);
          return;
        }
      }

      logger.info(`📊 Twitter API returned ${posts.length} posts for account ${account.username}`);

      if (posts.length > 0) {
        logger.info(`✅ Collected ${posts.length} new posts for account ${account.username} (${coinSymbol})`);
        
        // Update account's last activity
        await account.update({
          lastActivityAt: new Date()
        });

        // Update relevance statistics
        await this.updateRelevanceStatistics(account.id, coinSymbol, posts);
      } else {
        logger.info(`ℹ️  No new posts found for account ${account.username}`);
      }
    } catch (error) {
      logger.error(`❌ Failed to collect data for account ${account.username}:`, error);
      throw error;
    }
  }

  /**
   * Update relevance statistics based on collected posts
   */
  private async updateRelevanceStatistics(
    accountId: string, 
    coinSymbol: string, 
    posts: TwitterPost[]
  ): Promise<void> {
    try {
      const relevance = await AccountCoinRelevance.findOne({
        where: {
          twitterAccountId: accountId,
          coinSymbol: coinSymbol
        }
      });

      if (!relevance) {
        logger.warn(`No relevance record found for account ${accountId} and coin ${coinSymbol}`);
        return;
      }

      // Filter posts that mention the coin
      const coinMentionPosts = posts.filter(post => 
        post.relevantCoins.includes(coinSymbol) || 
        post.content.toLowerCase().includes(coinSymbol.toLowerCase())
      );

      if (coinMentionPosts.length === 0) {
        return;
      }

      // Calculate new statistics
      const totalSentiment = coinMentionPosts.reduce((sum, post) => sum + post.sentimentScore, 0);
      const avgSentiment = totalSentiment / coinMentionPosts.length;
      
      const totalImpact = coinMentionPosts.reduce((sum, post) => sum + post.impactScore, 0);
      const avgImpact = totalImpact / coinMentionPosts.length;

      // Update relevance record
      await relevance.update({
        mentionCount: relevance.mentionCount + coinMentionPosts.length,
        totalPosts: relevance.totalPosts + posts.length,
        avgSentiment: avgSentiment,
        avgImpact: avgImpact,
        lastMentionAt: new Date(),
        updatedAt: new Date()
      });

      logger.debug(`Updated relevance statistics for ${accountId}-${coinSymbol}: ${coinMentionPosts.length} mentions`);
    } catch (error) {
      logger.error(`Failed to update relevance statistics for ${accountId}-${coinSymbol}:`, error);
    }
  }

  /**
   * Manually trigger data collection for a specific coin with improved rate limiting
   */
  public async collectDataForSpecificCoin(coinSymbol: string): Promise<{
    success: boolean;
    accountsProcessed: number;
    postsCollected: number;
    errors: string[];
  }> {
    try {
      logger.info(`Manual data collection triggered for ${coinSymbol}`);

      // Check overall rate limit status first
      const rateLimitStatus = this.twitterService.getDetailedRateLimitStatus();
      logger.info('📊 Current rate limit status:', rateLimitStatus.recommendations);

      const relevances = await AccountCoinRelevance.findAll({
        where: {
          coinSymbol: coinSymbol.toUpperCase(),
          isConfirmed: true
        },
        include: [{
          model: TwitterAccount,
          as: 'account',
          required: true
        }],
        limit: 5 // Limit to 5 accounts per manual collection to avoid rate limits
      });

      if (relevances.length === 0) {
        return {
          success: false,
          accountsProcessed: 0,
          postsCollected: 0,
          errors: [`No monitored accounts found for ${coinSymbol}`]
        };
      }

      let accountsProcessed = 0;
      let postsCollected = 0;
      const errors: string[] = [];

      logger.info(`🎯 Processing ${relevances.length} accounts for ${coinSymbol} (limited to avoid rate limits)`);

      for (const relevance of relevances) {
        try {
          const account = (relevance as any).account;
          if (!account) {
            errors.push(`No account data found for relevance ${relevance.id}`);
            continue;
          }

          const beforeCount = await TwitterPost.count({
            where: { twitterAccountId: account.id }
          });

          await this.collectDataForAccount(account, coinSymbol);

          const afterCount = await TwitterPost.count({
            where: { twitterAccountId: account.id }
          });

          const newPosts = afterCount - beforeCount;
          postsCollected += newPosts;
          accountsProcessed++;

          // Longer delay between accounts to respect rate limits
          await this.sleep(3000); // 3 seconds between accounts
        } catch (error: any) {
          const account = (relevance as any).account;
          const errorMsg = `Failed to collect data for ${account?.username || 'unknown'}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          logger.error(errorMsg);
          
          // If we hit a rate limit, stop processing more accounts
          if (error.message && error.message.includes('429')) {
            logger.warn('🛑 Rate limit hit, stopping further processing for this collection cycle');
            break;
          }
        }
      }

      logger.info(`Manual data collection for ${coinSymbol} completed: ${accountsProcessed} accounts, ${postsCollected} posts, ${errors.length} errors`);

      return {
        success: true,
        accountsProcessed,
        postsCollected,
        errors
      };
    } catch (error) {
      logger.error(`Failed manual data collection for ${coinSymbol}:`, error);
      return {
        success: false,
        accountsProcessed: 0,
        postsCollected: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Get collection status and statistics
   */
  public async getCollectionStatus(): Promise<{
    isRunning: boolean;
    lastCollection: Date | null;
    totalAccounts: number;
    totalPosts: number;
    coinBreakdown: { [coinSymbol: string]: { accounts: number; posts: number } };
  }> {
    try {
      const totalAccounts = await TwitterAccount.count();
      const totalPosts = await TwitterPost.count();

      // Calculate breakdown by coin
      const relevances = await AccountCoinRelevance.findAll({
        where: { isConfirmed: true },
        include: [{
          model: TwitterAccount,
          as: 'account',
          required: true
        }]
      });

      const coinBreakdown: { [coinSymbol: string]: { accounts: number; posts: number } } = {};
      
      for (const relevance of relevances) {
        const coinSymbol = relevance.coinSymbol;
        if (!coinBreakdown[coinSymbol]) {
          coinBreakdown[coinSymbol] = { accounts: 0, posts: 0 };
        }
        coinBreakdown[coinSymbol].accounts++;

        // Count posts for this account that mention the coin
        const postsCount = await TwitterPost.count({
          where: {
            twitterAccountId: (relevance as any).account?.id,
            [Op.or]: [
              { content: { [Op.like]: `%${coinSymbol}%` } }
            ]
          }
        });
        coinBreakdown[coinSymbol].posts += Number(postsCount) || 0;
      }

      return {
        isRunning: this.isCollecting,
        lastCollection: this.lastCollectionTime,
        totalAccounts,
        totalPosts,
        coinBreakdown
      };
    } catch (error) {
      logger.error('Failed to get collection status:', error);
      throw error;
    }
  }

  /**
   * Sleep utility function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 