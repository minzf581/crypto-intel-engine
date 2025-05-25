import { NewsData } from '../models/NewsData';
import logger from '../utils/logger';
import axios from 'axios';
import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import Parser from 'rss-parser';

export class NewsAnalysisService {
  private static instance: NewsAnalysisService;
  private rssParser = new Parser();
  private newsApiKey = process.env.NEWS_API_KEY;

  public static getInstance(): NewsAnalysisService {
    if (!NewsAnalysisService.instance) {
      NewsAnalysisService.instance = new NewsAnalysisService();
    }
    return NewsAnalysisService.instance;
  }

  /**
   * Fetch and analyze crypto news from multiple sources
   */
  async fetchAndAnalyzeNews(): Promise<NewsData[]> {
    try {
      const newsItems = [];
      
      // Fetch from News API if available
      if (this.newsApiKey && this.newsApiKey.trim() !== '') {
        logger.info('Fetching news from NewsAPI...');
        const newsApiData = await this.fetchFromNewsAPI();
        newsItems.push(...newsApiData);
      } else {
        logger.info('NewsAPI key not configured, skipping NewsAPI source');
      }

      // Fetch from RSS feeds
      logger.info('Fetching news from RSS feeds...');
      const rssData = await this.fetchFromRSSFeeds();
      newsItems.push(...rssData);

      // Fetch from CoinDesk
      logger.info('Fetching news from CoinDesk...');
      const coinDeskData = await this.fetchFromCoinDesk();
      newsItems.push(...coinDeskData);

      // Analyze sentiment and save to database
      const analyzedNews = [];
      for (const item of newsItems) {
        const analysis = await this.analyzeNewsItem(item);
        if (analysis) {
          analyzedNews.push(analysis);
        }
      }

      logger.info(`Fetched and analyzed ${analyzedNews.length} news items from ${newsItems.length} raw items`);
      return analyzedNews;
    } catch (error) {
      logger.error('Failed to fetch and analyze news:', error);
      return [];
    }
  }

  /**
   * Get recent news with filtering options
   */
  async getRecentNews(
    limit: number = 20,
    sentiment?: string,
    impact?: string,
    coin?: string
  ): Promise<NewsData[]> {
    const whereClause: any = {};
    
    if (sentiment) whereClause.sentiment = sentiment;
    if (impact) whereClause.impact = impact;
    if (coin) {
      whereClause.relevantCoins = {
        [Op.contains]: [coin],
      };
    }

    return await NewsData.findAll({
      where: whereClause,
      order: [['publishedAt', 'DESC']],
      limit,
    });
  }

  /**
   * Get news summary for a specific timeframe
   */
  async getNewsSummary(hours: number = 24): Promise<{
    total: number;
    bysentiment: Record<string, number>;
    byImpact: Record<string, number>;
    topCoins: Record<string, number>;
    highImpactNews: NewsData[];
  }> {
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const recentNews = await NewsData.findAll({
      where: {
        publishedAt: {
          [Op.gte]: startDate,
        },
      },
    });

    const bysentiment = { positive: 0, negative: 0, neutral: 0 };
    const byImpact = { low: 0, medium: 0, high: 0 };
    const coinMentions: Record<string, number> = {};

    recentNews.forEach(news => {
      bysentiment[news.sentiment]++;
      byImpact[news.impact]++;
      
      news.relevantCoins.forEach(coin => {
        coinMentions[coin] = (coinMentions[coin] || 0) + 1;
      });
    });

    const topCoins = Object.entries(coinMentions)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .reduce((obj, [coin, count]) => ({ ...obj, [coin]: count }), {});

    const highImpactNews = recentNews
      .filter(news => news.impact === 'high')
      .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
      .slice(0, 5);

    return {
      total: recentNews.length,
      bysentiment,
      byImpact,
      topCoins,
      highImpactNews,
    };
  }

  /**
   * Analyze sentiment trends for specific coins
   */
  async analyzeSentimentTrends(
    coins: string[],
    days: number = 7
  ): Promise<Record<string, any[]>> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const trends: Record<string, any[]> = {};

    for (const coin of coins) {
      const newsItems = await NewsData.findAll({
        where: {
          relevantCoins: {
            [Op.contains]: [coin],
          },
          publishedAt: {
            [Op.gte]: startDate,
          },
        },
        order: [['publishedAt', 'ASC']],
      });

      // Group by day and calculate sentiment scores
      const dailyTrends = this.groupNewsByDay(newsItems);
      trends[coin] = dailyTrends;
    }

