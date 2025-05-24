import React, { useState, useEffect, useCallback } from 'react';
import { 
  BellIcon, 
  XMarkIcon, 
  CheckIcon, 
  ArchiveBoxIcon,
  FunnelIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  NewspaperIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { BellIcon as BellIconSolid } from '@heroicons/react/24/solid';
import { EnhancedNotificationService } from '../services/notificationService';
import { NotificationHistory, NotificationGroup } from '../types/notification';
import { useNotificationSounds } from '../hooks/useNotificationSounds';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  unreadCount: number;
  onUnreadCountChange: (count: number) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  unreadCount,
  onUnreadCountChange,
}) => {
  const [notifications, setNotifications] = useState<NotificationHistory[]>([]);
  const [groups, setGroups] = useState<NotificationGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({
    type: '',
    priority: '',
    showGrouped: false,
  });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const { playPrioritySound } = useNotificationSounds();

  const loadNotifications = useCallback(async (reset = false) => {
    if (loading) return;
    
    setLoading(true);
    try {
      if (filter.showGrouped) {
        const groupedData = await EnhancedNotificationService.getGrouped();
        setGroups(groupedData);
      } else {
        const currentPage = reset ? 1 : page;
        const response = await EnhancedNotificationService.getHistory(
          currentPage,
          20,
          filter.type || undefined,
          filter.priority || undefined
        );
        
        if (reset) {
          setNotifications(response.notifications);
        } else {
          setNotifications(prev => [...prev, ...response.notifications]);
        }
        
        setHasMore(currentPage < response.pages);
        if (reset) setPage(1);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [loading, filter, page]);

  useEffect(() => {
    if (isOpen) {
      loadNotifications(true);
    }
  }, [isOpen, filter]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      // Call API to mark as read
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true, readAt: new Date() } : n
        )
      );
      
      onUnreadCountChange(Math.max(0, unreadCount - 1));
      toast.success('Marked as read');
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      toast.error('Failed to mark as read');
    }
  };

  const handleArchive = async (notificationId: string) => {
    try {
      // Call API to archive
      await fetch(`/api/notifications/${notificationId}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      // Remove from local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast.success('Notification archived');
    } catch (error) {
      console.error('Failed to archive notification:', error);
      toast.error('Failed to archive');
    }
  };

  const handleQuickAction = async (notificationId: string, action: string) => {
    switch (action) {
      case 'view':
        // Handle view action - could navigate to specific page
        break;
      case 'dismiss':
        await handleArchive(notificationId);
        break;
      case 'mark_read':
        await handleMarkAsRead(notificationId);
        break;
      default:
        console.log('Unknown action:', action);
    }
  };

  const getNotificationIcon = (type: string, priority: string) => {
    const iconClass = `w-5 h-5 ${
      priority === 'critical' ? 'text-red-500' :
      priority === 'high' ? 'text-orange-500' :
      priority === 'medium' ? 'text-blue-500' :
      'text-gray-500'
    }`;

    switch (type) {
      case 'price_alert':
        return <CurrencyDollarIcon className={iconClass} />;
      case 'news':
        return <NewspaperIcon className={iconClass} />;
      case 'system':
        return <InformationCircleIcon className={iconClass} />;
      default:
        return <ExclamationTriangleIcon className={iconClass} />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const baseClass = 'px-2 py-1 text-xs font-medium rounded-full';
    switch (priority) {
      case 'critical':
        return `${baseClass} bg-red-100 text-red-800`;
      case 'high':
        return `${baseClass} bg-orange-100 text-orange-800`;
      case 'medium':
        return `${baseClass} bg-blue-100 text-blue-800`;
      default:
        return `${baseClass} bg-gray-100 text-gray-800`;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <BellIconSolid className="w-6 h-6 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2 mb-3">
          <FunnelIcon className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <select
            value={filter.type}
            onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value }))}
            className="text-sm border border-gray-300 rounded-md px-2 py-1"
          >
            <option value="">All Types</option>
            <option value="price_alert">Price Alerts</option>
            <option value="signal">Signals</option>
            <option value="news">News</option>
            <option value="system">System</option>
          </select>
          
          <select
            value={filter.priority}
            onChange={(e) => setFilter(prev => ({ ...prev, priority: e.target.value }))}
            className="text-sm border border-gray-300 rounded-md px-2 py-1"
          >
            <option value="">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <label className="flex items-center mt-2">
          <input
            type="checkbox"
            checked={filter.showGrouped}
            onChange={(e) => setFilter(prev => ({ ...prev, showGrouped: e.target.checked }))}
            className="mr-2"
          />
          <span className="text-sm text-gray-700">Group similar notifications</span>
        </label>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {loading && notifications.length === 0 ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filter.showGrouped ? (
          // Grouped view
          <div className="space-y-2 p-4">
            {groups.map((group) => (
              <div key={group.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{group.title}</h3>
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    {group.count}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  Latest: {group.latestNotification.title}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatDistanceToNow(new Date(group.latestNotification.sentAt), { addSuffix: true })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Individual notifications view
          <div className="divide-y divide-gray-200">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-gray-50 transition-colors ${
                  !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type, notification.priority)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {notification.title}
                      </h4>
                      <span className={getPriorityBadge(notification.priority)}>
                        {notification.priority}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(notification.sentAt), { addSuffix: true })}
                      </span>
                      
                      <div className="flex items-center space-x-2">
                        {!notification.read && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            <CheckIcon className="w-4 h-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleArchive(notification.id)}
                          className="text-xs text-gray-600 hover:text-gray-800"
                        >
                          <ArchiveBoxIcon className="w-4 h-4" />
                        </button>
                        
                        {notification.quickActions?.map((action) => (
                          <button
                            key={action.id}
                            onClick={() => handleQuickAction(notification.id, action.action)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {hasMore && !loading && (
              <div className="p-4 text-center">
                <button
                  onClick={() => {
                    setPage(prev => prev + 1);
                    loadNotifications();
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Load more
                </button>
              </div>
            )}
          </div>
        )}

        {notifications.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <BellIcon className="w-8 h-8 mb-2" />
            <p className="text-sm">No notifications found</p>
          </div>
        )}
      </div>
    </div>
  );
}; 