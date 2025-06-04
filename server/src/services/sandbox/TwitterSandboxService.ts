/**
 * Twitter Sandbox Service - Development Only
 * Generates realistic mock Twitter data for development and testing
 * 
 * ⚠️ WARNING: This is for DEVELOPMENT purposes only
 * Production environments must use real Twitter API data
 */

import { TwitterSearchResult } from '../TwitterService';
import logger from '../../utils/logger';

export interface MockTweet {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  public_metrics: {
    retweet_count: number;
    like_count: number;
    reply_count: number;
    quote_count: number;
  };
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export interface MockTwitterUser {
  id: string;
  username: string;
  name: string;
  description: string;
  verified: boolean;
  public_metrics: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
  profile_image_url?: string;
  created_at: string;
}

// Interface for internal use that matches the expected return format
interface TwitterAccountForResult {
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
}

class TwitterSandboxService {
  private static instance: TwitterSandboxService;
  
  public static getInstance(): TwitterSandboxService {
    if (!TwitterSandboxService.instance) {
      TwitterSandboxService.instance = new TwitterSandboxService();
    }
    return TwitterSandboxService.instance;
  }

  /**
   * Generate mock Twitter accounts for a cryptocurrency
   */
  generateMockAccountsForCoin(
    coinSymbol: string,
    coinName: string,
    options: {
      limit?: number;
      minFollowers?: number;
      includeVerified?: boolean;
    } = {}
  ): TwitterSearchResult {
    const { limit = 50, minFollowers = 1000, includeVerified = true } = options;
    
    logger.info(`[SANDBOX] Generating mock Twitter accounts for ${coinSymbol} (${coinName})`, {
      limit,
      minFollowers,
      includeVerified
    });

    const mockAccounts = this.generateCryptoInfluencers(coinSymbol, coinName, limit);
    
    // Filter accounts based on criteria
    const filteredAccounts = mockAccounts.filter(account => {
      const meetsFollowerThreshold = account.followersCount >= minFollowers;
      const meetsVerificationCriteria = includeVerified || !account.verified;
      return meetsFollowerThreshold && meetsVerificationCriteria;
    });

    return {
      accounts: filteredAccounts.slice(0, limit),
      totalCount: filteredAccounts.length,
      hasMore: filteredAccounts.length > limit,
      query: `${coinSymbol} ${coinName}`,
      searchMethod: 'Sandbox Mock Data (Development Only)'
    };
  }

