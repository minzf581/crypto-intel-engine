import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

// Notification types
export type NotificationType = 'signal' | 'price' | 'system';

// Notification interface
export interface Notification {
  id: string;
  userId: string;
  assetId?: string;
  assetSymbol?: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  data?: any;
  timestamp: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
}

// Notification context type
interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

// Create context
const NotificationContext = createContext<NotificationContextType | null>(null);

// Notification provider component
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const socket = useSocket();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch notifications list
  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await axios.get('/api/notifications');
      
      if (response.data && response.data.success && response.data.data) {
        setNotifications(response.data.data.notifications);
        setUnreadCount(response.data.data.unreadCount);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setError('Failed to fetch notifications list');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Mark notification as read
  const markAsRead = async (id: string) => {
    if (!isAuthenticated) return;
    
    try {
      const response = await axios.put(`/api/notifications/${id}/read`);
      
      if (response.data && response.data.success) {
        // Update read status in notifications list
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === id ? { ...notif, read: true } : notif
          )
        );
        
        // Update unread count
        setUnreadCount(response.data.data.unreadCount);
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      setError('Failed to mark notification as read');
    }
  };
  
  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await axios.put('/api/notifications/read-all');
      
      if (response.data && response.data.success) {
        // Update read status for all notifications
        setNotifications(prev => 
          prev.map(notif => ({ ...notif, read: true }))
        );
        
        // Reset unread count
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      setError('Failed to mark all notifications as read');
    }
  };
  
  // Initial load notifications
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated]);
  
  // Listen for real-time notifications
  useEffect(() => {
    if (!socket || !isAuthenticated) return;
    
    const handleNewNotification = (notification: Notification) => {
      console.log('Received new notification:', notification);
      
      // Add new notification to list
      setNotifications(prev => [notification, ...prev]);
      
      // Update unread count
      setUnreadCount(prev => prev + 1);
      
      // Show browser notification (if user has granted permission)
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          tag: `notification-${notification.id}`,
          requireInteraction: notification.priority === 'critical',
        });
      }
    };

    const handleBrowserNotification = (notificationData: any) => {
      console.log('Received browser notification request:', notificationData);
      
      // Show browser notification if permission is granted
      if (Notification.permission === 'granted') {
        const browserNotification = new Notification(notificationData.title, {
          body: notificationData.body,
          icon: notificationData.icon || '/favicon.ico',
          tag: notificationData.tag,
          requireInteraction: notificationData.requireInteraction || false,
          data: notificationData.data,
        });

        // Handle notification click
        browserNotification.onclick = () => {
          window.focus();
          browserNotification.close();
          
          // Navigate to notification or specific page if needed
          if (notificationData.data?.actionUrl) {
            window.location.href = notificationData.data.actionUrl;
          }
        };

        // Auto-close after 5 seconds for non-critical notifications
        if (!notificationData.requireInteraction) {
          setTimeout(() => {
            browserNotification.close();
          }, 5000);
        }
      } else if (Notification.permission === 'default') {
        // Request permission if not yet determined
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            // Retry showing the notification
            handleBrowserNotification(notificationData);
          }
        });
      }
    };
    
    // Register notification event listeners
    socket.on('notification', handleNewNotification);
    socket.on('browser_notification', handleBrowserNotification);
    
    // Cleanup function
    return () => {
      socket.off('notification', handleNewNotification);
      socket.off('browser_notification', handleBrowserNotification);
    };
  }, [socket, isAuthenticated]);
  
  // Request browser notification permission
  useEffect(() => {
    if (isAuthenticated && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, [isAuthenticated]);
  
  const value = {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead
  };
  
  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Notification context hook
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  
  return context;
}; 