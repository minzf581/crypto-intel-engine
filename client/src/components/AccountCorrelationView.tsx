import React, { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  UserIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  TagIcon,
  EyeIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { socialSentimentApi } from '../services/socialSentimentApi';

interface TwitterAccount {
  id: string;
  username: string;
  displayName: string;
  bio?: string;
  followersCount: number;
  isVerified: boolean;
  profileImageUrl?: string;
  influenceScore: number;
  relevanceScore: number;
}

interface AccountCoinRelevance {
  id: string;
  accountId: string;
  coinSymbol: string;
  relevanceScore: number;
  mentionFrequency: number;
  lastMentionAt: Date;
  totalMentions: number;
  avgSentiment: number;
  predictionAccuracy: number;
}

interface HistoricalCorrelation {
  date: string;
  priceChange: number;
  sentimentScore: number;
  correlation: number;
}

interface KeywordData {
  word: string;
  frequency: number;
  sentiment: number;
}

interface TwitterPost {
  id: string;
  content: string;
  publishedAt: Date;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;
  impact: 'low' | 'medium' | 'high';
  impactScore: number;
  engagementMetrics: {
    likes: number;
    retweets: number;
    replies: number;
  };
}

interface AccountCorrelationData {
  account: TwitterAccount;
  relevance: AccountCoinRelevance;
  historicalCorrelation: HistoricalCorrelation[];
  recentActivity: TwitterPost[];
  keywordCloud: KeywordData[];
  predictionAccuracy: number;
}

interface AccountCorrelationViewProps {
  coinSymbol: string;
  coinName: string;
}

const safeToFixed = (value: number | null | undefined, decimals: number = 2): string => {
  if (value === null || value === undefined || isNaN(value)) return '--';
  return Number(value).toFixed(decimals);
};

const AccountCorrelationView: React.FC<AccountCorrelationViewProps> = ({
  coinSymbol,
  coinName
}) => {
  const [correlationData, setCorrelationData] = useState<AccountCorrelationData[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<AccountCorrelationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadCorrelationData();
  }, [coinSymbol, timeRange]);

  const loadCorrelationData = async () => {
    setIsLoading(true);
    try {
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const response = await socialSentimentApi.getAccountCorrelation(coinSymbol, days);
      setCorrelationData(response.data);
    } catch (error) {
      console.error('Failed to load correlation data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCorrelationColor = (correlation: number) => {
    if (correlation > 0.7) return 'text-green-600';
    if (correlation > 0.4) return 'text-yellow-600';
    if (correlation > 0) return 'text-orange-600';
    return 'text-red-600';
  };

  const getCorrelationBadge = (correlation: number) => {
    if (correlation > 0.7) return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
    if (correlation > 0.4) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
    if (correlation > 0) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
    return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
  };

  const formatCorrelationLabel = (correlation: number) => {
    if (correlation > 0.7) return 'Strong';
    if (correlation > 0.4) return 'Moderate';
    if (correlation > 0) return 'Weak';
    return 'Negative';
  };

  const renderAccountList = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Account Correlation for {coinName} ({coinSymbol})
        </h3>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
          className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
        </select>
      </div>

      {/* Data Quality Warning */}
      {correlationData.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Data Analysis Notice
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Correlation analysis is based on available social media posts and estimated price movements. 
                For production use, this should be integrated with real-time price data APIs.
              </p>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Loading correlation data...</p>
        </div>
      ) : correlationData.length === 0 ? (
        <div className="text-center py-8">
          <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            No monitored accounts found for {coinSymbol}
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            Add accounts to monitoring from the Search or Recommended tabs to see correlation data
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {correlationData.map((data) => {
            const avgCorrelation = data.historicalCorrelation.reduce((sum, item) => sum + item.correlation, 0) / data.historicalCorrelation.length || 0;
            
            return (
              <div
                key={data.account.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedAccount(data)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {data.account.profileImageUrl ? (
                        <img
                          src={data.account.profileImageUrl}
                          alt={data.account.displayName}
                          className="h-12 w-12 rounded-full"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                          <UserIcon className="h-6 w-6 text-gray-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {data.account.displayName}
                        </p>
                        {data.account.isVerified && (
                          <span className="text-blue-500">✓</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        @{data.account.username}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>{data.account.followersCount.toLocaleString()} followers</span>
                        <span>{data.relevance.totalMentions} mentions</span>
                        <span>Accuracy: {safeToFixed((data.predictionAccuracy || 0) * 100, 1)}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCorrelationBadge(avgCorrelation)}`}>
                      {formatCorrelationLabel(avgCorrelation)}
                    </span>
                    <span className={`text-lg font-bold ${getCorrelationColor(avgCorrelation)}`}>
                      {safeToFixed((avgCorrelation || 0) * 100, 1)}%
                    </span>
                    <ArrowRightIcon className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderAccountDetail = () => {
    if (!selectedAccount) return null;

    const avgCorrelation = selectedAccount.historicalCorrelation.reduce((sum, item) => sum + item.correlation, 0) / selectedAccount.historicalCorrelation.length || 0;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedAccount(null)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            ← Back to List
          </button>
        </div>

        {/* Account Header */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              {selectedAccount.account.profileImageUrl ? (
                <img
                  src={selectedAccount.account.profileImageUrl}
                  alt={selectedAccount.account.displayName}
                  className="h-16 w-16 rounded-full"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                  <UserIcon className="h-8 w-8 text-gray-500" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {selectedAccount.account.displayName}
                </h2>
                {selectedAccount.account.isVerified && (
                  <span className="text-blue-500 text-xl">✓</span>
                )}
              </div>
              <p className="text-gray-600 dark:text-gray-400">@{selectedAccount.account.username}</p>
              {selectedAccount.account.bio && (
                <p className="text-gray-700 dark:text-gray-300 mt-2">{selectedAccount.account.bio}</p>
              )}
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Correlation</p>
                <p className={`text-2xl font-bold ${getCorrelationColor(avgCorrelation)}`}>
                  {safeToFixed((avgCorrelation || 0) * 100, 1)}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center">
              <TagIcon className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Total Mentions</p>
                <p className="text-2xl font-bold text-green-600">
                  {selectedAccount.relevance.totalMentions}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center">
              <ArrowTrendingUpIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Accuracy</p>
                <p className="text-2xl font-bold text-purple-600">
                  {safeToFixed((selectedAccount.predictionAccuracy || 0) * 100, 1)}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center">
              <EyeIcon className="h-8 w-8 text-orange-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Avg Sentiment</p>
                <p className={`text-2xl font-bold ${
                  selectedAccount.relevance.avgSentiment > 0 ? 'text-green-600' : 
                  selectedAccount.relevance.avgSentiment < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {safeToFixed(selectedAccount.relevance.avgSentiment, 2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Keyword Cloud */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Keyword Cloud
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedAccount.keywordCloud.slice(0, 30).map((keyword, index) => (
              <span
                key={index}
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  keyword.sentiment > 0 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                    : keyword.sentiment < 0
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}
                style={{ fontSize: `${Math.max(0.75, Math.min(1.2, keyword.frequency / 10))}rem` }}
              >
                {keyword.word}
              </span>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Recent Activity
          </h4>
          <div className="space-y-4">
            {selectedAccount.recentActivity.slice(0, 5).map((post) => (
              <div key={post.id} className="border-l-4 border-gray-200 dark:border-gray-600 pl-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                      {post.content}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
                      <span className={`px-2 py-1 rounded-full ${
                        post.sentiment === 'positive' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' :
                        post.sentiment === 'negative' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {post.sentiment}
                      </span>
                      <span>{post.engagementMetrics.likes} likes</span>
                      <span>{post.engagementMetrics.retweets} retweets</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {selectedAccount ? renderAccountDetail() : renderAccountList()}
    </div>
  );
};

export default AccountCorrelationView; 