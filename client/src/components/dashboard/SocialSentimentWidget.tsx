import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChatBubbleLeftRightIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  ArrowRightIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { socialSentimentApi } from '../../services/socialSentimentApi';
import { useSocialSentimentSocket } from '../../hooks/useSocialSentimentSocket';

interface SentimentSummary {
  coinSymbol: string;
  totalPosts: number;
  avgSentimentScore: number;
  sentimentDistribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
  impactDistribution: {
    low: number;
    medium: number;
    high: number;
  };
  trendingKeywords: {
    word: string;
    count: number;
    sentiment: number;
  }[];
}

interface SocialSentimentWidgetProps {
  selectedCoin?: string;
  coinName?: string;
}

const SocialSentimentWidget: React.FC<SocialSentimentWidgetProps> = ({
  selectedCoin = 'BTC',
  coinName = 'Bitcoin',
}) => {
  const navigate = useNavigate();
  const [sentimentData, setSentimentData] = useState<SentimentSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [alertCount, setAlertCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // WebSocket integration for real-time updates
  const { connected } = useSocialSentimentSocket({
    coinSymbol: selectedCoin,
    onAlert: (alert) => {
      setAlertCount(prev => prev + 1);
      // Update last update time when new alert arrives
      setLastUpdate(new Date());
    },
    onSentimentUpdate: (update) => {
      // Update sentiment data in real-time
      setSentimentData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          avgSentimentScore: update.update.sentimentScore,
          totalPosts: prev.totalPosts + update.update.postCount,
        };
      });
      setLastUpdate(new Date());
    },
    enableToastNotifications: false, // Disable for widget to avoid notification spam
  });

  useEffect(() => {
    loadSentimentData();
    // Refresh every 2 minutes
    const interval = setInterval(loadSentimentData, 120000);
    return () => clearInterval(interval);
  }, [selectedCoin]);

  const loadSentimentData = async () => {
    setIsLoading(true);
    try {
      const response = await socialSentimentApi.getSentimentSummary(selectedCoin, '24h');
      setSentimentData(response.data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load sentiment data:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
      // Set to null to show no data state instead of fake data
      setSentimentData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getSentimentTrend = () => {
    if (!sentimentData) return { icon: ArrowTrendingUpIcon, color: 'text-gray-500', label: 'neutral' };
    
    if (sentimentData.avgSentimentScore > 0.2) {
      return { icon: ArrowTrendingUpIcon, color: 'text-green-600', label: 'bullish' };
    } else if (sentimentData.avgSentimentScore < -0.2) {
      return { icon: ArrowTrendingDownIcon, color: 'text-red-600', label: 'bearish' };
    }
    return { icon: ArrowTrendingUpIcon, color: 'text-gray-500', label: 'neutral' };
  };

  const getAlertCount = () => {
    return alertCount || sentimentData?.impactDistribution.high || 0;
  };

  const sentimentTrend = getSentimentTrend();

  // 安全的数值格式化函数
  const safeToFixed = (value: number | null | undefined, decimals: number = 2): string => {
    if (value === null || value === undefined || isNaN(value)) return '--';
    return value.toFixed(decimals);
  };

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 border border-neutral-200 dark:border-neutral-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Social Sentiment
        </h3>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-neutral-500 dark:text-neutral-400">Live</span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-red-600 dark:text-red-400 mb-2">Failed to load sentiment data</p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{error}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Overall Sentiment Score */}
          <div className="text-center">
            <div className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">
              {safeToFixed(sentimentData?.avgSentimentScore, 2)}
            </div>
            <div className="text-sm text-neutral-500 dark:text-neutral-400">
              Average Sentiment Score
            </div>
          </div>

          {/* Main Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <ChatBubbleLeftRightIcon className="h-4 w-4 text-gray-400" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Posts</span>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {sentimentData?.totalPosts || 0}
              </p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <sentimentTrend.icon className={`h-4 w-4 ${sentimentTrend.color}`} />
                <span className="text-xs text-gray-500 dark:text-gray-400">Trend</span>
              </div>
              <p className={`text-lg font-bold capitalize ${sentimentTrend.color}`}>
                {sentimentTrend.label}
              </p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Alerts</span>
              </div>
              <p className="text-lg font-bold text-yellow-600">
                {getAlertCount()}
              </p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <UserGroupIcon className="h-4 w-4 text-purple-500" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Score</span>
              </div>
              <p className={`text-lg font-bold ${
                sentimentData && sentimentData.avgSentimentScore > 0 
                  ? 'text-green-600' 
                  : sentimentData && sentimentData.avgSentimentScore < 0 
                  ? 'text-red-600' 
                  : 'text-gray-600'
              }`}>
                {sentimentData?.avgSentimentScore?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>

          {/* Sentiment Distribution Bar */}
          {sentimentData && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                <span>Sentiment Distribution</span>
                <span>{coinName} ({selectedCoin})</span>
              </div>
              <div className="flex rounded-lg overflow-hidden h-2">
                <div 
                  className="bg-green-500"
                  style={{ 
                    width: `${(sentimentData.sentimentDistribution.positive / 
                      (sentimentData.sentimentDistribution.positive + 
                       sentimentData.sentimentDistribution.negative + 
                       sentimentData.sentimentDistribution.neutral)) * 100}%` 
                  }}
                />
                <div 
                  className="bg-gray-400"
                  style={{ 
                    width: `${(sentimentData.sentimentDistribution.neutral / 
                      (sentimentData.sentimentDistribution.positive + 
                       sentimentData.sentimentDistribution.negative + 
                       sentimentData.sentimentDistribution.neutral)) * 100}%` 
                  }}
                />
                <div 
                  className="bg-red-500"
                  style={{ 
                    width: `${(sentimentData.sentimentDistribution.negative / 
                      (sentimentData.sentimentDistribution.positive + 
                       sentimentData.sentimentDistribution.negative + 
                       sentimentData.sentimentDistribution.neutral)) * 100}%` 
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>Positive ({sentimentData.sentimentDistribution.positive})</span>
                <span>Neutral ({sentimentData.sentimentDistribution.neutral})</span>
                <span>Negative ({sentimentData.sentimentDistribution.negative})</span>
              </div>
            </div>
          )}

          {/* Trending Keywords */}
          {sentimentData?.trendingKeywords && sentimentData.trendingKeywords.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Trending Keywords
              </h4>
              <div className="flex flex-wrap gap-1">
                {sentimentData.trendingKeywords.slice(0, 8).map((keyword, index) => (
                  <span
                    key={index}
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      keyword.sentiment > 0 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                        : keyword.sentiment < 0
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {keyword.word}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
            <div className="flex items-center space-x-1">
              <EyeIcon className="h-3 w-3" />
              <span>Monitoring active</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialSentimentWidget; 