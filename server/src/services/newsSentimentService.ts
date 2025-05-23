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
      // For demo purposes, we'll generate mock news articles with sentiment
      // In production, you would use NewsAPI, CoinDesk API, etc.
      const mockArticles = this.generateMockNewsArticles(symbol);
      
      const processedArticles = await Promise.all(
        mockArticles.map(article => this.analyzeArticleSentiment(article))
      );

      const totalSentiment = processedArticles.reduce((sum, article) => {
        return sum + (article.sentiment * article.confidence);
      }, 0);

      const totalConfidence = processedArticles.reduce((sum, article) => sum + article.confidence, 0);
      const overallSentiment = totalConfidence > 0 ? totalSentiment / totalConfidence : 0;

      let sentimentTrend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      if (overallSentiment > 0.2) sentimentTrend = 'bullish';
      else if (overallSentiment < -0.2) sentimentTrend = 'bearish';

      const averageImpact = this.calculateAverageImpact(processedArticles);

      const metrics: NewsMetrics = {
        symbol,
        overallSentiment,
        sentimentTrend,
        newsVolume: processedArticles.length,
        averageImpact,
        articles: processedArticles,
        lastUpdated: new Date()
      };

      logger.info(`Analyzed news sentiment for ${symbol}`, {
        sentiment: overallSentiment,
        trend: sentimentTrend,
        articleCount: processedArticles.length
      });

      return metrics;
    } catch (error) {
      logger.error(`Failed to analyze news sentiment for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Analyze sentiment of a single news article
   */
  private async analyzeArticleSentiment(article: Partial<NewsArticle>): Promise<NewsArticle> {
    // Simulate sentiment analysis using keyword-based approach
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
   * Generate mock news articles for demo purposes
   */
  private generateMockNewsArticles(symbol: string): Partial<NewsArticle>[] {
    const newsTemplates = [
      {
        title: `${symbol} Shows Strong Momentum as Institutional Interest Grows`,
        content: `Recent analysis suggests that ${symbol} is gaining significant traction among institutional investors, with several major funds reportedly increasing their positions.`,
        source: 'CoinDesk'
      },
      {
        title: `Technical Analysis: ${symbol} Breaks Key Resistance Level`,
        content: `Technical indicators suggest that ${symbol} has successfully broken through a critical resistance level, potentially signaling further upward movement.`,
        source: 'CoinTelegraph'
      },
      {
        title: `Market Update: ${symbol} Trading Volume Surges`,
        content: `Trading volume for ${symbol} has increased dramatically over the past 24 hours, indicating heightened market interest and activity.`,
        source: 'Crypto News'
      },
      {
        title: `Regulatory Clarity Could Benefit ${symbol} Adoption`,
        content: `Industry experts believe that recent regulatory developments could provide a clearer framework for ${symbol} adoption and institutional investment.`,
        source: 'Bloomberg Crypto'
      }
    ];

    return newsTemplates.map(template => ({
      ...template,
      url: `https://example.com/news/${symbol.toLowerCase()}-${Date.now()}`,
      publishedAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000) // Random time within last 24h
    }));
  }

  /**
   * Get news sentiment trends over time
   */
  async getNewsTrends(symbol: string, timeframe: '1d' | '7d' | '30d' = '7d'): Promise<any[]> {
    try {
      const days = timeframe === '1d' ? 1 : timeframe === '7d' ? 7 : 30;
      const trends = [];

      for (let i = days; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        trends.push({
          date: date.toISOString().split('T')[0],
          sentiment: this.calculateSentimentFromText(`${symbol} crypto news analysis`),
          volume: Math.floor(Math.random() * 20) + 5,
          impact: Math.random() * 0.8 + 0.2
        });
      }

      return trends;
    } catch (error) {
      logger.error(`Failed to get news trends for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Get breaking news alerts for cryptocurrencies
   */
  async getBreakingNews(symbols: string[]): Promise<NewsArticle[]> {
    try {
      const allNews: NewsArticle[] = [];
      
      for (const symbol of symbols) {
        const mockArticles = this.generateMockNewsArticles(symbol);
        const processedArticles = await Promise.all(
          mockArticles.map(article => this.analyzeArticleSentiment(article))
        );
        
        // Filter for high-impact news only
        const breakingNews = processedArticles.filter(article => 
          article.impact === 'high' || Math.abs(article.sentiment) > 0.5
        );
        
        allNews.push(...breakingNews);
      }

      // Sort by impact and recency
      return allNews.sort((a, b) => {
        const impactScore = (article: NewsArticle) => {
          let score = article.impact === 'high' ? 3 : article.impact === 'medium' ? 2 : 1;
          score += Math.abs(article.sentiment) * 2;
          return score;
        };
        
        return impactScore(b) - impactScore(a);
      }).slice(0, 10); // Return top 10 breaking news
    } catch (error) {
      logger.error('Failed to get breaking news:', error);
      return [];
    }
  }
}

export default NewsSentimentService;
export { NewsArticle, NewsMetrics }; 