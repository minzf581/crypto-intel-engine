import React, { createContext, useState, useContext, useEffect, useCallback, useMemo, useRef } from 'react';
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
  const { isAuthenticated } = useAuth();
  const { selectedAssets } = useAssets();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [filters, setFilters] = useState<SignalFilter>(DEFAULT_FILTERS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [signalsInitialized, setSignalsInitialized] = useState(false);

  // Use refs to prevent unnecessary effect triggers
  const lastSelectedAssetsRef = useRef<string>('');
  const socketInitializedRef = useRef(false);

  // Memoize selected asset symbols
  const selectedAssetSymbols = useMemo(() => {
    if (!selectedAssets || !Array.isArray(selectedAssets)) return [];
    return selectedAssets.map(asset => asset.symbol).sort();
  }, [selectedAssets]);

  // Convert to string for comparison
  const selectedAssetsString = selectedAssetSymbols.join(',');

  // Initialize socket connection only once
  useEffect(() => {
    if (!isAuthenticated || selectedAssetSymbols.length === 0 || socketInitializedRef.current) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Cannot initialize WebSocket: no token');
      return;
    }

    socketInitializedRef.current = true;

    try {
      console.log('Initializing WebSocket connection for assets:', selectedAssetSymbols);
      const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      
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
        console.log('WebSocket connected successfully');
        newSocket.emit('subscribe', { assets: selectedAssetSymbols });
      });

      newSocket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        setError(`WebSocket connection error: ${error.message}`);
        socketInitializedRef.current = false;
      });

      newSocket.on('disconnect', () => {
        console.log('WebSocket disconnected');
        socketInitializedRef.current = false;
      });

      newSocket.on('error', (error) => {
        console.error('WebSocket error:', error);
        setError(error.message);
      });

      newSocket.on('newSignal', (signal) => {
        console.log('Received new signal:', signal);
        setSignals(prev => {
          if (!Array.isArray(prev)) return [signal];
          return [signal, ...prev];
        });
      });

      setSocket(newSocket);

      return () => {
        console.log('Cleaning up WebSocket connection...');
        newSocket.disconnect();
        socketInitializedRef.current = false;
      };
    } catch (error) {
      console.error('WebSocket initialization error:', error);
      setError('WebSocket initialization error');
      socketInitializedRef.current = false;
    }
  }, [isAuthenticated, selectedAssetsString]); // Use string comparison

  // Fetch initial signals when assets change
  useEffect(() => {
    // Only fetch if assets have changed and we're authenticated
    if (!isAuthenticated || 
        !selectedAssets || 
        selectedAssets.length === 0 || 
        selectedAssetsString === lastSelectedAssetsRef.current) {
      return;
    }

    // Update the ref to track current assets
    lastSelectedAssetsRef.current = selectedAssetsString;
    
    const fetchSignals = async () => {
      console.log('Fetching signals for assets:', selectedAssetSymbols);
      setIsLoading(true);
      setError(null);
      setPage(1);
      setHasMore(true);
      
      try {
        const assetIds = selectedAssets.map(asset => asset.id).join(',');
        const response = await axios.get(`/api/signals?assets=${assetIds}&page=1`);
        
        console.log('Signal API response:', response.data);
        
        if (response.data && response.data.success && response.data.data) {
          const signalData = response.data.data;
          
          if (signalData.signals && Array.isArray(signalData.signals)) {
            console.log('Setting signals:', signalData.signals.length);
            setSignals(signalData.signals);
            setHasMore(signalData.hasMore || false);
          } else {
            console.warn('No signals array in response');
            setSignals([]);
            setHasMore(false);
          }
        } else {
          console.warn('Unexpected response format');
          setSignals([]);
          setHasMore(false);
        }
        
        setSignalsInitialized(true);
      } catch (error) {
        console.error('Error fetching signals:', error);
        setError('Failed to load signals. Please try again.');
        setSignalsInitialized(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSignals();
  }, [isAuthenticated, selectedAssetsString]);

  // Reset state when authentication changes
  useEffect(() => {
    if (!isAuthenticated) {
      setSignalsInitialized(false);
      lastSelectedAssetsRef.current = '';
      socketInitializedRef.current = false;
      setSignals([]);
      setError(null);
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    }
  }, [isAuthenticated]);

  // Load more signals function
  const loadMoreSignals = async () => {
    if (isLoading || !hasMore || !selectedAssets || !selectedAssets.length) {
      return Promise.resolve();
    }
    
    setIsLoading(true);
    const nextPage = page + 1;
    
    try {
      const assetIds = selectedAssets.map(asset => asset.id).join(',');
      const response = await axios.get(`/api/signals?assets=${assetIds}&page=${nextPage}`);
      
      if (response.data && response.data.success && response.data.data) {
        const signalData = response.data.data;
        
        if (signalData.signals && Array.isArray(signalData.signals)) {
          setSignals(prev => {
            if (!Array.isArray(prev)) return signalData.signals;
            return [...prev, ...signalData.signals];
          });
          setHasMore(signalData.hasMore || false);
          setPage(nextPage);
        } else {
          setHasMore(false);
        }
      } else {
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

  // Reset filters
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // Apply filters to signals
  const filteredSignals = signals && Array.isArray(signals) ? signals.filter(signal => {
    if (filters.types.length && !filters.types.includes(signal.type)) {
      return false;
    }

    if (signal.strength < filters.minStrength) {
      return false;
    }

    if (filters.sources.length) {
      const hasMatchingSource = signal.sources.some(source => 
        filters.sources.includes(source.platform)
      );
      if (!hasMatchingSource) {
        return false;
      }
    }

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
    if (filters.sortBy === 'latest') {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    } else {
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