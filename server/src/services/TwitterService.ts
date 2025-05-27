import axios from 'axios';
import logger from '../utils/logger';
import { TwitterAccount } from '../models/TwitterAccount';
import { TwitterPost } from '../models/TwitterPost';
import { AccountCoinRelevance } from '../models/AccountCoinRelevance';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';

export interface TwitterSearchResult {
  accounts: TwitterAccount[];
  totalFound: number;
  searchQuery: string;
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
  private bearerToken: string;
  private baseUrl = 'https://api.twitter.com/2';

  constructor() {
    this.bearerToken = process.env.TWITTER_BEARER_TOKEN || '';
    if (!this.bearerToken) {
      logger.warn('Twitter Bearer Token not configured. Twitter functionality will be limited.');
    }
  }

  public static getInstance(): TwitterService {
    if (!TwitterService.instance) {
      TwitterService.instance = new TwitterService();
    }
    return TwitterService.instance;
  }

  /**
   * Search for Twitter accounts related to a cryptocurrency
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
      // Twitter API is now configured - proceed with real search
      logger.info(`Searching for accounts related to ${coinSymbol} using Twitter API`);

      const searchQueries = this.buildSearchQueries(coinSymbol, coinName);
      const foundAccounts: TwitterAccount[] = [];

      for (const query of searchQueries) {
        const accounts = await this.searchUsers(query, limit);
        
        for (const accountData of accounts) {
          const account = await this.processAccountData(accountData);
          if (account && this.meetsRequirements(account, minFollowers, includeVerified)) {
            foundAccounts.push(account);
          }
        }
      }

      // Remove duplicates and sort by influence score
      const uniqueAccounts = this.removeDuplicateAccounts(foundAccounts);
      const sortedAccounts = uniqueAccounts
        .sort((a, b) => b.influenceScore - a.influenceScore)
        .slice(0, limit);

      // Calculate relevance scores for each account
      await this.calculateRelevanceScores(sortedAccounts, coinSymbol);

      logger.info(`Found ${sortedAccounts.length} relevant accounts for ${coinSymbol}`);

      return {
        accounts: sortedAccounts,
        totalFound: sortedAccounts.length,
        searchQuery: searchQueries.join(' OR '),
      };
    } catch (error) {
      logger.error(`Failed to search accounts for ${coinSymbol}:`, error);
      
      // If Twitter API fails, provide helpful error message
      if (!this.bearerToken) {
        throw new Error('Twitter API not configured. Please set TWITTER_BEARER_TOKEN environment variable.');
      }
      
      throw new Error(`Twitter API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      // Twitter API is now configured - proceed with real post fetching
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
      
      // If Twitter API fails, provide helpful error message
      if (!this.bearerToken) {
        throw new Error('Twitter API not configured. Please set TWITTER_BEARER_TOKEN environment variable.');
      }
      
      throw new Error(`Twitter API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  /**
   * Private helper methods
   */
  private buildSearchQueries(coinSymbol: string, coinName: string): string[] {
    const queries = [
      `${coinSymbol} crypto`,
      `${coinName} cryptocurrency`,
      `#${coinSymbol}`,
      `#${coinName}`,
      `${coinSymbol} trading`,
      `${coinName} blockchain`,
      `${coinSymbol} analysis`,
      `${coinName} price`,
      `${coinSymbol} market`,
      `${coinName} news`,
    ];

    // Add specific patterns for major coins with more comprehensive keywords
    const specificQueries: Record<string, string[]> = {
      'BTC': [
        'bitcoin', '#bitcoin', '#btc', 'satoshi', 'bitcoin price', 'btc analysis',
        'bitcoin trading', 'bitcoin news', 'bitcoin market', 'hodl bitcoin',
        'bitcoin bull', 'bitcoin bear', 'bitcoin prediction'
      ],
      'ETH': [
        'ethereum', '#ethereum', '#eth', 'vitalik', 'ethereum price', 'eth analysis',
        'ethereum trading', 'ethereum news', 'defi ethereum', 'eth2', 'ethereum merge',
        'smart contracts', 'ethereum gas', 'ethereum prediction'
      ],
      'ADA': [
        'cardano', '#cardano', '#ada', 'ada price', 'cardano analysis',
        'cardano trading', 'cardano news', 'cardano staking', 'ada prediction'
      ],
      'SOL': [
        'solana', '#solana', '#sol', 'sol price', 'solana analysis',
        'solana trading', 'solana news', 'solana ecosystem', 'sol prediction'
      ],
      'DOGE': [
        'dogecoin', '#dogecoin', '#doge', 'doge price', 'dogecoin analysis',
        'dogecoin trading', 'dogecoin news', 'doge prediction', 'elon doge'
      ],
      'MATIC': [
        'polygon', '#polygon', '#matic', 'matic price', 'polygon analysis',
        'polygon trading', 'polygon news', 'matic prediction'
      ],
      'DOT': [
        'polkadot', '#polkadot', '#dot', 'dot price', 'polkadot analysis',
        'polkadot trading', 'polkadot news', 'dot prediction'
      ],
      'LINK': [
        'chainlink', '#chainlink', '#link', 'link price', 'chainlink analysis',
        'chainlink trading', 'chainlink news', 'link prediction', 'oracle'
      ],
    };

    if (specificQueries[coinSymbol]) {
      queries.push(...specificQueries[coinSymbol]);
    }

    return queries;
  }

