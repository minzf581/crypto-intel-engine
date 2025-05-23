import React, { useState } from 'react';
import { 
  BellIcon,
  BellAlertIcon,
  XMarkIcon,
  CheckIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications } from '@/context/NotificationContext';

// 通知中心组件
const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();
  
  // 处理通知点击
  const handleNotificationClick = (id: string) => {
    markAsRead(id);
  };
  
  // 处理标记所有为已读
  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };
  
  // 格式化时间
  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      return '未知时间';
    }
  };
  
  // 获取通知图标
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'price':
        return (
          <div className="flex-shrink-0 rounded-full p-2 bg-green-100 text-green-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'signal':
        return (
          <div className="flex-shrink-0 rounded-full p-2 bg-blue-100 text-blue-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="flex-shrink-0 rounded-full p-2 bg-gray-100 text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };
  
  return (
    <div className="relative">
      {/* 通知按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-full p-1 text-neutral-500 hover:text-primary-600 hover:bg-primary-50 relative"
        aria-label="通知"
      >
        {unreadCount > 0 ? (
          <BellAlertIcon className="h-6 w-6" />
        ) : (
          <BellIcon className="h-6 w-6" />
        )}
        
        {/* 未读数量徽章 */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 transform translate-x-1/3 -translate-y-1/3 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      
      {/* 通知面板 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-20 border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800">
          <div className="p-3 bg-neutral-50 dark:bg-neutral-800 flex justify-between items-center border-b border-neutral-200 dark:border-neutral-700">
            <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">通知</h3>
            
            <div className="flex space-x-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="p-1 rounded-full text-neutral-500 hover:text-primary-600 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                  title="标记所有为已读"
                >
                  <CheckCircleIcon className="h-5 w-5" />
                </button>
              )}
              
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full text-neutral-500 hover:text-primary-600 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                title="关闭"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-neutral-500 dark:text-neutral-400">
                <div className="animate-spin inline-block w-6 h-6 border-2 border-t-primary-500 border-neutral-200 rounded-full"></div>
                <p className="mt-1">加载通知...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-neutral-500 dark:text-neutral-400">
                <BellIcon className="mx-auto h-10 w-10 mb-2" />
                <p>没有通知</p>
              </div>
            ) : (
              <ul className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={`p-3 hover:bg-neutral-50 dark:hover:bg-neutral-700 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-primary-50 dark:bg-neutral-750' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification.id)}
                  >
                    <div className="flex items-start space-x-3">
                      {getNotificationIcon(notification.type)}
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 line-clamp-1">
                          {notification.title}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                          {formatTime(notification.timestamp)}
                          {!notification.read && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-800 dark:text-primary-100">
                              新
                            </span>
                          )}
                        </p>
                      </div>
                      
                      {notification.read && (
                        <CheckIcon className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          {notifications.length > 0 && (
            <div className="p-2 bg-neutral-50 dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700 text-center">
              <button
                onClick={() => {}}
                className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium"
              >
                查看所有通知
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter; 