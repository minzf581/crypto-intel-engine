import React, { useState, useEffect } from 'react';
import {
  ShieldCheckIcon,
  HeartIcon,
  ChatBubbleLeftRightIcon,
  ArrowPathIcon,
  EyeIcon,
  CalendarIcon,
  CheckCircleIcon,
  UserGroupIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { TwitterAccount, RecentTweet } from '../types/socialSentiment';
import { socialSentimentApi } from '../services/socialSentimentApi';

interface AccountPreviewCardProps {
  account: TwitterAccount;
  isSelected: boolean;
  onToggleSelect: () => void;
  coinSymbol: string;
  isMonitored?: boolean;
  onMonitoringStatusChange?: (accountId: string, isMonitored: boolean) => void;
}

const AccountPreviewCard: React.FC<AccountPreviewCardProps> = ({
  account,
  isSelected,
  onToggleSelect,
  coinSymbol,
  isMonitored: initialIsMonitored = false,
  onMonitoringStatusChange
}) => {
  const [recentTweets, setRecentTweets] = useState<RecentTweet[]>([]);
  const [isLoadingTweets, setIsLoadingTweets] = useState(false);
  const [showTweets, setShowTweets] = useState(false);
  const [isMonitored, setIsMonitored] = useState(initialIsMonitored);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  useEffect(() => {
    checkMonitoringStatus();
  }, [account.id, coinSymbol]);

  useEffect(() => {
    setIsMonitored(initialIsMonitored);
  }, [initialIsMonitored]);

  const checkMonitoringStatus = async () => {
    setIsCheckingStatus(true);
    try {
      const response = await socialSentimentApi.checkAccountsMonitoringStatus(coinSymbol, [account.id]);
      
      if (response.success && response.data.accountStatuses.length > 0) {
        const status = response.data.accountStatuses[0];
        setIsMonitored(status.isMonitored);
        onMonitoringStatusChange?.(account.id, status.isMonitored);
      }
    } catch (error) {
      console.error('Failed to check monitoring status:', error);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  const getSentimentColor = (sentiment: 'positive' | 'negative' | 'neutral'): string => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-300';
      case 'negative': return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-300';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const loadRecentTweets = async () => {
    if (recentTweets.length > 0) return; // Already loaded

    setIsLoadingTweets(true);
    try {
      const response = await socialSentimentApi.getAccountPosts(account.id, { 
        limit: 3,
        coinSymbol 
      });
      
      // Transform the response to match RecentTweet interface
      const tweets: RecentTweet[] = response.data.map((post: any) => ({
        id: post.id,
        text: post.content,
        publishedAt: post.publishedAt,
        retweetCount: post.retweetCount || 0,
        likeCount: post.likeCount || 0,
        replyCount: post.replyCount || 0,
        sentimentScore: post.sentimentScore || 0,
        sentiment: post.sentiment || 'neutral'
      }));
      
      setRecentTweets(tweets);
    } catch (error) {
      console.error('Failed to load recent tweets:', error);
      // Set empty array to prevent retry
      setRecentTweets([]);
    } finally {
      setIsLoadingTweets(false);
    }
  };

  const handleShowTweets = () => {
    if (!showTweets) {
      loadRecentTweets();
    }
    setShowTweets(!showTweets);
  };

  const getAccountCategoryBadge = () => {
    if (!account.accountCategory) return null;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${account.accountCategory.color}`}>
        <span className="mr-1">{account.accountCategory.icon}</span>
        {account.accountCategory.name}
      </span>
    );
  };

  const getEngagementRate = (): number => {
    if (account.engagementMetrics) {
      return account.engagementMetrics.engagementRate;
    }
    
    // Calculate basic engagement rate if metrics available
    if (account.followersCount && recentTweets.length > 0) {
      const avgEngagement = recentTweets.reduce((sum, tweet) => 
        sum + tweet.likeCount + tweet.retweetCount + tweet.replyCount, 0
      ) / recentTweets.length;
      return (avgEngagement / account.followersCount) * 100;
    }
    
    return 0;
  };

  return (
    <div className={`bg-white dark:bg-gray-800 border-2 rounded-lg p-4 transition-all duration-200 hover:shadow-md ${
      isSelected 
        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start space-x-3 flex-1">
          <img
            src={account.profileImageUrl || '/default-avatar.png'}
            alt={account.displayName}
            className="h-12 w-12 rounded-full flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {account.displayName}
              </h3>
              {account.isVerified && (
                <ShieldCheckIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              @{account.username}
            </p>
            {getAccountCategoryBadge()}
          </div>
        </div>
        
        <button
          onClick={isMonitored ? undefined : onToggleSelect}
          disabled={isMonitored}
          className={`flex-shrink-0 p-2 rounded-full transition-colors ${
            isMonitored
              ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 cursor-not-allowed'
              : isSelected
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          title={isMonitored ? 'Already monitoring this account' : isSelected ? 'Remove from selection' : 'Add to selection'}
        >
          {isCheckingStatus ? (
            <ArrowPathIcon className="h-5 w-5 animate-spin" />
          ) : isMonitored ? (
            <CheckCircleIcon className="h-5 w-5" />
          ) : (
            <CheckCircleIcon className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Bio */}
      {account.bio && (
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-2">
          {account.bio}
        </p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 mb-1">
            <UserGroupIcon className="h-4 w-4 text-gray-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Followers</span>
          </div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {formatNumber(account.followersCount)}
          </p>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 mb-1">
            <HeartIcon className="h-4 w-4 text-gray-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Engagement</span>
          </div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {getEngagementRate().toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Influence & Relevance Scores */}
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Influence</p>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-purple-600 h-2 rounded-full" 
              style={{ width: `${Math.min(account.influenceScore * 100, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {(account.influenceScore * 100).toFixed(0)}%
          </p>
        </div>
        
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Relevance</p>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full" 
              style={{ width: `${Math.min(account.relevanceScore * 100, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {(account.relevanceScore * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Monitoring Status */}
      {isMonitored && (
        <div className="flex items-center justify-center space-x-2 mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <CheckCircleIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="text-sm font-medium text-green-700 dark:text-green-300">
            Currently Monitoring
          </span>
        </div>
      )}

      {/* Recent Tweets Toggle */}
      <button
        onClick={handleShowTweets}
        className="w-full flex items-center justify-center space-x-2 py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <EyeIcon className="h-4 w-4" />
        <span>{showTweets ? 'Hide' : 'Show'} Recent Tweets</span>
        {isLoadingTweets && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
      </button>

      {/* Recent Tweets */}
      {showTweets && (
        <div className="mt-3 space-y-3 border-t border-gray-200 dark:border-gray-700 pt-3">
          {isLoadingTweets ? (
            <div className="text-center py-4">
              <ArrowPathIcon className="h-6 w-6 animate-spin mx-auto text-gray-400" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Loading tweets...</p>
            </div>
          ) : recentTweets.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">No recent tweets found</p>
            </div>
          ) : (
            recentTweets.map((tweet) => (
              <div key={tweet.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(tweet.sentiment)}`}>
                    {tweet.sentiment}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatTimeAgo(tweet.publishedAt)}
                  </span>
                </div>
                
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 line-clamp-3">
                  {tweet.text}
                </p>
                
                <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center space-x-1">
                    <HeartIcon className="h-3 w-3" />
                    <span>{formatNumber(tweet.likeCount)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <ArrowPathIcon className="h-3 w-3" />
                    <span>{formatNumber(tweet.retweetCount)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <ChatBubbleLeftRightIcon className="h-3 w-3" />
                    <span>{formatNumber(tweet.replyCount)}</span>
                  </div>
                  <div className="ml-auto">
                    <span className="font-medium">
                      Score: {tweet.sentimentScore.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AccountPreviewCard; 