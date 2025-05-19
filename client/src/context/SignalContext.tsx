import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useAssets, Asset } from './AssetContext';

export interface Source {
  platform: 'twitter' | 'reddit';
  count: number;
}

export interface Signal {
  id: string;
  assetId: string;
  assetSymbol: string;
  assetName: string;
  assetLogo: string;
  type: 'sentiment' | 'narrative';
  strength: number;
  description: string;
  timestamp: string;
  sources: Source[];
}

export interface SignalFilter {
  timeRange: 'hour' | 'today' | 'yesterday' | 'all';
  types: ('sentiment' | 'narrative')[];
  minStrength: number;
  sources: ('twitter' | 'reddit')[];
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
  types: ['sentiment', 'narrative'],
  minStrength: 0,
  sources: ['twitter', 'reddit'],
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

    const newSocket = io(import.meta.env.VITE_API_URL || '', {
      withCredentials: true,
      auth: {
        token: localStorage.getItem('token')
      }
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated]);

  // Subscribe to signals for selected assets
  useEffect(() => {
    if (!socket || !selectedAssets.length) return;

    // Get the asset symbols
    const symbols = selectedAssets.map(asset => asset.symbol);
    
    // Subscribe to signals for these assets
    socket.emit('subscribe', { assets: symbols });

    // Listen for new signals
    socket.on('newSignal', (signal: Signal) => {
      setSignals(prevSignals => [signal, ...prevSignals]);
    });

    return () => {
      // Unsubscribe and remove listeners when dependencies change
      socket.emit('unsubscribe');
      socket.off('newSignal');
    };
  }, [socket, selectedAssets]);

  // Fetch initial signals
  useEffect(() => {
    if (!isAuthenticated || !selectedAssets.length) return;
    
    const fetchSignals = async () => {
      setIsLoading(true);
      setError(null);
      setPage(1);
      setHasMore(true);
      
      try {
        const assetIds = selectedAssets.map(asset => asset.id).join(',');
        const response = await axios.get(`/api/signals?assets=${assetIds}&page=1`);
        
        setSignals(response.data.signals);
        setHasMore(response.data.hasMore);
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
    if (isLoading || !hasMore || !selectedAssets.length) return Promise.resolve();
    
    setIsLoading(true);
    const nextPage = page + 1;
    
    try {
      const assetIds = selectedAssets.map(asset => asset.id).join(',');
      const response = await axios.get(`/api/signals?assets=${assetIds}&page=${nextPage}`);
      
      setSignals(prev => [...prev, ...response.data.signals]);
      setHasMore(response.data.hasMore);
      setPage(nextPage);
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
  const filteredSignals = signals.filter(signal => {
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
  });

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