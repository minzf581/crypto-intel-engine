import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  HeartIcon,
  ArrowPathRoundedSquareIcon,
  CalendarIcon,
  UserIcon,
  ShieldCheckIcon,
  EyeIcon,
  ArrowTopRightOnSquareIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { socialSentimentApi } from '../services/socialSentimentApi';

interface TwitterPost {
  id: string;
  content: string;
  publishedAt: string;
  sentimentScore: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  impact: 'low' | 'medium' | 'high';
  impactScore: number;
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  account: {
    id: string;
    username: string;
    displayName: string;
    verified: boolean;
    followersCount: number;
    profileImageUrl?: string;
  };
}

interface PostsDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  coinSymbol: string;
  coinName: string;
  totalPosts: number;
}

const PostsDetailModal: React.FC<PostsDetailModalProps> = ({
  isOpen,
  onClose,
  coinSymbol,
  coinName,
  totalPosts,
}) => {
  const [posts, setPosts] = useState<TwitterPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState<'time' | 'engagement' | 'sentiment'>('time');
  const [filterBy, setFilterBy] = useState<'all' | 'positive' | 'negative' | 'neutral'>('all');
  const [filteredPostsCount, setFilteredPostsCount] = useState(0);

  const postsPerPage = 20;

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      loadPosts(true);
    }
  }, [isOpen, coinSymbol]);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      loadPosts(true);
    }
  }, [sortBy, filterBy]);

  const loadPosts = async (reset = false) => {
    if (reset) {
      setCurrentPage(1);
      setIsLoading(true);
    }

    try {
      // Get all monitored accounts for this coin first
      const accountsResponse = await socialSentimentApi.getMonitoredAccounts(coinSymbol);
      const monitoredAccounts = accountsResponse.data || [];

      if (monitoredAccounts.length === 0) {
        setPosts([]);
        setHasMore(false);
        setError('No monitored accounts found for this cryptocurrency.');
        return;
      }

      // Collect posts from all monitored accounts
      const allPosts: TwitterPost[] = [];
      const failedAccounts: string[] = [];
      
      for (const accountData of monitoredAccounts) {
        try {
          const accountId = accountData.account?.id || accountData.id;
          const accountUsername = accountData.account?.username || accountData.username;
          
          const postsResponse = await socialSentimentApi.getAccountPosts(
            accountId,
            {
              limit: 50,
              coinSymbol: coinSymbol,
            }
          );
          
          if (postsResponse.success && postsResponse.data && Array.isArray(postsResponse.data)) {
            allPosts.push(...postsResponse.data);
          } else {
            console.warn(`No posts data for account ${accountUsername}`);
          }
        } catch (accountError: any) {
          const accountUsername = accountData.account?.username || accountData.username || 'Unknown';
          console.warn(`Failed to load posts for account ${accountUsername}:`, accountError);
          failedAccounts.push(accountUsername);
        }
      }

      // Show information about failed accounts if any
      if (failedAccounts.length > 0 && allPosts.length === 0) {
        setError(`Unable to load posts data. This might be because the application is running in sandbox mode with mock data, or the monitored accounts don't have recent posts mentioning ${coinSymbol}.`);
      } else if (failedAccounts.length > 0) {
        console.info(`Some accounts failed to load: ${failedAccounts.join(', ')}`);
      }

      // Filter posts based on filter criteria
      let filteredPosts = allPosts;
      if (filterBy !== 'all') {
        filteredPosts = allPosts.filter(post => post.sentiment === filterBy);
      }

      // Sort posts based on sort criteria
      filteredPosts.sort((a, b) => {
        switch (sortBy) {
          case 'engagement':
            const engagementA = a.likeCount + a.retweetCount + a.replyCount;
            const engagementB = b.likeCount + b.retweetCount + b.replyCount;
            return engagementB - engagementA;
          case 'sentiment':
            return Math.abs(b.sentimentScore) - Math.abs(a.sentimentScore);
          case 'time':
          default:
            return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        }
      });

      // Paginate results
      const startIndex = reset ? 0 : (currentPage - 1) * postsPerPage;
      const endIndex = startIndex + postsPerPage;
      const paginatedPosts = filteredPosts.slice(startIndex, endIndex);

      if (reset) {
        setPosts(paginatedPosts);
      } else {
        setPosts(prev => [...prev, ...paginatedPosts]);
      }

      setHasMore(endIndex < filteredPosts.length);
      setFilteredPostsCount(filteredPosts.length);
      
      if (allPosts.length === 0) {
        setError(`No posts found for ${coinSymbol}. This might be because:\n• The application is running in sandbox mode with mock data\n• The monitored accounts don't have recent posts mentioning ${coinSymbol}\n• The posts data is still being collected`);
      } else {
        setError(null);
      }
    } catch (error: any) {
      console.error('Failed to load posts:', error);
      setError(`Failed to load posts: ${error.response?.data?.message || error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMorePosts = () => {
    if (!isLoading && hasMore) {
      setCurrentPage(prev => prev + 1);
      loadPosts(false);
    }
  };

  const getSentimentColor = (sentiment: string, score: number) => {
    if (sentiment === 'positive') return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-300';
    if (sentiment === 'negative') return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-300';
    return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
  };

  const getImpactColor = (impact: string) => {
    if (impact === 'high') return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20 dark:text-orange-300';
    if (impact === 'medium') return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-300';
    return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const openTwitterPost = (username: string, postId: string) => {
    window.open(`https://twitter.com/${username}/status/${postId}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75" onClick={onClose} />

        <div className="inline-block w-full max-w-6xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Posts for {coinName} ({coinSymbol})
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {posts.length} of {filteredPostsCount} total posts
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Filters and Sort */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sort by
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'time' | 'engagement' | 'sentiment')}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="time">Latest First</option>
                  <option value="engagement">Most Engagement</option>
                  <option value="sentiment">Strongest Sentiment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Filter by Sentiment
                </label>
                <select
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value as 'all' | 'positive' | 'negative' | 'neutral')}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="all">All Posts</option>
                  <option value="positive">Positive Only</option>
                  <option value="negative">Negative Only</option>
                  <option value="neutral">Neutral Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md">
                  <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Unable to Load Posts
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">
                    {error}
                  </p>
                  <button
                    onClick={() => {
                      setError(null);
                      setIsLoading(true);
                      loadPosts(true);
                    }}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            ) : isLoading && posts.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <ArrowPathRoundedSquareIcon className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-2" />
                  <p className="text-gray-600 dark:text-gray-400">Loading posts...</p>
                </div>
              </div>
            ) : posts.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md">
                  <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No Posts Found
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    No posts were found for {coinSymbol}. This might be because the monitored accounts 
                    don't have recent posts mentioning this cryptocurrency, or the data is still being collected.
                  </p>
                  <button
                    onClick={() => {
                      setIsLoading(true);
                      loadPosts(true);
                    }}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="border-b border-gray-200 dark:border-gray-700 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    {/* Post content here */}
                    <div className="flex items-start space-x-3">
                      {/* Account Avatar */}
                      <div className="flex-shrink-0">
                        {post.account?.profileImageUrl ? (
                          <img
                            src={post.account.profileImageUrl}
                            alt={post.account.displayName}
                            className="h-10 w-10 rounded-full"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                            <UserIcon className="h-6 w-6 text-gray-500" />
                          </div>
                        )}
                      </div>

                      {/* Post Content */}
                      <div className="flex-1 min-w-0">
                        {/* Account Info */}
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {post.account?.displayName || 'Unknown User'}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">
                            @{post.account?.username || 'unknown'}
                          </span>
                          {post.account?.verified && (
                            <ShieldCheckIcon className="h-4 w-4 text-blue-500" />
                          )}
                          <span className="text-gray-500 dark:text-gray-400 text-sm">
                            {new Date(post.publishedAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Post Text */}
                        <p className="text-gray-900 dark:text-white mb-3">
                          {post.content}
                        </p>

                        {/* Sentiment and Impact */}
                        <div className="flex items-center space-x-4 mb-3">
                          <div className="flex items-center space-x-1">
                            <span className="text-sm text-gray-500">Sentiment:</span>
                            <span className={`text-sm font-medium ${
                              post.sentiment === 'positive' ? 'text-green-600' :
                              post.sentiment === 'negative' ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {post.sentiment} ({post.sentimentScore.toFixed(2)})
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="text-sm text-gray-500">Impact:</span>
                            <span className={`text-sm font-medium ${
                              post.impact === 'high' ? 'text-red-600' :
                              post.impact === 'medium' ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                              {post.impact}
                            </span>
                          </div>
                        </div>

                        {/* Engagement Metrics */}
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <HeartIcon className="h-4 w-4" />
                            <span>{post.likeCount.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <ArrowPathRoundedSquareIcon className="h-4 w-4" />
                            <span>{post.retweetCount.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <ChatBubbleLeftRightIcon className="h-4 w-4" />
                            <span>{post.replyCount.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <EyeIcon className="h-4 w-4" />
                            <span>{post.viewCount?.toLocaleString() || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Load More Button */}
                {hasMore && (
                  <div className="p-4 text-center">
                    <button
                      onClick={() => {
                        setCurrentPage(prev => prev + 1);
                        loadPosts();
                      }}
                      disabled={isLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {isLoading ? 'Loading...' : 'Load More'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostsDetailModal; 