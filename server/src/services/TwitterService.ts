import axios, { AxiosError } from 'axios';
import logger from '../utils/logger';
import { TwitterAccount } from '../models/TwitterAccount';
import { TwitterPost } from '../models/TwitterPost';
import { AccountCoinRelevance } from '../models/AccountCoinRelevance';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';

// Rate limit management interfaces
interface RateLimitInfo {
  remaining: number;
  reset: number;
  limit: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class RateLimitManager {
  private rateLimits: Map<string, RateLimitInfo> = new Map();
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MIN_REMAINING_THRESHOLD = 10; // 提高阈值到10个请求
  private readonly CRITICAL_THRESHOLD = 5; // 关键阈值

  /**
   * Check if we can make a request to the given endpoint
   */
  canMakeRequest(endpoint: string): boolean {
    const rateLimit = this.rateLimits.get(endpoint);
    if (!rateLimit) return true;

    const now = Date.now();
    if (now > rateLimit.reset * 1000) {
      // Rate limit window has reset
      this.rateLimits.delete(endpoint);
      return true;
    }

    // 如果剩余请求数很少，更加谨慎
    if (rateLimit.remaining <= this.CRITICAL_THRESHOLD) {
      logger.warn(`Critical rate limit threshold reached for ${endpoint}: ${rateLimit.remaining}/${rateLimit.limit}`);
      return false;
    }

    return rateLimit.remaining > this.MIN_REMAINING_THRESHOLD;
  }

  /**
   * Update rate limit info from response headers
   */
  updateRateLimit(endpoint: string, headers: Headers) {
    const remaining = parseInt(headers.get('x-rate-limit-remaining') || '0');
    const reset = parseInt(headers.get('x-rate-limit-reset') || '0');
    const limit = parseInt(headers.get('x-rate-limit-limit') || '0');

    this.rateLimits.set(endpoint, { remaining, reset, limit });
    
    logger.info(`Rate limit for ${endpoint}: ${remaining}/${limit}, resets at ${new Date(reset * 1000).toISOString()}`);
  }

  /**
   * Get wait time until rate limit resets
   */
  getWaitTime(endpoint: string): number {
    const rateLimit = this.rateLimits.get(endpoint);
    if (!rateLimit) return 0;

    const now = Date.now();
    const resetTime = rateLimit.reset * 1000;
    return Math.max(0, resetTime - now);
  }

  /**
   * Cache data with TTL
   */
  setCache<T>(key: string, data: T, ttl: number = this.CACHE_TTL): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl
    });
  }

  /**
   * Get cached data if not expired
   */
  getCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

export interface TwitterSearchResult {
  accounts: Array<{
    id: string;
    username: string;
    displayName: string;
    bio: string;
    followersCount: number;
    followingCount: number;
    tweetsCount: number;
    verified: boolean;
    profileImageUrl: string;
    isInfluencer: boolean;
    influenceScore: number;
    relevanceScore?: number;
    mentionCount?: number;
    avgSentiment?: number;
  }>;
  totalCount: number;
  hasMore: boolean;
  query: string;
  searchMethod?: string;
}

export interface TwitterApiUser {
  id: string;
  username: string;
  name: string;
  description?: string;
  public_metrics: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
  };
  verified?: boolean;
  profile_image_url?: string;
  created_at: string;
}

export interface TwitterTimelinePost {
  id: string;
  text: string;
  created_at: string;
  public_metrics: {
    retweet_count: number;
    like_count: number;
    reply_count: number;
    quote_count: number;
    impression_count?: number;
  };
  entities?: {
    hashtags?: Array<{ tag: string }>;
    mentions?: Array<{ username: string }>;
  };
  referenced_tweets?: Array<{
    type: string;
    id: string;
  }>;
}

export class TwitterService {
  private static instance: TwitterService;
  private readonly baseUrl = 'https://api.twitter.com/2';
  private readonly bearerToken: string;
  private readonly isConfigured: boolean;
  private readonly rateLimitManager = new RateLimitManager();

  constructor() {
    this.bearerToken = process.env.TWITTER_BEARER_TOKEN || '';
    this.isConfigured = !!this.bearerToken;
    
    if (this.isConfigured) {
      logger.info('Twitter service initialized with real API token');
    } else {
      logger.warn('Twitter service initialized without API token - some features will be limited');
    }
    
    // Start cache cleanup interval (every 10 minutes)
    setInterval(() => {
      this.rateLimitManager.clearExpiredCache();
    }, 10 * 60 * 1000);
  }

  public static getInstance(): TwitterService {
    if (!TwitterService.instance) {
      TwitterService.instance = new TwitterService();
    }
    return TwitterService.instance;
  }

  public isTwitterConfigured(): boolean {
    return this.isConfigured;
  }

  private validateConfiguration(): void {
    if (!this.isConfigured) {
      throw new Error('Twitter API configuration not available. Please set TWITTER_BEARER_TOKEN environment variable to enable Twitter features.');
    }
  }

