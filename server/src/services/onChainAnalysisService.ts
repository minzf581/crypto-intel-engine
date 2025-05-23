import axios from 'axios';
import logger from '../utils/logger';

interface OnChainMetrics {
  symbol: string;
  networkActivity: {
    transactionCount24h: number;
    activeAddresses24h: number;
    transactionVolume24h: number;
    avgTransactionFee: number;
    networkHashRate?: number;
  };
  holderAnalysis: {
    totalHolders: number;
    topHoldersPercentage: number;
    holderDistribution: {
      whales: number; // >1000 coins
      fish: number;   // 1-1000 coins
      shrimp: number; // <1 coin
    };
    newHolders24h: number;
  };
  exchangeFlow: {
    inflowUSD24h: number;
    outflowUSD24h: number;
    netFlow24h: number;
    exchangeBalance: number;
    exchangeRatio: number; // % of supply on exchanges
  };
  supplyMetrics: {
    circulatingSupply: number;
    maxSupply: number;
    inflationRate: number;
    burnedTokens24h?: number;
  };
  dexMetrics?: {
    liquidityUSD: number;
    volume24hUSD: number;
    priceImpact: number;
    majorPairs: Array<{
      pair: string;
      liquidity: number;
      volume24h: number;
    }>;
  };
}

interface OnChainSignal {
  type: 'bullish' | 'bearish' | 'neutral';
  indicator: string;
  strength: number;
  description: string;
  confidence: number;
  timeframe: string;
}

interface OnChainAnalysis {
  symbol: string;
  metrics: OnChainMetrics;
  signals: OnChainSignal[];
  healthScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high';
  lastUpdated: Date;
}

class OnChainAnalysisService {
  private blockchainApiKey?: string;
  private dexApiKey?: string;

  constructor() {
    this.blockchainApiKey = process.env.BLOCKCHAIN_API_KEY;
    this.dexApiKey = process.env.DEX_API_KEY;
  }

