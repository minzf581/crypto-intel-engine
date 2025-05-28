import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

interface DashboardAsset {
  id: string;
  symbol: string;
  name: string;
  logo: string;
  currentPrice: number | null;
  priceChange24h: number | null;
  lastUpdated: string | null;
}

interface DashboardData {
  assets: DashboardAsset[];
  lastUpdated: Date;
}

interface DashboardContextType {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  getAssetBySymbol: (symbol: string) => DashboardAsset | null;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataInitialized, setDataInitialized] = useState(false);

  // Use ref to prevent multiple simultaneous API calls
  const fetchInProgress = useRef(false);

  // Fetch dashboard data
  const fetchData = async () => {
    if (fetchInProgress.current || !isAuthenticated) return;

    fetchInProgress.current = true;
    setIsLoading(true);
    setError(null);

    try {
      console.log('Fetching dashboard data...');
      const response = await axios.get('/api/dashboard/data');

      if (response.data && response.data.success && response.data.data) {
        const dashboardData: DashboardData = {
          assets: response.data.data.assets || [],
          lastUpdated: new Date()
        };
        
        setData(dashboardData);
        setDataInitialized(true);
        console.log('Dashboard data fetched successfully:', dashboardData.assets.length, 'assets');
      } else {
        throw new Error('Invalid dashboard data format');
      }
    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error);
      setError(error.message || 'Failed to fetch dashboard data');
    } finally {
      setIsLoading(false);
      fetchInProgress.current = false;
    }
  };

  // Initialize data when authenticated
  useEffect(() => {
    if (isAuthenticated && !dataInitialized && !fetchInProgress.current) {
      fetchData();
    }
  }, [isAuthenticated]);

  // Auto-refresh every 2 minutes
  useEffect(() => {
    if (!isAuthenticated || !dataInitialized) return;

    const interval = setInterval(() => {
      fetchData();
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated, dataInitialized]);

  // Reset state when authentication changes
  useEffect(() => {
    if (!isAuthenticated) {
      setData(null);
      setDataInitialized(false);
      setError(null);
      fetchInProgress.current = false;
    }
  }, [isAuthenticated]);

  // Get asset by symbol
  const getAssetBySymbol = (symbol: string): DashboardAsset | null => {
    if (!data || !data.assets) return null;
    return data.assets.find(asset => asset.symbol === symbol) || null;
  };

  // Manual refresh
  const refreshData = async () => {
    await fetchData();
  };

  const value = {
    data,
    isLoading,
    error,
    refreshData,
    getAssetBySymbol
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}; 