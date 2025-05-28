import axios from 'axios';
import logger from '../utils/logger';
import { TwitterService } from './TwitterService';
import { TwitterAccount } from '../models/TwitterAccount';
import { TwitterPost } from '../models/TwitterPost';
import { AccountCoinRelevance } from '../models/AccountCoinRelevance';
import notificationService from './notificationService';
import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import cron from 'node-cron';
import { Server as SocketIOServer } from 'socket.io';
import { sendSocialSentimentAlert, sendSentimentUpdate, sendAccountMonitoringUpdate } from './socket';

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

export interface SentimentAlert {
  id: string;
  accountId: string;
  accountUsername: string;
  coinSymbol: string;
  postId: string;
  content: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;
  impact: 'low' | 'medium' | 'high';
  impactScore: number;
  alertLevel: 'info' | 'warning' | 'critical';
  triggeredAt: Date;
  isProcessed: boolean;
}

export interface SentimentSummary {
  coinSymbol: string;
  timeframe: string;
  totalPosts: number;
  sentimentDistribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
  avgSentimentScore: number;
  impactDistribution: {
    low: number;
    medium: number;
    high: number;
  };
  avgImpactScore: number;
  topInfluencers: {
    account: TwitterAccount;
    posts: number;
    avgSentiment: number;
    avgImpact: number;
  }[];
  significantPosts: TwitterPost[];
  trendingKeywords: {
    word: string;
    count: number;
    sentiment: number;
  }[];
}

export interface AccountCorrelationData {
  account: TwitterAccount;
  relevance: AccountCoinRelevance;
  historicalCorrelation: {
    date: string;
    priceChange: number;
    sentimentScore: number;
    correlation: number;
  }[];
  recentActivity: TwitterPost[];
  keywordCloud: {
    word: string;
    frequency: number;
    sentiment: number;
  }[];
  predictionAccuracy: number;
}

export class SocialSentimentService {
  private static instance: SocialSentimentService;
  private twitterService: TwitterService;
  private notificationService: typeof notificationService;
  private monitoringAccounts: Map<string, Set<string>> = new Map(); // coinSymbol -> accountIds
  private isMonitoring = false;
  private io: SocketIOServer | null = null;

  constructor() {
    this.twitterService = TwitterService.getInstance();
    this.notificationService = notificationService;
  }

  public static getInstance(): SocialSentimentService {
    if (!SocialSentimentService.instance) {
      SocialSentimentService.instance = new SocialSentimentService();
    }
    return SocialSentimentService.instance;
  }

  /**
   * Set Socket.IO instance for real-time updates
   */
  public setSocketIO(io: SocketIOServer): void {
    this.io = io;
    logger.info('Socket.IO instance set for SocialSentimentService');
  }

