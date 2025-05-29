import React, { useState, useEffect } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { ChartBarIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';

interface SentimentData {
  timestamp: string;
  sentiment: number; // 0-100
  price: number;
  volume?: number;
}

interface SentimentChartProps {
  symbol: string;
  timeRange?: '1h' | '6h' | '24h' | '7d';
}

const SentimentChart: React.FC<SentimentChartProps> = ({ 
  symbol, 
  timeRange = '24h' 
}) => {
  const { getAssetBySymbol, isLoading, data: dashboardData } = useDashboard();
  const [data, setData] = useState<SentimentData[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number | null>(null);

  // Simulate sentiment data (should fetch from API in actual project)
  const generateMockSentimentData = (priceData: number) => {
    const now = Date.now();
    const points = timeRange === '1h' ? 12 : timeRange === '6h' ? 24 : timeRange === '24h' ? 48 : 168;
    const interval = timeRange === '1h' ? 5 * 60 * 1000 : 
                   timeRange === '6h' ? 15 * 60 * 1000 :
                   timeRange === '24h' ? 30 * 60 * 1000 : 
                   60 * 60 * 1000;

    const mockData: SentimentData[] = [];
    
    for (let i = points; i >= 0; i--) {
      const timestamp = new Date(now - (i * interval)).toISOString();
      
      // Simulate price changes (based on real price)
      const priceVariation = (Math.random() - 0.5) * 0.1; // ±5%
      const price = priceData * (1 + priceVariation);
      
      // Simulate sentiment correlation with price
      const baseSentiment = 50;
      const priceInfluence = priceVariation * 200; // Price change affects sentiment
      const randomNoise = (Math.random() - 0.5) * 30;
      const sentiment = Math.max(0, Math.min(100, baseSentiment + priceInfluence + randomNoise));
      
      mockData.push({
        timestamp,
        sentiment,
        price,
        volume: Math.random() * 1000000
      });
    }
    
    return mockData;
  };

  // Get price data and generate sentiment data from dashboard context
  useEffect(() => {
    const assetData = getAssetBySymbol(symbol);
    
    if (assetData && assetData.currentPrice) {
      setCurrentPrice(assetData.currentPrice);
      setPriceChange(assetData.priceChange24h);
      
      // Generate mock sentiment data
      const sentimentData = generateMockSentimentData(assetData.currentPrice);
      setData(sentimentData);
    } else {
      setCurrentPrice(null);
      setPriceChange(null);
      setData([]);
    }
  }, [symbol, getAssetBySymbol, timeRange, dashboardData]);

  // Calculate price and sentiment correlation
  const calculateCorrelation = (): number => {
    if (data.length < 2) return 0;
    
    const priceChanges = data.slice(1).map((point, i) => 
      (point.price - data[i].price) / data[i].price
    );
    const sentimentChanges = data.slice(1).map((point, i) => 
      point.sentiment - data[i].sentiment
    );
    
    if (priceChanges.length === 0) return 0;
    
    const avgPriceChange = priceChanges.reduce((a, b) => a + b, 0) / priceChanges.length;
    const avgSentimentChange = sentimentChanges.reduce((a, b) => a + b, 0) / sentimentChanges.length;
    
    let numerator = 0;
    let priceVariance = 0;
    let sentimentVariance = 0;
    
    for (let i = 0; i < priceChanges.length; i++) {
      const priceDeviation = priceChanges[i] - avgPriceChange;
      const sentimentDeviation = sentimentChanges[i] - avgSentimentChange;
      
      numerator += priceDeviation * sentimentDeviation;
      priceVariance += priceDeviation * priceDeviation;
      sentimentVariance += sentimentDeviation * sentimentDeviation;
    }
    
    const denominator = Math.sqrt(priceVariance * sentimentVariance);
    return denominator === 0 ? 0 : numerator / denominator;
  };

  const correlation = calculateCorrelation();
  const currentSentiment = data.length > 0 ? data[data.length - 1].sentiment : 50;

  // Get sentiment color
  const getSentimentColor = (sentiment: number) => {
    if (sentiment >= 70) return 'text-green-600 dark:text-green-400';
    if (sentiment >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getSentimentLabel = (sentiment: number) => {
    if (sentiment >= 75) return 'Extremely Bullish';
    if (sentiment >= 60) return 'Bullish';
    if (sentiment >= 40) return 'Neutral';
    if (sentiment >= 25) return 'Bearish';
    return 'Extremely Bearish';
  };

  // 安全的数值格式化函数
  const safeToFixed = (value: number | null | undefined, decimals: number = 2): string => {
    if (value === null || value === undefined || isNaN(value)) return '--';
    return value.toFixed(decimals);
  };

  // 安全的百分比格式化函数
  const safePercentage = (value: number | null | undefined, decimals: number = 2): string => {
    if (value === null || value === undefined || isNaN(value)) return '--';
    return `${value >= 0 ? '+' : ''}${safeToFixed(value, decimals)}%`;
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 border border-neutral-200 dark:border-neutral-700">
        <div className="animate-pulse">
          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2 mb-4"></div>
          <div className="h-32 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 border border-neutral-200 dark:border-neutral-700">
      {/* Title and controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <ChartBarIcon className="w-6 h-6 text-neutral-600 dark:text-neutral-400" />
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {symbol} Market Sentiment Analysis
          </h3>
        </div>
        
        <div className="flex items-center space-x-2">
          {['1h', '6h', '24h', '7d'].map((range) => (
            <button
              key={range}
              onClick={() => {/* Add time range switching logic here */}}
              className={`px-3 py-1 text-sm rounded-md ${
                timeRange === range
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-600'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Current metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-4">
          <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Current Sentiment</div>
          <div className={`text-xl font-bold ${getSentimentColor(currentSentiment)}`}>
            {safeToFixed(currentSentiment)}
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-300">
            {getSentimentLabel(currentSentiment)}
          </div>
        </div>
        
        <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-4">
          <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Current Price</div>
          <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
            ${safeToFixed(currentPrice)}
          </div>
          {priceChange !== null && (
            <div className={`text-sm ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {safePercentage(priceChange)} (24h)
            </div>
          )}
        </div>
        
        <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-4">
          <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Price Correlation</div>
          <div className={`text-xl font-bold ${
            Math.abs(correlation) > 0.6 ? 'text-green-600' : 
            Math.abs(correlation) > 0.3 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {safeToFixed(correlation * 100)}%
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-300">
            {Math.abs(correlation) > 0.6 ? 'Strong Correlation' : 
             Math.abs(correlation) > 0.3 ? 'Moderate Correlation' : 'Weak Correlation'}
          </div>
        </div>
      </div>

      {/* Simplified chart display */}
      <div className="space-y-4">
        <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Sentiment Trend (Last {timeRange})
        </div>
        
        {/* Sentiment bars */}
        <div className="space-y-2">
          {data.slice(-10).map((point, index) => {
            const time = new Date(point.timestamp).toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit' 
            });
            
            return (
              <div key={index} className="flex items-center space-x-3">
                <div className="text-xs text-neutral-500 dark:text-neutral-400 w-12">
                  {time}
                </div>
                <div className="flex-1 bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      point.sentiment >= 70 ? 'bg-green-500' :
                      point.sentiment >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${point.sentiment}%` }}
                  />
                </div>
                <div className="text-xs text-neutral-600 dark:text-neutral-400 w-8">
                  {safeToFixed(point.sentiment, 0)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Analysis insights */}
      <div className="mt-6 p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <ArrowTrendingUpIcon className="w-4 h-4 text-primary-600" />
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Analysis Insights
          </span>
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {correlation > 0.3 ? 
            `${symbol} market sentiment shows positive correlation with price, sentiment tends to rise when price increases.` :
            correlation < -0.3 ?
            `${symbol} market sentiment shows negative correlation with price, there may be contrarian investment opportunities.` :
            `${symbol} market sentiment has weak correlation with price, recommend combining with other indicators for analysis.`
          }
          Current market sentiment is {getSentimentLabel(currentSentiment)}.
        </p>
      </div>
    </div>
  );
};

export default SentimentChart; 