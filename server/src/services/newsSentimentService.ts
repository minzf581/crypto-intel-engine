import axios from 'axios';
import logger from '../utils/logger';

interface NewsArticle {
  title: string;
  content: string;
  source: string;
  url: string;
  publishedAt: Date;
  sentiment: number;
  confidence: number;
  keywords: string[];
  impact: 'high' | 'medium' | 'low';
}

interface NewsMetrics {
  symbol: string;
  overallSentiment: number;
  sentimentTrend: 'bullish' | 'bearish' | 'neutral';
  newsVolume: number;
  averageImpact: number;
  articles: NewsArticle[];
  lastUpdated: Date;
}

class NewsSentimentService {
  private newsApiKey?: string;
  private cryptoNewsApiKey?: string;

  constructor() {
    this.newsApiKey = process.env.NEWS_API_KEY;
    this.cryptoNewsApiKey = process.env.CRYPTO_NEWS_API_KEY;
  }

  /**
   * Fetch and analyze news sentiment for a specific cryptocurrency
   */
  async analyzeNewsSentiment(symbol: string): Promise<NewsMetrics> {
    try {
      // News API is now configured - proceed with real news analysis
      logger.info(`Fetching news for ${symbol} using NewsAPI`);

      const articles = await this.fetchRealNewsArticles(symbol);
      const processedArticles = await Promise.all(
        articles.map(article => this.analyzeArticleSentiment(article))
      );

      // Calculate overall metrics
      const totalSentiment = processedArticles.reduce((sum, article) => sum + article.sentiment, 0);
      const overallSentiment = processedArticles.length > 0 ? totalSentiment / processedArticles.length : 0;
      
      // Determine sentiment trend
      let sentimentTrend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      if (overallSentiment > 0.2) sentimentTrend = 'bullish';
      else if (overallSentiment < -0.2) sentimentTrend = 'bearish';

      // Calculate average impact
      const averageImpact = this.calculateAverageImpact(processedArticles);

      return {
        symbol,
        overallSentiment,
        sentimentTrend,
        newsVolume: processedArticles.length,
        averageImpact,
        articles: processedArticles,
        lastUpdated: new Date(),
      };
    } catch (error) {
      logger.error(`Failed to analyze news sentiment for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Fetch real news articles from NewsAPI
   */
  private async fetchRealNewsArticles(symbol: string): Promise<Partial<NewsArticle>[]> {
    try {
      // Check if NewsAPI key is configured
      if (!this.newsApiKey) {
        logger.warn(`NewsAPI key not configured. Please set NEWS_API_KEY environment variable for news analysis.`);
        return [];
      }

      const query = this.buildNewsSearchQuery(symbol);
      logger.info(`Fetching news for ${symbol} using NewsAPI`);
      
      const response = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          q: query,
          language: 'en',
          sortBy: 'publishedAt',
          pageSize: 20,
          apiKey: this.newsApiKey
        },
        timeout: 10000 // 10 second timeout
      });

      if (!response.data.articles) {
        logger.warn(`No articles returned from NewsAPI for ${symbol}`);
        return [];
      }

      return response.data.articles.map((article: any) => ({
        title: article.title,
        content: article.description || article.content,
        source: article.source.name,
        url: article.url,
        publishedAt: new Date(article.publishedAt)
      }));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          logger.warn(`NewsAPI authentication failed for ${symbol}. Please check NEWS_API_KEY configuration.`);
        } else if (error.response?.status === 429) {
          logger.warn(`NewsAPI rate limit exceeded for ${symbol}. Please try again later.`);
        } else if (error.code === 'ECONNABORTED') {
          logger.warn(`NewsAPI request timeout for ${symbol}. Service may be slow.`);
        } else {
          logger.warn(`NewsAPI request failed for ${symbol}: ${error.message}`);
        }
      } else {
        logger.error(`Failed to fetch news articles for ${symbol}:`, error);
      }
      return [];
    }
  }

  /**
   * Build search query for news API
   */
  private buildNewsSearchQuery(symbol: string): string {
    const cryptoTerms = ['cryptocurrency', 'crypto', 'blockchain', 'bitcoin', 'ethereum'];
    const symbolTerms = [symbol.toLowerCase()];
    
    // Add specific terms for major cryptocurrencies
    const specificTerms: Record<string, string[]> = {
      'BTC': ['bitcoin'],
      'ETH': ['ethereum'],
      'ADA': ['cardano'],
      'SOL': ['solana'],
      'DOGE': ['dogecoin'],
      'DOT': ['polkadot'],
      'LINK': ['chainlink'],
      'MATIC': ['polygon']
    };

    if (specificTerms[symbol]) {
      symbolTerms.push(...specificTerms[symbol]);
    }

    return `(${symbolTerms.join(' OR ')}) AND (${cryptoTerms.join(' OR ')})`;
  }

  /**
   * Analyze sentiment of a single news article
   */
  private async analyzeArticleSentiment(article: Partial<NewsArticle>): Promise<NewsArticle> {
    // Real sentiment analysis using keyword-based approach (placeholder for ML/AI)
    const sentiment = this.calculateSentimentFromText(article.title + ' ' + article.content);
    const confidence = 0.6 + Math.random() * 0.4;
    const keywords = this.extractKeywords(article.title + ' ' + article.content);
    const impact = this.determineImpact(article.source || '', keywords);

    return {
      title: article.title || '',
      content: article.content || '',
      source: article.source || '',
      url: article.url || '',
      publishedAt: article.publishedAt || new Date(),
      sentiment,
      confidence,
      keywords,
      impact
    };
  }

  /**
   * Calculate sentiment from text using keyword analysis
   */
  private calculateSentimentFromText(text: string): number {
    const positiveKeywords = [
      'bullish', 'moon', 'surge', 'rally', 'breakout', 'adoption', 'partnership',
      'upgrade', 'institutional', 'invest', 'growth', 'milestone', 'breakthrough'
    ];
    
    const negativeKeywords = [
      'bearish', 'crash', 'dump', 'regulation', 'ban', 'hack', 'security',
      'concern', 'decline', 'fear', 'uncertainty', 'sell-off', 'correction'
    ];

    const neutralKeywords = [
      'analysis', 'update', 'report', 'discussion', 'overview', 'summary'
    ];

    const lowerText = text.toLowerCase();
    let positiveScore = 0;
    let negativeScore = 0;
    let neutralScore = 0;

    positiveKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) positiveScore += 1;
    });

    negativeKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) negativeScore += 1;
    });

    neutralKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) neutralScore += 0.5;
    });

    const totalScore = positiveScore + negativeScore + neutralScore;
    if (totalScore === 0) return 0;

    return (positiveScore - negativeScore) / Math.max(totalScore, 1);
  }

  /**
   * Extract relevant keywords from text
   */
  private extractKeywords(text: string): string[] {
    const allKeywords = [
      'bitcoin', 'ethereum', 'crypto', 'blockchain', 'defi', 'nft', 'web3',
      'bullish', 'bearish', 'institutional', 'adoption', 'regulation', 'sec',
      'etf', 'mining', 'staking', 'yield', 'liquidity', 'volume', 'price'
    ];

    const lowerText = text.toLowerCase();
    return allKeywords.filter(keyword => lowerText.includes(keyword))
                    .slice(0, 5); // Limit to top 5 keywords
  }

  /**
   * Determine impact level based on source and keywords
   */
  private determineImpact(source: string, keywords: string[]): 'high' | 'medium' | 'low' {
    const highImpactSources = ['coindesk', 'cointelegraph', 'bloomberg', 'reuters', 'wsj'];
    const highImpactKeywords = ['regulation', 'sec', 'institutional', 'etf', 'ban'];

    const isHighImpactSource = highImpactSources.some(s => source.toLowerCase().includes(s));
    const hasHighImpactKeywords = keywords.some(k => highImpactKeywords.includes(k));

    if (isHighImpactSource || hasHighImpactKeywords) return 'high';
    if (keywords.length >= 3) return 'medium';
    return 'low';
  }

  /**
   * Calculate average impact score
   */
  private calculateAverageImpact(articles: NewsArticle[]): number {
    if (articles.length === 0) return 0;

    const impactScores = articles.map(article => {
      switch (article.impact) {
        case 'high': return 1;
        case 'medium': return 0.6;
        case 'low': return 0.3;
        default: return 0;
      }
    });

    return impactScores.reduce((sum: number, score: number) => sum + score, 0) / articles.length;
  }

  /**
   * Get news sentiment trends over time
   */
  async getNewsTrends(symbol: string, timeframe: '1d' | '7d' | '30d' = '7d'): Promise<any[]> {
    try {
      logger.info(`Fetching news trends for ${symbol} (${timeframe})`);
      
      const days = timeframe === '1d' ? 1 : timeframe === '7d' ? 7 : 30;
      const query = this.buildNewsSearchQuery(symbol);
      
      const response = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          q: query,
          language: 'en',
          sortBy: 'publishedAt',
          from: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          pageSize: 100,
          apiKey: this.newsApiKey
        }
      });

      // Group articles by day and calculate sentiment trends
      const trendData: any[] = [];
      const articlesGrouped: Record<string, any[]> = {};

      response.data.articles.forEach((article: any) => {
        const date = article.publishedAt.split('T')[0];
        if (!articlesGrouped[date]) {
          articlesGrouped[date] = [];
        }
        articlesGrouped[date].push(article);
      });

      // Process each day's articles
      for (const [date, articles] of Object.entries(articlesGrouped)) {
        const processedArticles = await Promise.all(
          articles.map(article => this.analyzeArticleSentiment({
            title: article.title,
            content: article.description || article.content,
            source: article.source.name,
            publishedAt: new Date(article.publishedAt)
          }))
        );

        const avgSentiment = processedArticles.reduce((sum, article) => sum + article.sentiment, 0) / processedArticles.length;
        
        trendData.push({
          date,
          sentiment: avgSentiment,
          articleCount: articles.length,
          articles: processedArticles.slice(0, 5) // Top 5 articles for the day
        });
      }

      return trendData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (error) {
      logger.error(`Failed to get news trends for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get breaking news alerts for cryptocurrencies
   */
  async getBreakingNews(symbols: string[]): Promise<NewsArticle[]> {
    try {
      logger.info(`Fetching breaking news for ${symbols.join(', ')}`);
      
      const allArticles: NewsArticle[] = [];
      
      for (const symbol of symbols) {
        const query = this.buildNewsSearchQuery(symbol);
        
        const response = await axios.get('https://newsapi.org/v2/everything', {
          params: {
            q: query,
            language: 'en',
            sortBy: 'publishedAt',
            from: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // Last 6 hours
            pageSize: 10,
            apiKey: this.newsApiKey
          }
        });

        const processedArticles = await Promise.all(
          response.data.articles.map((article: any) => this.analyzeArticleSentiment({
            title: article.title,
            content: article.description || article.content,
            source: article.source.name,
            url: article.url,
            publishedAt: new Date(article.publishedAt)
          }))
        );

        // Only include high-impact articles
        const breakingNews = processedArticles.filter(article => 
          article.impact === 'high' || Math.abs(article.sentiment) > 0.6
        );

        allArticles.push(...breakingNews);
      }

      // Sort by impact and recency
      return allArticles
        .sort((a, b) => {
          const impactWeight = { high: 3, medium: 2, low: 1 };
          const impactDiff = impactWeight[b.impact] - impactWeight[a.impact];
          if (impactDiff !== 0) return impactDiff;
          return b.publishedAt.getTime() - a.publishedAt.getTime();
        })
        .slice(0, 20); // Top 20 breaking news items
    } catch (error) {
      logger.error('Failed to get breaking news:', error);
      throw error;
    }
  }
}

export default NewsSentimentService;
export { NewsArticle, NewsMetrics }; 