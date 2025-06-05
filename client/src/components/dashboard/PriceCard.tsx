import React from 'react';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface PriceData {
  symbol: string;
  name: string;
  logo: string;
  currentPrice: number | null;
  priceChange24h: number | null;
  lastUpdated: string | null;
}

interface PriceCardProps {
  priceData: PriceData;
}

const PriceCard: React.FC<PriceCardProps> = ({ priceData }) => {
  const {
    symbol,
    name,
    logo,
    currentPrice,
    priceChange24h,
    lastUpdated
  } = priceData;

  // Safe number formatting function
  const safeToFixed = (value: number | null | undefined, decimals: number = 2): string => {
    if (value === null || value === undefined || isNaN(value)) return '--';
    return Number(value).toFixed(decimals);
  };

  // Format price
  const formatPrice = (price: number | null): string => {
    if (price === null || price === undefined || isNaN(price)) return '--';
    
    if (price < 1) {
      return `$${safeToFixed(price, 6)}`;
    } else if (price < 100) {
      return `$${safeToFixed(price, 2)}`;
    } else {
      return `$${price.toLocaleString()}`;
    }
  };

  // Format price change
  const formatPriceChange = (change: number | null): string => {
    if (change === null || change === undefined || isNaN(change)) return '--';
    return `${change >= 0 ? '+' : ''}${safeToFixed(change, 2)}%`;
  };

  // Determine price change direction
  const isPositive = priceChange24h !== null && priceChange24h >= 0;
  const isNegative = priceChange24h !== null && priceChange24h < 0;

  // Get change color class
  const getChangeColorClass = () => {
    if (isPositive) return 'text-green-600 dark:text-green-400';
    if (isNegative) return 'text-red-600 dark:text-red-400';
    return 'text-neutral-500 dark:text-neutral-400';
  };

  // Get background color class
  const getBackgroundColorClass = () => {
    if (isPositive) return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
    if (isNegative) return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    return 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700';
  };

  // Format updated time
  const formatLastUpdated = (timestamp: string | null): string => {
    if (!timestamp) return 'Unknown';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just updated';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hrs ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={`rounded-lg p-5 border transition-all duration-200 hover:shadow-lg ${getBackgroundColorClass()}`}>
      {/* Header with coin info */}
      <div className="flex items-center space-x-3 mb-4">
        <img 
          src={logo} 
          alt={symbol} 
          className="w-12 h-12 rounded-full flex-shrink-0"
          onError={(e) => {
            // If image loading fails, use backup image
            const target = e.target as HTMLImageElement;
            // First try JSDelivr CDN
            if (!target.src.includes('jsdelivr.net')) {
              target.src = `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/32/color/${symbol.toLowerCase()}.png`;
            } else {
              // If JSDelivr also fails, use letter icon
              target.src = `https://via.placeholder.com/48x48/6366f1/ffffff?text=${symbol}`;
            }
          }}
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 truncate">
            {symbol}
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
            {name}
          </p>
        </div>
      </div>

      {/* Price information */}
      <div className="space-y-3">
        {/* Current price */}
        <div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">
            {formatPrice(currentPrice)}
          </div>
          <div className="text-xs text-neutral-400 dark:text-neutral-500">
            Current Price
          </div>
        </div>

        {/* Price change */}
        <div className="flex items-center justify-between">
          <div>
            <div className={`flex items-center space-x-1 text-base font-semibold ${getChangeColorClass()}`}>
              {priceChange24h !== null && (
                <>
                  {isPositive ? (
                    <ChevronUpIcon className="w-4 h-4" />
                  ) : isNegative ? (
                    <ChevronDownIcon className="w-4 h-4" />
                  ) : null}
                  <span>{formatPriceChange(priceChange24h)}</span>
                </>
              )}
              {priceChange24h === null && (
                <span className="text-neutral-500 dark:text-neutral-400">--</span>
              )}
            </div>
            <div className="text-xs text-neutral-400 dark:text-neutral-500">
              24h Change
            </div>
          </div>
        </div>

        {/* Last updated */}
        <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700">
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            Updated: {formatLastUpdated(lastUpdated)}
          </p>
        </div>
      </div>

      {/* Price change indicator bar */}
      {priceChange24h !== null && Math.abs(priceChange24h) > 0 && (
        <div className="mt-4 h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${
              isPositive ? 'bg-green-500' : 'bg-red-500'
            }`}
            style={{ 
              width: `${Math.min(Math.abs(priceChange24h) * 5, 100)}%` 
            }}
          />
        </div>
      )}
    </div>
  );
};

export default PriceCard; 