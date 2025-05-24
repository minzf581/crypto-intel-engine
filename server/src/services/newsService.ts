/**
 * News Analysis Service
 * Fetches and analyzes cryptocurrency news for narrative signals
 */

import axios from 'axios';
import logger from '../utils/logger';
import { dataSourceService, NewsData } from './dataSourceService';

export interface NewsSignal {
  id: string;
  title: string;
  summary: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  impact: 'low' | 'medium' | 'high';
  relevantAssets: string[];
  publishedAt: Date;
  source: string;
  url: string;
  confidence: number;
}

export interface MarketNarrative {
  theme: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  strength: number;
  relatedNews: NewsSignal[];
  affectedAssets: string[];
  timeframe: '1h' | '4h' | '24h' | '7d';
}

class NewsService {
  private readonly UPDATE_INTERVAL = 30 * 60 * 1000; // 30 minutes
  private newsCache: NewsData[] = [];
  private lastUpdate: Date = new Date(0);
  
  /**
   * Get latest crypto news and generate signals
   */
  async getNewsSignals(): Promise<NewsSignal[]> {
    try {
      const news = await this.getLatestNews();
      return this.analyzeNewsForSignals(news);
    } catch (error) {
      logger.error('Failed to get news signals:', error);
      return [];
    }
  }
  
  /**
   * Get latest cryptocurrency news
   */
  async getLatestNews(forceRefresh = false): Promise<NewsData[]> {
    const now = new Date();
    
    if (!forceRefresh && 
        now.getTime() - this.lastUpdate.getTime() < this.UPDATE_INTERVAL &&
        this.newsCache.length > 0) {
      return this.newsCache;
    }
    
    try {
      const cryptoKeywords = [
        'bitcoin', 'ethereum', 'crypto', 'blockchain', 'defi',
        'nft', 'solana', 'cardano', 'dogecoin', 'trump', 'meme'
      ];
      
      this.newsCache = await dataSourceService.getCryptoNews(cryptoKeywords);
      this.lastUpdate = now;
      
      logger.info(`Fetched ${this.newsCache.length} news articles`);
      return this.newsCache;
    } catch (error) {
      logger.warn('Failed to fetch latest news:', error);
      return this.newsCache; // Return cached data on error
    }
  }
  
  /**
   * Analyze news for trading signals
   */
  private analyzeNewsForSignals(news: NewsData[]): NewsSignal[] {
    return news.map(article => {
      const relevantAssets = this.extractRelevantAssets(article.title + ' ' + article.description);
      const impact = this.calculateImpact(article);
      const confidence = this.calculateConfidence(article);
      
      return {
        id: this.generateNewsId(article),
        title: article.title,
        summary: this.generateSummary(article.description),
        sentiment: article.sentiment || 'neutral',
        impact,
        relevantAssets,
        publishedAt: article.publishedAt,
        source: article.source,
        url: article.url,
        confidence
      };
    }).filter(signal => signal.relevantAssets.length > 0); // Only include relevant news
  }
  
  /**
   * Extract relevant cryptocurrency assets from text
   */
  private extractRelevantAssets(text: string): string[] {
    const assetPatterns = {
      'BTC': ['bitcoin', 'btc'],
      'ETH': ['ethereum', 'eth', 'ether'],
      'BNB': ['binance', 'bnb'],
      'SOL': ['solana', 'sol'],
      'ADA': ['cardano', 'ada'],
      'DOT': ['polkadot', 'dot'],
      'DOGE': ['dogecoin', 'doge'],
      'TRUMP': ['trump', 'maga']
    };
    
    const lowerText = text.toLowerCase();
    const foundAssets: string[] = [];
    
    for (const [symbol, patterns] of Object.entries(assetPatterns)) {
      if (patterns.some(pattern => lowerText.includes(pattern))) {
        foundAssets.push(symbol);
      }
    }
    
    return foundAssets;
  }
  
  /**
   * Calculate the potential market impact of a news article
   */
  private calculateImpact(article: NewsData): 'low' | 'medium' | 'high' {
    const highImpactKeywords = [
      'regulation', 'sec', 'etf', 'institutional', 'adoption',
      'partnership', 'acquisition', 'listing', 'delisting'
    ];
    
    const mediumImpactKeywords = [
      'upgrade', 'update', 'development', 'announcement',
      'conference', 'event', 'milestone'
    ];
    
    const text = (article.title + ' ' + article.description).toLowerCase();
    
    if (highImpactKeywords.some(keyword => text.includes(keyword))) {
      return 'high';
    }
    
    if (mediumImpactKeywords.some(keyword => text.includes(keyword))) {
      return 'medium';
    }
    
    return 'low';
  }
  