  /**
   * Search for Twitter accounts related to a cryptocurrency
   * ONLY returns real data from Twitter API - NO DEMO/MOCK DATA
   */
  async searchAccountsForCoin(
    coinSymbol: string,
    coinName: string,
    options: {
      limit?: number;
      minFollowers?: number;
      includeVerified?: boolean;
    } = {}
  ): Promise<TwitterSearchResult> {
    const { limit = 50, minFollowers = 1000, includeVerified = true } = options;

    try {
      logger.info(`Searching Twitter accounts for ${coinSymbol} (${coinName}) with REAL API data only`, {
        limit,
        minFollowers,
        includeVerified
      });

      // Validate Twitter API configuration
      if (!this.bearerToken) {
        throw new Error('Twitter API Bearer Token is required. Please configure TWITTER_BEARER_TOKEN environment variable. Demo data is prohibited for financial applications.');
      }

      // Build search queries for the cryptocurrency
      const queries = this.buildSearchQueries(coinSymbol, coinName);
      const allUsers: TwitterApiUser[] = [];
      let successfulQueries = 0;
      const queryErrors: string[] = [];

      // Execute searches with real Twitter API
      for (const query of queries) {
        try {
          const users = await this.searchUsers(query, Math.ceil(limit / queries.length));
          allUsers.push(...users);
          successfulQueries++;
          logger.debug(`Query "${query}" returned ${users.length} users`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          queryErrors.push(`Query "${query}": ${errorMessage}`);
          logger.warn(`Search failed for query "${query}":`, errorMessage);
        }
      }

      // If no queries succeeded, throw detailed error
      if (successfulQueries === 0) {
        logger.error(`All Twitter API queries failed for ${coinSymbol}:`, queryErrors);
        throw new Error(`Twitter API search failed for ${coinSymbol}. Errors: ${queryErrors.join('; ')}. Please check API configuration, rate limits, and permissions.`);
      }

      // If no users found, return empty result with clear message
      if (allUsers.length === 0) {
        logger.warn(`No Twitter accounts found for ${coinSymbol} using real API (${successfulQueries}/${queries.length} queries succeeded)`);
        return {
          accounts: [],
          totalCount: 0,
          hasMore: false,
          query: `${coinSymbol} ${coinName}`,
          searchMethod: 'Twitter API v2 (Real Data)'
        };
      }

      // Remove duplicates and filter by criteria
      const uniqueUsers = this.removeDuplicateUsers(allUsers);
      const filteredUsers = uniqueUsers.filter(user => {
        const meetsFollowerThreshold = user.public_metrics.followers_count >= minFollowers;
        const meetsVerificationCriteria = includeVerified || !user.verified;
        return meetsFollowerThreshold && meetsVerificationCriteria;
      });

      // Sort by follower count and limit results
      const sortedUsers = filteredUsers
        .sort((a, b) => b.public_metrics.followers_count - a.public_metrics.followers_count)
        .slice(0, limit);

      // Store accounts in database and get relevance data
      const accounts = await Promise.all(
        sortedUsers.map(user => this.processAndStoreAccount(user, coinSymbol))
      );

      logger.info(`Successfully found ${accounts.length} REAL Twitter accounts for ${coinSymbol} (${successfulQueries}/${queries.length} queries succeeded)`);

      return {
        accounts,
        totalCount: accounts.length,
        hasMore: filteredUsers.length > limit,
        query: `${coinSymbol} ${coinName}`,
        searchMethod: 'Twitter API v2 (Real Data)'
      };

    } catch (error) {
      logger.error(`Twitter API search failed for ${coinSymbol}:`, error);
      
      if (error instanceof Error) {
        // Provide specific error details without fallback to demo data
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          throw new Error(`Twitter API rate limit exceeded for ${coinSymbol}. Please wait before making more requests. Demo data is not permitted for financial applications.`);
        }
        
        if (error.message.includes('authentication') || error.message.includes('401')) {
          throw new Error(`Twitter API authentication failed. Please check TWITTER_BEARER_TOKEN configuration. Demo data is not permitted for financial applications.`);
        }
        
        if (error.message.includes('403')) {
          throw new Error(`Twitter API access forbidden. Please check API permissions and endpoints. Demo data is not permitted for financial applications.`);
        }
      }
      
      throw new Error(`Twitter API search failed for ${coinSymbol}: ${error instanceof Error ? error.message : 'Unknown error'}. Please check API configuration and network connectivity.`);
    }
  }

