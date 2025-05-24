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
      console.error('Cannot initialize WebSocket connection: authentication token not found');
      return;
    }
    
    try {
      console.log('Initializing WebSocket connection...');
      const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      console.log('WebSocket connection URL:', socketUrl);
      
      const newSocket = io(socketUrl, {
        withCredentials: true,
        auth: { token },
        transports: ['websocket', 'polling'],
        path: '/socket.io',
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        timeout: 20000
      });
      
      newSocket.on('connect', () => {
        console.log('WebSocket connection successful');
        setConnected(true);
      });
      
      newSocket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        setConnected(false);
      });
      
      newSocket.on('disconnect', () => {
        console.log('WebSocket disconnected');
        setConnected(false);
      });
      
      setSocket(newSocket);
    } catch (error) {
      console.error('WebSocket initialization error:', error);
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