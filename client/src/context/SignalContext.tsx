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
        
        // Ensure selectedAssets exists and is an array
        if (selectedAssets && Array.isArray(selectedAssets) && selectedAssets.length > 0) {
          // Ensure each asset has symbol property
          const validAssets = selectedAssets.filter(asset => asset && typeof asset === 'object' && 'symbol' in asset);
          if (validAssets.length > 0) {
            const assetSymbols = validAssets.map(asset => asset.symbol);
            console.log('Subscribing to assets:', assetSymbols);
            newSocket.emit('subscribe', { assets: assetSymbols });
          } else {
            console.warn('Selected assets do not have symbol property:', selectedAssets);
          }
        } else {
          console.log('No assets selected for subscription');
        }
      });

      newSocket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        setError(`WebSocket connection error: ${error.message}`);
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
          // Ensure prev is an array, if not, use empty array
          if (!Array.isArray(prev)) {
            console.warn('Signal state is not an array, resetting to:', [signal]);
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
      console.error('WebSocket initialization error:', error);
      setError('WebSocket initialization error');
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
        
        // Fix data structure issue - ensure correct data structure handling
        console.log('Signal API response:', response.data);
        
        if (response.data && response.data.success && response.data.data) {
          // Extract correct data structure
          const signalData = response.data.data;
          
          if (signalData.signals && Array.isArray(signalData.signals)) {
            console.log('Received signal data:', signalData.signals.length);
            setSignals(signalData.signals);
            setHasMore(signalData.hasMore || false);
          } else {
            console.warn('Server returned signal data without signals array', signalData);
            setSignals([]);
            setHasMore(false);
          }
        } else {
          console.warn('Server returned unexpected signal data format', response.data);
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
      
      // Use the same data processing approach
      if (response.data && response.data.success && response.data.data) {
        const signalData = response.data.data;
        
        if (signalData.signals && Array.isArray(signalData.signals)) {
          setSignals(prev => {
            // Ensure prev is an array
            if (!Array.isArray(prev)) {
              console.warn('When loading more signals, existing signal state is not an array, using newly loaded signals');
              return signalData.signals;
            }
            return [...prev, ...signalData.signals];
          });
          setHasMore(signalData.hasMore || false);
          setPage(nextPage);
        } else {
          console.warn('When loading more signals, server returned data without signals array', signalData);
          setHasMore(false);
        }
      } else {
        console.warn('When loading more signals, server returned unexpected data format', response.data);
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