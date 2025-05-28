import React, { useState, useEffect } from 'react';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useDashboard } from '../../context/DashboardContext';

interface PriceWidgetData {
  symbol: string;
  currentPrice: number | null;
  priceChange24h: number | null;
  lastUpdated: string | null;
}

interface PriceWidgetProps {
  symbol: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const PriceWidget: React.FC<PriceWidgetProps> = ({ 
  symbol, 
  size = 'md', 
  showIcon = true,
  className = ''
}) => {
  const { getAssetBySymbol, isLoading } = useDashboard();
  const [data, setData] = useState<PriceWidgetData | null>(null);

  // Get price data from dashboard context
  useEffect(() => {
    const assetData = getAssetBySymbol(symbol);
    
    if (assetData) {
      setData({
        symbol: assetData.symbol,
        currentPrice: assetData.currentPrice,
        priceChange24h: assetData.priceChange24h,
        lastUpdated: assetData.lastUpdated
      });
    } else {
      setData(null);
    }
  }, [symbol, getAssetBySymbol]);

  // Format price
  const formatPrice = (price: number | null): string => {
    if (price === null) return '--';
    
    if (price < 1) {
      return `$${price.toFixed(6)}`;
    } else if (price < 100) {
      return `$${price.toFixed(2)}`;
    } else {
      return `$${price.toLocaleString()}`;
    }
  };

  // Format price change
  const formatPriceChange = (change: number | null): string => {
    if (change === null) return '--';
    return `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
  };

  // Determine price change direction
  const isPositive = data?.priceChange24h !== null && data?.priceChange24h! >= 0;
  const isNegative = data?.priceChange24h !== null && data?.priceChange24h! < 0;

  // Get style classes
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'px-2 py-1',
          price: 'text-sm font-medium',
          change: 'text-xs',
          icon: 'w-3 h-3'
        };
      case 'lg':
        return {
          container: 'px-4 py-3',
          price: 'text-lg font-bold',
          change: 'text-sm',
          icon: 'w-5 h-5'
        };
      default: // md
        return {
          container: 'px-3 py-2',
          price: 'text-base font-semibold',
          change: 'text-sm',
          icon: 'w-4 h-4'
        };
    }
  };

  const getChangeColorClass = () => {
    if (isPositive) return 'text-green-600 dark:text-green-400';
    if (isNegative) return 'text-red-600 dark:text-red-400';
    return 'text-neutral-500 dark:text-neutral-400';
  };

  const styles = getSizeClasses();

  if (isLoading && !data) {
    return (
      <div className={`inline-flex items-center space-x-1 ${styles.container} ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-16"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`inline-flex items-center space-x-1 ${styles.container} ${className}`}>
        <span className={`${styles.price} text-neutral-400 dark:text-neutral-500`}>
          {symbol} --
        </span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center space-x-1 ${styles.container} ${className}`}>
      <span className={`${styles.price} text-neutral-900 dark:text-neutral-100`}>
        {formatPrice(data.currentPrice)}
      </span>
      
      {data.priceChange24h !== null && (
        <div className={`flex items-center space-x-0.5 ${getChangeColorClass()}`}>
          {showIcon && (
            <>
              {isPositive ? (
                <ChevronUpIcon className={styles.icon} />
              ) : isNegative ? (
                <ChevronDownIcon className={styles.icon} />
              ) : null}
            </>
          )}
          <span className={styles.change}>
            {formatPriceChange(data.priceChange24h)}
          </span>
        </div>
      )}
    </div>
  );
};

export default PriceWidget; 