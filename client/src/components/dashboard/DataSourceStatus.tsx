import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ChatBubbleBottomCenterTextIcon, 
  NewspaperIcon, 
  ChartBarIcon, 
  LinkIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface DataSourceStatus {
  social: {
    available: boolean;
    lastUpdate?: string;
    responseTime?: number;
  };
  news: {
    available: boolean;
    lastUpdate?: string;
    responseTime?: number;
  };
  technical: {
    available: boolean;
    lastUpdate?: string;
    responseTime?: number;
  };
  onchain: {
    available: boolean;
    lastUpdate?: string;
    responseTime?: number;
  };
}

const DataSourceStatus: React.FC = () => {
  const [status, setStatus] = useState<DataSourceStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get('/api/analysis/data-sources/status');
      
      if (response.data?.success) {
        setStatus(response.data.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch data source status:', error);
      setError('Failed to load data source status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'social': return <ChatBubbleBottomCenterTextIcon className="w-5 h-5" />;
      case 'news': return <NewspaperIcon className="w-5 h-5" />;
      case 'technical': return <ChartBarIcon className="w-5 h-5" />;
      case 'onchain': return <LinkIcon className="w-5 h-5" />;
      default: return <ClockIcon className="w-5 h-5" />;
    }
  };

  const getSourceName = (source: string) => {
    switch (source) {
      case 'social': return 'Social Sentiment';
      case 'news': return 'News Analysis';
      case 'technical': return 'Technical Indicators';
      case 'onchain': return 'On-Chain Data';
      default: return source;
    }
  };

  const formatLastUpdate = (timestamp?: string) => {
    if (!timestamp) return 'Never';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 border border-neutral-200 dark:border-neutral-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Data Source Status
        </h3>
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="px-3 py-1 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Checking...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}

      {loading && !status && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          <span className="ml-2 text-neutral-600 dark:text-neutral-400">Loading status...</span>
        </div>
      )}

      {status && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(status).map(([source, sourceStatus]) => (
            <div 
              key={source}
              className="flex items-center space-x-3 p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-md"
            >
              <div className={`p-2 rounded-full ${
                sourceStatus.available 
                  ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' 
                  : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {getSourceIcon(source)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {getSourceName(source)}
                  </span>
                  {sourceStatus.available ? (
                    <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircleIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
                  )}
                </div>
                
                <div className="flex items-center space-x-4 mt-1">
                  <span className={`text-xs ${
                    sourceStatus.available 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {sourceStatus.available ? 'Online' : 'Offline'}
                  </span>
                  
                  {sourceStatus.lastUpdate && (
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      Updated: {formatLastUpdate(sourceStatus.lastUpdate)}
                    </span>
                  )}
                  
                  {sourceStatus.responseTime && (
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      {sourceStatus.responseTime}ms
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {status && (
        <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-600 dark:text-neutral-400">
              Overall System Health:
            </span>
            <span className={`font-medium ${
              Object.values(status).every(s => s.available)
                ? 'text-green-600 dark:text-green-400'
                : Object.values(status).some(s => s.available)
                ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
              {Object.values(status).every(s => s.available)
                ? 'Excellent'
                : Object.values(status).some(s => s.available)
                ? 'Partial'
                : 'Offline'
              }
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataSourceStatus; 