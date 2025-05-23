import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

// 通知类型
export type NotificationType = 'signal' | 'price' | 'system';

// 通知接口
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
}

// 通知上下文类型
interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

// 创建上下文
const NotificationContext = createContext<NotificationContextType | null>(null);

// 通知提供组件
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const socket = useSocket();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 获取通知列表
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
      console.error('获取通知失败:', error);
      setError('获取通知列表失败');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 标记通知为已读
  const markAsRead = async (id: string) => {
    if (!isAuthenticated) return;
    
    try {
      const response = await axios.put(`/api/notifications/${id}/read`);
      
      if (response.data && response.data.success) {
        // 更新通知列表中的已读状态
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === id ? { ...notif, read: true } : notif
          )
        );
        
        // 更新未读数量
        setUnreadCount(response.data.data.unreadCount);
      }
    } catch (error) {
      console.error('标记通知为已读失败:', error);
      setError('标记通知为已读失败');
    }
  };
  
  // 标记所有通知为已读
  const markAllAsRead = async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await axios.put('/api/notifications/read-all');
      
      if (response.data && response.data.success) {
        // 更新所有通知的已读状态
        setNotifications(prev => 
          prev.map(notif => ({ ...notif, read: true }))
        );
        
        // 重置未读数量
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('标记所有通知为已读失败:', error);
      setError('标记所有通知为已读失败');
    }
  };
  
  // 初始加载通知
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated]);
  
  // 监听实时通知
  useEffect(() => {
    if (!socket || !isAuthenticated) return;
    
    const handleNewNotification = (notification: Notification) => {
      console.log('收到新通知:', notification);
      
      // 将新通知添加到列表
      setNotifications(prev => [notification, ...prev]);
      
      // 更新未读数量
      setUnreadCount(prev => prev + 1);
      
      // 显示浏览器通知 (如果用户已授权)
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico'
        });
      }
    };
    
    // 注册通知事件监听器
    socket.on('notification', handleNewNotification);
    
    // 清理函数
    return () => {
      socket.off('notification', handleNewNotification);
    };
  }, [socket, isAuthenticated]);
  
  // 请求浏览器通知权限
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

// 通知上下文Hook
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  
  if (!context) {
    throw new Error('useNotifications必须在NotificationProvider内使用');
  }
  
  return context;
}; 