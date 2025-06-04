import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  logo: string;
  isSelected: boolean;
}

interface AssetContextType {
  availableAssets: Asset[];
  selectedAssets: Asset[];
  isLoading: boolean;
  error: string | null;
  toggleAssetSelection: (assetSymbol: string) => void;
  saveAssetPreferences: () => Promise<void>;
  searchCryptocurrencies: (query: string) => Promise<Asset[]>;
  addAssetToAvailable: (asset: Omit<Asset, 'isSelected'>) => void;
}

const AssetContext = createContext<AssetContextType | null>(null);

export const useAssets = () => {
  const context = useContext(AssetContext);
  if (!context) {
    throw new Error('useAssets must be used within an AssetProvider');
  }
  return context;
};

// Default available assets
const DEFAULT_ASSETS: Asset[] = [
  { id: '1', symbol: 'BTC', name: 'Bitcoin', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1.png', isSelected: false },
  { id: '2', symbol: 'ETH', name: 'Ethereum', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png', isSelected: false },
  { id: '3', symbol: 'SOL', name: 'Solana', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png', isSelected: false },
  { id: '4', symbol: 'ADA', name: 'Cardano', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/2010.png', isSelected: false },
  { id: '5', symbol: 'DOGE', name: 'Dogecoin', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/74.png', isSelected: false },
  { id: '6', symbol: 'DOT', name: 'Polkadot', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/6636.png', isSelected: false },
  { id: '7', symbol: 'AVAX', name: 'Avalanche', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5805.png', isSelected: false },
  { id: '8', symbol: 'MATIC', name: 'Polygon', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3890.png', isSelected: false },
  { id: '9', symbol: 'LINK', name: 'Chainlink', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1975.png', isSelected: false },
  { id: '10', symbol: 'UNI', name: 'Uniswap', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/7083.png', isSelected: false },
];

export const AssetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [availableAssets, setAvailableAssets] = useState<Asset[]>(DEFAULT_ASSETS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assetsInitialized, setAssetsInitialized] = useState(false);

  // Use ref to track the user ID to prevent unnecessary refetches
  const lastUserIdRef = useRef<string | null>(null);

  // Fetch user's asset preferences when authenticated
  useEffect(() => {
    // Only fetch if user is authenticated and user ID has changed
    if (!isAuthenticated || !user?.id || user.id === lastUserIdRef.current) {
      return;
    }

    // Update the ref to track current user
    lastUserIdRef.current = user.id;
    
    const fetchAssetPreferences = async () => {
      console.log('Fetching asset preferences for user:', user.id);
      setIsLoading(true);
      setError(null);
      
      try {
        // Get user's selected asset symbols from backend
        const response = await axios.get('/api/users/assets');
        let selectedSymbols: string[] = [];
        
        // Handle successful response format: { success: true, data: { selectedAssets: string[] } }
        if (response.data && response.data.success && response.data.data && Array.isArray(response.data.data.selectedAssets)) {
          selectedSymbols = response.data.data.selectedAssets;
        } else if (user?.selectedAssets) {
          // Fallback to user data
          selectedSymbols = user.selectedAssets;
        }
        
        console.log('User selected assets:', selectedSymbols);
        
        // Update available assets with selection status
        setAvailableAssets(prevAssets => 
          prevAssets.map(asset => ({
            ...asset,
            isSelected: selectedSymbols.includes(asset.symbol)
          }))
        );
        
        setAssetsInitialized(true);
      } catch (error) {
        console.error('Error fetching asset preferences:', error);
        // Try to use user data as fallback
        if (user?.selectedAssets) {
          setAvailableAssets(prevAssets => 
            prevAssets.map(asset => ({
              ...asset,
              isSelected: user.selectedAssets?.includes(asset.symbol) || false
            }))
          );
        }
        setError('Failed to load your asset preferences');
        setAssetsInitialized(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssetPreferences();
  }, [isAuthenticated, user?.id]); // Only depend on authentication status and user ID

  // Reset state when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      setAssetsInitialized(false);
      lastUserIdRef.current = null;
      // Reset to default state
      setAvailableAssets(DEFAULT_ASSETS);
      setError(null);
    }
  }, [isAuthenticated]);

  // Toggle asset selection by symbol
  const toggleAssetSelection = (assetSymbol: string) => {
    setAvailableAssets(prevAssets => {
      const selectedCount = prevAssets.filter(asset => asset.isSelected).length;
      const targetAsset = prevAssets.find(asset => asset.symbol === assetSymbol);
      
      if (!targetAsset) return prevAssets;
      
      // If selecting a new asset and none are selected, require at least 1
      if (!targetAsset.isSelected && selectedCount === 0) {
        // Allow selection - no restrictions
      }
      
      // If deselecting and only 1 asset is selected, require at least 1
      if (targetAsset.isSelected && selectedCount === 1) {
        setError('You must select at least 1 asset');
        return prevAssets;
      }
      
      setError(null);
      
      return prevAssets.map(asset => 
        asset.symbol === assetSymbol 
          ? { ...asset, isSelected: !asset.isSelected } 
          : asset
      );
    });
  };

  // Save asset preferences to the server
  const saveAssetPreferences = async () => {
    if (!isAuthenticated) return Promise.reject('User not authenticated');
    
    setIsLoading(true);
    setError(null);
    
    try {
      const selectedSymbols = availableAssets
        .filter(asset => asset.isSelected)
        .map(asset => asset.symbol);
      
      await axios.post('/api/users/assets', { assets: selectedSymbols });
      return Promise.resolve();
    } catch (error) {
      console.error('Error saving asset preferences:', error);
      setError('Failed to save your asset preferences');
      return Promise.reject(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Search for cryptocurrencies using CoinGecko API
  const searchCryptocurrencies = async (query: string): Promise<Asset[]> => {
    if (!query.trim()) return [];
    
    try {
      const response = await axios.get(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`);
      
      if (response.data && response.data.coins) {
        return response.data.coins.slice(0, 10).map((coin: any) => ({
          id: `search-${coin.id}`,
          symbol: coin.symbol.toUpperCase(),
          name: coin.name,
          logo: coin.large || coin.small || coin.thumb || `https://via.placeholder.com/64x64/6366f1/ffffff?text=${coin.symbol.toUpperCase()}`,
          isSelected: false
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error searching cryptocurrencies:', error);
      return [];
    }
  };

  // Add a new asset to available assets list and save to backend
  const addAssetToAvailable = async (newAsset: Omit<Asset, 'isSelected'>) => {
    try {
      const exists = availableAssets.some(asset => asset.symbol === newAsset.symbol);
      if (exists) return;
      
      await axios.post('/api/assets', {
        symbol: newAsset.symbol,
        name: newAsset.name,
        logo: newAsset.logo
      });
      
      setAvailableAssets(prevAssets => [
        ...prevAssets, 
        { ...newAsset, isSelected: false }
      ]);
      
    } catch (error) {
      console.error('Error adding asset:', error);
      setAvailableAssets(prevAssets => {
        const exists = prevAssets.some(asset => asset.symbol === newAsset.symbol);
        if (exists) return prevAssets;
        return [...prevAssets, { ...newAsset, isSelected: false }];
      });
      setError('Asset added locally, but failed to sync with server');
    }
  };

  // Calculate selected assets
  const selectedAssets = availableAssets.filter(asset => asset.isSelected);

  const value = {
    availableAssets,
    selectedAssets,
    isLoading,
    error,
    toggleAssetSelection,
    saveAssetPreferences,
    searchCryptocurrencies,
    addAssetToAvailable
  };

  return <AssetContext.Provider value={value}>{children}</AssetContext.Provider>;
}; 