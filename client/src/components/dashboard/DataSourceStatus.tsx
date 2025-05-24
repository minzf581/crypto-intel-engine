import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ChatBubbleBottomCenterTextIcon, 
  NewspaperIcon, 
  ChartBarIcon, 
  LinkIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

interface ApiDataSourceStatus {
  status: {
    priceMonitoring: boolean;
    socialSentiment: boolean;
    newsAnalysis: boolean;
    technicalAnalysis: boolean;
    marketData: boolean;
  };
  lastUpdated: string;
  activeSources: number;
  totalSources: number;
}

const DataSourceStatus: React.FC = () => {
  const [status, setStatus] = useState<ApiDataSourceStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching data source status...');
      
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      console.log('Token found:', !!token, token ? `Length: ${token.length}` : 'No token');
      
      if (!token) {
        setError('Authentication required. Please log in.');
        return;
      }
      
      const response = await axios.get('/api/analysis/data-sources/status');
      
      console.log('API Response:', response.data);
      
      if (response.data?.success && response.data?.data) {
        setStatus(response.data.data);
        console.log('Status updated:', response.data.data);
      } else {
        console.error('Invalid API response format:', response.data);
        setError('Invalid response format from server');
      }
    } catch (error: any) {
      console.error('Failed to fetch data source status:', error);
      
      // Provide more detailed error messages
      if (error.response) {
        // Server responded with error status
        const statusCode = error.response.status;
        const message = error.response.data?.message || error.response.statusText;
        
        if (statusCode === 401) {
          setError('Authentication failed. Please log in again.');
        } else {
          setError(`Server error (${statusCode}): ${message}`);
        }
      } else if (error.request) {
        // Network error
        setError('Network error: Unable to reach server');
      } else {
        // Other error
        setError(`Error: ${error.message}`);
      }
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
      case 'priceMonitoring': return <CurrencyDollarIcon className="w-5 h-5" />;
      case 'socialSentiment': return <ChatBubbleBottomCenterTextIcon className="w-5 h-5" />;
      case 'newsAnalysis': return <NewspaperIcon className="w-5 h-5" />;
      case 'technicalAnalysis': return <ChartBarIcon className="w-5 h-5" />;
      case 'marketData': return <LinkIcon className="w-5 h-5" />;
      default: return <ClockIcon className="w-5 h-5" />;
    }
  };

  const getSourceName = (source: string) => {
    switch (source) {
      case 'priceMonitoring': return 'Price Monitoring';
      case 'socialSentiment': return 'Social Sentiment';
      case 'newsAnalysis': return 'News Analysis';
      case 'technicalAnalysis': return 'Technical Analysis';
      case 'marketData': return 'Market Data';
      default: return source;
    }
  };

  const formatLastUpdate = (timestamp?: string) => {
    if (!timestamp) return 'Never';
    
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
      return date.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Unknown';
    }
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
          className="px-3 py-1 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Checking...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-4 py-3 rounded-md mb-4">
          <p className="text-sm font-medium">Error Loading Status</p>
          <p className="text-xs mt-1">{error}</p>
        </div>
      )}

      {loading && !status && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          <span className="ml-2 text-neutral-600 dark:text-neutral-400">Loading status...</span>
        </div>
      )}

      {status && status.status && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(status.status).map(([source, isAvailable]) => (
            <div 
              key={source}
              className="flex items-center space-x-3 p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-md border border-neutral-100 dark:border-neutral-600"
            >
              <div className={`p-2 rounded-full transition-colors ${
                isAvailable 
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
                  {isAvailable ? (
                    <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                  ) : (
                    <XCircleIcon className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                  )}
                </div>
                
                <div className="flex items-center space-x-4 mt-1">
                  <span className={`text-xs font-medium ${
                    isAvailable 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {isAvailable ? 'Online' : 'Offline'}
                  </span>
                  
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    Updated: {formatLastUpdate(status.lastUpdated)}
                  </span>
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
            <span className={`font-medium transition-colors ${
              status.activeSources === status.totalSources
                ? 'text-green-600 dark:text-green-400'
                : status.activeSources > 0
                ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
              {status.activeSources === status.totalSources
                ? 'Excellent'
                : status.activeSources > 0
                ? 'Partial'
                : 'Offline'
              }
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            <span>{status.activeSources} of {status.totalSources} sources active</span>
            <span>Last check: {formatLastUpdate(status.lastUpdated)}</span>
          </div>
        </div>
      )}

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && status && (
        <div className="mt-4 p-3 bg-neutral-100 dark:bg-neutral-700 rounded-md">
          <p className="text-xs text-neutral-600 dark:text-neutral-400 font-mono">
            Debug: {JSON.stringify(status, null, 2)}
          </p>
        </div>
      )}
    </div>
  );
};

export default DataSourceStatus; 