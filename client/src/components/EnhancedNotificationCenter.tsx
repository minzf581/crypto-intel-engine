import React, { useState, useEffect } from 'react';
import { 
  BellIcon, 
  CheckIcon, 
  XMarkIcon, 
  EyeIcon,
  TrashIcon,
  ArrowPathIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { api } from '../utils/api';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'price' | 'volume' | 'news' | 'signal' | 'system';
  priority: 'high' | 'medium' | 'low';
  isRead: boolean;
  timestamp: string;
  assetSymbol?: string;
  actionUrl?: string;
}

interface NotificationGroup {
  type: string;
  count: number;
  notifications: NotificationItem[];
  latestTimestamp: string;
}

interface NotificationStats {
  total: number;
  unread: number;
  byType: {
    [key: string]: number;
  };
}

export default function EnhancedNotificationCenter() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [groupedNotifications, setGroupedNotifications] = useState<NotificationGroup[]>([]);
  const [stats, setStats] = useState<NotificationStats>({ total: 0, unread: 0, byType: {} });
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'price' | 'volume' | 'news'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      
      // Fetch notification history
      const historyResponse = await api.get('/notifications-enhanced/history');
      if (historyResponse.data.success) {
        setNotifications(historyResponse.data.data);
      }
      
      // Fetch grouped notifications
      const groupedResponse = await api.get('/notifications-enhanced/grouped');
      if (groupedResponse.data.success) {
        setGroupedNotifications(groupedResponse.data.data);
      }
      
      // Calculate stats
      const totalNotifications = notifications.length;
      const unreadCount = notifications.filter(n => !n.isRead).length;
      const byType = notifications.reduce((acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });
      
      setStats({
        total: totalNotifications,
        unread: unreadCount,
        byType
      });
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      // Set mock data for demonstration
      setNotifications([
        {
          id: '1',
          title: 'Price Alert',
          message: 'Bitcoin has increased by 5.2% in the last hour',
          type: 'price',
          priority: 'high',
          isRead: false,
          timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          assetSymbol: 'BTC'
        },
        {
          id: '2',
          title: 'Volume Spike',
          message: 'Ethereum trading volume is 150% above average',
          type: 'volume',
          priority: 'medium',
          isRead: false,
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          assetSymbol: 'ETH'
        },
        {
          id: '3',
          title: 'News Alert',
          message: 'Major institutional adoption news for Solana',
          type: 'news',
          priority: 'high',
          isRead: true,
          timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          assetSymbol: 'SOL'
        },
        {
          id: '4',
          title: 'Signal Generated',
          message: 'Strong bullish signal detected for ADA',
          type: 'signal',
          priority: 'medium',
          isRead: true,
          timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          assetSymbol: 'ADA'
        }
      ]);
      
      setStats({
        total: 4,
        unread: 2,
        byType: { price: 1, volume: 1, news: 1, signal: 1 }
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Auto refresh every 2 minutes
    const interval = setInterval(fetchNotifications, 120000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      // Update locally for demo
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Failed to delete notification:', error);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }
  };

  const getFilteredNotifications = () => {
    let filtered = notifications;
    
    switch (filter) {
      case 'unread':
        filtered = notifications.filter(n => !n.isRead);
        break;
      case 'price':
        filtered = notifications.filter(n => n.type === 'price');
        break;
      case 'volume':
        filtered = notifications.filter(n => n.type === 'volume');
        break;
      case 'news':
        filtered = notifications.filter(n => n.type === 'news');
        break;
      default:
        filtered = notifications;
    }
    
    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500 bg-red-50';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'low':
        return 'border-l-blue-500 bg-blue-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'price':
        return '💰';
      case 'volume':
        return '📊';
      case 'news':
        return '📰';
      case 'signal':
        return '🎯';
      default:
        return '🔔';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  const filteredNotifications = getFilteredNotifications();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <BellIcon className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Notification Center</h3>
          {stats.unread > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {stats.unread}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={markAllAsRead}
            className="text-sm text-blue-600 hover:text-blue-800"
            disabled={stats.unread === 0}
          >
            Mark all read
          </button>
          <button
            onClick={fetchNotifications}
            disabled={loading}
            className="text-blue-600 hover:text-blue-800 p-1 rounded disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-50 rounded">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total</div>
        </div>
        <div className="text-center p-3 bg-red-50 rounded">
          <div className="text-2xl font-bold text-red-600">{stats.unread}</div>
          <div className="text-sm text-gray-600">Unread</div>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded">
          <div className="text-2xl font-bold text-blue-600">{stats.byType.price || 0}</div>
          <div className="text-sm text-gray-600">Price</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded">
          <div className="text-2xl font-bold text-green-600">{stats.byType.volume || 0}</div>
          <div className="text-sm text-gray-600">Volume</div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <FunnelIcon className="h-4 w-4 text-gray-500" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="all">All Notifications</option>
            <option value="unread">Unread Only</option>
            <option value="price">Price Alerts</option>
            <option value="volume">Volume Alerts</option>
            <option value="news">News Alerts</option>
          </select>
        </div>
        <div className="flex space-x-1">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 text-sm rounded ${
              viewMode === 'list' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            List
          </button>
          <button
            onClick={() => setViewMode('grouped')}
            className={`px-3 py-1 text-sm rounded ${
              viewMode === 'grouped' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Grouped
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {loading && filteredNotifications.length === 0 ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No notifications found
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`border-l-4 p-4 rounded-r ${getPriorityColor(notification.priority)} ${
                !notification.isRead ? 'bg-opacity-80' : 'bg-opacity-40'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-lg">{getTypeIcon(notification.type)}</span>
                    <h4 className={`font-medium ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                      {notification.title}
                    </h4>
                    {notification.assetSymbol && (
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                        {notification.assetSymbol}
                      </span>
                    )}
                    {!notification.isRead && (
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>{formatTimeAgo(notification.timestamp)}</span>
                    <span>•</span>
                    <span className="capitalize">{notification.priority} priority</span>
                  </div>
                </div>
                <div className="flex items-center space-x-1 ml-4">
                  {!notification.isRead && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="p-1 text-blue-600 hover:text-blue-800 rounded"
                      title="Mark as read"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="p-1 text-red-600 hover:text-red-800 rounded"
                    title="Delete"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 