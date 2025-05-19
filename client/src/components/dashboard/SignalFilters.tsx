import { useState } from 'react';
import {
  AdjustmentsHorizontalIcon,
  XMarkIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useSignals, SignalFilter } from '@/context/SignalContext';

const SignalFilters = () => {
  const { filters, updateFilters, resetFilters } = useSignals();
  const [isOpen, setIsOpen] = useState(false);

  const handleTimeRangeChange = (timeRange: SignalFilter['timeRange']) => {
    updateFilters({ timeRange });
  };

  const handleTypeToggle = (type: 'sentiment' | 'narrative') => {
    const updatedTypes = [...filters.types];
    
    if (updatedTypes.includes(type)) {
      // Remove if it's the only type selected, don't allow empty array
      if (updatedTypes.length > 1) {
        updateFilters({ types: updatedTypes.filter(t => t !== type) });
      }
    } else {
      updateFilters({ types: [...updatedTypes, type] });
    }
  };

  const handleSourceToggle = (source: 'twitter' | 'reddit') => {
    const updatedSources = [...filters.sources];
    
    if (updatedSources.includes(source)) {
      // Remove if it's the only source selected, don't allow empty array
      if (updatedSources.length > 1) {
        updateFilters({ sources: updatedSources.filter(s => s !== source) });
      }
    } else {
      updateFilters({ sources: [...updatedSources, source] });
    }
  };

  const handleMinStrengthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value);
    updateFilters({ minStrength: value });
  };

  const handleSortByChange = (sortBy: SignalFilter['sortBy']) => {
    updateFilters({ sortBy });
  };

  const toggleFilters = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">Signal Feed</h2>
        <button
          onClick={toggleFilters}
          className="inline-flex items-center rounded-md px-3 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700"
        >
          <AdjustmentsHorizontalIcon className="h-5 w-5 mr-1" />
          Filters
        </button>
      </div>

      {isOpen && (
        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 shadow-sm mb-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-md font-medium text-neutral-900 dark:text-neutral-100">Filter Signals</h3>
            <div className="flex space-x-2">
              <button
                onClick={resetFilters}
                className="inline-flex items-center text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
              >
                <ArrowPathIcon className="h-4 w-4 mr-1" />
                Reset
              </button>
              <button
                onClick={toggleFilters}
                className="text-neutral-400 hover:text-neutral-500 dark:hover:text-neutral-300"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Time Range */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Time Range
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'hour', label: 'Past Hour' },
                  { value: 'today', label: 'Today' },
                  { value: 'yesterday', label: 'Yesterday' },
                  { value: 'all', label: 'All Time' }
                ].map(option => (
                  <button
                    key={option.value}
                    className={`px-3 py-1.5 text-sm rounded-md ${
                      filters.timeRange === option.value
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 border border-primary-300 dark:border-primary-700'
                        : 'bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-600'
                    }`}
                    onClick={() => handleTimeRangeChange(option.value as SignalFilter['timeRange'])}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Signal Type */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Signal Type
              </label>
              <div className="flex gap-2">
                {[
                  { value: 'sentiment', label: 'Sentiment' },
                  { value: 'narrative', label: 'Narrative' }
                ].map(option => (
                  <button
                    key={option.value}
                    className={`px-3 py-1.5 text-sm rounded-md ${
                      filters.types.includes(option.value as 'sentiment' | 'narrative')
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 border border-primary-300 dark:border-primary-700'
                        : 'bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-600'
                    }`}
                    onClick={() => handleTypeToggle(option.value as 'sentiment' | 'narrative')}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Minimum Strength */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Minimum Strength: {filters.minStrength}
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={filters.minStrength}
                onChange={handleMinStrengthChange}
                className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-neutral-500 mt-1">
                <span>0</span>
                <span>50</span>
                <span>100</span>
              </div>
            </div>

            {/* Sources */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Sources
              </label>
              <div className="flex gap-2">
                {[
                  { value: 'twitter', label: 'Twitter/X' },
                  { value: 'reddit', label: 'Reddit' }
                ].map(option => (
                  <button
                    key={option.value}
                    className={`px-3 py-1.5 text-sm rounded-md ${
                      filters.sources.includes(option.value as 'twitter' | 'reddit')
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 border border-primary-300 dark:border-primary-700'
                        : 'bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-600'
                    }`}
                    onClick={() => handleSourceToggle(option.value as 'twitter' | 'reddit')}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Sort By
              </label>
              <div className="flex gap-2">
                {[
                  { value: 'latest', label: 'Latest' },
                  { value: 'strength', label: 'Strength' }
                ].map(option => (
                  <button
                    key={option.value}
                    className={`px-3 py-1.5 text-sm rounded-md ${
                      filters.sortBy === option.value
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 border border-primary-300 dark:border-primary-700'
                        : 'bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-600'
                    }`}
                    onClick={() => handleSortByChange(option.value as SignalFilter['sortBy'])}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active filters summary */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
        <span>Showing:</span>
        {filters.timeRange !== 'all' && (
          <span className="bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
            {filters.timeRange === 'hour'
              ? 'Past Hour'
              : filters.timeRange === 'today'
              ? 'Today'
              : 'Yesterday'}
          </span>
        )}
        {filters.minStrength > 0 && (
          <span className="bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
            Strength &ge; {filters.minStrength}
          </span>
        )}
        {filters.types.length === 1 && (
          <span className="bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full capitalize">
            {filters.types[0]} Only
          </span>
        )}
        {filters.sources.length === 1 && (
          <span className="bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
            {filters.sources[0] === 'twitter' ? 'Twitter/X Only' : 'Reddit Only'}
          </span>
        )}
        <span className="ml-auto">
          Sorted by: <span className="font-medium capitalize">{filters.sortBy}</span>
        </span>
      </div>
    </div>
  );
};

export default SignalFilters; 