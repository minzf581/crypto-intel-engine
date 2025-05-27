import logger from '../utils/logger';
import { SocialSentimentService, SocialMetrics } from './socialSentimentService';
import NewsSentimentService, { NewsMetrics } from './newsSentimentService';
import TechnicalIndicatorService, { TechnicalAnalysis } from './technicalIndicatorService';
import OnChainAnalysisService, { OnChainAnalysis } from './onChainAnalysisService';

interface ComprehensiveSignal {
  id: string;
  type: 'buy' | 'sell' | 'hold';
  source: 'social' | 'news' | 'technical' | 'onchain' | 'combined';
  strength: number; // 0-100
  confidence: number; // 0-1
  title: string;
  description: string;
  timeframe: string;
  timestamp: Date;
  metadata: any;
}

interface MarketIntelligence {
  symbol: string;
  overallSentiment: {
    score: number; // -1 to 1
    trend: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
  };
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
    score: number; // 0-100
  };
  investmentRecommendation: {
    action: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
    reasoning: string[];
    confidence: number;
    timeHorizon: 'short' | 'medium' | 'long';
  };
  dataQuality: {
    social: number;
    news: number;
    technical: number;
    onchain: number;
    overall: number;
  };
}

interface ComprehensiveAnalysisResult {
  symbol: string;
  intelligence: MarketIntelligence;
  signals: ComprehensiveSignal[];
  dataBreakdown: {
    social: SocialMetrics;
    news: NewsMetrics;
    technical: TechnicalAnalysis;
    onchain: OnChainAnalysis;
  };
  marketInsights: {
    keyTrends: string[];
    opportunities: string[];
    risks: string[];
    catalysts: string[];
  };
  lastUpdated: Date;
}

class ComprehensiveAnalysisService {
  private socialService: SocialSentimentService;
  private newsService: NewsSentimentService;
  private technicalService: TechnicalIndicatorService;
  private onchainService: OnChainAnalysisService;

  constructor() {
    this.socialService = SocialSentimentService.getInstance();
    this.newsService = new NewsSentimentService();
    this.technicalService = new TechnicalIndicatorService();
    this.onchainService = new OnChainAnalysisService();
  }