  /**
   * Perform comprehensive on-chain analysis for a cryptocurrency
   */
  async analyzeOnChainData(symbol: string): Promise<OnChainAnalysis> {
    try {
      // For demo purposes, we'll generate realistic mock data
      // In production, you would integrate with blockchain APIs like:
      // - Etherscan, BSCScan for Ethereum/BSC
      // - Solscan for Solana
      // - Blockchair for Bitcoin
      // - CoinMetrics, Glassnode for advanced metrics

      const metrics = await this.generateOnChainMetrics(symbol);
      const signals = this.generateOnChainSignals(metrics);
      const healthScore = this.calculateHealthScore(metrics);
      const riskLevel = this.assessRiskLevel(metrics, signals);

      const analysis: OnChainAnalysis = {
        symbol,
        metrics,
        signals,
        healthScore,
        riskLevel,
        lastUpdated: new Date()
      };

      logger.info(`Generated on-chain analysis for ${symbol}`, {
        healthScore,
        riskLevel,
        signalCount: signals.length
      });

      return analysis;
    } catch (error) {
      logger.error(`Failed to analyze on-chain data for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Generate realistic on-chain metrics
   */
  private async generateOnChainMetrics(symbol: string): Promise<OnChainMetrics> {
    // Base values vary by cryptocurrency type
    const baseValues = this.getBaseValues(symbol);

    return {
      symbol,
      networkActivity: {
        transactionCount24h: Math.floor(baseValues.txCount * (0.8 + Math.random() * 0.4)),
        activeAddresses24h: Math.floor(baseValues.activeAddresses * (0.9 + Math.random() * 0.2)),
        transactionVolume24h: baseValues.volume * (0.7 + Math.random() * 0.6),
        avgTransactionFee: baseValues.avgFee * (0.5 + Math.random() * 1.0),
        networkHashRate: baseValues.hashRate
      },
      holderAnalysis: {
        totalHolders: Math.floor(baseValues.holders * (0.95 + Math.random() * 0.1)),
        topHoldersPercentage: 15 + Math.random() * 20, // 15-35%
        holderDistribution: {
          whales: Math.floor(baseValues.holders * 0.001), // 0.1%
          fish: Math.floor(baseValues.holders * 0.2), // 20%
          shrimp: Math.floor(baseValues.holders * 0.799) // 79.9%
        },
        newHolders24h: Math.floor(baseValues.holders * 0.001 * (0.5 + Math.random()))
      },
      exchangeFlow: {
        inflowUSD24h: baseValues.volume * 0.1 * (0.8 + Math.random() * 0.4),
        outflowUSD24h: baseValues.volume * 0.12 * (0.8 + Math.random() * 0.4),
        netFlow24h: 0, // Will be calculated
        exchangeBalance: baseValues.volume * 2,
        exchangeRatio: 8 + Math.random() * 12 // 8-20%
      },
      supplyMetrics: {
        circulatingSupply: baseValues.circulatingSupply,
        maxSupply: baseValues.maxSupply,
        inflationRate: baseValues.inflationRate,
        burnedTokens24h: baseValues.burned24h
      },
      dexMetrics: symbol !== 'BTC' ? {
        liquidityUSD: baseValues.volume * 0.5 * (0.8 + Math.random() * 0.4),
        volume24hUSD: baseValues.volume * 0.3 * (0.7 + Math.random() * 0.6),
        priceImpact: 0.1 + Math.random() * 0.3, // 0.1-0.4%
        majorPairs: this.generateDexPairs(symbol)
      } : undefined
    };
  }

  /**
   * Get base values for different cryptocurrencies
   */
  private getBaseValues(symbol: string): any {
    const baseValueMap: { [key: string]: any } = {
      'BTC': {
        txCount: 300000,
        activeAddresses: 800000,
        volume: 15000000000, // $15B
        avgFee: 2.5,
        hashRate: 450000000, // 450 EH/s
        holders: 46000000,
        circulatingSupply: 19700000,
        maxSupply: 21000000,
        inflationRate: 1.8,
        burned24h: 0
      },
      'ETH': {
        txCount: 1200000,
        activeAddresses: 600000,
        volume: 8000000000, // $8B
        avgFee: 15,
        hashRate: null,
        holders: 98000000,
        circulatingSupply: 120000000,
        maxSupply: null,
        inflationRate: -0.1, // Deflationary
        burned24h: 1500
      },
      'SOL': {
        txCount: 2500000,
        activeAddresses: 400000,
        volume: 1200000000, // $1.2B
        avgFee: 0.0001,
        hashRate: null,
        holders: 12000000,
        circulatingSupply: 467000000,
        maxSupply: null,
        inflationRate: 5.2,
        burned24h: 0
      }
    };

    return baseValueMap[symbol] || {
      txCount: 100000,
      activeAddresses: 50000,
      volume: 500000000,
      avgFee: 0.1,
      hashRate: null,
      holders: 1000000,
      circulatingSupply: 1000000000,
      maxSupply: 10000000000,
      inflationRate: 3.0,
      burned24h: 0
    };
  }

  /**
   * Generate DEX trading pairs data
   */
  private generateDexPairs(symbol: string): Array<{ pair: string; liquidity: number; volume24h: number }> {
    const commonPairs = ['USDT', 'USDC', 'ETH', 'BTC'];
    return commonPairs.map(quote => ({
      pair: `${symbol}/${quote}`,
      liquidity: Math.floor(Math.random() * 50000000) + 1000000, // $1M-50M
      volume24h: Math.floor(Math.random() * 10000000) + 100000   // $100K-10M
    })).slice(0, 3);
  }

  /**
   * Generate on-chain signals based on metrics
   */
  private generateOnChainSignals(metrics: OnChainMetrics): OnChainSignal[] {
    const signals: OnChainSignal[] = [];

    // Network activity signals
    const txGrowth = this.calculateGrowthRate(metrics.networkActivity.transactionCount24h);
    if (txGrowth > 10) {
      signals.push({
        type: 'bullish',
        indicator: 'Transaction Volume',
        strength: Math.min(100, txGrowth * 5),
        description: `Transaction count increased by ${txGrowth.toFixed(1)}%`,
        confidence: 0.75,
        timeframe: '24h'
      });
    } else if (txGrowth < -10) {
      signals.push({
        type: 'bearish',
        indicator: 'Transaction Volume',
        strength: Math.min(100, Math.abs(txGrowth) * 5),
        description: `Transaction count decreased by ${Math.abs(txGrowth).toFixed(1)}%`,
        confidence: 0.75,
        timeframe: '24h'
      });
    }

    // Exchange flow signals
    metrics.exchangeFlow.netFlow24h = metrics.exchangeFlow.outflowUSD24h - metrics.exchangeFlow.inflowUSD24h;
    
    if (metrics.exchangeFlow.netFlow24h > 0) {
      const flowPercentage = (metrics.exchangeFlow.netFlow24h / metrics.exchangeFlow.inflowUSD24h) * 100;
      if (flowPercentage > 20) {
        signals.push({
          type: 'bullish',
          indicator: 'Exchange Flow',
          strength: Math.min(100, flowPercentage * 2),
          description: `Net outflow from exchanges: $${(metrics.exchangeFlow.netFlow24h / 1000000).toFixed(1)}M`,
          confidence: 0.8,
          timeframe: '24h'
        });
      }
    } else {
      const flowPercentage = Math.abs(metrics.exchangeFlow.netFlow24h / metrics.exchangeFlow.outflowUSD24h) * 100;
      if (flowPercentage > 20) {
        signals.push({
          type: 'bearish',
          indicator: 'Exchange Flow',
          strength: Math.min(100, flowPercentage * 2),
          description: `Net inflow to exchanges: $${(Math.abs(metrics.exchangeFlow.netFlow24h) / 1000000).toFixed(1)}M`,
          confidence: 0.8,
          timeframe: '24h'
        });
      }
    }

    // Holder concentration signals
    if (metrics.holderAnalysis.topHoldersPercentage > 30) {
      signals.push({
        type: 'bearish',
        indicator: 'Holder Concentration',
        strength: (metrics.holderAnalysis.topHoldersPercentage - 20) * 2,
        description: `High concentration: Top holders control ${metrics.holderAnalysis.topHoldersPercentage.toFixed(1)}%`,
        confidence: 0.65,
        timeframe: 'structural'
      });
    }

    // New holders growth
    const holderGrowthRate = (metrics.holderAnalysis.newHolders24h / metrics.holderAnalysis.totalHolders) * 100;
    if (holderGrowthRate > 0.1) {
      signals.push({
        type: 'bullish',
        indicator: 'Holder Growth',
        strength: Math.min(100, holderGrowthRate * 100),
        description: `New holders increased by ${holderGrowthRate.toFixed(3)}%`,
        confidence: 0.7,
        timeframe: '24h'
      });
    }

    // Supply metrics signals
    if (metrics.supplyMetrics.burnedTokens24h && metrics.supplyMetrics.burnedTokens24h > 0) {
      signals.push({
        type: 'bullish',
        indicator: 'Token Burns',
        strength: 60,
        description: `${metrics.supplyMetrics.burnedTokens24h} tokens burned in 24h`,
        confidence: 0.8,
        timeframe: '24h'
      });
    }

    // DEX metrics signals (if available)
    if (metrics.dexMetrics) {
      const liquidityRatio = metrics.dexMetrics.volume24hUSD / metrics.dexMetrics.liquidityUSD;
      if (liquidityRatio > 0.3) {
        signals.push({
          type: 'bullish',
          indicator: 'DEX Activity',
          strength: Math.min(100, liquidityRatio * 100),
          description: `High DEX volume/liquidity ratio: ${liquidityRatio.toFixed(2)}`,
          confidence: 0.7,
          timeframe: '24h'
        });
      }
    }

    return signals;
  }

  /**
   * Calculate growth rate (simplified)
   */
  private calculateGrowthRate(currentValue: number): number {
    // Simulate comparison with previous period
    const previousValue = currentValue * (0.9 + Math.random() * 0.2);
    return ((currentValue - previousValue) / previousValue) * 100;
  }

  /**
   * Calculate overall health score
   */
  private calculateHealthScore(metrics: OnChainMetrics): number {
    let score = 50; // Base score

    // Network activity score (0-25 points)
    const activityScore = Math.min(25, (metrics.networkActivity.activeAddresses24h / 100000) * 10);
    score += activityScore;

    // Holder distribution score (0-20 points)
    const distributionScore = Math.max(0, 20 - (metrics.holderAnalysis.topHoldersPercentage - 20));
    score += distributionScore;

    // Exchange flow score (0-15 points)
    if (metrics.exchangeFlow.netFlow24h > 0) {
      score += 15; // Positive for outflows
    } else if (metrics.exchangeFlow.netFlow24h < -metrics.exchangeFlow.outflowUSD24h * 0.1) {
      score -= 10; // Negative for large inflows
    }

    // Supply health score (0-10 points)
    if (metrics.supplyMetrics.inflationRate < 5) {
      score += 10;
    } else if (metrics.supplyMetrics.inflationRate > 10) {
      score -= 5;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Assess risk level based on metrics and signals
   */
  private assessRiskLevel(metrics: OnChainMetrics, signals: OnChainSignal[]): 'low' | 'medium' | 'high' {
    let riskPoints = 0;

    // High concentration risk
    if (metrics.holderAnalysis.topHoldersPercentage > 40) riskPoints += 3;
    else if (metrics.holderAnalysis.topHoldersPercentage > 25) riskPoints += 1;

    // Exchange ratio risk
    if (metrics.exchangeFlow.exchangeRatio > 25) riskPoints += 2;
    else if (metrics.exchangeFlow.exchangeRatio > 15) riskPoints += 1;

    // High inflation risk
    if (metrics.supplyMetrics.inflationRate > 15) riskPoints += 2;
    else if (metrics.supplyMetrics.inflationRate > 8) riskPoints += 1;

    // Signal-based risk
    const bearishSignals = signals.filter(s => s.type === 'bearish').length;
    if (bearishSignals > 2) riskPoints += 2;
    else if (bearishSignals > 0) riskPoints += 1;

    if (riskPoints >= 5) return 'high';
    if (riskPoints >= 2) return 'medium';
    return 'low';
  }

  /**
   * Get historical on-chain trends
   */
  async getOnChainTrends(symbol: string, timeframe: '7d' | '30d' | '90d' = '30d'): Promise<any[]> {
    try {
      const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
      const trends = [];

      for (let i = days; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        trends.push({
          date: date.toISOString().split('T')[0],
          activeAddresses: Math.floor(Math.random() * 100000) + 200000,
          transactionCount: Math.floor(Math.random() * 50000) + 150000,
          exchangeInflow: Math.random() * 50000000 + 10000000,
          exchangeOutflow: Math.random() * 60000000 + 15000000,
          holderCount: Math.floor(Math.random() * 10000) + 5000000
        });
      }

      return trends;
    } catch (error) {
      logger.error(`Failed to get on-chain trends for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Get whale activity alerts
   */
  async getWhaleActivityAlerts(symbols: string[]): Promise<any[]> {
    try {
      const alerts = [];

      for (const symbol of symbols) {
        // Simulate whale transaction detection
        if (Math.random() > 0.7) { // 30% chance of whale activity
          const amount = Math.floor(Math.random() * 10000) + 1000;
          const type = Math.random() > 0.5 ? 'buy' : 'sell';
          const exchange = ['Binance', 'Coinbase', 'Kraken'][Math.floor(Math.random() * 3)];

          alerts.push({
            symbol,
            type,
            amount,
            amountUSD: amount * 50000, // Approximate value
            exchange,
            timestamp: new Date(),
            impact: amount > 5000 ? 'high' : amount > 2000 ? 'medium' : 'low'
          });
        }
      }

      return alerts.sort((a, b) => b.amountUSD - a.amountUSD).slice(0, 10);
    } catch (error) {
      logger.error('Failed to get whale activity alerts:', error);
      return [];
    }
  }

  /**
   * Get network health summary for multiple cryptocurrencies
   */
  async getNetworkHealthSummary(symbols: string[]): Promise<any> {
    try {
      const healthData = await Promise.all(
        symbols.map(async symbol => {
          const analysis = await this.analyzeOnChainData(symbol);
          return {
            symbol,
            healthScore: analysis.healthScore,
            riskLevel: analysis.riskLevel,
            keyMetrics: {
              activeAddresses: analysis.metrics.networkActivity.activeAddresses24h,
              transactionVolume: analysis.metrics.networkActivity.transactionVolume24h,
              netFlow: analysis.metrics.exchangeFlow.netFlow24h
            }
          };
        })
      );

      return {
        summary: healthData,
        averageHealthScore: Math.round(
          healthData.reduce((sum, item) => sum + item.healthScore, 0) / healthData.length
        ),
        riskDistribution: {
          low: healthData.filter(item => item.riskLevel === 'low').length,
          medium: healthData.filter(item => item.riskLevel === 'medium').length,
          high: healthData.filter(item => item.riskLevel === 'high').length
        },
        lastUpdated: new Date()
      };
    } catch (error) {
      logger.error('Failed to get network health summary:', error);
      throw error;
    }
  }
}

export default OnChainAnalysisService;
export { OnChainAnalysis, OnChainMetrics, OnChainSignal }; 