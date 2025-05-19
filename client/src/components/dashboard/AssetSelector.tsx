import { useAssets } from '@/context/AssetContext';
import { Switch } from '@headlessui/react';

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
            <div className="flex items-center gap-x-3">
              <div className="h-6 w-6 flex-shrink-0 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-700">
                <img
                  src={asset.logo}
                  alt={asset.name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    // Handle image error by showing a fallback
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>';
                  }}
                />
              </div>
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {asset.symbol}
                <span className="text-xs text-neutral-500 dark:text-neutral-400 ml-1">
                  {asset.name}
                </span>
              </span>
            </div>
            <Switch
              checked={asset.isSelected}
              onChange={() => toggleAssetSelection(asset.id)}
              className={`${
                asset.isSelected ? 'bg-primary-600' : 'bg-neutral-200 dark:bg-neutral-700'
              } relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2`}
            >
              <span
                className={`${
                  asset.isSelected ? 'translate-x-5' : 'translate-x-0'
                } pointer-events-none relative inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
              />
            </Switch>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AssetSelector; 