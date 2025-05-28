import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';

interface TwitterOAuthButtonProps {
  onConnectionChange?: (connected: boolean) => void;
  className?: string;
}

export const TwitterOAuthButton: React.FC<TwitterOAuthButtonProps> = ({
  onConnectionChange,
  className = ''
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [twitterUsername, setTwitterUsername] = useState<string | null>(null);

  useEffect(() => {
    checkTwitterStatus();
  }, []);

  const checkTwitterStatus = async () => {
    try {
      const response = await api.get('/auth/twitter/status');
      setIsConnected(response.data.connected);
      setTwitterUsername(response.data.twitterUsername);
      onConnectionChange?.(response.data.connected);
    } catch (error) {
      console.error('Failed to check Twitter status:', error);
      setIsConnected(false);
    }
  };

  const handleConnect = () => {
    setIsLoading(true);
    // Redirect to Twitter OAuth flow
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/auth/twitter/login`;
  };

  const handleDisconnect = async () => {
    try {
      setIsLoading(true);
      await api.post('/auth/twitter/disconnect');
      setIsConnected(false);
      setTwitterUsername(null);
      onConnectionChange?.(false);
    } catch (error) {
      console.error('Failed to disconnect Twitter:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isConnected) {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Connected as @{twitterUsername}
          </span>
        </div>
        <button
          onClick={handleDisconnect}
          disabled={isLoading}
          className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200 disabled:opacity-50"
        >
          {isLoading ? 'Disconnecting...' : 'Disconnect'}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isLoading}
      className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 ${className}`}
    >
      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
      </svg>
      {isLoading ? 'Connecting...' : 'Connect Twitter'}
    </button>
  );
}; 