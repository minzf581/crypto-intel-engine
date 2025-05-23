import { useState } from 'react';
import { useAssets } from '@/context/AssetContext';
import PriceWidget from '@/components/common/PriceWidget';
import { MagnifyingGlassIcon, PlusIcon, CheckIcon } from '@heroicons/react/24/outline';

interface AssetSelectorProps {
  isMobile?: boolean;
}

const AssetSelector = ({ isMobile = false }: AssetSelectorProps) => {
  const { 
    availableAssets, 
    toggleAssetSelection, 
    saveAssetPreferences, 
    searchCryptocurrencies, 
    addAssetToAvailable,
    isLoading,
    error 
  } = useAssets();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const results = await searchCryptocurrencies(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddAsset = async (searchAsset: any) => {
    try {
      await addAssetToAvailable(searchAsset);
      setSearchResults([]);
      setSearchQuery('');
      setShowSearch(false);
    } catch (error) {
      console.error('Error adding asset:', error);
    }
  };

  const handleSavePreferences = async () => {
    setIsSaving(true);
    try {
      await saveAssetPreferences();
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`${isMobile ? 'px-1' : ''}`}>
      {/* Search Section */}
      <div className="mb-4">
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="w-full flex items-center justify-center px-3 py-2 text-sm bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-md hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Cryptocurrency
        </button>
        
        {showSearch && (
          <div className="mt-2 space-y-2">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search cryptocurrencies..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                </div>
              )}
            </div>
            
            {searchResults.length > 0 && (
              <div className="max-h-40 overflow-y-auto border border-neutral-200 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800">
                {searchResults.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-neutral-700 cursor-pointer"
                    onClick={() => handleAddAsset(asset)}
                  >
                    <div className="flex items-center">
                      <img
                        src={asset.logo}
                        alt={asset.name}
                        className="w-6 h-6 rounded-full mr-2"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://via.placeholder.com/24x24/6366f1/ffffff?text=${asset.symbol}`;
                        }}
                      />
                      <div>
                        <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {asset.symbol}
                        </div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">
                          {asset.name}
                        </div>
                      </div>
                    </div>
                    <PlusIcon className="w-4 h-4 text-primary-600" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-3 p-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md">
          {error}
        </div>
      )}

      {/* Assets List */}
      <ul className="space-y-2 mb-4">
        {availableAssets.map((asset) => (
          <li key={asset.symbol} className="flex items-center justify-between py-1">
            <div className="flex items-center gap-x-3 flex-1">
              <div className="h-6 w-6 flex-shrink-0 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-700">
                <img
                  src={asset.logo}
                  alt={asset.name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    // Use JSDelivr CDN as backup
                    const target = e.target as HTMLImageElement;
                    if (!target.src.includes('jsdelivr.net')) {
                      target.src = `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/32/color/${asset.symbol.toLowerCase()}.png`;
                    } else {
                      // If JSDelivr also fails, use letter icon
                      target.src = `https://via.placeholder.com/24x24/6366f1/ffffff?text=${asset.symbol}`;
                    }
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 truncate">
                    {asset.symbol}
                  </span>
                  
                  {/* Price widget */}
                  {asset.isSelected && (
                    <PriceWidget 
                      symbol={asset.symbol} 
                      size="sm" 
                      showIcon={false}
                      className="ml-2"
                    />
                  )}
                </div>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate block">
                  {asset.name}
                </span>
              </div>
            </div>
            
            <div className="ml-2 flex-shrink-0">
              <input
                type="checkbox"
                checked={asset.isSelected}
                onChange={() => toggleAssetSelection(asset.symbol)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 dark:border-neutral-600 rounded"
              />
            </div>
          </li>
        ))}
      </ul>

      {/* Save Button */}
      <button
        onClick={handleSavePreferences}
        disabled={isSaving || isLoading}
        className="w-full flex items-center justify-center px-3 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSaving ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Saving...
          </>
        ) : (
          <>
            <CheckIcon className="w-4 h-4 mr-2" />
            Save Selection
          </>
        )}
      </button>
    </div>
  );
};

export default AssetSelector; 