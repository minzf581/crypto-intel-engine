import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useAssets, Asset } from './AssetContext';

export interface Source {
  platform: 'twitter' | 'reddit' | 'price';
  count?: number;
  priceChange?: number;
  currentPrice?: number;
  previousPrice?: number;
  timeframe?: string;
}

export interface Signal {
  id: string;
  assetId: string;
  assetSymbol: string;
  assetName: string;
  assetLogo: string;
  type: 'sentiment' | 'narrative' | 'price';
  strength: number;
  description: string;
  timestamp: string;
  sources: Source[];
}

export interface SignalFilter {
  timeRange: 'hour' | 'today' | 'yesterday' | 'all';
  types: ('sentiment' | 'narrative' | 'price')[];
  minStrength: number;
  sources: ('twitter' | 'reddit' | 'price')[];
  sortBy: 'latest' | 'strength';
}

interface SignalContextType {
  signals: Signal[];
  filteredSignals: Signal[];
  selectedSignal: Signal | null;
  filters: SignalFilter;
  isLoading: boolean;
  error: string | null;
  setSelectedSignal: (signal: Signal | null) => void;
  updateFilters: (newFilters: Partial<SignalFilter>) => void;
  resetFilters: () => void;
  loadMoreSignals: () => Promise<void>;
}

const SignalContext = createContext<SignalContextType | null>(null);

export const useSignals = () => {
  const context = useContext(SignalContext);
  if (!context) {
    throw new Error('useSignals must be used within a SignalProvider');
  }
  return context;
};

// Default filters
const DEFAULT_FILTERS: SignalFilter = {
  timeRange: 'all',
  types: ['sentiment', 'narrative', 'price'],
  minStrength: 0,
  sources: ['twitter', 'reddit', 'price'],
  sortBy: 'latest'
};