    return trends;
  }

  /**
   * Get news impact analysis for portfolio
   */
  async getPortfolioNewsImpact(
    symbols: string[]
  ): Promise<Record<string, {
    newsCount: number;
    sentimentScore: number;
    impactLevel: 'low' | 'medium' | 'high';
    recentNews: NewsData[];
  }>> {
    const analysis: Record<string, any> = {};

    for (const symbol of symbols) {
      const recentNews = await NewsData.findAll({
        where: {
          relevantCoins: {
            [Op.contains]: [symbol],
          },
          publishedAt: {
            [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
        order: [['publishedAt', 'DESC']],
        limit: 10,
      });

      const sentimentScore = this.calculateSentimentScore(recentNews);
      const impactLevel = this.determineImpactLevel(recentNews);

      analysis[symbol] = {
        newsCount: recentNews.length,
        sentimentScore,
        impactLevel,
        recentNews: recentNews.slice(0, 3),
      };
    }

    return analysis;
  }

  /**
   * Private methods
   */
  private async fetchFromNewsAPI(): Promise<any[]> {
    try {
      const response = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          q: 'cryptocurrency OR bitcoin OR ethereum OR crypto',
          sortBy: 'publishedAt',
          pageSize: 50,
          language: 'en',
          apiKey: this.newsApiKey,
        },
        timeout: 10000,
      });

      return response.data.articles.map((article: any) => ({
        title: article.title,
        description: article.description || '',
        url: article.url,
        source: article.source.name,
        publishedAt: new Date(article.publishedAt),
        category: 'general',
      }));
    } catch (error) {
      logger.error('Failed to fetch from News API:', error);
      return [];
    }
  }

  private async fetchFromRSSFeeds(): Promise<any[]> {
    const rssFeeds = [
      'https://cointelegraph.com/rss',
      'https://coindesk.com/arc/outboundfeeds/rss/',
      'https://decrypt.co/feed',
      'https://www.coinbureau.com/feed/',
    ];

    const newsItems = [];
    
    for (const feedUrl of rssFeeds) {
      try {
        const feed = await this.rssParser.parseURL(feedUrl);
        const source = feed.title || 'Unknown';
        
        const items = feed.items.slice(0, 10).map(item => ({
          title: item.title || '',
          description: item.contentSnippet || item.content || '',
          url: item.link || '',
          source,
          publishedAt: new Date(item.pubDate || Date.now()),
          category: 'crypto',
        }));

        newsItems.push(...items);
      } catch (error) {
        logger.warn(`Failed to fetch RSS feed ${feedUrl}:`, error);
      }
    }

    return newsItems;
  }

  private async fetchFromCoinDesk(): Promise<any[]> {
    try {
      // CoinDesk doesn't have a public API, but we can parse their RSS
      const feed = await this.rssParser.parseURL('https://coindesk.com/arc/outboundfeeds/rss/');
      
      return feed.items.slice(0, 15).map(item => ({
        title: item.title || '',
        description: item.contentSnippet || '',
        url: item.link || '',
        source: 'CoinDesk',
        publishedAt: new Date(item.pubDate || Date.now()),
        category: 'crypto',
      }));
    } catch (error) {
      logger.error('Failed to fetch from CoinDesk:', error);
      return [];
    }
  }

  private async analyzeNewsItem(item: any): Promise<NewsData | null> {
    try {
      // Check if news item already exists
      const existing = await NewsData.findOne({
        where: { url: item.url },
      });

      if (existing) {
        return existing;
      }

      // Analyze sentiment
      const sentiment = this.analyzeSentiment(item.title, item.description);
      
      // Extract relevant coins
      const relevantCoins = this.extractRelevantCoins(item.title, item.description);
      
      // Determine impact
      const impact = this.determineImpact(item.title, item.description, relevantCoins);

      const newsData = await NewsData.create({
        id: uuidv4(),
        title: item.title,
        description: item.description,
        url: item.url,
        source: item.source,
        publishedAt: item.publishedAt,
        sentiment,
        relevantCoins,
        impact,
        category: item.category,
      });

      return newsData;
    } catch (error) {
      logger.error('Failed to analyze news item:', error);
      return null;
    }
  }

  private analyzeSentiment(title: string, description: string): 'positive' | 'negative' | 'neutral' {
    const text = `${title} ${description}`.toLowerCase();
    
    const positiveWords = [
      'bull', 'bullish', 'surge', 'pump', 'moon', 'rally', 'breakout',
      'adoption', 'growth', 'institutional', 'investment', 'profit',
      'gain', 'rise', 'increase', 'breakthrough', 'milestone', 'success'
    ];
    
    const negativeWords = [
      'bear', 'bearish', 'crash', 'dump', 'plunge', 'drop', 'fall',
      'regulation', 'ban', 'hack', 'scam', 'fraud', 'loss', 'decline',
      'correction', 'selloff', 'liquidation', 'fear', 'panic', 'risk'
    ];

    let positiveScore = 0;
    let negativeScore = 0;

    positiveWords.forEach(word => {
      const matches = (text.match(new RegExp(word, 'g')) || []).length;
      positiveScore += matches;
    });

    negativeWords.forEach(word => {
      const matches = (text.match(new RegExp(word, 'g')) || []).length;
      negativeScore += matches;
    });

    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    return 'neutral';
  }

  private extractRelevantCoins(title: string, description: string): string[] {
    const text = `${title} ${description}`.toLowerCase();
    const coins: string[] = [];
    
    const coinPatterns = [
      { pattern: /bitcoin|btc/g, symbol: 'BTC' },
      { pattern: /ethereum|eth/g, symbol: 'ETH' },
      { pattern: /cardano|ada/g, symbol: 'ADA' },
      { pattern: /solana|sol/g, symbol: 'SOL' },
      { pattern: /dogecoin|doge/g, symbol: 'DOGE' },
      { pattern: /polkadot|dot/g, symbol: 'DOT' },
      { pattern: /chainlink|link/g, symbol: 'LINK' },
      { pattern: /polygon|matic/g, symbol: 'MATIC' },
      { pattern: /avalanche|avax/g, symbol: 'AVAX' },
      { pattern: /binance coin|bnb/g, symbol: 'BNB' },
    ];

    coinPatterns.forEach(({ pattern, symbol }) => {
      if (pattern.test(text)) {
        coins.push(symbol);
      }
    });

    return [...new Set(coins)]; // Remove duplicates
  }

  private determineImpact(title: string, description: string, relevantCoins: string[]): 'low' | 'medium' | 'high' {
    const text = `${title} ${description}`.toLowerCase();
    
    const highImpactKeywords = [
      'regulation', 'sec', 'government', 'federal', 'institutional',
      'etf', 'approval', 'ban', 'lawsuit', 'hack', 'exchange',
      'mainstream', 'adoption', 'partnership', 'integration'
    ];

    const mediumImpactKeywords = [
      'price', 'market', 'trading', 'volume', 'analysis',
      'technical', 'support', 'resistance', 'trend'
    ];

    let impactScore = 0;
    
    highImpactKeywords.forEach(keyword => {
      if (text.includes(keyword)) impactScore += 3;
    });

    mediumImpactKeywords.forEach(keyword => {
      if (text.includes(keyword)) impactScore += 1;
    });

    // Major coins get higher impact
    if (relevantCoins.includes('BTC') || relevantCoins.includes('ETH')) {
      impactScore += 2;
    }

    if (impactScore >= 6) return 'high';
    if (impactScore >= 3) return 'medium';
    return 'low';
  }

  private groupNewsByDay(newsItems: NewsData[]): any[] {
    const dailyData: Record<string, any> = {};

    newsItems.forEach(news => {
      const day = news.publishedAt.toISOString().split('T')[0];
      
      if (!dailyData[day]) {
        dailyData[day] = {
          date: day,
          count: 0,
          positive: 0,
          negative: 0,
          neutral: 0,
          sentimentScore: 0,
        };
      }

      dailyData[day].count++;
      dailyData[day][news.sentiment]++;
    });

    // Calculate sentiment scores for each day
    Object.values(dailyData).forEach((day: any) => {
      day.sentimentScore = (day.positive - day.negative) / day.count;
    });

    return Object.values(dailyData).sort((a: any, b: any) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  private calculateSentimentScore(newsItems: NewsData[]): number {
    if (newsItems.length === 0) return 0;

    const scores = newsItems.map(news => {
      switch (news.sentiment) {
        case 'positive': return 1;
        case 'negative': return -1;
        default: return 0;
      }
    });

    return scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length;
  }

  private determineImpactLevel(newsItems: NewsData[]): 'low' | 'medium' | 'high' {
    const impacts = newsItems.map(news => news.impact);
    
    if (impacts.includes('high')) return 'high';
    if (impacts.includes('medium')) return 'medium';
    return 'low';
  }
} 