import { TwitterApi, TwitterApiReadWrite } from 'twitter-api-v2';
import crypto from 'crypto';
import logger from '../utils/logger';
import env from '../config/env';

export interface OAuthState {
  state: string;
  codeVerifier: string;
  userId?: string;
  timestamp: number;
}

export interface TwitterUserInfo {
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

export class TwitterOAuthService {
  private static instance: TwitterOAuthService;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private readonly isConfigured: boolean;
  private oauthStates = new Map<string, OAuthState>();

  constructor() {
    this.clientId = process.env.TWITTER_CLIENT_ID || '';
    this.clientSecret = process.env.TWITTER_CLIENT_SECRET || '';
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://yourdomain.com' 
      : 'http://localhost:5001';

    this.isConfigured = !!(this.clientId && this.clientSecret);

    if (!this.isConfigured) {
      logger.warn('Twitter OAuth 2.0 configuration not found. Twitter authentication features will be disabled.');
      logger.warn('To enable Twitter OAuth, set TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET environment variables.');
    } else {
      logger.info('Twitter OAuth 2.0 service initialized');
    }
    
    // Clean up expired states every hour
    setInterval(() => this.cleanupExpiredStates(), 60 * 60 * 1000);
  }

  public static getInstance(): TwitterOAuthService {
    if (!TwitterOAuthService.instance) {
      TwitterOAuthService.instance = new TwitterOAuthService();
    }
    return TwitterOAuthService.instance;
  }

  /**
   * Check if Twitter OAuth is properly configured
   * This method dynamically checks environment variables
   */
  public isTwitterOAuthConfigured(): boolean {
    const currentClientId = process.env.TWITTER_CLIENT_ID;
    const currentClientSecret = process.env.TWITTER_CLIENT_SECRET;
    return !!(currentClientId && currentClientSecret);
  }

  /**
   * Generate OAuth 2.0 authorization URL with PKCE
   */
  generateAuthUrl(userId?: string): { url: string; state: string } {
    if (!this.isConfigured) {
      throw new Error('Twitter OAuth is not configured. Please set TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET environment variables.');
    }

    try {
      const client = new TwitterApi({
        clientId: this.clientId,
        clientSecret: this.clientSecret,
      });

      const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
        `${this.baseUrl}/auth/twitter/callback`,
        {
          scope: ['tweet.read', 'users.read', 'follows.read', 'offline.access'],
        }
      );

      // Store OAuth state
      this.oauthStates.set(state, {
        state,
        codeVerifier,
        userId,
        timestamp: Date.now(),
      });

      logger.info('Generated Twitter OAuth 2.0 authorization URL', { state, userId });

      return { url, state };
    } catch (error) {
      logger.error('Failed to generate OAuth authorization URL:', error);
      throw new Error('Failed to generate Twitter authorization URL');
    }
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleCallback(code: string, state: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    userInfo: TwitterUserInfo;
  }> {
    if (!this.isConfigured) {
      throw new Error('Twitter OAuth is not configured. Please set TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET environment variables.');
    }

    try {
      // Validate state
      const storedState = this.oauthStates.get(state);
      if (!storedState) {
        throw new Error('Invalid or expired OAuth state');
      }

      const client = new TwitterApi({
        clientId: this.clientId,
        clientSecret: this.clientSecret,
      });

      // Exchange code for tokens
      const { client: loggedClient, accessToken, refreshToken } = await client.loginWithOAuth2({
        code,
        codeVerifier: storedState.codeVerifier,
        redirectUri: `${this.baseUrl}/auth/twitter/callback`,
      });

      // Get user information
      const userResponse = await loggedClient.v2.me({
        'user.fields': ['id', 'username', 'name', 'description', 'public_metrics', 'verified', 'profile_image_url', 'created_at']
      });

      const userData = userResponse.data;
      const userInfo: TwitterUserInfo = {
        id: userData.id,
        username: userData.username,
        name: userData.name,
        description: userData.description,
        public_metrics: {
          followers_count: userData.public_metrics?.followers_count || 0,
          following_count: userData.public_metrics?.following_count || 0,
          tweet_count: userData.public_metrics?.tweet_count || 0,
        },
        verified: userData.verified || false,
        profile_image_url: userData.profile_image_url,
        created_at: userData.created_at || new Date().toISOString(),
      };

      // Clean up used state
      this.oauthStates.delete(state);

      logger.info('Twitter OAuth callback successful', {
        userId: userInfo.id,
        username: userInfo.username
      });

      return {
        accessToken,
        refreshToken,
        userInfo,
      };
    } catch (error) {
      logger.error('Twitter OAuth callback failed:', error);
      throw new Error('Failed to complete Twitter authentication');
    }
  }

