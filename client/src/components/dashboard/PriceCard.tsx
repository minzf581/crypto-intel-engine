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

  // 安全的数值格式化函数
  const safeToFixed = (value: number | null | undefined, decimals: number = 2): string => {
    if (value === null || value === undefined || isNaN(value)) return '--';
    return value.toFixed(decimals);
  };

  // 格式化价格
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

  // 格式化价格变化
  const formatPriceChange = (change: number | null): string => {
    if (change === null || change === undefined || isNaN(change)) return '--';
    return `${change >= 0 ? '+' : ''}${safeToFixed(change, 2)}%`;
  };

  // 判断价格变化方向
  const isPositive = priceChange24h !== null && priceChange24h >= 0;
  const isNegative = priceChange24h !== null && priceChange24h < 0;

  // 获取变化颜色类
  const getChangeColorClass = () => {
    if (isPositive) return 'text-green-600 dark:text-green-400';
    if (isNegative) return 'text-red-600 dark:text-red-400';
    return 'text-neutral-500 dark:text-neutral-400';
  };

  // 获取背景颜色类
  const getBackgroundColorClass = () => {
    if (isPositive) return 'bg-green-50 dark:bg-green-900/20';
    if (isNegative) return 'bg-red-50 dark:bg-red-900/20';
    return 'bg-neutral-50 dark:bg-neutral-800';
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
    <div className={`rounded-lg p-4 border transition-all duration-200 hover:shadow-md ${getBackgroundColorClass()} border-neutral-200 dark:border-neutral-700`}>
      <div className="flex items-center justify-between">
        {/* 左侧：币种信息 */}
        <div className="flex items-center space-x-3">
          <img 
            src={logo} 
            alt={symbol} 
            className="w-10 h-10 rounded-full"
            onError={(e) => {
              // 如果图片加载失败，使用备用图片
              const target = e.target as HTMLImageElement;
              // 先尝试JSDelivr CDN
              if (!target.src.includes('jsdelivr.net')) {
                target.src = `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/32/color/${symbol.toLowerCase()}.png`;
              } else {
                // 如果JSDelivr也失败，使用字母图标
                target.src = `https://via.placeholder.com/40x40/6366f1/ffffff?text=${symbol}`;
              }
            }}
          />
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                {symbol}
              </h3>
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                {name}
              </span>
            </div>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              {formatLastUpdated(lastUpdated)}
            </p>
          </div>
        </div>

        {/* 右侧：价格信息 */}
        <div className="text-right">
          <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
            {formatPrice(currentPrice)}
          </div>
          <div className={`flex items-center justify-end space-x-1 text-sm font-medium ${getChangeColorClass()}`}>
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

      {/* 价格变化条 */}
      {priceChange24h !== null && Math.abs(priceChange24h) > 0 && (
        <div className="mt-3 h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
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