  /**
   * Search for Twitter accounts with custom query
   * ONLY returns real data from Twitter API - NO DEMO/MOCK DATA
   */
  async searchAccountsWithCustomQuery(
    query: string,
    options: {
      limit?: number;
      minFollowers?: number;
      includeVerified?: boolean;
    } = {}
  ): Promise<TwitterSearchResult> {
    const { limit = 50, minFollowers = 1000, includeVerified = true } = options;

    try {
      logger.info(`Searching Twitter accounts with custom query "${query}" using REAL API data only`, {
        limit,
        minFollowers,
        includeVerified
      });

      // Validate Twitter API configuration
      if (!this.bearerToken) {
        return this.getFallbackRecommendedAccounts(query, limit);
      }

      // Search for tweets with the custom query and extract users
      const tweets = await this.searchTweets(query, limit * 2);
      
      if (tweets.length === 0) {
        logger.info(`No tweets found for query "${query}"`);
        return this.getFallbackRecommendedAccounts(query, limit);
      }

      // Extract unique user IDs from tweets
      const userIds = Array.from(new Set(tweets.map(tweet => tweet.author_id).filter(Boolean)));
      
      if (userIds.length === 0) {
        logger.warn(`No user IDs found in tweets for query "${query}"`);
        return this.getFallbackRecommendedAccounts(query, limit);
      }

      // Get user details for the user IDs
      const users = await this.getUsersByIds(userIds.slice(0, limit * 2));
      
      // Filter users based on criteria
      const filteredUsers = users.filter(user => {
        const meetsFollowerThreshold = user.public_metrics.followers_count >= minFollowers;
        const meetsVerificationCriteria = includeVerified || !user.verified;
        return meetsFollowerThreshold && meetsVerificationCriteria;
      });

      // Sort by follower count and limit results
      const sortedUsers = filteredUsers
        .sort((a, b) => b.public_metrics.followers_count - a.public_metrics.followers_count)
        .slice(0, limit);

      // Store accounts in database and get relevance data
      const accounts = await Promise.all(
        sortedUsers.map(user => this.processAndStoreAccountForCustomQuery(user, query))
      );

      logger.info(`Successfully found ${accounts.length} REAL Twitter accounts for custom query "${query}"`);

      return {
        accounts,
        totalCount: accounts.length,
        hasMore: filteredUsers.length > limit,
        query,
        searchMethod: 'Twitter API v2 (Real Data - Custom Query)'
      };

    } catch (error) {
      logger.error(`Twitter API custom query search failed for "${query}":`, error);
      
      if (error instanceof Error) {
        // 如果是速率限制错误，返回推荐账户作为降级策略
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          logger.info(`Rate limit reached, falling back to recommended accounts for query "${query}"`);
          return this.getFallbackRecommendedAccounts(query, limit);
        }
        
        if (error.message.includes('authentication') || error.message.includes('401')) {
          logger.warn(`Authentication failed, falling back to recommended accounts for query "${query}"`);
          return this.getFallbackRecommendedAccounts(query, limit);
        }
        
        if (error.message.includes('403')) {
          logger.warn(`Access forbidden, falling back to recommended accounts for query "${query}"`);
          return this.getFallbackRecommendedAccounts(query, limit);
        }
      }
      
      // 对于其他错误，也尝试返回推荐账户
      logger.info(`API error occurred, falling back to recommended accounts for query "${query}"`);
      return this.getFallbackRecommendedAccounts(query, limit);
    }
  }

  /**
   * Search for users using Twitter API v2 with rate limit handling and caching
   * This approach searches for recent tweets and extracts user information from the authors
   */
  private async searchUsers(query: string, maxResults: number): Promise<TwitterApiUser[]> {
    try {
      logger.debug(`Searching Twitter users with query: "${query}"`);
      
      // Check cache first
      const cacheKey = `search_users_${query}_${maxResults}`;
      const cachedUsers = this.rateLimitManager.getCache<TwitterApiUser[]>(cacheKey);
      if (cachedUsers) {
        logger.info(`Retrieved ${cachedUsers.length} users from cache for query: ${query}`);
        return cachedUsers;
      }
      
      // Use tweets/search/recent instead of users/search
      const url = `${this.baseUrl}/tweets/search/recent?query=${encodeURIComponent(`${query} -is:retweet`)}&max_results=${Math.min(maxResults * 2, 100)}&tweet.fields=id,text,created_at,public_metrics,author_id&user.fields=id,username,name,description,public_metrics,verified,profile_image_url,created_at&expansions=author_id`;
      
      const options: RequestInit = {
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
          'Content-Type': 'application/json',
        },
      };
      
      const response = await this.makeRequestWithRetry(url, options, 'tweets_search_users');
      const data = await response.json();

      // Extract unique users from the tweet authors
      const users = data.includes?.users || [];
      const uniqueUsers = this.removeDuplicateUsers(users);
      
      logger.debug(`Twitter API returned ${uniqueUsers.length} unique users from tweets for query: "${query}"`);
      
      const resultUsers = uniqueUsers.slice(0, maxResults);
      
      // Cache the results for 3 minutes
      this.rateLimitManager.setCache(cacheKey, resultUsers, 3 * 60 * 1000);
      
      return resultUsers;

    } catch (error) {
      logger.error(`Twitter API error for query "${query}":`, error);
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          throw new Error('Twitter API authentication failed. Please check your Bearer Token.');
        } else if (error.message.includes('429')) {
          throw new Error('Twitter API rate limit exceeded. Please try again later.');
        } else if (error.message.includes('403')) {
          throw new Error('Twitter API access forbidden. Please check your API permissions.');
        }
      }
      
      throw new Error(`Twitter API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build search queries for a cryptocurrency - optimized for tweet search
   */
  private buildSearchQueries(coinSymbol: string, coinName: string): string[] {
    const queries: string[] = [];
    
    // Primary symbol-based queries with context
    queries.push(`${coinSymbol} (crypto OR cryptocurrency OR bitcoin)`);
    queries.push(`${coinSymbol} (trading OR price OR market)`);
    
    // Name-based queries (if different from symbol)
    if (coinName.toLowerCase() !== coinSymbol.toLowerCase()) {
      queries.push(`${coinName} (crypto OR cryptocurrency)`);
      queries.push(`${coinName} (blockchain OR DeFi)`);
    }
    
    // Hashtag queries
    queries.push(`#${coinSymbol}`);
    if (coinName.toLowerCase() !== coinSymbol.toLowerCase()) {
      queries.push(`#${coinName.replace(/\s+/g, '')}`);
    }
    
    // Additional targeted queries for better user discovery
    queries.push(`"${coinSymbol}" analysis`);
    if (coinName.toLowerCase() !== coinSymbol.toLowerCase()) {
      queries.push(`"${coinName}" news`);
    }
    
    return queries;
  }

  /**
   * Remove duplicate users from search results
   */
  private removeDuplicateUsers(users: TwitterApiUser[]): TwitterApiUser[] {
    const seenIds = new Set<string>();
    return users.filter(user => {
      if (seenIds.has(user.id)) {
        return false;
      }
      seenIds.add(user.id);
      return true;
    });
  }

  /**
   * Process Twitter user data and store in database
   */
  private async processAndStoreAccount(user: TwitterApiUser, coinSymbol: string) {
    try {
      // Check if account already exists
      let account = await TwitterAccount.findByPk(user.id);
      
      if (!account) {
        // Create new account
        account = await TwitterAccount.create({
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
          influenceScore: this.calculateInfluenceScore(user),
          lastActivityAt: new Date(),
        });
      } else {
        // Update existing account
        await account.update({
          displayName: user.name,
          bio: user.description || '',
          followersCount: user.public_metrics.followers_count,
          followingCount: user.public_metrics.following_count,
          tweetsCount: user.public_metrics.tweet_count,
          verified: user.verified || false,
          profileImageUrl: user.profile_image_url || '',
          isInfluencer: user.public_metrics.followers_count > 10000,
          influenceScore: this.calculateInfluenceScore(user),
          lastActivityAt: new Date(),
        });
      }

      // Get or create relevance data
      const relevance = await AccountCoinRelevance.findOne({
        where: {
          twitterAccountId: user.id,
          coinSymbol: coinSymbol
        }
      });

      return {
        id: account.id,
        username: account.username,
        displayName: account.displayName,
        bio: account.bio,
        followersCount: account.followersCount,
        followingCount: account.followingCount,
        tweetsCount: account.tweetsCount,
        verified: account.verified,
        profileImageUrl: account.profileImageUrl,
        isInfluencer: account.isInfluencer,
        influenceScore: account.influenceScore,
        relevanceScore: relevance?.relevanceScore || 0,
        mentionCount: relevance?.mentionCount || 0,
        avgSentiment: relevance?.avgSentiment || 0,
      };

    } catch (error) {
      logger.error(`Failed to process account ${user.username}:`, error);
      
      // Return basic account data even if database operation fails
      return {
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
        influenceScore: this.calculateInfluenceScore(user),
        relevanceScore: 0,
        mentionCount: 0,
        avgSentiment: 0,
      };
    }
  }

  /**
   * Calculate influence score based on Twitter metrics
   */
  private calculateInfluenceScore(user: TwitterApiUser): number {
    const followers = user.public_metrics.followers_count;
    const following = user.public_metrics.following_count;
    const tweets = user.public_metrics.tweet_count;
    
    // Avoid division by zero
    const followRatio = following > 0 ? followers / following : followers;
    const engagementRate = tweets > 0 ? followers / tweets : 0;
    
    // Calculate base score
    let score = Math.log10(followers + 1) * 10; // Base score from followers
    
    // Bonus for good follow ratio (more followers than following)
    if (followRatio > 1) {
      score += Math.min(followRatio * 5, 25);
    }
    
    // Bonus for engagement
    score += Math.min(engagementRate * 0.1, 10);
    
    // Verification bonus
    if (user.verified) {
      score += 15;
    }
    
    // Cap at 100 and normalize to 0.0-1.0 range
    const normalizedScore = Math.min(Math.round(score), 100) / 100;
    return Math.max(0.0, Math.min(1.0, normalizedScore));
  }

  /**
   * Get monitoring status for Twitter service
   */
  async getMonitoringStatus() {
    try {
      // Test API connectivity with a simple request
      const response = await axios.get(`${this.baseUrl}/users/me`, {
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
        },
        timeout: 5000,
      });

      return {
        status: 'active',
        apiConnected: true,
        lastCheck: new Date().toISOString(),
        rateLimitRemaining: response.headers['x-rate-limit-remaining'] || 'unknown',
      };
    } catch (error) {
      logger.error('Twitter API connectivity check failed:', error);
      return {
        status: 'error',
        apiConnected: false,
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Fetch recent posts for an account
   */
  async getAccountPosts(
    accountId: string,
    options: {
      limit?: number;
      sinceId?: string;
      maxResults?: number;
    } = {}
  ): Promise<TwitterPost[]> {
    const { limit = 50, maxResults = 100 } = options;

    try {
      // Skip demo accounts - they don't exist in real Twitter API
      if (accountId.startsWith('demo_')) {
        logger.debug(`Skipping demo account ${accountId} - returning empty posts array`);
        return [];
      }

      // Check if Twitter API is configured
      if (!this.bearerToken) {
        const errorMsg = 'Twitter API not configured. Please set TWITTER_BEARER_TOKEN environment variable.';
        logger.error(errorMsg);
        throw new Error(errorMsg);
      }

      // Twitter API is configured - proceed with real post fetching
      logger.info(`Fetching posts for account ${accountId} using Twitter API`);

      const posts = await this.fetchUserTweets(accountId, maxResults);
      const processedPosts: TwitterPost[] = [];

      for (const postData of posts) {
        const post = await this.processPostData(postData, accountId);
        if (post) {
          processedPosts.push(post);
        }
      }

      logger.info(`Retrieved ${processedPosts.length} posts for account ${accountId}`);
      return processedPosts.slice(0, limit);
    } catch (error) {
      logger.error(`Failed to fetch posts for account ${accountId}:`, error);
      throw error;
    }
  }

  /**
   * Analyze sentiment of a post
   */
  analyzeSentiment(text: string, coinSymbol: string): {
    sentiment: 'positive' | 'negative' | 'neutral';
    sentimentScore: number;
    impact: 'low' | 'medium' | 'high';
    impactScore: number;
  } {
    const cleanText = text.toLowerCase();
    
    // Enhanced cryptocurrency-specific sentiment keywords
    const positiveKeywords = [
      'moon', 'bullish', 'pump', 'surge', 'rally', 'breakout', 'ath', 'hodl',
      'buy', 'long', 'gain', 'profit', 'win', 'success', 'adoption', 'breakthrough',
      'institutional', 'mainstream', 'partnership', 'upgrade', 'launch', 'green',
      'up', 'rise', 'growth', 'bull run', 'accumulate', 'strong', 'support',
      'resistance broken', 'golden cross', 'oversold bounce', 'reversal',
      'momentum', 'volume spike', 'whale buying', 'institutional buying',
      'positive news', 'good news', 'bullish news', 'catalyst', 'milestone',
      'achievement', 'record high', 'new high', 'all time high', 'parabolic',
      '🚀', '📈', '💎', '🔥', '🌙', '💚', '✅', '⬆️', '📊',
      'diamond hands', 'to the moon', 'lfg', 'wagmi', 'gm', 'bullish af'
    ];

    const negativeKeywords = [
      'dump', 'crash', 'bear', 'bearish', 'sell', 'short', 'drop', 'fall',
      'dip', 'correction', 'loss', 'scam', 'rug', 'hack', 'exploit', 'fear',
      'panic', 'liquidation', 'margin call', 'rekt', 'bad news', 'regulation',
      'red', 'down', 'decline', 'bear market', 'capitulation', 'weak', 'broken',
      'support broken', 'death cross', 'overbought', 'rejection', 'resistance',
      'selling pressure', 'whale selling', 'institutional selling', 'fud',
      'negative news', 'bad news', 'bearish news', 'concern', 'warning',
      'risk', 'danger', 'bubble', 'overvalued', 'crash incoming', 'top signal',
      '📉', '😱', '💸', '🔴', '❌', '⬇️', '💀', '🩸',
      'paper hands', 'ngmi', 'rip', 'ded', 'exit liquidity'
    ];

    const impactKeywords = [
      'sec', 'etf', 'federal', 'government', 'regulation', 'ban', 'lawsuit',
      'institutional', 'whale', 'exchange', 'binance', 'coinbase', 'tesla',
      'microstrategy', 'grayscale', 'blackrock', 'vanguard', 'fidelity',
      'news', 'breaking', 'major', 'significant', 'important', 'huge', 'massive',
      'announcement', 'partnership', 'acquisition', 'merger', 'listing',
      'delisting', 'fork', 'upgrade', 'mainnet', 'testnet', 'audit',
      'ceo', 'founder', 'developer', 'team', 'roadmap', 'whitepaper',
      'earnings', 'revenue', 'adoption', 'integration', 'collaboration',
      'investment', 'funding', 'ipo', 'vc', 'venture capital'
    ];

    let positiveScore = 0;
    let negativeScore = 0;
    let impactScore = 0;

    // Count keyword occurrences
    positiveKeywords.forEach(keyword => {
      const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const matches = (cleanText.match(regex) || []).length;
      positiveScore += matches;
    });

    negativeKeywords.forEach(keyword => {
      const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const matches = (cleanText.match(regex) || []).length;
      negativeScore += matches;
    });

    impactKeywords.forEach(keyword => {
      const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const matches = (cleanText.match(regex) || []).length;
      impactScore += matches * 2; // Impact keywords are weighted more
    });

    // Check for coin mentions
    const coinMentions = this.countCoinMentions(cleanText, coinSymbol);
    if (coinMentions > 0) {
      impactScore += coinMentions;
    }

    // Calculate final scores
    const totalSentimentScore = positiveScore - negativeScore;
    const normalizedSentimentScore = Math.max(-1, Math.min(1, totalSentimentScore / 10));
    
    let sentiment: 'positive' | 'negative' | 'neutral';
    if (totalSentimentScore > 0) sentiment = 'positive';
    else if (totalSentimentScore < 0) sentiment = 'negative';
    else sentiment = 'neutral';

    const normalizedImpactScore = Math.min(1, impactScore / 10);
    let impact: 'low' | 'medium' | 'high';
    if (normalizedImpactScore >= 0.7) impact = 'high';
    else if (normalizedImpactScore >= 0.3) impact = 'medium';
    else impact = 'low';

    return {
      sentiment,
      sentimentScore: normalizedSentimentScore,
      impact,
      impactScore: normalizedImpactScore,
    };
  }

  private async fetchUserTweets(userId: string, maxResults: number): Promise<TwitterTimelinePost[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/users/${userId}/tweets`, {
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
        },
        params: {
          max_results: Math.min(maxResults, 100),
          'tweet.fields': 'id,text,created_at,public_metrics,entities,referenced_tweets',
          'expansions': 'referenced_tweets.id',
        },
      });

      return response.data.data || [];
    } catch (error) {
      logger.error(`Failed to fetch tweets for user ${userId}:`, error);
      return [];
    }
  }

  private async processPostData(postData: TwitterTimelinePost, accountId: string): Promise<TwitterPost | null> {
    try {
      const hashtags = postData.entities?.hashtags?.map(h => h.tag) || [];
      const mentions = postData.entities?.mentions?.map(m => m.username) || [];
      const relevantCoins = this.extractRelevantCoins(postData.text);
      
      const analysis = this.analyzeSentiment(postData.text, relevantCoins[0] || '');
      
      const [post] = await TwitterPost.findOrCreate({
        where: { id: postData.id },
        defaults: {
          id: postData.id,
          twitterAccountId: accountId,
          content: postData.text,
          hashtags,
          mentions,
          relevantCoins,
          sentiment: analysis.sentiment,
          sentimentScore: analysis.sentimentScore,
          impact: analysis.impact,
          impactScore: analysis.impactScore,
          retweetCount: postData.public_metrics.retweet_count,
          likeCount: postData.public_metrics.like_count,
          replyCount: postData.public_metrics.reply_count,
          quoteCount: postData.public_metrics.quote_count,
          viewCount: postData.public_metrics.impression_count || 0,
          isRetweet: postData.referenced_tweets?.some(rt => rt.type === 'retweeted') || false,
          originalPostId: postData.referenced_tweets?.find(rt => rt.type === 'retweeted')?.id,
          publishedAt: new Date(postData.created_at),
          processedAt: new Date(),
        },
      });

      return post;
    } catch (error) {
      logger.error('Failed to process post data:', error);
      return null;
    }
  }

  private extractRelevantCoins(text: string): string[] {
    const coinPatterns = [
      { pattern: /\$?bitcoin|\$?btc/gi, symbol: 'BTC' },
      { pattern: /\$?ethereum|\$?eth/gi, symbol: 'ETH' },
      { pattern: /\$?cardano|\$?ada/gi, symbol: 'ADA' },
      { pattern: /\$?solana|\$?sol/gi, symbol: 'SOL' },
      { pattern: /\$?dogecoin|\$?doge/gi, symbol: 'DOGE' },
      { pattern: /\$?polkadot|\$?dot/gi, symbol: 'DOT' },
      { pattern: /\$?chainlink|\$?link/gi, symbol: 'LINK' },
      { pattern: /\$?polygon|\$?matic/gi, symbol: 'MATIC' },
      { pattern: /\$?avalanche|\$?avax/gi, symbol: 'AVAX' },
      { pattern: /\$?binance coin|\$?bnb/gi, symbol: 'BNB' },
    ];

    const coins: string[] = [];
    coinPatterns.forEach(({ pattern, symbol }) => {
      if (pattern.test(text)) {
        coins.push(symbol);
      }
    });

    return [...new Set(coins)];
  }

  private countCoinMentions(text: string, coinSymbol: string): number {
    const patterns = [
      new RegExp(`\\$?${coinSymbol}`, 'gi'),
      new RegExp(`#${coinSymbol}`, 'gi'),
    ];

    let count = 0;
    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) count += matches.length;
    });

    return count;
  }

  /**
   * Process and store account for custom query searches
   */
  private async processAndStoreAccountForCustomQuery(user: TwitterApiUser, query: string) {
    try {
      // Store the account in the database
      const [account] = await TwitterAccount.findOrCreate({
        where: { id: user.id },
        defaults: {
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
          influenceScore: this.calculateInfluenceScore(user),
          lastActivityAt: new Date(),
        },
      });

      // Update existing account if needed
      if (!account.isNewRecord) {
        await account.update({
          displayName: user.name,
          bio: user.description || '',
          followersCount: user.public_metrics.followers_count,
          followingCount: user.public_metrics.following_count,
          tweetsCount: user.public_metrics.tweet_count,
          verified: user.verified || false,
          profileImageUrl: user.profile_image_url || '',
          influenceScore: this.calculateInfluenceScore(user),
          lastActivityAt: new Date(),
        });
      }

      return {
        id: account.id,
        username: account.username,
        displayName: account.displayName,
        bio: account.bio,
        followersCount: account.followersCount,
        followingCount: account.followingCount,
        tweetsCount: account.tweetsCount,
        verified: account.verified,
        profileImageUrl: account.profileImageUrl,
        isInfluencer: account.isInfluencer,
        influenceScore: account.influenceScore,
        relevanceScore: this.calculateQueryRelevance(user, query),
        mentionCount: this.countQueryMentions(user.description || '', query),
        avgSentiment: 0,
      };
    } catch (error) {
      logger.error(`Failed to process and store account ${user.username}:`, error);
      throw error;
    }
  }

  /**
   * Calculate relevance score for custom query
   */
  private calculateQueryRelevance(user: TwitterApiUser, query: string): number {
    const bio = (user.description || '').toLowerCase();
    const name = user.name.toLowerCase();
    const username = user.username.toLowerCase();
    const queryLower = query.toLowerCase();
    
    let score = 0;
    
    // Check for exact matches
    if (bio.includes(queryLower) || name.includes(queryLower) || username.includes(queryLower)) {
      score += 0.5;
    }
    
    // Check for individual keywords
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
    queryWords.forEach(word => {
      if (bio.includes(word) || name.includes(word) || username.includes(word)) {
        score += 0.1;
      }
    });
    
    // Boost score based on follower count (influence factor)
    const followerBoost = Math.min(user.public_metrics.followers_count / 100000, 0.3);
    score += followerBoost;
    
    return Math.min(score, 1.0);
  }

  /**
   * Count query mentions in text
   */
  private countQueryMentions(text: string, query: string): number {
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();
    
    let count = 0;
    
    // Count exact query matches
    const exactMatches = textLower.split(queryLower).length - 1;
    count += exactMatches * 2;
    
    // Count individual keyword matches
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
    queryWords.forEach(word => {
      const wordMatches = textLower.split(word).length - 1;
      count += wordMatches;
    });
    
    return count;
  }

  /**
   * Search for tweets using Twitter API v2 with rate limit handling and caching
   */
  private async searchTweets(query: string, maxResults: number = 100): Promise<any[]> {
    try {
      // Check cache first
      const cacheKey = `tweets_${query}_${maxResults}`;
      const cachedTweets = this.rateLimitManager.getCache<any[]>(cacheKey);
      if (cachedTweets) {
        logger.info(`Retrieved ${cachedTweets.length} tweets from cache for query: ${query}`);
        return cachedTweets;
      }
      
      const url = `${this.baseUrl}/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=${Math.min(maxResults, 100)}&tweet.fields=author_id,created_at,public_metrics&user.fields=id,username,name,description,public_metrics,verified,profile_image_url`;
      const options: RequestInit = {
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
          'Content-Type': 'application/json',
        },
      };
      
      const response = await this.makeRequestWithRetry(url, options, 'tweets_search');
      const data = await response.json();
      
      const tweets = data.data || [];
      
      // Cache the results for 2 minutes (tweets are more time-sensitive)
      this.rateLimitManager.setCache(cacheKey, tweets, 2 * 60 * 1000);
      
      return tweets;
    } catch (error) {
      logger.error('Failed to search tweets:', error);
      throw error;
    }
  }

  /**
   * Get users by IDs using Twitter API v2 with rate limit handling and caching
   */
  private async getUsersByIds(userIds: string[]): Promise<TwitterApiUser[]> {
    try {
      if (userIds.length === 0) return [];
      
      // Check cache first
      const cacheKey = `users_${userIds.sort().join(',')}`;
      const cachedUsers = this.rateLimitManager.getCache<TwitterApiUser[]>(cacheKey);
      if (cachedUsers) {
        logger.info(`Retrieved ${cachedUsers.length} users from cache`);
        return cachedUsers;
      }
      
      // Process in batches of 100 (API limit)
      const allUsers: TwitterApiUser[] = [];
      const batchSize = 100;
      
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        const idsParam = batch.join(',');
        
        const url = `${this.baseUrl}/users?ids=${idsParam}&user.fields=id,username,name,description,public_metrics,verified,profile_image_url,created_at`;
        const options: RequestInit = {
          headers: {
            'Authorization': `Bearer ${this.bearerToken}`,
            'Content-Type': 'application/json',
          },
        };
        
        const response = await this.makeRequestWithRetry(url, options, 'users_lookup');
        const data = await response.json();
        
        if (data.data) {
          allUsers.push(...data.data);
          logger.info(`Retrieved batch ${Math.floor(i / batchSize) + 1}: ${data.data.length} users`);
        }
        
        // Add small delay between batches to be respectful
        if (i + batchSize < userIds.length) {
          await this.sleep(100);
        }
      }
      
      // Cache the results for 5 minutes
      this.rateLimitManager.setCache(cacheKey, allUsers, 5 * 60 * 1000);
      
      return allUsers;
    } catch (error) {
      logger.error('Failed to get users by IDs:', error);
      throw error;
    }
  }

  /**
   * Make HTTP request with rate limit handling and exponential backoff
   */
  private async makeRequestWithRetry(
    url: string,
    options: RequestInit,
    endpoint: string,
    maxRetries: number = 3
  ): Promise<Response> {
    let attempt = 0;
    const MAX_WAIT_TIME = 60000; // 最大等待1分钟
    
    while (attempt < maxRetries) {
      try {
        // Check rate limit before making request
        if (!this.rateLimitManager.canMakeRequest(endpoint)) {
          const waitTime = this.rateLimitManager.getWaitTime(endpoint);
          if (waitTime > 0) {
            // 如果等待时间超过最大限制，直接抛出错误而不是等待
            if (waitTime > MAX_WAIT_TIME) {
              logger.warn(`Rate limit wait time (${Math.ceil(waitTime / 1000)}s) exceeds maximum (${MAX_WAIT_TIME / 1000}s). Failing fast.`);
              throw new Error(`Twitter API rate limit exceeded. Please try again in ${Math.ceil(waitTime / 60000)} minutes.`);
            }
            
            logger.warn(`Rate limit reached for ${endpoint}. Waiting ${Math.ceil(waitTime / 1000)} seconds...`);
            await this.sleep(waitTime);
          }
        }

        const response = await fetch(url, options);
        
        // Update rate limit info from headers
        this.rateLimitManager.updateRateLimit(endpoint, response.headers);
        
        if (response.ok) {
          return response;
        }
        
        if (response.status === 429) {
          // Rate limit exceeded
          const resetHeader = response.headers.get('x-rate-limit-reset');
          let waitTime = resetHeader ? 
            (parseInt(resetHeader) * 1000 - Date.now()) : 
            this.calculateBackoffDelay(attempt);
          
          // 限制最大等待时间
          if (waitTime > MAX_WAIT_TIME) {
            logger.warn(`Rate limit wait time (${Math.ceil(waitTime / 1000)}s) exceeds maximum. Failing fast.`);
            throw new Error(`Twitter API rate limit exceeded. Please try again in ${Math.ceil(waitTime / 60000)} minutes.`);
          }
          
          logger.warn(`Rate limit exceeded for ${endpoint}. Waiting ${Math.ceil(waitTime / 1000)} seconds before retry ${attempt + 1}/${maxRetries}`);
          
          if (attempt < maxRetries - 1) {
            await this.sleep(waitTime);
            attempt++;
            continue;
          }
        }
        
        // For other errors, use exponential backoff
        if (attempt < maxRetries - 1 && response.status >= 500) {
          const backoffDelay = this.calculateBackoffDelay(attempt);
          logger.warn(`Request failed with status ${response.status}. Retrying in ${Math.ceil(backoffDelay / 1000)} seconds... (${attempt + 1}/${maxRetries})`);
          await this.sleep(backoffDelay);
          attempt++;
          continue;
        }
        
        throw new Error(`Twitter API request failed: ${response.status} ${response.statusText}`);
        
      } catch (error) {
        if (attempt === maxRetries - 1) {
          throw error;
        }
        
        // 如果是速率限制错误，不要重试
        if (error instanceof Error && error.message.includes('rate limit exceeded')) {
          throw error;
        }
        
        const backoffDelay = this.calculateBackoffDelay(attempt);
        logger.warn(`Request error: ${error}. Retrying in ${Math.ceil(backoffDelay / 1000)} seconds... (${attempt + 1}/${maxRetries})`);
        await this.sleep(backoffDelay);
        attempt++;
      }
    }
    
    throw new Error(`Max retries (${maxRetries}) exceeded for ${endpoint}`);
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(attempt: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 60000; // 60 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current rate limit status for monitoring
   */
  public getRateLimitStatus(): { [endpoint: string]: RateLimitInfo } {
    const status: { [endpoint: string]: RateLimitInfo } = {};
    // Note: This would require making rateLimits public or adding a getter method to RateLimitManager
    return status;
  }

  /**
   * Clear all cached data (useful for testing or manual refresh)
   */
  public clearCache(): void {
    this.rateLimitManager.clearExpiredCache();
    logger.info('Twitter service cache cleared');
  }

  /**
   * Get fallback recommended accounts when Twitter API is not available
   */
  private async getFallbackRecommendedAccounts(query: string, limit: number): Promise<TwitterSearchResult> {
    try {
      // Import RecommendedAccount model dynamically to avoid circular dependency
      const { RecommendedAccount } = await import('../models/RecommendedAccount');
      
      // Try to match query with coin symbols
      const coinSymbols = ['BTC', 'ETH', 'SOL', 'ADA', 'BNB', 'DOT', 'LINK', 'MATIC', 'AVAX', 'DOGE'];
      const queryUpper = query.toUpperCase();
      const matchedCoin = coinSymbols.find(symbol => 
        queryUpper.includes(symbol) || queryUpper.includes(symbol.toLowerCase())
      );
      
      let recommendedAccounts: any[] = [];
      
      if (matchedCoin) {
        // Get recommended accounts for the matched coin
        recommendedAccounts = await RecommendedAccount.findAll({
          where: { 
            coinSymbol: matchedCoin,
            isActive: true
          },
          order: [['priority', 'DESC']],
          limit: Math.min(limit, 10)
        });
      }
      
      // If no specific coin match or no accounts found, get general crypto accounts
      if (recommendedAccounts.length === 0) {
        recommendedAccounts = await RecommendedAccount.findAll({
          where: { isActive: true },
          order: [['priority', 'DESC']],
          limit: Math.min(limit, 10)
        });
      }
      
      const accounts = recommendedAccounts.map((account: any) => ({
        id: account.twitterUserId || account.twitterUsername,
        username: account.twitterUsername,
        displayName: account.displayName,
        bio: account.bio || '',
        followersCount: account.followersCount,
        followingCount: 0,
        tweetsCount: 0,
        verified: account.verified,
        profileImageUrl: account.profileImageUrl || '',
        isInfluencer: account.category === 'influencer' || account.followersCount > 10000,
        influenceScore: account.relevanceScore,
        relevanceScore: account.relevanceScore,
        mentionCount: 0,
        avgSentiment: 0,
      }));
      
      logger.info(`Returning ${accounts.length} recommended accounts as fallback for query "${query}"`);
      
      return {
        accounts,
        totalCount: accounts.length,
        hasMore: false,
        query,
        searchMethod: 'Recommended Accounts (Fallback)'
      };
      
    } catch (error) {
      logger.error('Failed to get fallback recommended accounts:', error);
      
      // Return empty result as last resort
      return {
        accounts: [],
        totalCount: 0,
        hasMore: false,
        query,
        searchMethod: 'No Data Available'
      };
    }
  }
} 