import React, { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon,
} from '@heroicons/react/24/outline';
import { socialSentimentApi } from '../services/socialSentimentApi';

interface SentimentTrendData {
  timestamps: string[];
  sentimentScores: number[];
  volumeData: number[];
  trendDirection: 'bullish' | 'bearish' | 'neutral';
  momentum: number;
}

interface SentimentTrendChartProps {
  coinSymbol: string;
  coinName: string;
  timeframe: '1h' | '4h' | '24h' | '7d';
  onTimeframeChange: (timeframe: '1h' | '4h' | '24h' | '7d') => void;
}

const safeToFixed = (value: number | null | undefined, decimals: number = 2): string => {
  if (value === null || value === undefined || isNaN(value)) return '--';
  return Number(value).toFixed(decimals);
};

const SentimentTrendChart: React.FC<SentimentTrendChartProps> = ({
  coinSymbol,
  coinName,
  timeframe,
  onTimeframeChange,
}) => {
  const [trendData, setTrendData] = useState<SentimentTrendData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTrendData();
  }, [coinSymbol, timeframe]);

  const loadTrendData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await socialSentimentApi.getSentimentTrend(coinSymbol, timeframe);
      setTrendData(response.data);
    } catch (error) {
      console.error('Failed to load sentiment trend:', error);
      setError('Failed to load sentiment trend data');
    } finally {
      setIsLoading(false);
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'bullish':
        return <ArrowTrendingUpIcon className="h-5 w-5 text-green-600" />;
      case 'bearish':
        return <ArrowTrendingDownIcon className="h-5 w-5 text-red-600" />;
      default:
        return <MinusIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'bullish':
        return 'text-green-600';
      case 'bearish':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getMomentumIcon = (momentum: number) => {
    if (momentum > 0.1) return <ArrowUpIcon className="h-4 w-4 text-green-600" />;
    if (momentum < -0.1) return <ArrowDownIcon className="h-4 w-4 text-red-600" />;
    return <MinusIcon className="h-4 w-4 text-gray-600" />;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    if (timeframe === '1h' || timeframe === '4h') {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderChart = () => {
    if (!trendData || trendData.timestamps.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          No trend data available
        </div>
      );
    }

    const maxSentiment = Math.max(...(trendData.sentimentScores?.map(Math.abs) || [0]));
    const maxVolume = Math.max(...(trendData.volumeData || [0]));

    return (
      <div className="space-y-4">
        {/* Chart Area */}
        <div className="relative h-64 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="flex items-end justify-between h-full space-x-1">
            {trendData.timestamps.map((timestamp, index) => {
              const sentimentScore = trendData.sentimentScores[index];
              const volume = trendData.volumeData[index];
              
              const sentimentHeight = Math.abs(sentimentScore) / maxSentiment * 100;
              const volumeHeight = volume / maxVolume * 40;
              
              return (
                <div key={timestamp} className="flex flex-col items-center space-y-1 flex-1">
                  {/* Sentiment Bar */}
                  <div className="flex flex-col items-center justify-end h-32">
                    {sentimentScore !== 0 && (
                      <div
                        className={`w-3 rounded-t ${
                          sentimentScore > 0 
                            ? 'bg-green-500' 
                            : 'bg-red-500'
                        }`}
                        style={{ height: `${sentimentHeight}%` }}
                        title={`Sentiment: ${safeToFixed(sentimentScore, 2)}`}
                      />
                    )}
                  </div>
                  
                  {/* Volume Bar */}
                  <div
                    className="w-2 bg-blue-300 dark:bg-blue-600 rounded"
                    style={{ height: `${volumeHeight}px` }}
                    title={`Volume: ${volume} posts`}
                  />
                  
                  {/* Timestamp */}
                  <span className="text-xs text-gray-500 dark:text-gray-400 transform -rotate-45 origin-left">
                    {formatTimestamp(timestamp)}
                  </span>
                </div>
              );
            })}
          </div>
          
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>+{safeToFixed(maxSentiment, 1)}</span>
            <span>0</span>
            <span>-{safeToFixed(maxSentiment, 1)}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-gray-700 dark:text-gray-300">Positive Sentiment</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-gray-700 dark:text-gray-300">Negative Sentiment</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-3 bg-blue-300 dark:bg-blue-600 rounded"></div>
            <span className="text-gray-700 dark:text-gray-300">Post Volume</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <ChartBarIcon className="h-6 w-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Sentiment Trend - {coinName} ({coinSymbol})
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Real-time sentiment analysis over time
            </p>
          </div>
        </div>

        {/* Timeframe Selector */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          {(['1h', '4h', '24h', '7d'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                timeframe === tf
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Trend Summary */}
      {trendData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              {getTrendIcon(trendData.trendDirection)}
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Trend Direction
                </p>
                <p className={`text-lg font-bold capitalize ${getTrendColor(trendData.trendDirection)}`}>
                  {trendData.trendDirection}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              {getMomentumIcon(trendData.momentum)}
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Momentum
                </p>
                <p className={`text-lg font-bold ${
                  trendData.momentum > 0 ? 'text-green-600' : 
                  trendData.momentum < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {trendData.momentum > 0 ? '+' : ''}{safeToFixed(trendData.momentum, 3)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <ChartBarIcon className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Total Posts
                </p>
                <p className="text-lg font-bold text-blue-600">
                  {trendData?.volumeData ? trendData.volumeData.reduce((sum, vol) => sum + vol, 0) : 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-64 text-red-600">
          {error}
        </div>
      ) : (
        renderChart()
      )}
    </div>
  );
};

export default SentimentTrendChart; 