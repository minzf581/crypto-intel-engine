import React, { useState } from 'react';
import {
  ClockIcon,
  BookmarkIcon,
  FireIcon,
  StarIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  TrashIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import {
  SearchHistory,
  SavedSearch,
  PopularSearch,
  PopularAccount
} from '../types/socialSentiment';

interface SearchHistoryPanelProps {
  searchHistory: SearchHistory[];
  savedSearches: SavedSearch[];
  popularSearches: PopularSearch[];
  popularAccounts: PopularAccount[];
  onSelectSearch: (search: SearchHistory | SavedSearch) => void;
  onClose: () => void;
}

const SearchHistoryPanel: React.FC<SearchHistoryPanelProps> = ({
  searchHistory,
  savedSearches,
  popularSearches,
  popularAccounts,
  onSelectSearch,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'history' | 'saved' | 'popular' | 'accounts'>('history');

  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const renderHistoryTab = () => (
    <div className="space-y-3">
      {searchHistory.length === 0 ? (
        <div className="text-center py-8">
          <ClockIcon className="mx-auto h-8 w-8 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No search history yet</p>
        </div>
      ) : (
        searchHistory.map((search) => (
          <div
            key={search.id}
            onClick={() => onSelectSearch(search)}
            className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {search.query}
                  </p>
                </div>
                <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                  <span>{search.coinSymbol}</span>
                  <span>{search.resultsCount} results</span>
                  <span>{formatTimeAgo(search.timestamp)}</span>
                </div>
                {search.filters.accountCategories.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {search.filters.accountCategories.map((category) => (
                      <span
                        key={category}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderSavedTab = () => (
    <div className="space-y-3">
      {savedSearches.length === 0 ? (
        <div className="text-center py-8">
          <BookmarkIcon className="mx-auto h-8 w-8 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No saved searches yet</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Save frequently used searches for quick access</p>
        </div>
      ) : (
        savedSearches.map((search) => (
          <div
            key={search.id}
            onClick={() => onSelectSearch(search)}
            className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <BookmarkIcon className="h-4 w-4 text-yellow-500" />
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {search.name}
                  </p>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {search.query}
                </p>
                <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                  <span>{search.coinSymbol}</span>
                  <span>Used {search.useCount} times</span>
                  <span>Last used {formatTimeAgo(search.lastUsed)}</span>
                </div>
              </div>
              <button className="text-gray-400 hover:text-red-500">
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderPopularTab = () => (
    <div className="space-y-3">
      {popularSearches.length === 0 ? (
        <div className="text-center py-8">
          <FireIcon className="mx-auto h-8 w-8 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No popular searches yet</p>
        </div>
      ) : (
        popularSearches.map((search, index) => (
          <div
            key={`${search.query}-${search.coinSymbol}`}
            onClick={() => onSelectSearch({
              id: `popular-${index}`,
              query: search.query,
              filters: {
                minFollowers: 1000,
                includeVerified: true,
                accountCategories: [],
                hasRecentActivity: true
              },
              timestamp: search.lastSearched,
              resultsCount: 0,
              coinSymbol: search.coinSymbol,
              coinName: search.coinName,
              userId: 'popular'
            })}
            className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-6 h-6 bg-orange-100 dark:bg-orange-900/20 rounded-full">
                  <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
                    {index + 1}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {search.query}
                  </p>
                  <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>{search.coinSymbol}</span>
                    <span>•</span>
                    <span>{search.searchCount} searches</span>
                  </div>
                </div>
              </div>
              <FireIcon className="h-4 w-4 text-orange-500" />
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderAccountsTab = () => (
    <div className="space-y-3">
      {popularAccounts.length === 0 ? (
        <div className="text-center py-8">
          <UserGroupIcon className="mx-auto h-8 w-8 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No popular accounts yet</p>
        </div>
      ) : (
        popularAccounts.map((item, index) => (
          <div
            key={item.account.id}
            className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-6 h-6 bg-pink-100 dark:bg-pink-900/20 rounded-full">
                  <span className="text-xs font-bold text-pink-600 dark:text-pink-400">
                    {index + 1}
                  </span>
                </div>
                <img
                  src={item.account.profileImageUrl || '/default-avatar.png'}
                  alt={item.account.displayName}
                  className="h-8 w-8 rounded-full"
                />
                <div>
                  <div className="flex items-center space-x-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {item.account.displayName}
                    </p>
                    {item.account.isVerified && (
                      <StarIcon className="h-3 w-3 text-blue-500" />
                    )}
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>@{item.account.username}</span>
                    <span>•</span>
                    <span>{item.addedToMonitoringCount} times added</span>
                  </div>
                </div>
              </div>
              <HeartIcon className="h-4 w-4 text-pink-500" />
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Search History & Popular
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8 px-4" aria-label="Tabs">
          {[
            { id: 'history', name: 'Recent', icon: ClockIcon, count: searchHistory.length },
            { id: 'saved', name: 'Saved', icon: BookmarkIcon, count: savedSearches.length },
            { id: 'popular', name: 'Popular', icon: FireIcon, count: popularSearches.length },
            { id: 'accounts', name: 'Top Accounts', icon: UserGroupIcon, count: popularAccounts.length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.name}
              {tab.count > 0 && (
                <span className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 py-0.5 px-2 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {activeTab === 'history' && renderHistoryTab()}
        {activeTab === 'saved' && renderSavedTab()}
        {activeTab === 'popular' && renderPopularTab()}
        {activeTab === 'accounts' && renderAccountsTab()}
      </div>
    </div>
  );
};

export default SearchHistoryPanel; 