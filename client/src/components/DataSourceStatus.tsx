import React, { useState, useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon, ClockIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { api } from '../utils/api';

interface DataSourceStatus {
  priceMonitoring: boolean;
  socialSentiment: boolean;
  newsAnalysis: boolean;
  technicalAnalysis: boolean;
  marketData: boolean;
}

interface StatusData {
  status: DataSourceStatus;
  lastUpdated: string;
  activeSources: number;
  totalSources: number;
}

export default function DataSourceStatus() {
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/analysis/data-sources/status');
      if (response.data.success) {
        setStatusData(response.data.data);
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch data source status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    
    // Auto refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (isActive: boolean) => {
    if (isActive) {
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    }
    return <XCircleIcon className="h-5 w-5 text-red-500" />;
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'text-green-600' : 'text-red-600';
  };

  const getOverallStatusColor = () => {
    if (!statusData) return 'text-gray-500';
    const activePercentage = (statusData.activeSources / statusData.totalSources) * 100;
    if (activePercentage >= 80) return 'text-green-600';
    if (activePercentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const sources = [
    { key: 'priceMonitoring', name: 'Price Monitoring', description: 'Real-time crypto price tracking' },
    { key: 'marketData', name: 'Market Data', description: 'Market cap and volume data' },
    { key: 'socialSentiment', name: 'Social Sentiment', description: 'Twitter and Reddit analysis' },
    { key: 'newsAnalysis', name: 'News Analysis', description: 'Crypto news sentiment tracking' },
    { key: 'technicalAnalysis', name: 'Technical Analysis', description: 'Chart pattern recognition' }
  ];

  if (!statusData && !loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Data Source Status</h3>
          <button
            onClick={fetchStatus}
            className="text-blue-600 hover:text-blue-800 p-1 rounded"
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="text-center py-4 text-gray-500">
          Click refresh to check data source status
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-gray-900">Data Source Status</h3>
          {statusData && (
            <span className={`text-sm font-medium ${getOverallStatusColor()}`}>
              {statusData.activeSources}/{statusData.totalSources} Active
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center text-xs text-gray-500">
            <ClockIcon className="h-4 w-4 mr-1" />
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="text-blue-600 hover:text-blue-800 p-1 rounded disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && !statusData ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : statusData ? (
        <div className="space-y-4">
          {sources.map((source) => {
            const isActive = statusData.status[source.key as keyof DataSourceStatus];
            return (
              <div key={source.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(isActive)}
                  <div>
                    <div className="font-medium text-gray-900">{source.name}</div>
                    <div className="text-sm text-gray-500">{source.description}</div>
                  </div>
                </div>
                <div className={`text-sm font-medium ${getStatusColor(isActive)}`}>
                  {isActive ? 'Online' : 'Offline'}
                </div>
              </div>
            );
          })}
          
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Overall System Health</span>
              <span className={`font-semibold ${getOverallStatusColor()}`}>
                {Math.round((statusData.activeSources / statusData.totalSources) * 100)}%
              </span>
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  statusData.activeSources / statusData.totalSources >= 0.8
                    ? 'bg-green-500'
                    : statusData.activeSources / statusData.totalSources >= 0.5
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${(statusData.activeSources / statusData.totalSources) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
} 