import React, { useState, useEffect } from 'react';
import { 
  ClockIcon, 
  HeartIcon, 
  ChatBubbleLeftIcon, 
  ArrowPathRoundedSquareIcon,
  ShareIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { socialSentimentApi } from '../services/socialSentimentApi';

interface Tweet {
  id: string;
  text: string;
  createdAt: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    profileImageUrl: string;
    isVerified: boolean;
  };
  metrics: {
    likeCount: number;
    retweetCount: number;
    replyCount: number;
    quoteCount: number;
  };
  sentiment: {
    score: number;
    label: 'positive' | 'negative' | 'neutral';
    confidence: number;
  };
  engagement: {
    rate: number;
    score: number;
  };
}

interface RealTimeTweetsProps {
  coinSymbol: string;
  monitoredAccounts: any[];
}

const RealTimeTweets: React.FC<RealTimeTweetsProps> = ({ coinSymbol, monitoredAccounts }) => {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'time' | 'engagement' | 'sentiment'>('time');
  const [expandedTweets, setExpandedTweets] = useState<Set<string>>(new Set());
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<'checking' | 'available' | 'unavailable' | 'not_configured'>('checking');

  useEffect(() => {
    checkApiAvailability();
  }, [coinSymbol]); // Only depend on coinSymbol, not apiStatus

  useEffect(() => {
    if (apiStatus === 'available') {
      loadRealTimeTweets();
      // Set up auto-refresh every 2 minutes only if API is available
      const interval = setInterval(loadRealTimeTweets, 120000);
      return () => clearInterval(interval);
    }
  }, [coinSymbol, selectedAccount, sortBy, apiStatus]);

  const checkApiAvailability = async () => {
    try {
      setApiStatus('checking');
      // Check if Twitter API is configured and available
      const response = await socialSentimentApi.checkTwitterApiStatus();
      if (response.success && response.data.isConfigured && response.data.isConnected) {
        setApiStatus('available');
        setError(null);
      } else if (response.success && response.data.isConfigured && !response.data.isConnected) {
        setApiStatus('unavailable');
        setError('Twitter API is configured but currently unavailable. Please try again later.');
      } else {
        setApiStatus('not_configured');
        setError('Twitter API is not configured. Please contact administrator to set up Twitter API access.');
      }
    } catch (error: any) {
      console.error('Failed to check Twitter API status:', error);
      setApiStatus('unavailable');
      setError('Twitter API is currently unavailable. Please try again later.');
    }
  };

  const handleEmergencyReset = async () => {
    try {
      setIsLoading(true);
      console.log('Attempting emergency rate limit reset...');
      
      // Reset the connection_test endpoint specifically
      const response = await socialSentimentApi.resetTwitterRateLimit('connection_test');
      
      if (response.success) {
        console.log('Rate limit reset successful:', response.message);
        setError(null);
        
        // Wait a moment then recheck API status
        setTimeout(() => {
          checkApiAvailability();
        }, 1000);
      } else {
        throw new Error(response.message || 'Failed to reset rate limit');
      }
    } catch (error: any) {
      console.error('Failed to reset rate limit:', error);
      setError(`Failed to reset rate limit: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRealTimeTweets = async () => {
    if (monitoredAccounts.length === 0 || apiStatus !== 'available') return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get account IDs for the selected filter
      let accountIds: string[] = [];
      if (selectedAccount === 'all') {
        accountIds = monitoredAccounts.map(account => account.id);
      } else {
        const account = monitoredAccounts.find(acc => acc.username === selectedAccount);
        if (account) {
          accountIds = [account.id];
        }
      }

      if (accountIds.length === 0) {
        setTweets([]);
        return;
      }

      // Fetch real tweets from Twitter API
      const response = await socialSentimentApi.getRealTimeTweets(coinSymbol, {
        accountIds,
        limit: 50,
        sortBy,
        includeReplies: false,
        includeRetweets: true
      });

      if (response.success && response.data.tweets) {
        setTweets(response.data.tweets);
        setLastUpdate(new Date());
        setError(null); // Clear any previous errors on success
      } else {
        throw new Error(response.message || 'Failed to fetch tweets');
      }
    } catch (error: any) {
      console.error('Failed to load real-time tweets:', error);
      
      // Handle specific error types
      if (error.response?.status === 401) {
        setError('Twitter API authentication failed. Please contact administrator.');
        setApiStatus('unavailable');
      } else if (error.response?.status === 429) {
        setError('Twitter API rate limit exceeded. Please wait a few minutes before refreshing.');
      } else if (error.response?.status === 403) {
        setError('Twitter API access forbidden. Please contact administrator to verify permissions.');
        setApiStatus('unavailable');
      } else if (error.response?.status === 503) {
        setError('Twitter API is temporarily unavailable. Please try again later.');
        setApiStatus('unavailable');
      } else if (error.message?.includes('not configured')) {
        setError('Twitter API is not configured. Please contact administrator to set up API access.');
        setApiStatus('not_configured');
      } else {
        setError('Failed to load tweets. Twitter API may be temporarily unavailable.');
      }
      
      setTweets([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getSentimentColor = (sentiment: Tweet['sentiment']) => {
    if (sentiment.label === 'positive') return 'text-green-600 bg-green-50 dark:bg-green-900/20';
    if (sentiment.label === 'negative') return 'text-red-600 bg-red-50 dark:bg-red-900/20';
    return 'text-gray-600 bg-gray-50 dark:bg-gray-700';
  };

  const getSentimentIcon = (score: number) => {
    if (score > 0.1) return '📈';
    if (score < -0.1) return '📉';
    return '➡️';
  };

  const toggleTweetExpansion = (tweetId: string) => {
    const newExpanded = new Set(expandedTweets);
    if (newExpanded.has(tweetId)) {
      newExpanded.delete(tweetId);
    } else {
      newExpanded.add(tweetId);
    }
    setExpandedTweets(newExpanded);
  };

  // Show API status messages
  if (apiStatus === 'checking') {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">Checking Twitter API Status</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Verifying API configuration and connectivity...
        </p>
      </div>
    );
  }

  if (apiStatus === 'not_configured') {
    return (
      <div className="text-center py-12">
        <InformationCircleIcon className="mx-auto h-12 w-12 text-blue-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Twitter API Not Configured</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Twitter API credentials are required to display real-time tweets.
        </p>
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Administrator:</strong> Please configure Twitter API credentials in the environment variables:
          </p>
          <ul className="mt-2 text-xs text-blue-600 dark:text-blue-400 list-disc list-inside">
            <li>TWITTER_BEARER_TOKEN</li>
            <li>TWITTER_API_KEY</li>
            <li>TWITTER_API_SECRET</li>
          </ul>
        </div>
      </div>
    );
  }

  if (apiStatus === 'unavailable') {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Twitter API Unavailable</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Unable to connect to Twitter API. The service may be temporarily down.
        </p>
        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}
        <div className="mt-4 flex justify-center space-x-3">
          <button
            onClick={checkApiAvailability}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            <ArrowPathRoundedSquareIcon className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Retry Connection
          </button>
          {error?.includes('rate limit') && (
            <button
              onClick={handleEmergencyReset}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-red-300 dark:border-red-600 text-sm font-medium rounded-md text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-50"
            >
              <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
              Emergency Reset
            </button>
          )}
        </div>
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
            What's happening?
          </h4>
          <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
            {error?.includes('rate limit') ? (
              <>
                <p>• Twitter API rate limits have been exceeded</p>
                <p>• This usually happens when too many requests are made in a short time</p>
                <p>• Rate limits typically reset every 15 minutes</p>
                <p>• The "Emergency Reset" button clears our local tracking but Twitter's limits remain</p>
              </>
            ) : (
              <>
                <p>• Twitter API connection is temporarily unavailable</p>
                <p>• This could be due to network issues or Twitter service problems</p>
                <p>• Try refreshing in a few minutes</p>
              </>
            )}
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Real-time tweets will be available once the connection is restored.
        </p>
      </div>
    );
  }

  if (monitoredAccounts.length === 0) {
    return (
      <div className="text-center py-12">
        <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No monitored accounts</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Add accounts to monitoring to see their real-time tweets.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Real-Time Tweets
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Latest tweets from monitored accounts • Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
          <div className="flex items-center mt-1">
            <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
            <span className="text-xs text-green-600 dark:text-green-400">Live Twitter API</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Account filter */}
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="block w-40 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Accounts</option>
            {monitoredAccounts.map((account) => (
              <option key={account.id} value={account.username}>
                @{account.username}
              </option>
            ))}
          </select>

          {/* Sort filter */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="block w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="time">Latest</option>
            <option value="engagement">Engagement</option>
            <option value="sentiment">Sentiment</option>
          </select>

          {/* Refresh button */}
          <button
            onClick={loadRealTimeTweets}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            <ArrowPathRoundedSquareIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && apiStatus === 'available' && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-red-900 dark:text-red-100">
                  Unable to Load Tweets
                </h4>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
              </div>
            </div>
            <button
              onClick={loadRealTimeTweets}
              disabled={isLoading}
              className="ml-4 inline-flex items-center px-3 py-1 border border-red-300 dark:border-red-600 rounded-md text-xs font-medium text-red-700 dark:text-red-300 bg-white dark:bg-red-900/20 hover:bg-red-50 dark:hover:bg-red-900/40 disabled:opacity-50"
            >
              <ArrowPathRoundedSquareIcon className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Tweets list */}
      <div className="space-y-4">
        {isLoading && tweets.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : tweets.length === 0 ? (
          <div className="text-center py-8">
            <ClockIcon className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              No recent tweets found from monitored accounts
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Tweets will appear here when accounts post new content
            </p>
          </div>
        ) : (
          tweets.map((tweet) => (
            <div
              key={tweet.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              {/* Tweet header */}
              <div className="flex items-start space-x-3 mb-3">
                <img
                  src={tweet.author.profileImageUrl}
                  alt={tweet.author.displayName}
                  className="h-10 w-10 rounded-full"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    if (target.src !== '/default-avatar.png') {
                      target.src = '/default-avatar.png';
                    }
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {tweet.author.displayName}
                    </h4>
                    {tweet.author.isVerified && (
                      <span className="text-blue-500">✓</span>
                    )}
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      @{tweet.author.username}
                    </span>
                    <span className="text-sm text-gray-400">•</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {formatTimeAgo(tweet.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tweet content */}
              <div className="mb-4">
                <p className="text-gray-900 dark:text-white text-sm leading-relaxed">
                  {tweet.text.length > 200 && !expandedTweets.has(tweet.id) 
                    ? `${tweet.text.substring(0, 200)}...`
                    : tweet.text
                  }
                  {tweet.text.length > 200 && (
                    <button
                      onClick={() => toggleTweetExpansion(tweet.id)}
                      className="ml-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      {expandedTweets.has(tweet.id) ? (
                        <span className="inline-flex items-center">
                          Show less <ChevronUpIcon className="h-4 w-4 ml-1" />
                        </span>
                      ) : (
                        <span className="inline-flex items-center">
                          Show more <ChevronDownIcon className="h-4 w-4 ml-1" />
                        </span>
                      )}
                    </button>
                  )}
                </p>
              </div>

              {/* Sentiment and engagement metrics */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Sentiment */}
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(tweet.sentiment)}`}>
                    <span className="mr-1">{getSentimentIcon(tweet.sentiment.score)}</span>
                    Sentiment: {tweet.sentiment.score.toFixed(2)}
                  </div>

                  {/* Engagement */}
                  <div className="inline-flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <span className="mr-1">📊</span>
                    Engagement: {formatNumber(tweet.engagement.score)}
                  </div>
                </div>

                {/* Tweet metrics */}
                <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center space-x-1">
                    <ChatBubbleLeftIcon className="h-4 w-4" />
                    <span>{formatNumber(tweet.metrics.replyCount)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <ArrowPathRoundedSquareIcon className="h-4 w-4" />
                    <span>{formatNumber(tweet.metrics.retweetCount)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <HeartIcon className="h-4 w-4" />
                    <span>{formatNumber(tweet.metrics.likeCount)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Auto-refresh indicator */}
      <div className="text-center">
        <p className="text-xs text-gray-400">
          Auto-refreshes every 2 minutes • Using live Twitter API data
        </p>
      </div>
    </div>
  );
};

export default RealTimeTweets; 