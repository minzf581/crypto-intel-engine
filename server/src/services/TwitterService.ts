import axios, { AxiosError } from 'axios';
import logger from '../utils/logger';
import { TwitterAccount } from '../models/TwitterAccount';
import { TwitterPost } from '../models/TwitterPost';
import { AccountCoinRelevance } from '../models/AccountCoinRelevance';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';

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

  constructor() {
    // Require Twitter Bearer Token from environment
    this.bearerToken = process.env.TWITTER_BEARER_TOKEN || '';
    
    if (!this.bearerToken) {
      throw new Error('Twitter API configuration required. Please set TWITTER_BEARER_TOKEN environment variable. Demo data is not allowed for financial applications.');
    }
    
    logger.info('Twitter service initialized with real API token');
  }

  public static getInstance(): TwitterService {
    if (!TwitterService.instance) {
      TwitterService.instance = new TwitterService();
    }
    return TwitterService.instance;
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
        throw new Error('Twitter API Bearer Token is required. Please configure TWITTER_BEARER_TOKEN environment variable. Demo data is prohibited for financial applications.');
      }

      // Search for tweets with the custom query and extract users
      const tweets = await this.searchTweets(query, limit * 2);
      
      if (tweets.length === 0) {
        logger.info(`No tweets found for query "${query}"`);
        return {
          accounts: [],
          totalCount: 0,
          hasMore: false,
          query,
          searchMethod: 'Twitter API v2 (Real Data - Custom Query)'
        };
      }

      // Extract unique user IDs from tweets
      const userIds = Array.from(new Set(tweets.map(tweet => tweet.author_id).filter(Boolean)));
      
      if (userIds.length === 0) {
        logger.warn(`No user IDs found in tweets for query "${query}"`);
        return {
          accounts: [],
          totalCount: 0,
          hasMore: false,
          query,
          searchMethod: 'Twitter API v2 (Real Data - Custom Query)'
        };
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
        // Provide specific error details without fallback to demo data
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          throw new Error(`Twitter API rate limit exceeded for query "${query}". Please wait before making more requests. Demo data is not permitted for financial applications.`);
        }
        
        if (error.message.includes('authentication') || error.message.includes('401')) {
          throw new Error(`Twitter API authentication failed. Please check TWITTER_BEARER_TOKEN configuration. Demo data is not permitted for financial applications.`);
        }
        
        if (error.message.includes('403')) {
          throw new Error(`Twitter API access forbidden. Please check API permissions and endpoints. Demo data is not permitted for financial applications.`);
        }
      }
      
      throw new Error(`Twitter API custom query search failed for "${query}": ${error instanceof Error ? error.message : 'Unknown error'}. Please check API configuration and network connectivity.`);
    }
  }

  /**
   * Search for users using Twitter API v2 - using tweets/search instead of users/search
   * This approach searches for recent tweets and extracts user information from the authors
   */
  private async searchUsers(query: string, maxResults: number): Promise<TwitterApiUser[]> {
    try {
      logger.debug(`Searching Twitter users with query: "${query}"`);
      
      // Use tweets/search/recent instead of users/search
      const response = await axios.get(`${this.baseUrl}/tweets/search/recent`, {
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
          'Content-Type': 'application/json',
        },
        params: {
          query: `${query} -is:retweet`, // Exclude retweets to get original content
          max_results: Math.min(maxResults * 2, 100), // Get more tweets to extract unique users
          'tweet.fields': 'id,text,created_at,public_metrics,author_id',
          'user.fields': 'id,username,name,description,public_metrics,verified,profile_image_url,created_at',
          'expansions': 'author_id',
        },
        timeout: 10000, // 10 second timeout
      });

      // Extract unique users from the tweet authors
      const users = response.data.includes?.users || [];
      const uniqueUsers = this.removeDuplicateUsers(users);
      
      logger.debug(`Twitter API returned ${uniqueUsers.length} unique users from tweets for query: "${query}"`);
      
      return uniqueUsers.slice(0, maxResults);

    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // Twitter API returned an error response
          logger.error(`Twitter API error for query "${query}":`, {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
          });
          
          // Handle specific error types
          if (error.response.status === 401) {
            throw new Error('Twitter API authentication failed. Please check your Bearer Token.');
          } else if (error.response.status === 429) {
            throw new Error('Twitter API rate limit exceeded. Please try again later.');
          } else if (error.response.status === 403) {
            throw new Error('Twitter API access forbidden. Please check your API permissions.');
          }
        } else if (error.request) {
          // Request was made but no response received
          logger.error(`No response from Twitter API for query "${query}":`, error.message);
          throw new Error('Twitter API connection failed. Please check your internet connection.');
        } else {
          // Something else happened
          logger.error(`Request setup error for query "${query}":`, error.message);
        }
      } else if (error instanceof Error) {
        logger.error(`Request setup error for query "${query}":`, error.message);
      } else {
        logger.error(`Request setup error for query "${query}":`, 'Unknown error');
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
    
    // Cap at 100
    return Math.min(Math.round(score), 100);
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
   * Search for tweets using Twitter API v2
   */
  private async searchTweets(query: string, maxResults: number = 100): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=${Math.min(maxResults, 100)}&tweet.fields=author_id,created_at,public_metrics&user.fields=id,username,name,description,public_metrics,verified,profile_image_url`,
        {
          headers: {
            'Authorization': `Bearer ${this.bearerToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Twitter API rate limit exceeded');
        }
        throw new Error(`Twitter API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      logger.error('Failed to search tweets:', error);
      throw error;
    }
  }

  /**
   * Get users by IDs using Twitter API v2
   */
  private async getUsersByIds(userIds: string[]): Promise<TwitterApiUser[]> {
    try {
      if (userIds.length === 0) return [];
      
      const idsParam = userIds.slice(0, 100).join(','); // API limit is 100 users per request
      const response = await fetch(
        `${this.baseUrl}/users?ids=${idsParam}&user.fields=id,username,name,description,public_metrics,verified,profile_image_url,created_at`,
        {
          headers: {
            'Authorization': `Bearer ${this.bearerToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Twitter API rate limit exceeded');
        }
        throw new Error(`Twitter API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      logger.error('Failed to get users by IDs:', error);
      throw error;
    }
  }
} 