  /**
   * Perform comprehensive analysis for a cryptocurrency
   */
  async performComprehensiveAnalysis(symbol: string): Promise<ComprehensiveAnalysisResult> {
    try {
      logger.info(`Starting comprehensive analysis for ${symbol}`);

      // Gather data from all sources in parallel
      const [socialData, newsData, technicalData, onchainData] = await Promise.all([
        this.socialService.getSocialMetrics(symbol).catch(err => {
          logger.warn(`Social analysis failed for ${symbol}:`, err);
          return this.getDefaultSocialMetrics(symbol);
        }),
        this.newsService.analyzeNewsSentiment(symbol).catch(err => {
          logger.warn(`News analysis failed for ${symbol}:`, err);
          return this.getDefaultNewsMetrics(symbol);
        }),
        this.technicalService.analyzeTechnicalIndicators(symbol).catch(err => {
          logger.warn(`Technical analysis failed for ${symbol}:`, err);
          return this.getDefaultTechnicalAnalysis(symbol);
        }),
        this.onchainService.analyzeOnChainData(symbol).catch(err => {
          logger.warn(`On-chain analysis failed for ${symbol}:`, err);
          return this.getDefaultOnChainAnalysis(symbol);
        })
      ]);

      // Generate comprehensive signals
      const signals = this.generateComprehensiveSignals(symbol, {
        social: socialData,
        news: newsData,
        technical: technicalData,
        onchain: onchainData
      });

      // Create market intelligence
      const intelligence = this.generateMarketIntelligence(symbol, {
        social: socialData,
        news: newsData,
        technical: technicalData,
        onchain: onchainData
      });

      // Generate market insights
      const marketInsights = this.generateMarketInsights({
        social: socialData,
        news: newsData,
        technical: technicalData,
        onchain: onchainData
      });

      const result: ComprehensiveAnalysisResult = {
        symbol,
        intelligence,
        signals,
        dataBreakdown: {
          social: socialData,
          news: newsData,
          technical: technicalData,
          onchain: onchainData
        },
        marketInsights,
        lastUpdated: new Date()
      };

      logger.info(`Comprehensive analysis completed for ${symbol}`, {
        signalCount: signals.length,
        overallSentiment: intelligence.overallSentiment.trend,
        recommendation: intelligence.investmentRecommendation.action
      });

      return result;
    } catch (error) {
      logger.error(`Failed to perform comprehensive analysis for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Generate comprehensive signals from all data sources
   */
  private generateComprehensiveSignals(symbol: string, data: any): ComprehensiveSignal[] {
    const signals: ComprehensiveSignal[] = [];

    // Social sentiment signals
    if (data.social) {
      if (Math.abs(data.social.overallSentiment) > 0.3) {
        signals.push({
          id: `social-${Date.now()}`,
          type: data.social.overallSentiment > 0 ? 'buy' : 'sell',
          source: 'social',
          strength: Math.min(100, Math.abs(data.social.overallSentiment) * 150),
          confidence: data.social.engagementRate,
          title: `${data.social.sentimentTrend.toUpperCase()} Social Sentiment`,
          description: `Social media sentiment is ${data.social.sentimentTrend} with ${data.social.socialVolume.toLocaleString()} mentions`,
          timeframe: '24h',
          timestamp: new Date(),
          metadata: { volume: data.social.socialVolume, sentiment: data.social.overallSentiment }
        });
      }
    }

    // News sentiment signals
    if (data.news && data.news.articles && data.news.articles.length > 0) {
      const highImpactNews = data.news.articles.filter((article: any) => article.impact === 'high');
      if (highImpactNews.length > 0) {
        const avgSentiment = highImpactNews.reduce((sum: number, article: any) => sum + article.sentiment, 0) / highImpactNews.length;
        signals.push({
          id: `news-${Date.now()}`,
          type: avgSentiment > 0.2 ? 'buy' : avgSentiment < -0.2 ? 'sell' : 'hold',
          source: 'news',
          strength: Math.min(100, Math.abs(avgSentiment) * 100 + (highImpactNews.length * 10)),
          confidence: data.news.averageImpact,
          title: `High-Impact News Analysis`,
          description: `${highImpactNews.length} high-impact news articles with ${data.news.sentimentTrend} sentiment`,
          timeframe: '24h',
          timestamp: new Date(),
          metadata: { articleCount: highImpactNews.length, sentiment: avgSentiment }
        });
      }
    }

    // Technical analysis signals
    if (data.technical && data.technical.signals && data.technical.signals.length > 0) {
      const strongSignals = data.technical.signals.filter((signal: any) => signal.strength > 60);
      strongSignals.forEach((signal: any) => {
        signals.push({
          id: `technical-${signal.indicator}-${Date.now()}`,
          type: signal.type,
          source: 'technical',
          strength: signal.strength,
          confidence: signal.confidence,
          title: `${signal.indicator} Signal`,
          description: signal.description,
          timeframe: data.technical.timeframe,
          timestamp: new Date(),
          metadata: { indicator: signal.indicator, trend: data.technical.overallTrend }
        });
      });
    }

    // On-chain analysis signals
    if (data.onchain && data.onchain.signals && data.onchain.signals.length > 0) {
      const significantSignals = data.onchain.signals.filter((signal: any) => signal.strength > 50);
      significantSignals.forEach((signal: any) => {
        signals.push({
          id: `onchain-${signal.indicator}-${Date.now()}`,
          type: signal.type,
          source: 'onchain',
          strength: signal.strength,
          confidence: signal.confidence,
          title: `${signal.indicator} Alert`,
          description: signal.description,
          timeframe: signal.timeframe,
          timestamp: new Date(),
          metadata: { healthScore: data.onchain.healthScore, riskLevel: data.onchain.riskLevel }
        });
      });
    }

    // Generate combined signals based on consensus
    const combinedSignal = this.generateCombinedSignal(symbol, data);
    if (combinedSignal) {
      signals.push(combinedSignal);
    }

    // Sort signals by strength and confidence
    return signals.sort((a, b) => (b.strength * b.confidence) - (a.strength * a.confidence));
  }

  /**
   * Generate a combined signal based on all data sources
   */
  private generateCombinedSignal(symbol: string, data: any): ComprehensiveSignal | null {
    const weights = {
      social: 0.2,
      news: 0.25,
      technical: 0.35,
      onchain: 0.2
    };

    let totalScore = 0;
    let totalWeight = 0;

    // Social sentiment contribution
    if (data.social) {
      const socialScore = data.social.overallSentiment * data.social.engagementRate;
      totalScore += socialScore * weights.social;
      totalWeight += weights.social;
    }

    // News sentiment contribution
    if (data.news) {
      const newsScore = data.news.overallSentiment * data.news.averageImpact;
      totalScore += newsScore * weights.news;
      totalWeight += weights.news;
    }

    // Technical analysis contribution
    if (data.technical) {
      const techScore = data.technical.overallTrend === 'bullish' ? 0.6 : 
                       data.technical.overallTrend === 'bearish' ? -0.6 : 0;
      const adjustedTechScore = techScore * (data.technical.strength / 100);
      totalScore += adjustedTechScore * weights.technical;
      totalWeight += weights.technical;
    }

    // On-chain contribution
    if (data.onchain) {
      const onchainScore = (data.onchain.healthScore - 50) / 50; // Convert to -1 to 1 scale
      totalScore += onchainScore * weights.onchain;
      totalWeight += weights.onchain;
    }

    if (totalWeight === 0) return null;

    const finalScore = totalScore / totalWeight;
    const strength = Math.abs(finalScore) * 100;
    const confidence = totalWeight; // Higher when more data sources are available

    if (strength < 30) return null; // Only generate signal if strong enough

    return {
      id: `combined-${Date.now()}`,
      type: finalScore > 0.15 ? 'buy' : finalScore < -0.15 ? 'sell' : 'hold',
      source: 'combined',
      strength: Math.min(100, strength),
      confidence: Math.min(1, confidence),
      title: 'Comprehensive Market Signal',
      description: `Multi-source analysis indicates ${finalScore > 0 ? 'bullish' : finalScore < 0 ? 'bearish' : 'neutral'} market conditions`,
      timeframe: 'multi',
      timestamp: new Date(),
      metadata: { 
        score: finalScore, 
        sources: Object.keys(data).length,
        breakdown: {
          social: data.social?.overallSentiment || 0,
          news: data.news?.overallSentiment || 0,
          technical: data.technical?.overallTrend || 'neutral',
          onchain: data.onchain?.healthScore || 50
        }
      }
    };
  }

  /**
   * Generate market intelligence summary
   */
  private generateMarketIntelligence(symbol: string, data: any): MarketIntelligence {
    // Calculate overall sentiment
    const sentiments = [
      data.social?.overallSentiment || 0,
      data.news?.overallSentiment || 0,
      data.technical?.overallTrend === 'bullish' ? 0.5 : data.technical?.overallTrend === 'bearish' ? -0.5 : 0,
      data.onchain ? (data.onchain.healthScore - 50) / 50 : 0
    ];

    const overallSentiment = sentiments.reduce((sum, val) => sum + val, 0) / sentiments.length;
    const sentimentTrend = overallSentiment > 0.15 ? 'bullish' : overallSentiment < -0.15 ? 'bearish' : 'neutral';

    // Calculate risk assessment
    const riskFactors = [];
    let riskScore = 50; // Base risk score

    if (data.onchain?.riskLevel === 'high') {
      riskFactors.push('High on-chain risk detected');
      riskScore += 20;
    }
    if (data.technical?.strength < 30 && data.technical?.overallTrend === 'bearish') {
      riskFactors.push('Weak technical indicators');
      riskScore += 15;
    }
    if (data.social?.engagementRate < 0.3) {
      riskFactors.push('Low social engagement');
      riskScore += 10;
    }
    if (data.news?.averageImpact > 0.8 && data.news?.sentimentTrend === 'bearish') {
      riskFactors.push('Negative high-impact news');
      riskScore += 15;
    }

    const riskLevel = riskScore > 70 ? 'high' : riskScore > 40 ? 'medium' : 'low';

    // Generate investment recommendation
    const recommendation = this.generateInvestmentRecommendation(overallSentiment, riskLevel, data);

    // Calculate data quality scores
    const dataQuality = {
      social: data.social ? Math.min(1, data.social.engagementRate + 0.3) : 0,
      news: data.news ? Math.min(1, data.news.averageImpact) : 0,
      technical: data.technical ? Math.min(1, data.technical.strength / 100 + 0.2) : 0,
      onchain: data.onchain ? Math.min(1, data.onchain.healthScore / 100 + 0.2) : 0,
      overall: 0
    };
    dataQuality.overall = (dataQuality.social + dataQuality.news + dataQuality.technical + dataQuality.onchain) / 4;

    return {
      symbol,
      overallSentiment: {
        score: Math.round(overallSentiment * 100) / 100,
        trend: sentimentTrend,
        confidence: dataQuality.overall
      },
      riskAssessment: {
        level: riskLevel,
        factors: riskFactors,
        score: Math.min(100, riskScore)
      },
      investmentRecommendation: recommendation,
      dataQuality
    };
  }

  /**
   * Generate investment recommendation
   */
  private generateInvestmentRecommendation(sentiment: number, riskLevel: string, data: any): any {
    let action: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell' = 'hold';
    const reasoning = [];
    let confidence = 0.5;
    let timeHorizon: 'short' | 'medium' | 'long' = 'medium';

    // Determine action based on sentiment and risk
    if (sentiment > 0.4 && riskLevel === 'low') {
      action = 'strong_buy';
      reasoning.push('Strong positive sentiment with low risk');
      confidence = 0.85;
      timeHorizon = 'medium';
    } else if (sentiment > 0.2 && riskLevel !== 'high') {
      action = 'buy';
      reasoning.push('Positive sentiment indicators');
      confidence = 0.7;
      timeHorizon = 'short';
    } else if (sentiment < -0.4 || riskLevel === 'high') {
      action = sentiment < -0.4 ? 'strong_sell' : 'sell';
      reasoning.push(sentiment < -0.4 ? 'Strong negative sentiment' : 'High risk detected');
      confidence = 0.8;
      timeHorizon = 'short';
    }

    // Add specific reasoning based on data sources
    if (data.technical?.overallTrend === 'bullish' && data.technical.strength > 70) {
      reasoning.push('Strong technical indicators support upward movement');
    }
    if (data.onchain?.healthScore > 80) {
      reasoning.push('Excellent on-chain fundamentals');
    }
    if (data.social?.socialVolume > 50000) {
      reasoning.push('High social media activity and engagement');
    }
    if (data.news?.newsVolume > 10 && data.news.sentimentTrend === 'bullish') {
      reasoning.push('Positive news coverage increasing');
    }

    return {
      action,
      reasoning: reasoning.slice(0, 4), // Limit to top 4 reasons
      confidence,
      timeHorizon
    };
  }

  /**
   * Generate market insights
   */
  private generateMarketInsights(data: any): any {
    const keyTrends = [];
    const opportunities = [];
    const risks = [];
    const catalysts = [];

    // Analyze trends
    if (data.social?.sentimentTrend === 'bullish' && data.social.socialVolume > 10000) {
      keyTrends.push('Growing social media buzz and positive sentiment');
    }
    if (data.technical?.overallTrend === 'bullish') {
      keyTrends.push(`Technical analysis shows ${data.technical.overallTrend} trend with ${data.technical.strength}% strength`);
    }
    if (data.onchain?.healthScore > 70) {
      keyTrends.push('Strong on-chain fundamentals and network health');
    }

    // Identify opportunities
    if (data.technical?.signals?.some((s: any) => s.type === 'buy' && s.strength > 70)) {
      opportunities.push('Strong technical buy signals detected');
    }
    if (data.onchain?.signals?.some((s: any) => s.type === 'bullish' && s.indicator === 'Exchange Flow')) {
      opportunities.push('Positive exchange flow indicating accumulation');
    }
    if (data.news?.articles?.some((a: any) => a.impact === 'high' && a.sentiment > 0.5)) {
      opportunities.push('High-impact positive news driving sentiment');
    }

    // Identify risks
    if (data.onchain?.riskLevel === 'high') {
      risks.push('High on-chain risk factors detected');
    }
    if (data.technical?.signals?.some((s: any) => s.type === 'sell' && s.strength > 60)) {
      risks.push('Technical indicators showing sell signals');
    }
    if (data.social?.engagementRate < 0.3) {
      risks.push('Low social engagement may indicate waning interest');
    }

    // Identify catalysts
    if (data.news?.articles?.some((a: any) => a.keywords.includes('institutional'))) {
      catalysts.push('Institutional adoption news');
    }
    if (data.news?.articles?.some((a: any) => a.keywords.includes('upgrade'))) {
      catalysts.push('Network upgrades and improvements');
    }
    if (data.onchain?.signals?.some((s: any) => s.indicator === 'Token Burns')) {
      catalysts.push('Token burning reducing supply');
    }

    return {
      keyTrends: keyTrends.slice(0, 5),
      opportunities: opportunities.slice(0, 4),
      risks: risks.slice(0, 4),
      catalysts: catalysts.slice(0, 3)
    };
  }

  /**
   * Get default metrics when data source fails
   */
  private getDefaultSocialMetrics(symbol: string): SocialMetrics {
    return {
      symbol,
      overallSentiment: 0,
      sentimentTrend: 'neutral',
      socialVolume: 0,
      engagementRate: 0,
      sources: []
    };
  }

  private getDefaultNewsMetrics(symbol: string): NewsMetrics {
    return {
      symbol,
      overallSentiment: 0,
      sentimentTrend: 'neutral',
      newsVolume: 0,
      averageImpact: 0,
      articles: [],
      lastUpdated: new Date()
    };
  }

  private getDefaultTechnicalAnalysis(symbol: string): TechnicalAnalysis {
    return {
      symbol,
      indicators: {} as any,
      signals: [],
      overallTrend: 'neutral',
      strength: 50,
      timeframe: '1d',
      lastUpdated: new Date()
    };
  }

  private getDefaultOnChainAnalysis(symbol: string): OnChainAnalysis {
    return {
      symbol,
      metrics: {} as any,
      signals: [],
      healthScore: 50,
      riskLevel: 'medium',
      lastUpdated: new Date()
    };
  }

  /**
   * Get comprehensive analysis for multiple symbols
   */
  async getPortfolioAnalysis(symbols: string[]): Promise<any> {
    try {
      const analyses = await Promise.all(
        symbols.map(symbol => this.performComprehensiveAnalysis(symbol))
      );

      const portfolioSummary = {
        totalAssets: symbols.length,
        averageSentiment: analyses.reduce((sum, a) => sum + a.intelligence.overallSentiment.score, 0) / analyses.length,
        riskDistribution: {
          low: analyses.filter(a => a.intelligence.riskAssessment.level === 'low').length,
          medium: analyses.filter(a => a.intelligence.riskAssessment.level === 'medium').length,
          high: analyses.filter(a => a.intelligence.riskAssessment.level === 'high').length
        },
        recommendations: {
          strong_buy: analyses.filter(a => a.intelligence.investmentRecommendation.action === 'strong_buy').length,
          buy: analyses.filter(a => a.intelligence.investmentRecommendation.action === 'buy').length,
          hold: analyses.filter(a => a.intelligence.investmentRecommendation.action === 'hold').length,
          sell: analyses.filter(a => a.intelligence.investmentRecommendation.action === 'sell').length,
          strong_sell: analyses.filter(a => a.intelligence.investmentRecommendation.action === 'strong_sell').length
        },
        topOpportunities: analyses
          .filter(a => a.intelligence.investmentRecommendation.action.includes('buy'))
          .sort((a, b) => b.intelligence.investmentRecommendation.confidence - a.intelligence.investmentRecommendation.confidence)
          .slice(0, 3)
          .map(a => ({
            symbol: a.symbol,
            action: a.intelligence.investmentRecommendation.action,
            confidence: a.intelligence.investmentRecommendation.confidence,
            reasoning: a.intelligence.investmentRecommendation.reasoning[0]
          })),
        lastUpdated: new Date()
      };

      return {
        portfolioSummary,
        detailedAnalyses: analyses
      };
    } catch (error) {
      logger.error('Failed to get portfolio analysis:', error);
      throw error;
    }
  }
}

export default ComprehensiveAnalysisService;
export { ComprehensiveAnalysisResult, ComprehensiveSignal, MarketIntelligence }; 