import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  CurrencyDollarIcon, 
  ArrowPathIcon, 
  ClockIcon,
  FireIcon 
} from '@heroicons/react/24/outline';
import { useSignals } from '@/context/SignalContext';
import { useDashboard } from '@/context/DashboardContext';
import { useAssets } from '@/context/AssetContext';
import PriceCard from '@/components/dashboard/PriceCard';
import SignalCard from '@/components/dashboard/SignalCard';
import SignalDetailModal from '@/components/dashboard/SignalDetailModal';
import SignalFilters from '@/components/dashboard/SignalFilters';
import AnalysisOverview from '@/components/dashboard/AnalysisOverview';
import DataSourceStatus from '@/components/DataSourceStatus';
import SocialSentimentWidget from '@/components/dashboard/SocialSentimentWidget';
import VolumeAnalysisPanel from '@/components/VolumeAnalysisPanel';
import NewsAnalysisPanel from '@/components/NewsAnalysisPanel';
import EnhancedNotificationCenter from '@/components/EnhancedNotificationCenter';
import type { Signal } from '@/context/SignalContext';

// Remove all demo data and use real data only
const DashboardPage = () => {
  const { filteredSignals, isLoading, loadMoreSignals } = useSignals();
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError, refreshData } = useDashboard();
  const { selectedAssets } = useAssets();
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Always use real data mode - demo mode removed
  const isDemoMode = false; // Always use real data mode
  
  // Use actual signals only
  const displaySignals = filteredSignals;

  // Get price data from dashboard context
  const priceData = dashboardData?.assets || [];
  const lastGlobalUpdate = dashboardData?.lastUpdated || new Date();

  // Manual refresh all data
  const handleGlobalRefresh = async () => {
    await refreshData();
  };

  // Open signal detail modal
  const handleOpenSignalDetail = (signalId: string) => {
    const signal = filteredSignals.find(s => s.id === signalId);
    
    if (signal) {
      setSelectedSignal(signal);
      setIsDetailModalOpen(true);
    }
  };

  // Close signal detail modal
  const handleCloseSignalDetail = () => {
    setIsDetailModalOpen(false);
    setTimeout(() => setSelectedSignal(null), 200); // Delay clearing signal for animation
  };

  // Implement infinite scroll
  const handleScroll = () => {
    if (
      window.innerHeight + document.documentElement.scrollTop >=
      document.documentElement.scrollHeight - 100
    ) {
      if (!isLoading && !isDemoMode) {
        loadMoreSignals();
      }
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLoading]);

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              Crypto Intelligence Dashboard
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1">
              Monitor real-time cryptocurrency signals, comprehensive analysis, and market data from multiple sources.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-sm text-gray-500">
              <ClockIcon className="h-4 w-4 mr-1" />
              Last updated: {lastGlobalUpdate.toLocaleTimeString()}
            </div>
            <button
              onClick={handleGlobalRefresh}
              disabled={dashboardLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-4 w-4 ${dashboardLoading ? 'animate-spin' : ''}`} />
              <span>{dashboardLoading ? 'Refreshing...' : 'Refresh All'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Data Source Status */}
      <DataSourceStatus />

      {/* Show no assets message if user hasn't selected any */}
      {selectedAssets.length === 0 ? (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-8">
          <div className="text-center">
            <CurrencyDollarIcon className="mx-auto h-16 w-16 text-blue-400 mb-4" />
            <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Welcome to Your Crypto Dashboard
            </h2>
            <p className="text-blue-700 dark:text-blue-300 mb-6 max-w-2xl mx-auto">
              To get started with real-time price monitoring and analysis, you need to select some cryptocurrencies to track.
            </p>
            <div className="bg-white dark:bg-blue-900/30 rounded-lg p-6 mb-6 max-w-lg mx-auto">
              <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-3">
                How to Add Cryptocurrencies:
              </h3>
              <ol className="text-left text-blue-700 dark:text-blue-300 space-y-2">
                <li className="flex items-start">
                  <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-3 mt-0.5">1</span>
                  Look for the "Asset Selector" in the left sidebar
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-3 mt-0.5">2</span>
                  Click "Add Cryptocurrency" to search for assets
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-3 mt-0.5">3</span>
                  Select cryptocurrencies to track
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-3 mt-0.5">4</span>
                  Click "Save Selection" to start monitoring
                </li>
              </ol>
            </div>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              Once you've selected assets, you'll see real-time prices, sentiment analysis, and market signals right here.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Real-time Price Cards */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center space-x-2 mb-4">
              <CurrencyDollarIcon className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Real-time Prices</h2>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {selectedAssets.length} assets selected
              </span>
            </div>
            
            {dashboardError && (
              <div className="bg-red-50 text-red-700 px-4 py-2 rounded-md mb-4 text-sm">
                {dashboardError}
              </div>
            )}
            
            {priceData.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {priceData.map((data) => (
                  <PriceCard key={data.symbol} priceData={data} />
                ))}
              </div>
            ) : (
              <div className="flex justify-center py-8">
                <div className="text-gray-500">
                  {dashboardLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span>Loading price data...</span>
                    </div>
                  ) : (
                    'No price data available'
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Social Sentiment Analysis Widget */}
          <SocialSentimentWidget 
            selectedCoin={selectedAssets.length > 0 ? selectedAssets[0].symbol : 'BTC'}
            coinName={selectedAssets.length > 0 ? selectedAssets[0].name : 'Bitcoin'}
          />

          {/* Three-column analysis section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Volume Analysis */}
            <VolumeAnalysisPanel />
            
            {/* News Analysis */}
            <NewsAnalysisPanel />
            
            {/* Enhanced Notification Center */}
            <EnhancedNotificationCenter />
          </div>

          {/* Signal Analysis Area */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center space-x-2 mb-6">
              <ChartBarIcon className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Signal Analysis</h2>
            </div>

            {/* Signal Filters */}
            <div className="mb-6">
              <SignalFilters />
            </div>

            {/* Analysis Overview */}
            <div className="mb-6">
              <AnalysisOverview symbols={selectedAssets.map(asset => asset.symbol)} />
            </div>

            {/* Signals */}
            <div className="space-y-4">
              {displaySignals.length > 0 ? (
                displaySignals.map((signal) => (
                  <SignalCard
                    key={signal.id}
                    signal={signal}
                    onClick={() => handleOpenSignalDetail(signal.id)}
                  />
                ))
              ) : (
                <div className="text-center py-8">
                  <FireIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No signals found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {isLoading 
                      ? 'Loading signals...' 
                      : 'Try adjusting your filters to see more signals.'
                    }
                  </p>
                </div>
              )}
            </div>

            {/* Loading indicator for infinite scroll */}
            {isLoading && !isDemoMode && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Signal Detail Modal */}
      <SignalDetailModal
        signal={selectedSignal}
        isOpen={isDetailModalOpen}
        onClose={handleCloseSignalDetail}
      />
    </div>
  );
};

export default DashboardPage; 