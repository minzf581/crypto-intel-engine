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
  toggleAssetSelection: (assetId: string) => void;
  saveAssetPreferences: () => Promise<void>;
}

const AssetContext = createContext<AssetContextType | null>(null);

export const useAssets = () => {
  const context = useContext(AssetContext);
  if (!context) {
    throw new Error('useAssets must be used within an AssetProvider');
  }
  return context;
};

// For the prototype, we'll use a limited set of hardcoded assets
const AVAILABLE_ASSETS: Asset[] = [
  { id: '1', symbol: 'BTC', name: 'Bitcoin', logo: '/assets/logos/btc.svg', isSelected: false },
  { id: '2', symbol: 'ETH', name: 'Ethereum', logo: '/assets/logos/eth.svg', isSelected: false },
  { id: '3', symbol: 'SOL', name: 'Solana', logo: '/assets/logos/sol.svg', isSelected: false },
  { id: '4', symbol: 'ADA', name: 'Cardano', logo: '/assets/logos/ada.svg', isSelected: false },
  { id: '5', symbol: 'DOGE', name: 'Dogecoin', logo: '/assets/logos/doge.svg', isSelected: false },
  { id: '6', symbol: 'DOT', name: 'Polkadot', logo: '/assets/logos/dot.svg', isSelected: false },
  { id: '7', symbol: 'AVAX', name: 'Avalanche', logo: '/assets/logos/avax.svg', isSelected: false },
  { id: '8', symbol: 'MATIC', name: 'Polygon', logo: '/assets/logos/matic.svg', isSelected: false },
  { id: '9', symbol: 'LINK', name: 'Chainlink', logo: '/assets/logos/link.svg', isSelected: false },
  { id: '10', symbol: 'UNI', name: 'Uniswap', logo: '/assets/logos/uni.svg', isSelected: false },
];

export const AssetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [availableAssets, setAvailableAssets] = useState<Asset[]>(AVAILABLE_ASSETS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's asset preferences when authenticated
  useEffect(() => {
    const fetchAssetPreferences = async () => {
      if (!isAuthenticated) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await axios.get('/api/users/assets');
        const selectedAssetIds = new Set(response.data.map((asset: { id: string }) => asset.id));
        
        setAvailableAssets(prevAssets => 
          prevAssets.map(asset => ({
            ...asset,
            isSelected: selectedAssetIds.has(asset.id)
          }))
        );
      } catch (error) {
        console.error('Error fetching asset preferences:', error);
        setError('Failed to load your asset preferences');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssetPreferences();
  }, [isAuthenticated, user?.id]);

  // Toggle asset selection
  const toggleAssetSelection = (assetId: string) => {
    setAvailableAssets(prevAssets => {
      // Count currently selected assets
      const selectedCount = prevAssets.filter(asset => asset.isSelected).length;
      
      // Find the asset we're trying to update
      const targetAsset = prevAssets.find(asset => asset.id === assetId);
      
      // If we're trying to select a 6th asset, prevent it
      if (targetAsset && !targetAsset.isSelected && selectedCount >= 5) {
        setError('You can select a maximum of 5 assets');
        return prevAssets;
      }
      
      // If we're trying to deselect when only 3 are selected, prevent it
      if (targetAsset && targetAsset.isSelected && selectedCount <= 3) {
        setError('You must select at least 3 assets');
        return prevAssets;
      }
      
      // Clear any previous errors
      setError(null);
      
      // Toggle the selection
      return prevAssets.map(asset => 
        asset.id === assetId 
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
      const selectedAssetIds = availableAssets
        .filter(asset => asset.isSelected)
        .map(asset => asset.id);
      
      await axios.post('/api/users/assets', { assets: selectedAssetIds });
      return Promise.resolve();
    } catch (error) {
      console.error('Error saving asset preferences:', error);
      setError('Failed to save your asset preferences');
      return Promise.reject(error);
    } finally {
      setIsLoading(false);
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
    saveAssetPreferences
  };

  return <AssetContext.Provider value={value}>{children}</AssetContext.Provider>;
}; 