  /**
   * Get social metrics for a cryptocurrency
   */
  async getSocialMetrics(symbol: string): Promise<SocialMetrics> {
    try {
      const timeframe = '24h';
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Get posts for the symbol
      const posts = await TwitterPost.findAll({
        where: {
          content: { [Op.like]: `%${symbol}%` },
          publishedAt: { [Op.gte]: startDate },
        },
        include: [{ model: TwitterAccount, as: 'account' }],
        order: [['publishedAt', 'DESC']],
      });

      // Calculate metrics
      const totalPosts = posts.length;
      const totalSentiment = posts.reduce((sum, post) => sum + post.sentimentScore, 0);
      const overallSentiment = totalPosts > 0 ? totalSentiment / totalPosts : 0;
      
      // Determine sentiment trend
      let sentimentTrend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      if (overallSentiment > 0.2) sentimentTrend = 'bullish';
      else if (overallSentiment < -0.2) sentimentTrend = 'bearish';

      // Calculate engagement rate
      const totalEngagement = posts.reduce((sum, post) => 
        sum + post.likeCount + post.retweetCount + post.replyCount, 0
      );
      const engagementRate = totalPosts > 0 ? Math.min(1, totalEngagement / (totalPosts * 100)) : 0;

      // Extract keywords
      const keywords = this.extractTrendingKeywords(posts).slice(0, 10).map(k => k.word);

      const metrics: SocialMetrics = {
        symbol,
        overallSentiment,
        sentimentTrend,
        socialVolume: totalPosts,
        engagementRate,
        sources: [{
          platform: 'twitter',
          symbol,
          sentiment: overallSentiment,
          confidence: Math.min(1, totalPosts / 50), // Higher confidence with more posts
          volume: totalPosts,
          keywords,
          timestamp: new Date()
        }]
      };

      return metrics;
    } catch (error) {
      logger.error(`Failed to get social metrics for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Start monitoring setup and real-time processing
   */
  public startMonitoring(): void {
    if (this.isMonitoring) {
      logger.info('Social sentiment monitoring is already running');
      return;
    }

    this.isMonitoring = true;
    logger.info('Starting social sentiment monitoring...');

    // Monitor every 2 minutes for new posts
    cron.schedule('*/2 * * * *', async () => {
      await this.processRealtimeUpdates();
    });

    // Update relevance scores every hour
    cron.schedule('0 * * * *', async () => {
      await this.updateRelevanceScores();
    });

    // Generate daily sentiment reports
    cron.schedule('0 0 * * *', async () => {
      await this.generateDailySentimentReports();
    });

    logger.info('Social sentiment monitoring started successfully');
  }

  /**
   * Search and add accounts for monitoring a specific coin
   */
  async setupCoinMonitoring(
    coinSymbol: string,
    coinName: string,
    options: {
      autoConfirm?: boolean;
      minRelevanceScore?: number;
      maxAccounts?: number;
    } = {}
  ): Promise<{
    suggestedAccounts: any[];
    confirmedAccounts: any[];
  }> {
    const { autoConfirm = false, minRelevanceScore = 0.5, maxAccounts = 20 } = options;

    try {
      logger.info(`Setting up monitoring for ${coinSymbol} (${coinName})`);

      const searchResult = await this.twitterService.searchAccountsForCoin(
        coinSymbol,
        coinName,
        { limit: maxAccounts * 2, minFollowers: 1000 }
      );

      const suggestedAccounts = searchResult.accounts.slice(0, maxAccounts);
      let confirmedAccounts: any[] = [];

      if (autoConfirm) {
        confirmedAccounts = suggestedAccounts.slice(0, Math.floor(maxAccounts / 2));
        await this.confirmAccountsForMonitoring(coinSymbol, confirmedAccounts.map(a => a.id));
      }

      return {
        suggestedAccounts,
        confirmedAccounts,
      };
    } catch (error) {
      logger.error(`Failed to setup monitoring for ${coinSymbol}:`, error);
      throw error;
    }
  }

  /**
   * Confirm accounts for monitoring
   */
  async confirmAccountsForMonitoring(coinSymbol: string, accountIds: string[]): Promise<void> {
    try {
      if (!this.monitoringAccounts.has(coinSymbol)) {
        this.monitoringAccounts.set(coinSymbol, new Set());
      }
      
      const accountSet = this.monitoringAccounts.get(coinSymbol)!;
      accountIds.forEach(id => accountSet.add(id));

      logger.info(`Confirmed ${accountIds.length} accounts for monitoring ${coinSymbol}`);
    } catch (error) {
      logger.error(`Failed to confirm accounts for monitoring:`, error);
      throw error;
    }
  }

  /**
   * Get real-time sentiment summary for a coin
   */
  async getCoinSentimentSummary(
    coinSymbol: string,
    timeframe: '1h' | '4h' | '24h' | '7d' = '24h'
  ): Promise<SentimentSummary> {
    try {
      const timeframeDuration = this.getTimeframeDuration(timeframe);
      const startDate = new Date(Date.now() - timeframeDuration);

      // Get relevant posts
      const posts = await TwitterPost.findAll({
        where: {
          content: { [Op.like]: `%${coinSymbol}%` },
          publishedAt: { [Op.gte]: startDate },
        },
        include: [{ model: TwitterAccount, as: 'account' }],
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

      // Get top influencers
      const influencerData = await this.getTopInfluencers(coinSymbol, startDate);
      
      // Get significant posts
      const significantPosts = posts
        .filter(post => post.impact === 'high' || Math.abs(post.sentimentScore) > 0.7)
        .slice(0, 10);

      // Generate trending keywords
      const trendingKeywords = this.extractTrendingKeywords(posts);

      return {
        coinSymbol,
        timeframe,
        totalPosts: posts.length,
        sentimentDistribution,
        avgSentimentScore: posts.length > 0 ? totalSentimentScore / posts.length : 0,
        impactDistribution,
        avgImpactScore: posts.length > 0 ? totalImpactScore / posts.length : 0,
        topInfluencers: influencerData,
        significantPosts,
        trendingKeywords,
      };
    } catch (error) {
      logger.error(`Failed to get sentiment summary for ${coinSymbol}:`, error);
      throw error;
    }
  }

  /**
   * Get historical correlation data for accounts
   */
  async getAccountCorrelationData(
    coinSymbol: string,
    days: number = 30
  ): Promise<AccountCorrelationData[]> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Get confirmed accounts
      const relevanceRecords = await AccountCoinRelevance.findAll({
        where: {
          coinSymbol,
          isConfirmed: true,
        },
        include: [{ model: TwitterAccount, as: 'account' }],
        order: [['relevanceScore', 'DESC']],
      });

      const correlationData: AccountCorrelationData[] = [];

      for (const relevance of relevanceRecords) {
        const account = (relevance as any).account as TwitterAccount;
        
        // Get recent activity
        const recentActivity = await TwitterPost.findAll({
          where: {
            twitterAccountId: account.id,
            content: { [Op.like]: `%${coinSymbol}%` },
            publishedAt: { [Op.gte]: startDate },
          },
          order: [['publishedAt', 'DESC']],
          limit: 20,
        });

        // Generate keyword cloud
        const keywordCloud = this.generateKeywordCloud(recentActivity);

        // Calculate historical correlation with price movements
        const historicalCorrelation = await this.calculateHistoricalCorrelation(
          account.id,
          coinSymbol,
          days
        );

        // Calculate prediction accuracy based on historical performance
        const predictionAccuracy = this.calculatePredictionAccuracy(historicalCorrelation);

        correlationData.push({
          account,
          relevance,
          historicalCorrelation,
          recentActivity,
          keywordCloud,
          predictionAccuracy,
        });
      }

      return correlationData.sort((a, b) => b.relevance.correlationScore - a.relevance.correlationScore);
    } catch (error) {
      logger.error(`Failed to get correlation data for ${coinSymbol}:`, error);
      throw error;
    }
  }

  /**
   * Process real-time updates
   */
  private async processRealtimeUpdates(): Promise<void> {
    try {
      for (const [coinSymbol, accountIds] of this.monitoringAccounts.entries()) {
        for (const accountId of accountIds) {
          await this.processAccountUpdates(accountId, coinSymbol);
        }
      }
    } catch (error) {
      logger.error('Failed to process real-time updates:', error);
    }
  }

  private async processAccountUpdates(accountId: string, coinSymbol: string): Promise<void> {
    try {
      // Skip demo accounts - they don't exist in real Twitter API
      if (accountId.startsWith('demo_')) {
        logger.debug(`Skipping demo account ${accountId} for real-time updates`);
        return;
      }

      const newPosts = await this.twitterService.getAccountPosts(accountId, { limit: 5 });
      
      for (const post of newPosts) {
        await this.analyzePostForAlerts(post, coinSymbol);
      }
    } catch (error) {
      logger.error(`Failed to process updates for account ${accountId}:`, error);
    }
  }

  private async analyzePostForAlerts(post: TwitterPost, coinSymbol: string): Promise<void> {
    const shouldAlert = this.shouldTriggerAlert(post, coinSymbol);
    
    if (shouldAlert) {
      const alert: SentimentAlert = {
        id: uuidv4(),
        accountId: post.twitterAccountId,
        accountUsername: '',
        coinSymbol,
        postId: post.id,
        content: post.content,
        sentiment: post.sentiment,
        sentimentScore: post.sentimentScore,
        impact: post.impact,
        impactScore: post.impactScore,
        alertLevel: this.determineAlertLevel(post),
        triggeredAt: new Date(),
        isProcessed: false,
      };

      await this.sendSentimentAlert(alert);
    }
  }

  private shouldTriggerAlert(post: TwitterPost, coinSymbol: string): boolean {
    if (post.impact === 'high') return true;
    if (Math.abs(post.sentimentScore) > 0.8) return true;
    
    const totalEngagement = post.retweetCount + post.likeCount + post.replyCount;
    if (totalEngagement > 1000) return true;

    return false;
  }

  private determineAlertLevel(post: TwitterPost): 'info' | 'warning' | 'critical' {
    if (post.impact === 'high' && Math.abs(post.sentimentScore) > 0.8) {
      return 'critical';
    }
    if (post.impact === 'high' || Math.abs(post.sentimentScore) > 0.6) {
      return 'warning';
    }
    return 'info';
  }

  private async sendSentimentAlert(alert: SentimentAlert): Promise<void> {
    try {
      const account = await TwitterAccount.findByPk(alert.accountId);
      if (!account) return;

      alert.accountUsername = account.username;

      const message = `🚨 ${alert.coinSymbol} Sentiment Alert!\n\n` +
        `@${account.username} posted: "${alert.content.slice(0, 100)}..."\n\n` +
        `Sentiment: ${alert.sentiment} (${alert.sentimentScore.toFixed(2)})\n` +
        `Impact: ${alert.impact} (${alert.impactScore.toFixed(2)})\n` +
        `Level: ${alert.alertLevel.toUpperCase()}`;

      // Send traditional notification
      // Note: This would require user ID and FCM token in a real implementation
      // For now, we'll just log the alert
      logger.info(`Social sentiment alert: ${message}`);

      // Send real-time WebSocket alert
      if (this.io) {
        sendSocialSentimentAlert(this.io, alert.coinSymbol, alert);
      }

      logger.info(`Sent sentiment alert for ${alert.coinSymbol} from @${account.username}`);
    } catch (error) {
      logger.error('Failed to send sentiment alert:', error);
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

  private async getTopInfluencers(coinSymbol: string, startDate: Date): Promise<any[]> {
    // This would typically involve complex queries - simplified for now
    const relevanceRecords = await AccountCoinRelevance.findAll({
      where: {
        coinSymbol,
        isConfirmed: true,
        lastMentionAt: { [Op.gte]: startDate },
      },
      include: [{ model: TwitterAccount, as: 'account' }],
      order: [['relevanceScore', 'DESC']],
      limit: 5,
    });

    return relevanceRecords.map(relevance => ({
      account: (relevance as any).account,
      posts: relevance.mentionCount,
      avgSentiment: relevance.avgSentiment,
      avgImpact: relevance.avgImpact,
    }));
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

  private async updateRelevanceScores(): Promise<void> {
    logger.info('Updating relevance scores...');
    // Implementation for periodic relevance score updates
  }

  private async generateDailySentimentReports(): Promise<void> {
    logger.info('Generating daily sentiment reports...');
    // Implementation for daily reports
  }

  /**
   * Calculate historical correlation between account sentiment and price movements
   */
  private async calculateHistoricalCorrelation(
    accountId: string,
    coinSymbol: string,
    days: number
  ): Promise<{
    date: string;
    priceChange: number;
    sentimentScore: number;
    correlation: number;
  }[]> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      // Get posts from this account for the timeframe
      const posts = await TwitterPost.findAll({
        where: {
          twitterAccountId: accountId,
          relevantCoins: { [Op.contains]: [coinSymbol] },
          publishedAt: { [Op.gte]: startDate },
        },
        order: [['publishedAt', 'ASC']],
      });

      // Group posts by day and calculate daily sentiment
      const dailySentiment: Record<string, { totalSentiment: number; count: number }> = {};
      
      posts.forEach(post => {
        const dateKey = post.publishedAt.toISOString().split('T')[0];
        if (!dailySentiment[dateKey]) {
          dailySentiment[dateKey] = { totalSentiment: 0, count: 0 };
        }
        dailySentiment[dateKey].totalSentiment += post.sentimentScore;
        dailySentiment[dateKey].count++;
      });

      // Fetch real price data from price service
      // Note: This requires integration with real price data sources
      const priceData = await this.getPriceData(coinSymbol, days);
      
      const correlationData = [];
      const dates = Object.keys(dailySentiment).sort();
      
      for (let i = 0; i < dates.length; i++) {
        const date = dates[i];
        const sentiment = dailySentiment[date];
        const avgSentiment = sentiment.totalSentiment / sentiment.count;
        
        // Find corresponding price data for this date
        const pricePoint = priceData.find(p => p.date === date);
        const priceChange = pricePoint ? pricePoint.change : 0;
        
        // Calculate correlation (simplified)
        const correlation = this.calculateCorrelationCoefficient(avgSentiment, priceChange);
        
        correlationData.push({
          date,
          priceChange,
          sentimentScore: avgSentiment,
          correlation,
        });
      }

      return correlationData;
    } catch (error) {
      logger.error(`Failed to calculate historical correlation for account ${accountId}:`, error);
      return [];
    }
  }

  /**
   * Calculate prediction accuracy based on historical correlation data
   */
  private calculatePredictionAccuracy(
    historicalCorrelation: {
      date: string;
      priceChange: number;
      sentimentScore: number;
      correlation: number;
    }[]
  ): number {
    if (historicalCorrelation.length === 0) return 0;

    let correctPredictions = 0;
    let totalPredictions = 0;

    for (const data of historicalCorrelation) {
      // Consider a prediction correct if sentiment direction matches price direction
      const sentimentDirection = data.sentimentScore > 0 ? 'positive' : data.sentimentScore < 0 ? 'negative' : 'neutral';
      const priceDirection = data.priceChange > 0 ? 'positive' : data.priceChange < 0 ? 'negative' : 'neutral';
      
      if (sentimentDirection !== 'neutral' && priceDirection !== 'neutral') {
        totalPredictions++;
        if (sentimentDirection === priceDirection) {
          correctPredictions++;
        }
      }
    }

    return totalPredictions > 0 ? correctPredictions / totalPredictions : 0;
  }

  /**
   * Calculate correlation coefficient between two variables
   */
  private calculateCorrelationCoefficient(x: number, y: number): number {
    // Simplified correlation calculation for single values
    // In real implementation, this would use arrays of values
    const normalizedX = Math.max(-1, Math.min(1, x));
    const normalizedY = Math.max(-1, Math.min(1, y / 10)); // Normalize price change
    
    return normalizedX * normalizedY;
  }

  /**
   * Get price data for correlation analysis
   */
  private async getPriceData(coinSymbol: string, days: number): Promise<{
    date: string;
    price: number;
    change: number;
  }[]> {
    try {
      // Integrate with CoinGecko API for real price data
      const coinIdMap: Record<string, string> = {
        'BTC': 'bitcoin',
        'ETH': 'ethereum',
        'ADA': 'cardano',
        'SOL': 'solana',
        'DOT': 'polkadot',
        'LINK': 'chainlink',
        'MATIC': 'matic-network',
        'AVAX': 'avalanche-2'
      };

      const coinId = coinIdMap[coinSymbol] || coinSymbol.toLowerCase();
      
      const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart`, {
        params: {
          vs_currency: 'usd',
          days: days,
          interval: 'daily'
        }
      });

      const prices = response.data.prices || [];
      const priceData = [];

      for (let i = 1; i < prices.length; i++) {
        const currentPrice = prices[i][1];
        const previousPrice = prices[i - 1][1];
        const change = ((currentPrice - previousPrice) / previousPrice) * 100;
        
        priceData.push({
          date: new Date(prices[i][0]).toISOString().split('T')[0],
          price: currentPrice,
          change: change
        });
      }

      logger.info(`Fetched ${priceData.length} days of price data for ${coinSymbol}`);
      return priceData;
    } catch (error) {
      logger.error(`Failed to fetch price data for ${coinSymbol}:`, error);
      // Return empty array if price data fails - correlation will be skipped
      return [];
    }
  }