  /**
   * Search users with OAuth 2.0 user context (supports /users/search endpoint)
   */
  async searchUsersWithOAuth(
    accessToken: string,
    query: string,
    maxResults: number = 50
  ): Promise<TwitterUserInfo[]> {
    if (!this.isConfigured) {
      logger.warn('Twitter OAuth not configured, returning empty search results');
      return [];
    }

    try {
      const client = new TwitterApi(accessToken);

      logger.debug(`Searching Twitter users with OAuth context: "${query}"`);

      // Use tweets search as fallback since searchUsers might not be available
      const response = await client.v2.search(query, {
        max_results: Math.min(maxResults, 100),
        'tweet.fields': ['id', 'text', 'created_at', 'public_metrics'],
        'user.fields': ['id', 'username', 'name', 'description', 'public_metrics', 'verified', 'profile_image_url', 'created_at'],
        expansions: ['author_id'],
      });

      // Extract users from tweet authors
      const users: TwitterUserInfo[] = [];
      if (response.includes?.users) {
        for (const user of response.includes.users) {
          users.push({
            id: user.id,
            username: user.username,
            name: user.name,
            description: user.description,
            public_metrics: {
              followers_count: user.public_metrics?.followers_count || 0,
              following_count: user.public_metrics?.following_count || 0,
              tweet_count: user.public_metrics?.tweet_count || 0,
            },
            verified: user.verified || false,
            profile_image_url: user.profile_image_url,
            created_at: user.created_at || new Date().toISOString(),
          });
        }
      }
      
      logger.debug(`Twitter OAuth search returned ${users.length} users for query: "${query}"`);

      return users;
    } catch (error) {
      logger.error(`Twitter OAuth search failed for query "${query}":`, error);
      throw new Error(`Twitter user search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search accounts for a specific cryptocurrency using OAuth 2.0
   */
  async searchAccountsForCoinWithOAuth(
    accessToken: string,
    coinSymbol: string,
    coinName: string,
    options: {
      limit?: number;
      minFollowers?: number;
      includeVerified?: boolean;
    } = {}
  ): Promise<TwitterUserInfo[]> {
    const { limit = 50, minFollowers = 1000, includeVerified = true } = options;

    try {
      const client = new TwitterApi(accessToken);
      
      logger.info(`Searching accounts for ${coinSymbol} (${coinName}) with OAuth context`, {
        limit,
        minFollowers,
        includeVerified
      });

      // Build search queries
      const queries = this.buildSearchQueries(coinSymbol, coinName);
      const allUsers: TwitterUserInfo[] = [];

      // Execute searches
      for (const query of queries) {
        try {
          const users = await this.searchUsersWithOAuth(accessToken, query, Math.ceil(limit / queries.length));
          allUsers.push(...users);
        } catch (error) {
          logger.warn(`OAuth search failed for query "${query}":`, error instanceof Error ? error.message : 'Unknown error');
        }
      }

      // Remove duplicates and filter
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

      logger.info(`OAuth search found ${sortedUsers.length} accounts for ${coinSymbol}`);
      return sortedUsers;

    } catch (error) {
      logger.error(`OAuth search failed for ${coinSymbol}:`, error);
      throw error;
    }
  }

  /**
   * Search accounts with custom query using OAuth 2.0
   */
  async searchAccountsWithCustomQuery(
    accessToken: string,
    query: string,
    options: {
      limit?: number;
      minFollowers?: number;
      includeVerified?: boolean;
    } = {}
  ): Promise<TwitterUserInfo[]> {
    const { limit = 50, minFollowers = 1000, includeVerified = true } = options;

    try {
      const client = new TwitterApi(accessToken);
      
      logger.info(`Searching accounts with custom query "${query}" using OAuth context`, {
        limit,
        minFollowers,
        includeVerified
      });

      // Search for tweets with the custom query
      const users = await this.searchUsersWithOAuth(accessToken, query, limit * 2);

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

      logger.info(`OAuth custom query search found ${sortedUsers.length} accounts for "${query}"`);
      return sortedUsers;

    } catch (error) {
      logger.error(`OAuth custom query search failed for "${query}":`, error);
      throw error;
    }
  }

  /**
   * Get user timeline with OAuth context
   */
  async getUserTweets(
    accessToken: string,
    userId: string,
    maxResults: number = 50
  ): Promise<any[]> {
    try {
      const client = new TwitterApi(accessToken);

      const response = await client.v2.userTimeline(userId, {
        max_results: Math.min(maxResults, 100),
        'tweet.fields': ['id', 'text', 'created_at', 'public_metrics', 'entities'],
        exclude: ['retweets', 'replies'],
      });

      return response.data.data || [];
    } catch (error) {
      logger.error(`Failed to get user tweets for ${userId}:`, error);
      throw new Error('Failed to fetch user tweets');
    }
  }

  /**
   * Build search queries for cryptocurrency
   */
  private buildSearchQueries(coinSymbol: string, coinName: string): string[] {
    const queries: string[] = [];
    
    // Direct symbol and name searches
    queries.push(coinSymbol);
    if (coinName.toLowerCase() !== coinSymbol.toLowerCase()) {
      queries.push(coinName);
    }
    
    // Crypto-specific searches
    queries.push(`${coinSymbol} crypto`);
    queries.push(`${coinSymbol} trading`);
    
    if (coinName.toLowerCase() !== coinSymbol.toLowerCase()) {
      queries.push(`${coinName} crypto`);
    }
    
    return queries;
  }

  /**
   * Remove duplicate users from search results
   */
  private removeDuplicateUsers(users: TwitterUserInfo[]): TwitterUserInfo[] {
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
   * Clean up expired OAuth states
   */
  private cleanupExpiredStates(): void {
    const now = Date.now();
    const expiredStates: string[] = [];

    for (const [state, data] of this.oauthStates.entries()) {
      // States expire after 10 minutes
      if (now - data.timestamp > 10 * 60 * 1000) {
        expiredStates.push(state);
      }
    }

    expiredStates.forEach(state => this.oauthStates.delete(state));
    
    if (expiredStates.length > 0) {
      logger.debug(`Cleaned up ${expiredStates.length} expired OAuth states`);
    }
  }

  /**
   * Validate OAuth state
   */
  validateState(state: string): boolean {
    return this.oauthStates.has(state);
  }

  /**
   * Get stored OAuth state
   */
  getStoredState(state: string): OAuthState | undefined {
    return this.oauthStates.get(state);
  }
} 