  /**
   * Calculate confidence score for news signal
   */
  private calculateConfidence(article: NewsData): number {
    let confidence = 0.5; // Base confidence
    
    // Boost confidence based on source reliability
    const reliableSources = ['reuters', 'bloomberg', 'coindesk', 'cointelegraph'];
    if (reliableSources.some(source => article.source.toLowerCase().includes(source))) {
      confidence += 0.2;
    }
    
    // Boost confidence based on relevance score
    if (article.relevanceScore && article.relevanceScore > 0.7) {
      confidence += 0.2;
    }
    
    // Boost confidence if sentiment is strong
    if (article.sentiment && article.sentiment !== 'neutral') {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 1.0);
  }
  
  /**
   * Generate a unique ID for news article
   */
  private generateNewsId(article: NewsData): string {
    const hash = article.title.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
    return `news_${hash}_${article.publishedAt.getTime()}`;
  }
  
  /**
   * Generate a summary from article description
   */
  private generateSummary(description: string): string {
    if (description.length <= 200) return description;
    
    // Simple summary - take first 200 characters and end at word boundary
    const summary = description.substring(0, 200);
    const lastSpaceIndex = summary.lastIndexOf(' ');
    return lastSpaceIndex > 150 ? summary.substring(0, lastSpaceIndex) + '...' : summary + '...';
  }
  
  /**
   * Identify market narratives from news trends
   */
  async identifyMarketNarratives(): Promise<MarketNarrative[]> {
    const news = await this.getLatestNews();
    const signals = this.analyzeNewsForSignals(news);
    
    // Group news by themes
    const themes = this.groupNewsByThemes(signals);
    
    return Object.entries(themes).map(([theme, newsItems]) => {
      const sentiments = newsItems.map(item => item.sentiment);
      const bullishCount = sentiments.filter(s => s === 'positive').length;
      const bearishCount = sentiments.filter(s => s === 'negative').length;
      
      let overallSentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      if (bullishCount > bearishCount * 1.5) overallSentiment = 'bullish';
      else if (bearishCount > bullishCount * 1.5) overallSentiment = 'bearish';
      
      const strength = Math.min(newsItems.length / 5, 1); // Max strength at 5+ articles
      const affectedAssets = [...new Set(newsItems.flatMap(item => item.relevantAssets))];
      
      return {
        theme,
        sentiment: overallSentiment,
        strength,
        relatedNews: newsItems,
        affectedAssets,
        timeframe: '24h' as const
      };
    }).filter(narrative => narrative.relatedNews.length >= 2); // At least 2 articles for a narrative
  }
  
  /**
   * Group news signals by themes
   */
  private groupNewsByThemes(signals: NewsSignal[]): { [theme: string]: NewsSignal[] } {
    const themes: { [theme: string]: NewsSignal[] } = {};
    
    const themeKeywords = {
      'Regulation': ['regulation', 'sec', 'legal', 'compliance', 'lawsuit'],
      'ETF': ['etf', 'exchange traded fund', 'approved', 'filing'],
      'Institutional Adoption': ['institutional', 'corporate', 'treasury', 'adoption'],
      'Technical Development': ['upgrade', 'development', 'protocol', 'network'],
      'Market Movement': ['price', 'rally', 'surge', 'crash', 'decline'],
      'DeFi': ['defi', 'decentralized finance', 'yield', 'liquidity'],
      'NFT': ['nft', 'non-fungible', 'collectible', 'art']
    };
    
    for (const signal of signals) {
      const text = (signal.title + ' ' + signal.summary).toLowerCase();
      let assigned = false;
      
      for (const [theme, keywords] of Object.entries(themeKeywords)) {
        if (keywords.some(keyword => text.includes(keyword))) {
          if (!themes[theme]) themes[theme] = [];
          themes[theme].push(signal);
          assigned = true;
          break;
        }
      }
      
      if (!assigned) {
        if (!themes['General']) themes['General'] = [];
        themes['General'].push(signal);
      }
    }
    
    return themes;
  }
}

export const newsService = new NewsService(); 