import React, { createContext, useState, useContext, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

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
      console.error('无法初始化WebSocket连接：未找到认证令牌');
      return;
    }
    
    try {
      console.log('初始化WebSocket连接...');
      const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      console.log('WebSocket连接地址:', socketUrl);
      
      const newSocket = io(socketUrl, {
        withCredentials: true,
        auth: { token },
        transports: ['websocket'],
        path: '/socket.io',
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000
      });
      
      newSocket.on('connect', () => {
        console.log('WebSocket连接成功');
        setConnected(true);
      });
      
      newSocket.on('connect_error', (error) => {
        console.error('WebSocket连接错误:', error);
        setConnected(false);
      });
      
      newSocket.on('disconnect', () => {
        console.log('WebSocket断开连接');
        setConnected(false);
      });
      
      setSocket(newSocket);
    } catch (error) {
      console.error('WebSocket初始化错误:', error);
    }
  };
  
  // 断开Socket连接
  const disconnect = () => {
    if (socket) {
      console.log('断开WebSocket连接');
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