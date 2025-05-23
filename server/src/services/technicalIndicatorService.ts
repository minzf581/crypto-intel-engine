import logger from '../utils/logger';

interface PricePoint {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TechnicalIndicators {
  rsi: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  sma: {
    sma20: number;
    sma50: number;
    sma200: number;
  };
  ema: {
    ema12: number;
    ema26: number;
  };
  stochastic: {
    k: number;
    d: number;
  };
  support: number;
  resistance: number;
}

interface TechnicalAnalysis {
  symbol: string;
  indicators: TechnicalIndicators;
  signals: TechnicalSignal[];
  overallTrend: 'bullish' | 'bearish' | 'neutral';
  strength: number; // 0-100
  timeframe: string;
  lastUpdated: Date;
}

interface TechnicalSignal {
  type: 'buy' | 'sell' | 'hold';
  indicator: string;
  strength: number;
  description: string;
  confidence: number;
}

class TechnicalIndicatorService {
  
  /**
   * Analyze technical indicators for a cryptocurrency
   */
  async analyzeTechnicalIndicators(symbol: string, timeframe: '1h' | '4h' | '1d' = '1d'): Promise<TechnicalAnalysis> {
    try {
      // Generate mock price data for demonstration
      const priceData = this.generateMockPriceData(symbol, timeframe);
      
      // Calculate technical indicators
      const indicators = this.calculateIndicators(priceData);
      
      // Generate signals based on indicators
      const signals = this.generateSignals(indicators);
      
      // Determine overall trend and strength
      const { trend, strength } = this.analyzeTrend(indicators, signals);

      const analysis: TechnicalAnalysis = {
        symbol,
        indicators,
        signals,
        overallTrend: trend,
        strength,
        timeframe,
        lastUpdated: new Date()
      };

      logger.info(`Generated technical analysis for ${symbol}`, {
        trend,
        strength,
        signalCount: signals.length
      });

      return analysis;
    } catch (error) {
      logger.error(`Failed to analyze technical indicators for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Calculate all technical indicators
   */
  private calculateIndicators(priceData: PricePoint[]): TechnicalIndicators {
    const closes = priceData.map(p => p.close);
    const highs = priceData.map(p => p.high);
    const lows = priceData.map(p => p.low);
    const volumes = priceData.map(p => p.volume);

    return {
      rsi: this.calculateRSI(closes),
      macd: this.calculateMACD(closes),
      bollingerBands: this.calculateBollingerBands(closes),
      sma: this.calculateSMA(closes),
      ema: this.calculateEMA(closes),
      stochastic: this.calculateStochastic(highs, lows, closes),
      support: this.calculateSupport(lows),
      resistance: this.calculateResistance(highs)
    };
  }

  /**
   * Calculate RSI (Relative Strength Index)
   */
  private calculateRSI(closes: number[], period: number = 14): number {
    if (closes.length < period + 1) return 50; // Default neutral RSI

    let gains = 0;
    let losses = 0;

    // Calculate initial average gains and losses
    for (let i = 1; i <= period; i++) {
      const change = closes[i] - closes[i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    return Math.round(rsi * 100) / 100;
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   */
  private calculateMACD(closes: number[]): { macd: number; signal: number; histogram: number } {
    const ema12 = this.calculateEMAValue(closes, 12);
    const ema26 = this.calculateEMAValue(closes, 26);
    const macd = ema12 - ema26;
    
    // Simplified signal line calculation (normally EMA of MACD)
    const signal = macd * 0.9; // Approximation
    const histogram = macd - signal;

    return {
      macd: Math.round(macd * 10000) / 10000,
      signal: Math.round(signal * 10000) / 10000,
      histogram: Math.round(histogram * 10000) / 10000
    };
  }

  /**
   * Calculate Bollinger Bands
   */
  private calculateBollingerBands(closes: number[], period: number = 20): { upper: number; middle: number; lower: number } {
    const sma = this.calculateSMAValue(closes, period);
    const standardDeviation = this.calculateStandardDeviation(closes.slice(-period), sma);
    
    return {
      upper: Math.round((sma + (standardDeviation * 2)) * 100) / 100,
      middle: Math.round(sma * 100) / 100,
      lower: Math.round((sma - (standardDeviation * 2)) * 100) / 100
    };
  }

  /**
   * Calculate Simple Moving Averages
   */
  private calculateSMA(closes: number[]): { sma20: number; sma50: number; sma200: number } {
    return {
      sma20: this.calculateSMAValue(closes, 20),
      sma50: this.calculateSMAValue(closes, 50),
      sma200: this.calculateSMAValue(closes, 200)
    };
  }

  /**
   * Calculate Exponential Moving Averages
   */
  private calculateEMA(closes: number[]): { ema12: number; ema26: number } {
    return {
      ema12: this.calculateEMAValue(closes, 12),
      ema26: this.calculateEMAValue(closes, 26)
    };
  }

  /**
   * Calculate Stochastic Oscillator
   */
  private calculateStochastic(highs: number[], lows: number[], closes: number[], period: number = 14): { k: number; d: number } {
    const recentHighs = highs.slice(-period);
    const recentLows = lows.slice(-period);
    const currentClose = closes[closes.length - 1];
    
    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);
    
    const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    const d = k * 0.9; // Simplified D line calculation
    
    return {
      k: Math.round(k * 100) / 100,
      d: Math.round(d * 100) / 100
    };
  }

  /**
   * Calculate support level
   */
  private calculateSupport(lows: number[]): number {
    const recentLows = lows.slice(-20);
    return Math.min(...recentLows);
  }

  /**
   * Calculate resistance level
   */
  private calculateResistance(highs: number[]): number {
    const recentHighs = highs.slice(-20);
    return Math.max(...recentHighs);
  }

  /**
   * Helper: Calculate SMA value
   */
  private calculateSMAValue(closes: number[], period: number): number {
    if (closes.length < period) return closes[closes.length - 1];
    
    const recentCloses = closes.slice(-period);
    const sum = recentCloses.reduce((acc, val) => acc + val, 0);
    return Math.round((sum / period) * 100) / 100;
  }

  /**
   * Helper: Calculate EMA value
   */
  private calculateEMAValue(closes: number[], period: number): number {
    if (closes.length < period) return closes[closes.length - 1];
    
    const multiplier = 2 / (period + 1);
    let ema = closes[0];
    
    for (let i = 1; i < closes.length; i++) {
      ema = (closes[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return Math.round(ema * 100) / 100;
  }

  /**
   * Helper: Calculate standard deviation
   */
  private calculateStandardDeviation(values: number[], mean: number): number {
    const squaredDifferences = values.map(value => Math.pow(value - mean, 2));
    const variance = squaredDifferences.reduce((acc, val) => acc + val, 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Generate trading signals based on indicators
   */
  private generateSignals(indicators: TechnicalIndicators): TechnicalSignal[] {
    const signals: TechnicalSignal[] = [];

    // RSI signals
    if (indicators.rsi > 70) {
      signals.push({
        type: 'sell',
        indicator: 'RSI',
        strength: Math.min(100, (indicators.rsi - 70) * 3),
        description: `RSI is overbought at ${indicators.rsi}`,
        confidence: 0.7
      });
    } else if (indicators.rsi < 30) {
      signals.push({
        type: 'buy',
        indicator: 'RSI',
        strength: Math.min(100, (30 - indicators.rsi) * 3),
        description: `RSI is oversold at ${indicators.rsi}`,
        confidence: 0.7
      });
    }

    // MACD signals
    if (indicators.macd.macd > indicators.macd.signal && indicators.macd.histogram > 0) {
      signals.push({
        type: 'buy',
        indicator: 'MACD',
        strength: Math.min(100, Math.abs(indicators.macd.histogram) * 1000),
        description: 'MACD bullish crossover detected',
        confidence: 0.8
      });
    } else if (indicators.macd.macd < indicators.macd.signal && indicators.macd.histogram < 0) {
      signals.push({
        type: 'sell',
        indicator: 'MACD',
        strength: Math.min(100, Math.abs(indicators.macd.histogram) * 1000),
        description: 'MACD bearish crossover detected',
        confidence: 0.8
      });
    }

    // Moving Average signals
    if (indicators.sma.sma20 > indicators.sma.sma50 && indicators.sma.sma50 > indicators.sma.sma200) {
      signals.push({
        type: 'buy',
        indicator: 'SMA',
        strength: 75,
        description: 'Golden cross pattern - all SMAs aligned bullishly',
        confidence: 0.85
      });
    } else if (indicators.sma.sma20 < indicators.sma.sma50 && indicators.sma.sma50 < indicators.sma.sma200) {
      signals.push({
        type: 'sell',
        indicator: 'SMA',
        strength: 75,
        description: 'Death cross pattern - all SMAs aligned bearishly',
        confidence: 0.85
      });
    }

    // Stochastic signals
    if (indicators.stochastic.k > 80 && indicators.stochastic.d > 80) {
      signals.push({
        type: 'sell',
        indicator: 'Stochastic',
        strength: 60,
        description: 'Stochastic indicates overbought conditions',
        confidence: 0.6
      });
    } else if (indicators.stochastic.k < 20 && indicators.stochastic.d < 20) {
      signals.push({
        type: 'buy',
        indicator: 'Stochastic',
        strength: 60,
        description: 'Stochastic indicates oversold conditions',
        confidence: 0.6
      });
    }

    return signals;
  }

  /**
   * Analyze overall trend and strength
   */
  private analyzeTrend(indicators: TechnicalIndicators, signals: TechnicalSignal[]): { trend: 'bullish' | 'bearish' | 'neutral'; strength: number } {
    let bullishScore = 0;
    let bearishScore = 0;

    // Score based on indicators
    if (indicators.rsi > 50) bullishScore += 1;
    else bearishScore += 1;

    if (indicators.macd.macd > 0) bullishScore += 1;
    else bearishScore += 1;

    if (indicators.sma.sma20 > indicators.sma.sma50) bullishScore += 2;
    else bearishScore += 2;

    if (indicators.ema.ema12 > indicators.ema.ema26) bullishScore += 1;
    else bearishScore += 1;

    // Score based on signals
    signals.forEach(signal => {
      if (signal.type === 'buy') bullishScore += signal.strength / 50;
      else if (signal.type === 'sell') bearishScore += signal.strength / 50;
    });

    const totalScore = bullishScore + bearishScore;
    const bullishPercentage = totalScore > 0 ? (bullishScore / totalScore) * 100 : 50;

    let trend: 'bullish' | 'bearish' | 'neutral';
    if (bullishPercentage > 60) trend = 'bullish';
    else if (bullishPercentage < 40) trend = 'bearish';
    else trend = 'neutral';

    const strength = Math.round(Math.abs(bullishPercentage - 50) * 2);

    return { trend, strength };
  }

  /**
   * Generate mock price data for demonstration
   */
  private generateMockPriceData(symbol: string, timeframe: string): PricePoint[] {
    const data: PricePoint[] = [];
    const periods = 200; // Generate 200 data points
    let basePrice = 50000; // Starting price

    for (let i = 0; i < periods; i++) {
      const timestamp = new Date();
      timestamp.setHours(timestamp.getHours() - (periods - i));

      // Generate realistic price movement
      const change = (Math.random() - 0.5) * 0.02; // ±1% change
      basePrice = basePrice * (1 + change);

      const volatility = basePrice * 0.005; // 0.5% volatility
      const open = basePrice;
      const high = basePrice + (Math.random() * volatility);
      const low = basePrice - (Math.random() * volatility);
      const close = low + (Math.random() * (high - low));
      const volume = Math.floor(Math.random() * 1000000) + 100000;

      data.push({
        timestamp,
        open,
        high,
        low,
        close,
        volume
      });

      basePrice = close; // Use close as next base price
    }

    return data;
  }

  /**
   * Get technical analysis summary for multiple timeframes
   */
  async getMultiTimeframeAnalysis(symbol: string): Promise<any> {
    try {
      const timeframes = ['1h', '4h', '1d'] as const;
      const analyses = await Promise.all(
        timeframes.map(tf => this.analyzeTechnicalIndicators(symbol, tf))
      );

      return {
        symbol,
        timeframes: timeframes.reduce((acc, tf, index) => {
          acc[tf] = {
            trend: analyses[index].overallTrend,
            strength: analyses[index].strength,
            keySignals: analyses[index].signals.slice(0, 3)
          };
          return acc;
        }, {} as any),
        consensus: this.calculateConsensus(analyses),
        lastUpdated: new Date()
      };
    } catch (error) {
      logger.error(`Failed to get multi-timeframe analysis for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Calculate consensus across multiple timeframes
   */
  private calculateConsensus(analyses: TechnicalAnalysis[]): { trend: string; confidence: number } {
    const trends = analyses.map(a => a.overallTrend);
    const bullishCount = trends.filter(t => t === 'bullish').length;
    const bearishCount = trends.filter(t => t === 'bearish').length;
    const neutralCount = trends.filter(t => t === 'neutral').length;

    let consensus = 'neutral';
    let confidence = 0;

    if (bullishCount > bearishCount && bullishCount > neutralCount) {
      consensus = 'bullish';
      confidence = (bullishCount / trends.length) * 100;
    } else if (bearishCount > bullishCount && bearishCount > neutralCount) {
      consensus = 'bearish';
      confidence = (bearishCount / trends.length) * 100;
    } else {
      confidence = (neutralCount / trends.length) * 100;
    }

    return { trend: consensus, confidence: Math.round(confidence) };
  }
}

export default TechnicalIndicatorService;
export { TechnicalAnalysis, TechnicalIndicators, TechnicalSignal, PricePoint }; 