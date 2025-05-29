import React, { createContext, useState, useContext, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { detectFrontendEnvironment } from '../utils/environment';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  connect: () => void;
  disconnect: () => void;
}

// 创建Socket上下文
const SocketContext = createContext<SocketContextType | null>(null);

// Socket提供组件
export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  
  // 建立Socket连接
  const connect = () => {
    if (socket) return;
    
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Cannot initialize WebSocket connection: authentication token not found');
      return;
    }
    
    try {
      console.log('Initializing WebSocket connection...');
      
      // 使用环境检测函数获取正确的API URL
      const env = detectFrontendEnvironment();
      const socketUrl = env.apiUrl;
      
      console.log('WebSocket connection URL:', socketUrl);
      console.log('Environment detected:', {
        isLocal: env.isLocal,
        isRailway: env.isRailway,
        isProduction: env.isProduction
      });
      
      const newSocket = io(socketUrl, {
        withCredentials: true,
        auth: { token },
        transports: ['websocket', 'polling'], // 允许降级到polling
        path: '/socket.io',
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        timeout: 20000,
        forceNew: true // 强制创建新连接
      });
      
      newSocket.on('connect', () => {
        console.log('WebSocket connection successful');
        setConnected(true);
      });
      
      newSocket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        setConnected(false);
        
        // 在Railway环境中，如果WebSocket失败，尝试使用polling
        if (error.message.includes('websocket') || error.message.includes('transport')) {
          console.log('Retrying with polling transport only...');
          newSocket.io.opts.transports = ['polling'];
        }
      });
      
      newSocket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        setConnected(false);
      });
      
      newSocket.on('reconnect', (attemptNumber) => {
        console.log('WebSocket reconnected after', attemptNumber, 'attempts');
        setConnected(true);
      });
      
      newSocket.on('reconnect_error', (error) => {
        console.error('WebSocket reconnection error:', error);
      });
      
      setSocket(newSocket);
    } catch (error) {
      console.error('WebSocket initialization error:', error);
      setConnected(false);
    }
  };
  
  // 断开Socket连接
  const disconnect = () => {
    if (socket) {
      console.log('Disconnecting WebSocket');
      socket.disconnect();
      setSocket(null);
      setConnected(false);
    }
  };
  
  // 当认证状态改变时，自动连接/断开
  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      disconnect();
    }
    
    return () => {
      disconnect();
    };
  }, [isAuthenticated]);
  
  const value = {
    socket,
    connected,
    connect,
    disconnect
  };
  
  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

// Socket Hook
export const useSocket = () => {
  const context = useContext(SocketContext);
  
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  
  return context.socket;
};

// Socket完整API Hook
export const useSocketApi = () => {
  const context = useContext(SocketContext);
  
  if (!context) {
    throw new Error('useSocketApi must be used within a SocketProvider');
  }
  
  return context;
}; 