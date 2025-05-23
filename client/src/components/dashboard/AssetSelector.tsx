import { useAssets } from '@/context/AssetContext';
import PriceWidget from '@/components/common/PriceWidget';

interface AssetSelectorProps {
  isMobile?: boolean;
}

const AssetSelector = ({ isMobile = false }: AssetSelectorProps) => {
  const { availableAssets, toggleAssetSelection } = useAssets();

  return (
    <div className={`${isMobile ? 'px-1' : ''}`}>
      <ul className="space-y-2">
        {availableAssets.map((asset) => (
          <li key={asset.id} className="flex items-center justify-between py-1">
            <div className="flex items-center gap-x-3 flex-1">
              <div className="h-6 w-6 flex-shrink-0 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-700">
                <img
                  src={asset.logo}
                  alt={asset.name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    // 使用JSDelivr CDN作为备用
                    const target = e.target as HTMLImageElement;
                    if (!target.src.includes('jsdelivr.net')) {
                      target.src = `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/32/color/${asset.symbol.toLowerCase()}.png`;
                    } else {
                      // 如果JSDelivr也失败，使用字母图标
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
                  
                  {/* 价格小部件 */}
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
                onChange={() => toggleAssetSelection(asset.id)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 dark:border-neutral-600 rounded"
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AssetSelector; 