export const SignalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const { selectedAssets } = useAssets();
  
  const [signals, setSignals] = useState<Signal[]>([]);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [filters, setFilters] = useState<SignalFilter>(DEFAULT_FILTERS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Initialize socket connection
  useEffect(() => {
    if (!isAuthenticated) return;

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
        
        // 确保selectedAssets存在并且是数组
        if (selectedAssets && Array.isArray(selectedAssets) && selectedAssets.length > 0) {
          // 确保每个资产都有symbol属性
          const validAssets = selectedAssets.filter(asset => asset && typeof asset === 'object' && 'symbol' in asset);
          if (validAssets.length > 0) {
            const assetSymbols = validAssets.map(asset => asset.symbol);
            console.log('订阅资产:', assetSymbols);
            newSocket.emit('subscribe', { assets: assetSymbols });
          } else {
            console.warn('已选择的资产没有symbol属性:', selectedAssets);
          }
        } else {
          console.log('没有选择资产进行订阅');
        }
      });

      newSocket.on('connect_error', (error) => {
        console.error('WebSocket连接错误:', error);
        setError(`WebSocket连接错误: ${error.message}`);
      });

      newSocket.on('disconnect', () => {
        console.log('WebSocket disconnected');
      });

      newSocket.on('error', (error) => {
        console.error('WebSocket error:', error);
        setError(error.message);
      });

      newSocket.on('newSignal', (signal) => {
        console.log('Received new signal:', signal);
        setSignals(prev => {
          // 确保prev是一个数组，如果不是，则使用空数组
          if (!Array.isArray(prev)) {
            console.warn('信号状态不是数组，重置为：', [signal]);
            return [signal];
          }
          return [signal, ...prev];
        });
      });

      setSocket(newSocket);

      return () => {
        console.log('Cleaning up WebSocket connection...');
        newSocket.disconnect();
      };
    } catch (error) {
      console.error('WebSocket初始化错误:', error);
      setError('WebSocket初始化错误');
    }
  }, [isAuthenticated, selectedAssets]);

  // Fetch initial signals
  useEffect(() => {
    if (!isAuthenticated || !selectedAssets || !selectedAssets.length) return;
    
    const fetchSignals = async () => {
      setIsLoading(true);
      setError(null);
      setPage(1);
      setHasMore(true);
      
      try {
        const assetIds = selectedAssets.map(asset => asset.id).join(',');
        const response = await axios.get(`/api/signals?assets=${assetIds}&page=1`);
        
        // 修复数据结构问题 - 确保处理正确的数据结构
        console.log('信号API响应:', response.data);
        
        if (response.data && response.data.success && response.data.data) {
          // 提取正确的数据结构
          const signalData = response.data.data;
          
          if (signalData.signals && Array.isArray(signalData.signals)) {
            console.log('收到信号数据:', signalData.signals.length);
            setSignals(signalData.signals);
            setHasMore(signalData.hasMore || false);
          } else {
            console.warn('服务器返回的信号数据中没有signals数组', signalData);
            setSignals([]);
            setHasMore(false);
          }
        } else {
          console.warn('服务器返回的信号数据格式不符合预期', response.data);
          setSignals([]);
          setHasMore(false);
        }
      } catch (error) {
        console.error('Error fetching signals:', error);
        setError('Failed to load signals. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSignals();
  }, [isAuthenticated, selectedAssets]);

  // Load more signals
  const loadMoreSignals = async () => {
    if (isLoading || !hasMore || !selectedAssets || !selectedAssets.length) return Promise.resolve();
    
    setIsLoading(true);
    const nextPage = page + 1;
    
    try {
      const assetIds = selectedAssets.map(asset => asset.id).join(',');
      const response = await axios.get(`/api/signals?assets=${assetIds}&page=${nextPage}`);
      
      // 使用相同的数据处理方式
      if (response.data && response.data.success && response.data.data) {
        const signalData = response.data.data;
        
        if (signalData.signals && Array.isArray(signalData.signals)) {
          setSignals(prev => {
            // 确保prev是一个数组
            if (!Array.isArray(prev)) {
              console.warn('加载更多信号时，现有信号状态不是数组，使用新加载的信号');
              return signalData.signals;
            }
            return [...prev, ...signalData.signals];
          });
          setHasMore(signalData.hasMore || false);
          setPage(nextPage);
        } else {
          console.warn('加载更多信号时，服务器返回的数据中没有signals数组', signalData);
          setHasMore(false);
        }
      } else {
        console.warn('加载更多信号时，服务器返回的数据格式不符合预期', response.data);
        setHasMore(false);
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error loading more signals:', error);
      setError('Failed to load more signals');
      return Promise.reject(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<SignalFilter>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Reset filters to defaults
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // Apply filters to signals
  const filteredSignals = signals && Array.isArray(signals) ? signals.filter(signal => {
    // Filter by signal type
    if (filters.types.length && !filters.types.includes(signal.type)) {
      return false;
    }

    // Filter by minimum strength
    if (signal.strength < filters.minStrength) {
      return false;
    }

    // Filter by source
    if (filters.sources.length) {
      const hasMatchingSource = signal.sources.some(source => 
        filters.sources.includes(source.platform)
      );
      if (!hasMatchingSource) {
        return false;
      }
    }

    // Filter by time range
    if (filters.timeRange !== 'all') {
      const signalDate = new Date(signal.timestamp);
      const now = new Date();
      
      switch (filters.timeRange) {
        case 'hour':
          if (now.getTime() - signalDate.getTime() > 60 * 60 * 1000) {
            return false;
          }
          break;
        case 'today':
          if (
            signalDate.getDate() !== now.getDate() ||
            signalDate.getMonth() !== now.getMonth() ||
            signalDate.getFullYear() !== now.getFullYear()
          ) {
            return false;
          }
          break;
        case 'yesterday':
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          if (
            signalDate.getDate() !== yesterday.getDate() ||
            signalDate.getMonth() !== yesterday.getMonth() ||
            signalDate.getFullYear() !== yesterday.getFullYear()
          ) {
            return false;
          }
          break;
      }
    }

    return true;
  }).sort((a, b) => {
    // Sort by selected sort method
    if (filters.sortBy === 'latest') {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    } else { // sort by strength
      return b.strength - a.strength;
    }
  }) : [];

  const value = {
    signals,
    filteredSignals,
    selectedSignal,
    filters,
    isLoading,
    error,
    setSelectedSignal,
    updateFilters,
    resetFilters,
    loadMoreSignals
  };

  return <SignalContext.Provider value={value}>{children}</SignalContext.Provider>;
}; 