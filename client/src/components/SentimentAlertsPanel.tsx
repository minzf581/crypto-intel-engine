import React, { useState, useEffect } from 'react';
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ShieldExclamationIcon,
  ClockIcon,
  UserIcon,
  FunnelIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { socialSentimentApi } from '../services/socialSentimentApi';

interface SentimentAlert {
  id: string;
  accountUsername: string;
  coinSymbol: string;
  content: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;
  impact: 'low' | 'medium' | 'high';
  alertLevel: 'info' | 'warning' | 'critical';
  triggeredAt: Date;
  isProcessed: boolean;
}

interface SentimentAlertsPanelProps {
  coinSymbol: string;
  coinName: string;
}

const SentimentAlertsPanel: React.FC<SentimentAlertsPanelProps> = ({
  coinSymbol,
  coinName,
}) => {
  const [alerts, setAlerts] = useState<SentimentAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [showProcessed, setShowProcessed] = useState(false);

  useEffect(() => {
    loadAlerts();
    // Set up polling for real-time updates
    const interval = setInterval(loadAlerts, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [coinSymbol, selectedSeverity]);

  const loadAlerts = async () => {
    setIsLoading(true);
    try {
      const options: any = { limit: 50 };
      if (selectedSeverity !== 'all') {
        options.severity = selectedSeverity;
      }
      
      const response = await socialSentimentApi.getSentimentAlerts(coinSymbol, options);
      setAlerts(response.data);
    } catch (error) {
      console.error('Failed to load sentiment alerts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'critical':
        return <ShieldExclamationIcon className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-blue-600" />;
    }
  };

  const getAlertBadgeColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
    }
  };

  const getSentimentColor = (sentiment: string, score: number) => {
    if (sentiment === 'positive') return 'text-green-600';
    if (sentiment === 'negative') return 'text-red-600';
    return 'text-gray-600';
  };

  const getImpactBadgeColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
      case 'medium':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const markAsProcessed = async (alertId: string) => {
    // In real implementation, this would call an API to mark the alert as processed
    setAlerts(alerts.map(alert => 
      alert.id === alertId ? { ...alert, isProcessed: true } : alert
    ));
  };

  const filteredAlerts = alerts.filter(alert => 
    showProcessed || !alert.isProcessed
  );

  const alertCounts = {
    total: alerts.length,
    critical: alerts.filter(a => a.alertLevel === 'critical').length,
    warning: alerts.filter(a => a.alertLevel === 'warning').length,
    info: alerts.filter(a => a.alertLevel === 'info').length,
    unprocessed: alerts.filter(a => !a.isProcessed).length,
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Sentiment Alerts - {coinName} ({coinSymbol})
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Real-time alerts for significant sentiment changes
            </p>
          </div>
        </div>

        <button
          onClick={loadAlerts}
          disabled={isLoading}
          className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
          ) : (
            <ClockIcon className="h-4 w-4 mr-2" />
          )}
          Refresh
        </button>
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
          <p className="text-sm font-medium text-gray-900 dark:text-white">Total</p>
          <p className="text-xl font-bold text-gray-600">{alertCounts.total}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
          <p className="text-sm font-medium text-red-900 dark:text-red-100">Critical</p>
          <p className="text-xl font-bold text-red-600">{alertCounts.critical}</p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-center">
          <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">Warning</p>
          <p className="text-xl font-bold text-yellow-600">{alertCounts.warning}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Info</p>
          <p className="text-xl font-bold text-blue-600">{alertCounts.info}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
          <p className="text-sm font-medium text-green-900 dark:text-green-100">Pending</p>
          <p className="text-xl font-bold text-green-600">{alertCounts.unprocessed}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <FunnelIcon className="h-4 w-4 text-gray-500" />
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>

          <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={showProcessed}
              onChange={(e) => setShowProcessed(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <span>Show processed</span>
          </label>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          {filteredAlerts.length} alerts
        </p>
      </div>

      {/* Alerts List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {isLoading ? 'Loading alerts...' : 'No alerts found'}
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`border rounded-lg p-4 transition-colors ${
                alert.isProcessed 
                  ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50' 
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {getAlertIcon(alert.alertLevel)}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAlertBadgeColor(alert.alertLevel)}`}>
                        {alert.alertLevel.toUpperCase()}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getImpactBadgeColor(alert.impact)}`}>
                        {alert.impact} impact
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTimeAgo(alert.triggeredAt)}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2 mb-2">
                      <UserIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        @{alert.accountUsername}
                      </span>
                      <span className={`text-sm font-medium ${getSentimentColor(alert.sentiment, alert.sentimentScore)}`}>
                        {alert.sentiment} ({alert.sentimentScore.toFixed(2)})
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                      {alert.content}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  {alert.isProcessed ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-600" />
                  ) : (
                    <button
                      onClick={() => markAsProcessed(alert.id)}
                      className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Mark as Read
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SentimentAlertsPanel; 