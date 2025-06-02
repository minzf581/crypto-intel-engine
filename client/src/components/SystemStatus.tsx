import React, { useState, useEffect } from 'react';
import { 
  ExclamationTriangleIcon, 
  CheckCircleIcon, 
  ClockIcon,
  ServerIcon,
  CpuChipIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';

interface RateLimitStatus {
  requestsInWindow: number;
  maxRequests: number;
  windowMs: number;
  nextReset: number;
}

interface CacheStats {
  size: number;
  maxSize: number;
  hitRate: number;
  totalRequests: number;
  hits: number;
  misses: number;
}

interface SystemStatusData {
  timestamp: string;
  uptime: number;
  memory: {
    rss: string;
    heapTotal: string;
    heapUsed: string;
    external: string;
  };
  rateLimits: Record<string, RateLimitStatus>;
  cache: CacheStats;
  recommendations: string[];
}

const SystemStatus: React.FC = () => {
  const [systemStatus, setSystemStatus] = useState<SystemStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchSystemStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await axios.get('/api/system/status', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSystemStatus(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch system status:', err);
      setError(err.response?.data?.message || 'Failed to fetch system status');
    } finally {
      setLoading(false);
    }
  };

  const clearCache = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await axios.delete('/api/system/cache', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Refresh status after clearing cache
      await fetchSystemStatus();
    } catch (err: any) {
      console.error('Failed to clear cache:', err);
    }
  };

  const testApiConnectivity = async (service: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.post(`/api/system/test-api/${service}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert(`${service} API test successful: ${JSON.stringify(response.data.result, null, 2)}`);
    } catch (err: any) {
      alert(`${service} API test failed: ${err.response?.data?.error || err.message}`);
    }
  };

  useEffect(() => {
    fetchSystemStatus();

    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchSystemStatus, 30000); // Refresh every 30 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const getRateLimitColor = (current: number, max: number): string => {
    const percentage = (current / max) * 100;
    if (percentage > 80) return 'text-red-600';
    if (percentage > 60) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getRateLimitIcon = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage > 80) return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
    if (percentage > 60) return <ClockIcon className="h-5 w-5 text-yellow-500" />;
    return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-2 text-red-600 mb-4">
          <ExclamationTriangleIcon className="h-5 w-5" />
          <h3 className="text-lg font-medium">System Status Error</h3>
        </div>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchSystemStatus}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!systemStatus) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <ServerIcon className="h-6 w-6 text-blue-500" />
            <h2 className="text-xl font-semibold text-gray-900">System Status</h2>
          </div>
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-600">Auto-refresh</span>
            </label>
            <button
              onClick={fetchSystemStatus}
              className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* System Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <ClockIcon className="h-5 w-5 text-gray-500" />
              <span className="font-medium text-gray-700">Uptime</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">{formatUptime(systemStatus.uptime)}</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <CpuChipIcon className="h-5 w-5 text-gray-500" />
              <span className="font-medium text-gray-700">Memory Usage</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">{systemStatus.memory.heapUsed}</p>
            <p className="text-sm text-gray-500">of {systemStatus.memory.heapTotal}</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <ChartBarIcon className="h-5 w-5 text-gray-500" />
              <span className="font-medium text-gray-700">Cache Hit Rate</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {systemStatus.cache.hitRate ? `${systemStatus.cache.hitRate.toFixed(1)}%` : 'N/A'}
            </p>
            <p className="text-sm text-gray-500">
              {systemStatus.cache.size}/{systemStatus.cache.maxSize} items
            </p>
          </div>
        </div>
      </div>

      {/* Rate Limits */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">API Rate Limits</h3>
          <button
            onClick={() => testApiConnectivity('coingecko')}
            className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
          >
            Test CoinGecko API
          </button>
        </div>

        <div className="space-y-4">
          {Object.entries(systemStatus.rateLimits).map(([service, status]) => (
            <div key={service} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getRateLimitIcon(status.requestsInWindow, status.maxRequests)}
                  <span className="font-medium text-gray-700 capitalize">{service}</span>
                </div>
                <span className={`text-sm font-medium ${getRateLimitColor(status.requestsInWindow, status.maxRequests)}`}>
                  {status.requestsInWindow}/{status.maxRequests} requests
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div
                  className={`h-2 rounded-full ${
                    (status.requestsInWindow / status.maxRequests) > 0.8 
                      ? 'bg-red-500' 
                      : (status.requestsInWindow / status.maxRequests) > 0.6 
                        ? 'bg-yellow-500' 
                        : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min((status.requestsInWindow / status.maxRequests) * 100, 100)}%` }}
                ></div>
              </div>

              <div className="flex justify-between text-xs text-gray-500">
                <span>Window: {Math.round(status.windowMs / 1000)}s</span>
                <span>
                  Next reset: {status.nextReset > 0 ? `${Math.round(status.nextReset / 1000)}s` : 'Now'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cache Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Cache Status</h3>
          <button
            onClick={clearCache}
            className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
          >
            Clear Cache
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Cache Usage</span>
              <span className="text-sm font-medium">
                {systemStatus.cache.size}/{systemStatus.cache.maxSize}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${Math.min((systemStatus.cache.size / systemStatus.cache.maxSize) * 100, 100)}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600 mb-2">Cache Statistics</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Total Requests:</span>
                <span className="font-medium">{systemStatus.cache.totalRequests || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Cache Hits:</span>
                <span className="font-medium text-green-600">{systemStatus.cache.hits || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Cache Misses:</span>
                <span className="font-medium text-red-600">{systemStatus.cache.misses || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {systemStatus.recommendations && systemStatus.recommendations.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">System Recommendations</h3>
          <div className="space-y-2">
            {systemStatus.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start space-x-2">
                <div className="flex-shrink-0 mt-1">
                  {recommendation.includes('high') || recommendation.includes('exceeded') ? (
                    <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
                  ) : (
                    <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <p className="text-sm text-gray-700">{recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Updated */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {new Date(systemStatus.timestamp).toLocaleString()}
      </div>
    </div>
  );
};

export default SystemStatus; 