  private async searchUsers(query: string, maxResults: number): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/users/search`, {
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
        },
        params: {
          query,
          max_results: Math.min(maxResults, 100),
          'user.fields': 'id,username,name,description,public_metrics,verified,profile_image_url,created_at',
        },
      });

      return response.data.data || [];
    } catch (error) {
      logger.error(`Twitter user search failed for query "${query}":`, error);
      return [];
    }
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

  private async processAccountData(accountData: any): Promise<TwitterAccount | null> {
    try {
      const influenceScore = this.calculateInfluenceScore(accountData);
      
      const account = await TwitterAccount.findOrCreate({
        where: { id: accountData.id },
        defaults: {
          id: accountData.id,
          username: accountData.username,
          displayName: accountData.name,
          bio: accountData.description || '',
          followersCount: accountData.public_metrics?.followers_count || 0,
          followingCount: accountData.public_metrics?.following_count || 0,
          tweetsCount: accountData.public_metrics?.tweet_count || 0,
          verified: accountData.verified || false,
          profileImageUrl: accountData.profile_image_url || '',
          isInfluencer: influenceScore > 0.7,
          influenceScore,
          lastActivityAt: new Date(),
        },
      });

      return account[0];
    } catch (error) {
      logger.error('Failed to process account data:', error);
      return null;
    }
  }

  private async processPostData(postData: TwitterTimelinePost, accountId: string): Promise<TwitterPost | null> {
    try {
      const hashtags = postData.entities?.hashtags?.map(h => h.tag) || [];
      const mentions = postData.entities?.mentions?.map(m => m.username) || [];
      const relevantCoins = this.extractRelevantCoins(postData.text);
      
      const analysis = this.analyzeSentiment(postData.text, relevantCoins[0] || '');
      
      const post = await TwitterPost.findOrCreate({
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

      return post[0];
    } catch (error) {
      logger.error('Failed to process post data:', error);
      return null;
    }
  }

  private calculateInfluenceScore(accountData: any): number {
    const followers = accountData.public_metrics?.followers_count || 0;
    const following = accountData.public_metrics?.following_count || 0;
    const tweets = accountData.public_metrics?.tweet_count || 0;
    const verified = accountData.verified || false;

    // Normalize follower count (log scale)
    const followerScore = Math.min(1, Math.log10(followers + 1) / 7); // Max at 10M followers
    
    // Follower to following ratio (capped at 100)
    const ratioScore = following > 0 ? Math.min(1, followers / following / 100) : 0;
    
    // Tweet activity score
    const activityScore = Math.min(1, tweets / 10000); // Max at 10k tweets
    
    // Verification bonus
    const verificationBonus = verified ? 0.2 : 0;

    const baseScore = (followerScore * 0.5 + ratioScore * 0.3 + activityScore * 0.2);
    return Math.min(1, baseScore + verificationBonus);
  }

  private meetsRequirements(account: TwitterAccount, minFollowers: number, includeVerified: boolean): boolean {
    if (account.followersCount < minFollowers) {
      return false;
    }
    
    if (!includeVerified && !account.verified && account.followersCount < minFollowers * 2) {
      return false;
    }

    return true;
  }

  private removeDuplicateAccounts(accounts: TwitterAccount[]): TwitterAccount[] {
    const seen = new Set<string>();
    return accounts.filter(account => {
      if (seen.has(account.id)) {
        return false;
      }
      seen.add(account.id);
      return true;
    });
  }

  private async calculateRelevanceScores(accounts: TwitterAccount[], coinSymbol: string): Promise<void> {
    for (const account of accounts) {
      const relevanceScore = this.calculateAccountRelevance(account, coinSymbol);
      
      await AccountCoinRelevance.findOrCreate({
        where: {
          twitterAccountId: account.id,
          coinSymbol,
        },
        defaults: {
          id: uuidv4(),
          twitterAccountId: account.id,
          coinSymbol,
          relevanceScore,
          mentionCount: 0,
          totalPosts: 0,
          mentionFrequency: 0,
          avgSentiment: 0,
          avgImpact: 0,
          lastMentionAt: new Date(),
          historicalData: [],
          keywordFrequency: {},
          correlationScore: 0,
          isConfirmed: false,
        },
      });
    }
  }

  private calculateAccountRelevance(account: TwitterAccount, coinSymbol: string): number {
    const bio = account.bio.toLowerCase();
    const displayName = account.displayName.toLowerCase();
    
    const coinKeywords = [
      coinSymbol.toLowerCase(),
      `#${coinSymbol.toLowerCase()}`,
      'crypto', 'cryptocurrency', 'bitcoin', 'blockchain', 'defi',
      'trading', 'trader', 'investor', 'analyst'
    ];

    let relevanceScore = 0;
    
    // Check bio and name for keywords
    coinKeywords.forEach(keyword => {
      if (bio.includes(keyword)) relevanceScore += 0.2;
      if (displayName.includes(keyword)) relevanceScore += 0.1;
    });

    // Influence bonus
    relevanceScore += account.influenceScore * 0.3;

    // Verification bonus
    if (account.verified) relevanceScore += 0.2;

    return Math.min(1, relevanceScore);
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

} 