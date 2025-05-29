import { useEffect, useCallback } from 'react';
import { useSocketApi } from '@/context/SocketContext';
import { toast } from 'react-hot-toast';

const safeToFixed = (value: number | null | undefined, decimals: number = 2): string => {
  if (value === null || value === undefined || isNaN(value)) return '--';
  return Number(value).toFixed(decimals);
};

interface SocialSentimentAlert {
  id: string;
  accountUsername: string;
  coinSymbol: string;
  content: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;
  impact: 'low' | 'medium' | 'high';
  alertLevel: 'info' | 'warning' | 'critical';
  triggeredAt: Date;
}

interface SentimentUpdate {
  coinSymbol: string;
  update: {
    sentimentScore: number;
    postCount: number;
    timestamp: string;
  };
}

interface AccountMonitoringUpdate {
  coinSymbol: string;
  accountUpdate: {
    accountId: string;
    username: string;
    newPostsCount: number;
    avgSentiment: number;
  };
}

interface UseSocialSentimentSocketProps {
  coinSymbol?: string;
  onAlert?: (alert: SocialSentimentAlert) => void;
  onSentimentUpdate?: (update: SentimentUpdate) => void;
  onAccountUpdate?: (update: AccountMonitoringUpdate) => void;
  enableToastNotifications?: boolean;
}

export const useSocialSentimentSocket = ({
  coinSymbol,
  onAlert,
  onSentimentUpdate,
  onAccountUpdate,
  enableToastNotifications = true,
}: UseSocialSentimentSocketProps = {}) => {
  const { socket, connected } = useSocketApi();

  // Subscribe to social sentiment updates for a specific coin
  const subscribeToCoin = useCallback((coin: string) => {
    if (socket && connected) {
      socket.emit('subscribe_social_sentiment', { coinSymbol: coin });
    }
  }, [socket, connected]);

  // Unsubscribe from social sentiment updates for a specific coin
  const unsubscribeFromCoin = useCallback((coin: string) => {
    if (socket && connected) {
      socket.emit('unsubscribe_social_sentiment', { coinSymbol: coin });
    }
  }, [socket, connected]);

  // Handle social sentiment alerts
  const handleSocialSentimentAlert = useCallback((data: {
    coinSymbol: string;
    alert: SocialSentimentAlert;
    timestamp: string;
  }) => {
    const { alert, coinSymbol: alertCoin } = data;
    
    // Call custom alert handler if provided
    if (onAlert) {
      onAlert(alert);
    }

    // Show toast notification if enabled
    if (enableToastNotifications) {
      const alertEmoji = alert.alertLevel === 'critical' ? '🚨' : 
                        alert.alertLevel === 'warning' ? '⚠️' : 'ℹ️';
      
      const sentimentEmoji = alert.sentiment === 'positive' ? '🟢' : 
                           alert.sentiment === 'negative' ? '🔴' : '🟡';

      toast.custom((t) => (
        <div className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-2xl">{alertEmoji}</span>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {alertCoin} Sentiment Alert
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {sentimentEmoji} @{alert.accountUsername}: {alert.content.slice(0, 60)}...
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Score: {safeToFixed(alert.sentimentScore, 2)} | Impact: {alert.impact}
                </p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-gray-200">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Close
            </button>
          </div>
        </div>
      ), {
        duration: alert.alertLevel === 'critical' ? 10000 : 5000,
      });
    }
  }, [onAlert, enableToastNotifications]);

  // Handle sentiment updates
  const handleSentimentUpdate = useCallback((data: SentimentUpdate) => {
    if (onSentimentUpdate) {
      onSentimentUpdate(data);
    }
  }, [onSentimentUpdate]);

  // Handle account monitoring updates
  const handleAccountMonitoringUpdate = useCallback((data: AccountMonitoringUpdate) => {
    if (onAccountUpdate) {
      onAccountUpdate(data);
    }
  }, [onAccountUpdate]);

  // Set up event listeners
  useEffect(() => {
    if (!socket || !connected) return;

    // Subscribe to events
    socket.on('social_sentiment_alert', handleSocialSentimentAlert);
    socket.on('sentiment_update', handleSentimentUpdate);
    socket.on('account_monitoring_update', handleAccountMonitoringUpdate);

    // Subscribe confirmation handlers
    socket.on('social_sentiment_subscribed', (data) => {
      console.log(`Subscribed to social sentiment for ${data.coinSymbol}`);
    });

    socket.on('social_sentiment_unsubscribed', (data) => {
      console.log(`Unsubscribed from social sentiment for ${data.coinSymbol}`);
    });

    // Cleanup function
    return () => {
      socket.off('social_sentiment_alert', handleSocialSentimentAlert);
      socket.off('sentiment_update', handleSentimentUpdate);
      socket.off('account_monitoring_update', handleAccountMonitoringUpdate);
      socket.off('social_sentiment_subscribed');
      socket.off('social_sentiment_unsubscribed');
    };
  }, [socket, connected, handleSocialSentimentAlert, handleSentimentUpdate, handleAccountMonitoringUpdate]);

  // Auto-subscribe to coinSymbol if provided
  useEffect(() => {
    if (coinSymbol && socket && connected) {
      subscribeToCoin(coinSymbol);
      
      // Cleanup: unsubscribe when component unmounts or coinSymbol changes
      return () => {
        unsubscribeFromCoin(coinSymbol);
      };
    }
  }, [coinSymbol, socket, connected, subscribeToCoin, unsubscribeFromCoin]);

  return {
    connected,
    subscribeToCoin,
    unsubscribeFromCoin,
  };
}; 