import React, { useState, useEffect } from 'react';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  InformationCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface RateLimitStatus {
  remaining: number;
  limit: number;
  status: 'healthy' | 'warning' | 'critical' | 'emergency';
  waitTime: number;
}

interface TwitterApiStatusProps {
  className?: string;
  showDetails?: boolean;
  onRefresh?: () => void;
}

const TwitterApiStatus: React.FC<TwitterApiStatusProps> = ({
  className = '',
  showDetails = true,
  onRefresh,
}) => {
  const [apiStatus, setApiStatus] = useState<{
    isConfigured: boolean;
    isConnected: boolean;
    message: string;
    rateLimitStatus: { [endpoint: string]: RateLimitStatus };
    recommendations: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApiStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/social-sentiment/twitter-status');
      const data = await response.json();

      if (data.success) {
        setApiStatus(data.data);
      } else {
        setError(data.message || 'Failed to fetch API status');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiStatus();
    // Refresh status every 30 seconds
    const interval = setInterval(fetchApiStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />;
      case 'emergency':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/20 dark:border-green-800';
      case 'warning':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-900/20 dark:border-yellow-800';
      case 'critical':
        return 'text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-900/20 dark:border-orange-800';
      case 'emergency':
        return 'text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-900/20 dark:border-gray-800';
    }
  };

  const formatWaitTime = (waitTimeMs: number) => {
    if (waitTimeMs <= 0) return 'Ready';
    
    const minutes = Math.floor(waitTimeMs / 60000);
    const seconds = Math.floor((waitTimeMs % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const getOverallStatus = () => {
    if (!apiStatus) return 'unknown';
    if (!apiStatus.isConfigured) return 'not_configured';
    if (!apiStatus.isConnected) return 'disconnected';
    
    const statuses = Object.values(apiStatus.rateLimitStatus);
    if (statuses.some(s => s.status === 'emergency')) return 'emergency';
    if (statuses.some(s => s.status === 'critical')) return 'critical';
    if (statuses.some(s => s.status === 'warning')) return 'warning';
    return 'healthy';
  };

  const handleRefresh = () => {
    fetchApiStatus();
    onRefresh?.();
  };

  if (loading) {
    return (
      <div className={`p-4 border rounded-lg ${className}`}>
        <div className="flex items-center space-x-2">
          <ArrowPathIcon className="h-5 w-5 animate-spin text-gray-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Checking Twitter API status...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-lg ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
            <span className="text-sm text-red-700 dark:text-red-400">
              {error}
            </span>
          </div>
          <button
            onClick={handleRefresh}
            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (!apiStatus) return null;

  const overallStatus = getOverallStatus();

  return (
    <div className={`border rounded-lg ${getStatusColor(overallStatus)} ${className}`}>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon(overallStatus)}
            <div>
              <h3 className="text-sm font-medium">Twitter API Status</h3>
              <p className="text-xs opacity-75">{apiStatus.message}</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="opacity-75 hover:opacity-100 transition-opacity"
            title="Refresh status"
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
        </div>

        {showDetails && (
          <>
            {/* Rate Limit Details */}
            {Object.keys(apiStatus.rateLimitStatus).length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-xs font-medium opacity-75">Rate Limits</h4>
                {Object.entries(apiStatus.rateLimitStatus).map(([endpoint, status]) => (
                  <div key={endpoint} className="flex items-center justify-between text-xs">
                    <span className="capitalize">{endpoint.replace('_', ' ')}</span>
                    <div className="flex items-center space-x-2">
                      <span>{status.remaining}/{status.limit}</span>
                      {status.waitTime > 0 && (
                        <div className="flex items-center space-x-1">
                          <ClockIcon className="h-3 w-3" />
                          <span>{formatWaitTime(status.waitTime)}</span>
                        </div>
                      )}
                      {getStatusIcon(status.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {apiStatus.recommendations.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-medium opacity-75 mb-2">Recommendations</h4>
                <ul className="text-xs space-y-1 opacity-75">
                  {apiStatus.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start space-x-1">
                      <span>•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TwitterApiStatus; 