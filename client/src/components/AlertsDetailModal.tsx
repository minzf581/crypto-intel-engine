import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  FireIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  UserIcon,
  ShieldCheckIcon,
  CalendarIcon,
  ArrowTopRightOnSquareIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { socialSentimentApi } from '../services/socialSentimentApi';

interface SentimentAlert {
  id: string;
  coinSymbol: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  sentimentScore: number;
  impactScore: number;
  engagement: {
    likes: number;
    retweets: number;
    replies: number;
  };
  source: {
    platform: string;
    username: string;
    verified: boolean;
    followers: number;
  };
  timestamp: string;
  createdAt: string;
  isActive: boolean;
  priority: number;
}

interface AlertsDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  coinSymbol: string;
  coinName: string;
  totalAlerts: number;
}

const AlertsDetailModal: React.FC<AlertsDetailModalProps> = ({
  isOpen,
  onClose,
  coinSymbol,
  coinName,
  totalAlerts,
}) => {
  const [alerts, setAlerts] = useState<SentimentAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');
  const [filterType, setFilterType] = useState<'all' | 'bullish_signal' | 'bearish_signal' | 'viral_content' | 'influencer_post' | 'market_sentiment'>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'time' | 'severity'>('priority');

  useEffect(() => {
    if (isOpen) {
      loadAlerts();
    }
  }, [isOpen]);

  const loadAlerts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await socialSentimentApi.getSentimentAlerts(coinSymbol);
      
      if (response.success && response.data) {
        setAlerts(response.data);
      } else {
        setAlerts([]);
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
      setError('Failed to load alerts. Please try again.');
      setAlerts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />;
      case 'high':
        return <ExclamationCircleIcon className="h-5 w-5 text-orange-600" />;
      case 'medium':
        return <InformationCircleIcon className="h-5 w-5 text-yellow-600" />;
      case 'low':
      default:
        return <InformationCircleIcon className="h-5 w-5 text-blue-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800';
      case 'low':
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bullish_signal':
        return <ArrowTrendingUpIcon className="h-4 w-4 text-green-600" />;
      case 'bearish_signal':
        return <ArrowTrendingDownIcon className="h-4 w-4 text-red-600" />;
      case 'viral_content':
        return <FireIcon className="h-4 w-4 text-orange-600" />;
      case 'influencer_post':
        return <UserIcon className="h-4 w-4 text-purple-600" />;
      default:
        return <InformationCircleIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'bullish_signal':
        return 'Bullish Signal';
      case 'bearish_signal':
        return 'Bearish Signal';
      case 'viral_content':
        return 'Viral Content';
      case 'influencer_post':
        return 'Influencer Post';
      case 'market_sentiment':
        return 'Market Sentiment';
      default:
        return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const openTwitterPost = (username: string) => {
    window.open(`https://twitter.com/${username}`, '_blank');
  };

  const getFilteredAndSortedAlerts = () => {
    let filtered = alerts;

    // Filter by severity
    if (filterSeverity !== 'all') {
      filtered = filtered.filter(alert => alert.severity === filterSeverity);
    }

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(alert => alert.type === filterType);
    }

    // Sort alerts
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          return b.priority - a.priority;
        case 'time':
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        case 'severity':
          const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          return (severityOrder[b.severity as keyof typeof severityOrder] || 0) - 
                 (severityOrder[a.severity as keyof typeof severityOrder] || 0);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const filteredAlerts = getFilteredAndSortedAlerts();

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
                Sentiment Alerts for {coinName} ({coinSymbol})
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {filteredAlerts.length} of {totalAlerts} total alerts
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
                  onChange={(e) => setSortBy(e.target.value as 'priority' | 'time' | 'severity')}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="priority">Priority</option>
                  <option value="time">Latest First</option>
                  <option value="severity">Severity</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Filter by Severity
                </label>
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value as 'all' | 'low' | 'medium' | 'high' | 'critical')}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Filter by Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="bullish_signal">Bullish Signal</option>
                  <option value="bearish_signal">Bearish Signal</option>
                  <option value="viral_content">Viral Content</option>
                  <option value="influencer_post">Influencer Post</option>
                  <option value="market_sentiment">Market Sentiment</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <FunnelIcon className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {filteredAlerts.length} alerts
              </span>
            </div>
          </div>

          {/* Alerts List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-600 dark:text-red-400">{error}</p>
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="text-center py-8">
                <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No alerts found for the selected criteria</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAlerts.map((alert, index) => (
                  <div
                    key={`${alert.id}-${index}`}
                    className={`border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${getSeverityColor(alert.severity)}`}
                  >
                    {/* Alert Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          {getSeverityIcon(alert.severity)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                              {alert.title}
                            </h4>
                            <div className="flex items-center space-x-1">
                              {getTypeIcon(alert.type)}
                              <span className="text-xs text-gray-600 dark:text-gray-400">
                                {getTypeLabel(alert.type)}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                            {alert.message}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                          {alert.severity.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Priority: {alert.priority}/10
                        </span>
                      </div>
                    </div>

                    {/* Source Information */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <UserIcon className="h-4 w-4 text-gray-400" />
                          <button
                            onClick={() => openTwitterPost(alert.source.username)}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            @{alert.source.username}
                          </button>
                          {alert.source.verified && (
                            <ShieldCheckIcon className="h-4 w-4 text-blue-500" />
                          )}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatNumber(alert.source.followers)} followers
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                        <CalendarIcon className="h-4 w-4" />
                        <span>{new Date(alert.timestamp).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Sentiment Score</div>
                        <div className={`font-medium ${
                          alert.sentimentScore > 0 ? 'text-green-600' : 
                          alert.sentimentScore < 0 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {alert.sentimentScore?.toFixed(2) || 'N/A'}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Impact Score</div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {alert.impactScore?.toFixed(2) || 'N/A'}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Likes</div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {formatNumber(alert.engagement?.likes || 0)}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Retweets</div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {formatNumber(alert.engagement?.retweets || 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>
                Last updated: {new Date().toLocaleTimeString()}
              </span>
              <button
                onClick={loadAlerts}
                disabled={isLoading}
                className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                {isLoading ? 'Refreshing...' : 'Refresh Alerts'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertsDetailModal; 