  /**
   * Generate mock Twitter accounts with custom query
   */
  generateMockAccountsWithQuery(
    query: string,
    options: {
      limit?: number;
      minFollowers?: number;
      includeVerified?: boolean;
    } = {}
  ): TwitterSearchResult {
    const { limit = 50, minFollowers = 1000, includeVerified = true } = options;
    
    logger.info(`[SANDBOX] Generating mock Twitter accounts for query "${query}"`, {
      limit,
      minFollowers,
      includeVerified
    });

    // Extract potential coin symbols from query
    const queryWords = query.toLowerCase().split(/\s+/);
    const cryptoKeywords = ['bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'blockchain', 'defi', 'nft'];
    const relevantKeywords = queryWords.filter(word => 
      cryptoKeywords.some(keyword => word.includes(keyword) || keyword.includes(word))
    );

    const coinSymbol = relevantKeywords[0] || query.split(' ')[0] || 'CRYPTO';
    const mockAccounts = this.generateGenericCryptoAccounts(coinSymbol, limit);
    
    // Filter accounts based on criteria
    const filteredAccounts = mockAccounts.filter(account => {
      const meetsFollowerThreshold = account.followersCount >= minFollowers;
      const meetsVerificationCriteria = includeVerified || !account.verified;
      return meetsFollowerThreshold && meetsVerificationCriteria;
    });

    return {
      accounts: filteredAccounts.slice(0, limit),
      totalCount: filteredAccounts.length,
      hasMore: filteredAccounts.length > limit,
      query,
      searchMethod: 'Sandbox Mock Data (Development Only)'
    };
  }

  /**
   * Generate mock tweets for testing
   */
  generateMockTweets(query: string, count: number = 20): MockTweet[] {
    const tweets: MockTweet[] = [];
    const sentiments: Array<'positive' | 'negative' | 'neutral'> = ['positive', 'negative', 'neutral'];
    
    for (let i = 0; i < count; i++) {
      const tweetId = `mock_tweet_${Date.now()}_${i}`;
      const authorId = `mock_user_${Math.floor(Math.random() * 1000)}`;
      const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
      
      tweets.push({
        id: tweetId,
        text: this.generateMockTweetText(query, sentiment),
        author_id: authorId,
        created_at: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        public_metrics: {
          retweet_count: Math.floor(Math.random() * 100),
          like_count: Math.floor(Math.random() * 500),
          reply_count: Math.floor(Math.random() * 50),
          quote_count: Math.floor(Math.random() * 20)
        },
        sentiment
      });
    }
    
    return tweets;
  }

  /**
   * Generate mock posts for a specific account
   */
  generateMockPostsForAccount(
    accountId: string,
    username: string,
    coinSymbol: string,
    count: number = 20
  ): any[] {
    const posts: any[] = [];
    const sentiments: Array<'positive' | 'negative' | 'neutral'> = ['positive', 'negative', 'neutral'];
    const impacts: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
    
    logger.info(`[SANDBOX] Generating ${count} mock posts for account ${username} (${accountId})`);
    
    for (let i = 0; i < count; i++) {
      const postId = `mock_post_${accountId}_${Date.now()}_${i}`;
      const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
      const impact = impacts[Math.floor(Math.random() * impacts.length)];
      const sentimentScore = this.generateSentimentScore(sentiment);
      const impactScore = this.generateImpactScore(impact);
      
      // Generate realistic engagement metrics
      const baseEngagement = Math.floor(Math.random() * 1000) + 50;
      const likeCount = Math.floor(baseEngagement * (0.7 + Math.random() * 0.6));
      const retweetCount = Math.floor(baseEngagement * (0.1 + Math.random() * 0.3));
      const replyCount = Math.floor(baseEngagement * (0.05 + Math.random() * 0.15));
      
      posts.push({
        id: postId,
        content: this.generateMockTweetText(coinSymbol, sentiment),
        publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(), // Within last 7 days
        sentimentScore,
        sentiment,
        impact,
        impactScore,
        likeCount,
        retweetCount,
        replyCount,
        viewCount: Math.floor(baseEngagement * (5 + Math.random() * 10)), // 5-15x engagement
        account: {
          id: accountId,
          username,
          displayName: this.capitalizeWords(username.replace(/_/g, ' ')),
          verified: Math.random() > 0.7, // 30% chance of being verified
          followersCount: Math.floor(Math.random() * 100000) + 5000,
          profileImageUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${username}`
        }
      });
    }
    
    // Sort by publishedAt (newest first)
    posts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    
    return posts;
  }

  /**
   * Generate sentiment score based on sentiment label
   */
  private generateSentimentScore(sentiment: 'positive' | 'negative' | 'neutral'): number {
    switch (sentiment) {
      case 'positive':
        return Math.random() * 0.8 + 0.2; // 0.2 to 1.0
      case 'negative':
        return -(Math.random() * 0.8 + 0.2); // -1.0 to -0.2
      case 'neutral':
      default:
        return (Math.random() - 0.5) * 0.4; // -0.2 to 0.2
    }
  }

  /**
   * Generate impact score based on impact level
   */
  private generateImpactScore(impact: 'low' | 'medium' | 'high'): number {
    switch (impact) {
      case 'high':
        return Math.random() * 0.3 + 0.7; // 0.7 to 1.0
      case 'medium':
        return Math.random() * 0.4 + 0.3; // 0.3 to 0.7
      case 'low':
      default:
        return Math.random() * 0.3; // 0.0 to 0.3
    }
  }

  /**
   * Generate crypto influencer accounts
   */
  private generateCryptoInfluencers(coinSymbol: string, coinName: string, count: number): TwitterAccountForResult[] {
    const influencerTemplates = [
      {
        usernamePattern: (coin: string) => `${coin.toLowerCase()}_analyst`,
        namePattern: (coin: string) => `${coin} Market Analyst`,
        descriptionPattern: (coin: string) => `Professional ${coin} trader and market analyst. Sharing insights on ${coin} price movements and market trends. Not financial advice.`,
        followers: () => Math.floor(Math.random() * 50000) + 10000,
        verified: true
      },
      {
        usernamePattern: (coin: string) => `crypto_${coin.toLowerCase()}_news`,
        namePattern: (coin: string) => `${coin} News & Updates`,
        descriptionPattern: (coin: string) => `Latest news and updates about ${coin} ecosystem. Official announcements, partnerships, and developments.`,
        followers: () => Math.floor(Math.random() * 100000) + 25000,
        verified: true
      },
      {
        usernamePattern: (coin: string) => `${coin.toLowerCase()}_community`,
        namePattern: (coin: string) => `${coin} Community`,
        descriptionPattern: (coin: string) => `Community-driven ${coin} discussions. Share your ${coin} insights and connect with other holders.`,
        followers: () => Math.floor(Math.random() * 30000) + 5000,
        verified: false
      },
      {
        usernamePattern: (coin: string) => `${coin.toLowerCase()}_whale_watch`,
        namePattern: (coin: string) => `${coin} Whale Tracker`,
        descriptionPattern: (coin: string) => `Tracking large ${coin} transactions and whale movements. On-chain analysis and insights.`,
        followers: () => Math.floor(Math.random() * 75000) + 15000,
        verified: false
      },
      {
        usernamePattern: (coin: string) => `daily_${coin.toLowerCase()}`,
        namePattern: (coin: string) => `Daily ${coin} Updates`,
        descriptionPattern: (coin: string) => `Daily ${coin} price analysis, technical indicators, and market sentiment. Charts and predictions.`,
        followers: () => Math.floor(Math.random() * 40000) + 8000,
        verified: false
      }
    ];

    const accounts: TwitterAccountForResult[] = [];
    
    for (let i = 0; i < Math.min(count, influencerTemplates.length * 3); i++) {
      const template = influencerTemplates[i % influencerTemplates.length];
      const variation = Math.floor(i / influencerTemplates.length) + 1;
      
      const username = variation > 1 
        ? `${template.usernamePattern(coinSymbol)}_${variation}`
        : template.usernamePattern(coinSymbol);
      
      const followersCount = template.followers();
      const followingCount = Math.floor(Math.random() * 1000) + 100;
      const tweetsCount = Math.floor(Math.random() * 10000) + 1000;
      
      accounts.push({
        id: `mock_${username}_${Date.now()}_${i}`,
        username,
        displayName: template.namePattern(coinName),
        bio: template.descriptionPattern(coinName),
        verified: template.verified,
        followersCount,
        followingCount,
        tweetsCount,
        profileImageUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${username}`,
        isInfluencer: followersCount > 10000,
        influenceScore: this.calculateMockInfluenceScore(followersCount, tweetsCount, template.verified),
        relevanceScore: Math.random() * 100,
        mentionCount: Math.floor(Math.random() * 20) + 1,
        avgSentiment: (Math.random() - 0.5) * 2 // -1 to 1
      });
    }
    
    return accounts;
  }

  /**
   * Generate generic crypto accounts
   */
  private generateGenericCryptoAccounts(keyword: string, count: number): TwitterAccountForResult[] {
    const genericTemplates = [
      'crypto_trader_pro',
      'blockchain_expert',
      'defi_enthusiast',
      'nft_collector',
      'crypto_news_daily',
      'market_analysis_hub',
      'crypto_investment_tips',
      'blockchain_developer',
      'crypto_community_leader',
      'digital_asset_tracker'
    ];

    const accounts: TwitterAccountForResult[] = [];
    
    for (let i = 0; i < count; i++) {
      const baseUsername = genericTemplates[i % genericTemplates.length];
      const username = `${baseUsername}_${Math.floor(Math.random() * 1000)}`;
      const followersCount = Math.floor(Math.random() * 20000) + 1000;
      const followingCount = Math.floor(Math.random() * 2000) + 100;
      const tweetsCount = Math.floor(Math.random() * 5000) + 500;
      const verified = Math.random() > 0.7;
      
      accounts.push({
        id: `mock_${username}_${Date.now()}_${i}`,
        username,
        displayName: this.capitalizeWords(username.replace(/_/g, ' ')),
        bio: `Passionate about ${keyword} and cryptocurrency. Sharing insights and analysis. Follow for updates!`,
        verified,
        followersCount,
        followingCount,
        tweetsCount,
        profileImageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        isInfluencer: followersCount > 10000,
        influenceScore: this.calculateMockInfluenceScore(followersCount, tweetsCount, verified),
        relevanceScore: Math.random() * 100,
        mentionCount: Math.floor(Math.random() * 15) + 1,
        avgSentiment: (Math.random() - 0.5) * 2 // -1 to 1
      });
    }
    
    return accounts;
  }

  /**
   * Calculate mock influence score
   */
  private calculateMockInfluenceScore(followers: number, tweets: number, verified: boolean): number {
    let score = 0;
    
    // Follower contribution (max 60 points)
    score += Math.min(60, (followers / 1000) * 0.8);
    
    // Tweet activity contribution (max 20 points)
    score += Math.min(20, (tweets / 1000) * 2);
    
    // Verification bonus (10 points)
    if (verified) score += 10;
    
    // Engagement rate simulation (max 10 points)
    score += Math.random() * 10;
    
    return Math.round(Math.min(100, score));
  }

  /**
   * Generate mock tweet text
   */
  private generateMockTweetText(query: string, sentiment: 'positive' | 'negative' | 'neutral'): string {
    const positiveTemplates = [
      `${query} is showing strong momentum! Great time to be in the market 🚀`,
      `Bullish on ${query}! The fundamentals are looking solid 📈`,
      `${query} breaking resistance levels. This could be the start of something big! 💪`,
      `Just accumulated more ${query}. Long term outlook is very promising 🔥`,
      `${query} adoption is increasing rapidly. Exciting times ahead! 🌟`
    ];

    const negativeTemplates = [
      `${query} facing some headwinds today. Time to reassess positions 📉`,
      `Concerned about ${query} recent price action. Market sentiment shifting 😬`,
      `${query} might need more time to find support. Patience required ⏳`,
      `Regulatory concerns affecting ${query}. Keeping a close eye on developments 👀`,
      `${query} volatility is high today. Risk management is key 🛡️`
    ];

    const neutralTemplates = [
      `${query} consolidating at current levels. Waiting for next move 🤔`,
      `${query} market analysis: Mixed signals from technical indicators 📊`,
      `${query} update: Volume is average, price action sideways 📈📉`,
      `Monitoring ${query} closely. Key levels to watch in next session 👁️`,
      `${query} showing typical market behavior. No major surprises today 📱`
    ];

    let templates: string[];
    switch (sentiment) {
      case 'positive':
        templates = positiveTemplates;
        break;
      case 'negative':
        templates = negativeTemplates;
        break;
      default:
        templates = neutralTemplates;
    }

    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Utility function to capitalize words
   */
  private capitalizeWords(str: string): string {
    return str.replace(/\b\w/g, char => char.toUpperCase());
  }
}

export default TwitterSandboxService; 