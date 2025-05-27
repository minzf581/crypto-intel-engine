import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSignals, Signal } from '@/context/SignalContext';
import { useAssets } from '@/context/AssetContext';
import { useAuth } from '@/context/AuthContext';
import SignalCard from '@/components/dashboard/SignalCard';
import SignalDetailModal from '@/components/dashboard/SignalDetailModal';
import SignalFilters from '@/components/dashboard/SignalFilters';
import PriceCard from '@/components/dashboard/PriceCard';
import SentimentChart from '@/components/dashboard/SentimentChart';
import AnalysisOverview from '@/components/dashboard/AnalysisOverview';
import DataSourceStatus from '@/components/DataSourceStatus';
import VolumeAnalysisPanel from '@/components/VolumeAnalysisPanel';
import NewsAnalysisPanel from '@/components/NewsAnalysisPanel';
import EnhancedNotificationCenter from '@/components/EnhancedNotificationCenter';
import SocialSentimentWidget from '@/components/dashboard/SocialSentimentWidget';
import { 
  InformationCircleIcon, 
  CurrencyDollarIcon, 
  ChartBarIcon,
  ClockIcon,
  ArrowPathIcon 
} from '@heroicons/react/24/outline';

// Price data interface
interface PriceData {
  symbol: string;
  name: string;
  logo: string;
  currentPrice: number | null;
  priceChange24h: number | null;
  lastUpdated: string | null;
}

// Demo signals for when backend is unavailable
const DEMO_SIGNALS: Signal[] = [
  {
    id: 'demo-signal-1',
    assetId: 'btc-id',
    assetSymbol: 'BTC',
    assetName: 'Bitcoin',
    assetLogo: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png',
    type: 'sentiment',
    strength: 85,
    description: 'Social media discussions about Bitcoin have turned notably positive',
    sources: [
      { platform: 'twitter' as 'twitter', count: 324 },
      { platform: 'reddit' as 'reddit', count: 156 }
    ],
    timestamp: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'demo-signal-2',
    assetId: 'eth-id',
    assetSymbol: 'ETH',
    assetName: 'Ethereum',
    assetLogo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
    type: 'narrative',
    strength: 72,
    description: 'New technical updates for Ethereum have attracted widespread attention',
    sources: [
      { platform: 'twitter' as 'twitter', count: 267 },
      { platform: 'reddit' as 'reddit', count: 189 }
    ],
    timestamp: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: 'demo-signal-3',
    assetId: 'sol-id',
    assetSymbol: 'SOL',
    assetName: 'Solana',
    assetLogo: 'https://cryptologos.cc/logos/solana-sol-logo.png',
    type: 'sentiment',
    strength: 68,
    description: 'Traders are generally bullish on Solana short-term trend',
    sources: [
      { platform: 'twitter' as 'twitter', count: 213 },
      { platform: 'reddit' as 'reddit', count: 134 }
    ],
    timestamp: new Date(Date.now() - 10800000).toISOString()
  }
];

const DashboardPage = () => {
  const { user } = useAuth();
  const { filteredSignals, setSelectedSignal, selectedSignal, loadMoreSignals, isLoading } = useSignals();
  const { selectedAssets } = useAssets();
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [demoSignals, setDemoSignals] = useState(DEMO_SIGNALS);
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [lastGlobalUpdate, setLastGlobalUpdate] = useState<Date>(new Date());

  // Always use real data mode - demo mode removed
  const isDemoMode = false; // Always use real data mode
  
  // Use demo signals or actual signals based on mode
  const displaySignals = isDemoMode ? demoSignals : filteredSignals;

  // Fetch price data
  const fetchPriceData = async () => {
    if (isDemoMode) return; // Skip price data fetch in demo mode
    
    try {
      setPriceLoading(true);
      setPriceError(null);
      
      const response = await axios.get('/api/dashboard/data');
      
      if (response.data && response.data.success && response.data.data) {
        setPriceData(response.data.data.assets);
        setLastGlobalUpdate(new Date());
      } else {
        setPriceError('Price data format error');
      }
    } catch (error: any) {
      console.error('Failed to fetch price data:', error);
      setPriceError('Unable to fetch price data');
    } finally {
      setPriceLoading(false);
    }
  };

  // Manual refresh all data
  const handleGlobalRefresh = async () => {
    await fetchPriceData();
    setLastGlobalUpdate(new Date());
  };

  // Initial load of price data
  useEffect(() => {
    fetchPriceData();
    
    // Update price data every minute
    const interval = setInterval(fetchPriceData, 60000);
    
    return () => clearInterval(interval);
  }, [isDemoMode]);

  // Open signal detail modal
  const handleOpenSignalDetail = (signalId: string) => {
    let signal;
    
    if (isDemoMode) {
      signal = demoSignals.find(s => s.id === signalId);
    } else {
      signal = filteredSignals.find(s => s.id === signalId);
    }
    
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
              disabled={priceLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-4 w-4 ${priceLoading ? 'animate-spin' : ''}`} />
              <span>{priceLoading ? 'Refreshing...' : 'Refresh All'}</span>
            </button>
          </div>
        </div>
        
        {isDemoMode && (
          <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-md mt-4 text-sm">
            Demo Mode: Using sample data, no backend connection required.
          </div>
        )}
      </div>

      {/* Data Source Status */}
      <DataSourceStatus />

      {/* Real-time Price Cards */}
      {!isDemoMode && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-2 mb-4">
            <CurrencyDollarIcon className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Real-time Prices</h2>
          </div>
          
          {priceError && (
            <div className="bg-red-50 text-red-700 px-4 py-2 rounded-md mb-4 text-sm">
              {priceError}
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
                {priceLoading ? (
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
      )}

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
          <AnalysisOverview />
        </div>

        {/* Sentiment Chart */}
        <div className="mb-6">
          <SentimentChart />
        </div>

        {/* Signals Grid */}
        <div>
          {displaySignals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displaySignals.map((signal) => (
                <SignalCard
                  key={signal.id}
                  signal={signal}
                  onClick={() => handleOpenSignalDetail(signal.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <InformationCircleIcon className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                No signals found
              </h3>
              <p className="text-neutral-500 dark:text-neutral-400">
                {isLoading ? 'Loading signals...' : 'No signals match your current filters.'}
              </p>
            </div>
          )}

          {/* Load More Button */}
          {!isDemoMode && displaySignals.length > 0 && (
            <div className="mt-8 text-center">
              <button
                onClick={loadMoreSignals}
                disabled={isLoading}
                className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Loading...' : 'Load More Signals'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Signal Detail Modal */}
      <SignalDetailModal
        isOpen={isDetailModalOpen}
        onClose={handleCloseSignalDetail}
        signal={selectedSignal}
      />
    </div>
  );
};

export default DashboardPage; 