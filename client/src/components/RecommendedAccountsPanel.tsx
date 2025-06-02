import React, { useState, useEffect } from 'react';
import {
  UserGroupIcon,
  StarIcon,
  ShieldCheckIcon,
  PlusIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { socialSentimentApi } from '../services/socialSentimentApi';

interface RecommendedAccount {
  id: string;
  coinSymbol: string;
  coinName: string;
  twitterUsername: string;
  displayName: string;
  bio: string;
  followersCount: number;
  verified: boolean;
  profileImageUrl?: string;
  relevanceScore: number;
  category: 'founder' | 'influencer' | 'analyst' | 'news' | 'community' | 'developer';
  description: string;
  priority: number;
  isMonitored?: boolean;
  monitoringStatus?: 'active' | 'inactive' | 'pending';
}

interface RecommendedAccountsPanelProps {
  selectedCoin: string;
  coinName: string;
  onAccountAdded?: (account: RecommendedAccount) => void;
}

const categoryColors = {
  founder: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
  influencer: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  analyst: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  news: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
  community: 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-300',
  developer: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300',
};

const categoryIcons = {
  founder: '👑',
  influencer: '🌟',
  analyst: '📊',
  news: '📰',
  community: '👥',
  developer: '💻',
};

const safeToFixed = (value: number | null | undefined, decimals: number = 2): string => {
  if (value === null || value === undefined || isNaN(value)) return '--';
  return Number(value).toFixed(decimals);
};

const RecommendedAccountsPanel: React.FC<RecommendedAccountsPanelProps> = ({
  selectedCoin,
  coinName,
  onAccountAdded,
}) => {
  const [accounts, setAccounts] = useState<RecommendedAccount[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<RecommendedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'priority' | 'followers' | 'relevance'>('priority');
  const [showOnlyUnmonitored, setShowOnlyUnmonitored] = useState(false);

  useEffect(() => {
    loadRecommendedAccounts();
  }, [selectedCoin]);

  useEffect(() => {
    filterAndSortAccounts();
  }, [accounts, selectedCategory, searchQuery, sortBy, showOnlyUnmonitored]);

  const loadRecommendedAccounts = async () => {
    setIsLoading(true);
    try {
      const response = await socialSentimentApi.getRecommendedAccounts(selectedCoin);
      setAccounts(response.data.accounts);
    } catch (error) {
      console.error('Failed to load recommended accounts:', error);
      setAccounts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortAccounts = () => {
    let filtered = [...accounts];

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(account => account.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(account =>
        account.twitterUsername.toLowerCase().includes(query) ||
        account.displayName.toLowerCase().includes(query) ||
        account.description.toLowerCase().includes(query)
      );
    }

    // Filter by monitoring status
    if (showOnlyUnmonitored) {
      filtered = filtered.filter(account => !account.isMonitored);
    }

    // Sort accounts
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          return b.priority - a.priority;
        case 'followers':
          return b.followersCount - a.followersCount;
        case 'relevance':
          return b.relevanceScore - a.relevanceScore;
        default:
          return 0;
      }
    });

    setFilteredAccounts(filtered);
  };

  const addToMonitoring = async (account: RecommendedAccount) => {
    try {
      // 检查认证状态
      const token = localStorage.getItem('token');
      if (!token || token === 'undefined' || token === 'null') {
        alert('Please log in first to add accounts to monitoring.');
        return;
      }

      console.log('Adding account to monitoring:', {
        accountId: account.id,
        coinSymbol: selectedCoin,
        accountUsername: account.twitterUsername
      });

      const response = await socialSentimentApi.addRecommendedAccountToMonitoring(
        account.id,
        selectedCoin
      );

      console.log('API response:', response);

      if (response.success) {
        // Update local state
        setAccounts(prev =>
          prev.map(acc =>
            acc.id === account.id
              ? { ...acc, isMonitored: true, monitoringStatus: 'active' as const }
              : acc
          )
        );

        // Show success message
        alert(`Successfully added ${account.displayName} to monitoring for ${selectedCoin}`);
        
        // Notify parent component
        onAccountAdded?.(account);
      } else {
        throw new Error(response.message || 'Failed to add account to monitoring');
      }
    } catch (error: any) {
      console.error('Failed to add account to monitoring:', error);
      
      // 提供更详细的错误信息
      let errorMessage = 'Failed to add account to monitoring. Please try again.';
      
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        console.error('API Error Details:', {
          status,
          data,
          url: error.config?.url,
          method: error.config?.method,
          requestData: error.config?.data
        });
        
        if (status === 400) {
          errorMessage = `Bad Request: ${data.error || data.message || 'Invalid request parameters'}`;
        } else if (status === 401) {
          errorMessage = 'Authentication failed. Please log in again.';
          // 清除无效token
          localStorage.removeItem('token');
        } else if (status === 404) {
          errorMessage = 'Account not found. Please refresh the page and try again.';
        } else {
          errorMessage = `Server error (${status}): ${data.message || data.error || 'Unknown error'}`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    }
  };

  const getPriorityStars = (priority: number) => {
    const stars = [];
    const filledStars = Math.min(Math.max(Math.floor(priority / 2), 1), 5);
    
    for (let i = 0; i < 5; i++) {
      stars.push(
        <span key={i}>
          {i < filledStars ? (
            <StarIconSolid className="h-4 w-4 text-yellow-400" />
          ) : (
            <StarIcon className="h-4 w-4 text-gray-300" />
          )}
        </span>
      );
    }
    return stars;
  };

  const categories = ['all', 'founder', 'influencer', 'analyst', 'news', 'community', 'developer'];

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <UserGroupIcon className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Recommended Accounts
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Curated Twitter accounts for {coinName} ({selectedCoin})
              </p>
            </div>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {filteredAccounts.length} of {accounts.length} accounts
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 space-y-4">
          {/* Search and Category Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search accounts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : `${categoryIcons[category as keyof typeof categoryIcons]} ${category.charAt(0).toUpperCase() + category.slice(1)}`}
                </option>
              ))}
            </select>
          </div>

          {/* Sort and Filter Options */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <FunnelIcon className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'priority' | 'followers' | 'relevance')}
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-1"
                >
                  <option value="priority">Priority</option>
                  <option value="followers">Followers</option>
                  <option value="relevance">Relevance</option>
                </select>
              </div>
            </div>

            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={showOnlyUnmonitored}
                onChange={(e) => setShowOnlyUnmonitored(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700 dark:text-gray-300">Show only unmonitored</span>
            </label>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="text-center py-8">
            <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {accounts.length === 0 
                ? `No recommended accounts available for ${selectedCoin}`
                : 'No accounts match your current filters'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAccounts.map((account) => (
              <div
                key={account.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {account.profileImageUrl ? (
                        <img
                          src={account.profileImageUrl}
                          alt={account.displayName}
                          className="h-12 w-12 rounded-full"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                          <UserGroupIcon className="h-6 w-6 text-gray-500" />
                        </div>
                      )}
                    </div>

                    {/* Account Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {account.displayName}
                        </h4>
                        {account.verified && (
                          <ShieldCheckIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        )}
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${categoryColors[account.category]}`}>
                          {categoryIcons[account.category]} {account.category}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        @{account.twitterUsername}
                      </p>
                      
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 line-clamp-2">
                        {account.description}
                      </p>
                      
                      {/* Metrics */}
                      <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>{account.followersCount.toLocaleString()} followers</span>
                        <span>Relevance: {safeToFixed((account.relevanceScore || 0) * 100, 0)}%</span>
                        <div className="flex items-center space-x-1">
                          <span>Priority:</span>
                          <div className="flex space-x-0.5">
                            {getPriorityStars(account.priority)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    {account.isMonitored ? (
                      <div className="flex items-center space-x-2 text-green-600">
                        <CheckCircleIcon className="h-5 w-5" />
                        <span className="text-sm font-medium">Monitoring</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToMonitoring(account)}
                        className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                      >
                        <PlusIcon className="h-4 w-4" />
                        <span>Add to Monitoring</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendedAccountsPanel; 