  /**
   * Enhanced keyword extraction with sentiment weighting
   */
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

  /**
   * Check if a word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'man', 'men', 'put', 'say', 'she', 'too', 'use'
    ]);
    return stopWords.has(word.toLowerCase());
  }

  /**
   * Generate sentiment trend analysis
   */
  async getSentimentTrend(
    coinSymbol: string,
    timeframe: '1h' | '4h' | '24h' | '7d' = '24h'
  ): Promise<{
    timestamps: string[];
    sentimentScores: number[];
    volumeData: number[];
    trendDirection: 'bullish' | 'bearish' | 'neutral';
    momentum: number;
  }> {
    try {
      const timeframeDuration = this.getTimeframeDuration(timeframe);
      const startDate = new Date(Date.now() - timeframeDuration);
      
      const posts = await TwitterPost.findAll({
        where: {
          content: { [Op.like]: `%${coinSymbol}%` },
          publishedAt: { [Op.gte]: startDate },
        },
        order: [['publishedAt', 'ASC']],
      });

      // Group by time intervals
      const intervals = this.groupPostsByInterval(posts, timeframe);
      const timestamps = Object.keys(intervals).sort();
      const sentimentScores = timestamps.map(ts => {
        const intervalPosts = intervals[ts];
        const avgSentiment = intervalPosts.reduce((sum, post) => sum + post.sentimentScore, 0) / intervalPosts.length;
        return avgSentiment || 0;
      });
      const volumeData = timestamps.map(ts => intervals[ts].length);

      // Calculate trend direction and momentum
      const recentSentiment = sentimentScores.slice(-3).reduce((sum, score) => sum + score, 0) / 3;
      const earlierSentiment = sentimentScores.slice(0, 3).reduce((sum, score) => sum + score, 0) / 3;
      const momentum = recentSentiment - earlierSentiment;
      
      const trendDirection = momentum > 0.1 ? 'bullish' : momentum < -0.1 ? 'bearish' : 'neutral';

      return {
        timestamps,
        sentimentScores,
        volumeData,
        trendDirection,
        momentum,
      };
    } catch (error) {
      logger.error(`Failed to get sentiment trend for ${coinSymbol}:`, error);
      throw error;
    }
  }

  /**
   * Group posts by time intervals
   */
  private groupPostsByInterval(posts: TwitterPost[], timeframe: string): Record<string, TwitterPost[]> {
    const intervals: Record<string, TwitterPost[]> = {};
    const intervalSize = this.getIntervalSize(timeframe);
    
    posts.forEach(post => {
      const timestamp = Math.floor(post.publishedAt.getTime() / intervalSize) * intervalSize;
      const key = new Date(timestamp).toISOString();
      
      if (!intervals[key]) {
        intervals[key] = [];
      }
      intervals[key].push(post);
    });
    
    return intervals;
  }

  /**
   * Get interval size in milliseconds
   */
  private getIntervalSize(timeframe: string): number {
    switch (timeframe) {
      case '1h': return 5 * 60 * 1000; // 5-minute intervals
      case '4h': return 15 * 60 * 1000; // 15-minute intervals
      case '24h': return 60 * 60 * 1000; // 1-hour intervals
      case '7d': return 6 * 60 * 60 * 1000; // 6-hour intervals
      default: return 60 * 60 * 1000;
    }
  }
}

export default SocialSentimentService;
export { SentimentData, SocialMetrics }; 