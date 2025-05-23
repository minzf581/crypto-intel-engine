import React, { createContext, useState, useContext, useEffect } from 'react';
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

  // Fetch user's asset preferences when authenticated
  useEffect(() => {
    const fetchAssetPreferences = async () => {
      if (!isAuthenticated) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Get user's selected asset symbols from backend
        const response = await axios.get('/api/users/assets');
        let selectedSymbols: string[] = [];
        
        if (response.data && Array.isArray(response.data)) {
          selectedSymbols = response.data.map((asset: any) => asset.symbol);
        } else if (user?.selectedAssets) {
          selectedSymbols = user.selectedAssets;
        }
        
        // Update available assets with selection status
        setAvailableAssets(prevAssets => 
          prevAssets.map(asset => ({
            ...asset,
            isSelected: selectedSymbols.includes(asset.symbol)
          }))
        );
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
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssetPreferences();
  }, [isAuthenticated, user?.id]);

  // Toggle asset selection by symbol
  const toggleAssetSelection = (assetSymbol: string) => {
    setAvailableAssets(prevAssets => {
      // Count currently selected assets
      const selectedCount = prevAssets.filter(asset => asset.isSelected).length;
      
      // Find the asset we're trying to update
      const targetAsset = prevAssets.find(asset => asset.symbol === assetSymbol);
      
      if (!targetAsset) return prevAssets;
      
      // If we're trying to select a 6th asset, prevent it
      if (!targetAsset.isSelected && selectedCount >= 5) {
        setError('You can select a maximum of 5 assets');
        return prevAssets;
      }
      
      // If we're trying to deselect when only 3 are selected, prevent it
      if (targetAsset.isSelected && selectedCount <= 3) {
        setError('You must select at least 3 assets');
        return prevAssets;
      }
      
      // Clear any previous errors
      setError(null);
      
      // Toggle the selection
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
      // Using CoinGecko search API
      const response = await axios.get(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`);
      
      if (response.data && response.data.coins) {
        return response.data.coins.slice(0, 10).map((coin: any, index: number) => ({
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
      // Check if asset already exists locally
      const exists = availableAssets.some(asset => asset.symbol === newAsset.symbol);
      if (exists) return;
      
      // Add asset to backend
      await axios.post('/api/assets', {
        symbol: newAsset.symbol,
        name: newAsset.name,
        logo: newAsset.logo
      });
      
      // Add to local state
      setAvailableAssets(prevAssets => [
        ...prevAssets, 
        { ...newAsset, isSelected: false }
      ]);
      
    } catch (error) {
      console.error('Error adding asset:', error);
      // If backend fails, still add to local state temporarily
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