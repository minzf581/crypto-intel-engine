import { useState, useEffect } from 'react';
import { useSignals } from '@/context/SignalContext';
import { useAssets } from '@/context/AssetContext';
import { useAuth } from '@/context/AuthContext';
import SignalCard from '@/components/dashboard/SignalCard';
import SignalDetailModal from '@/components/dashboard/SignalDetailModal';
import SignalFilters from '@/components/dashboard/SignalFilters';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

// Demo signals for when backend is unavailable
const DEMO_SIGNALS = [
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
      { platform: 'twitter', count: 324 },
      { platform: 'reddit', count: 156 }
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
      { platform: 'twitter', count: 267 },
      { platform: 'reddit', count: 189 }
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
      { platform: 'twitter', count: 213 },
      { platform: 'reddit', count: 134 }
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

  // Determine if using demo mode
  const isDemoMode = user?.email === 'demo@example.com';
  
  // Use demo signals or actual signals based on mode
  const displaySignals = isDemoMode ? demoSignals : filteredSignals;

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
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Dashboard</h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-1">
          Monitor real-time cryptocurrency signals extracted from social media platforms.
        </p>
        {isDemoMode && (
          <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-md mt-2 text-sm">
            Demo Mode: Using sample data. No connection to backend required.
          </div>
        )}
      </div>

      {selectedAssets.length === 0 && !isDemoMode ? (
        <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-sm border border-neutral-200 dark:border-neutral-700">
          <div className="flex justify-center items-center h-48 flex-col text-center">
            <InformationCircleIcon className="h-12 w-12 text-neutral-400 mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">No Assets Selected</h3>
            <p className="text-neutral-500 dark:text-neutral-400 max-w-md">
              Please select at least one cryptocurrency asset from the sidebar to start receiving signals.
            </p>
          </div>
        </div>
      ) : (
        <>
          {!isDemoMode && <SignalFilters />}

          {displaySignals.length === 0 ? (
            <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-sm border border-neutral-200 dark:border-neutral-700">
              <div className="flex justify-center items-center h-48 flex-col text-center">
                <InformationCircleIcon className="h-12 w-12 text-neutral-400 mb-4" />
                <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">No Signals Found</h3>
                <p className="text-neutral-500 dark:text-neutral-400 max-w-md">
                  No signals match your current filter criteria. Try adjusting your filters or check back later.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {displaySignals.map(signal => (
                <SignalCard
                  key={signal.id}
                  signal={signal}
                  onClick={() => handleOpenSignalDetail(signal.id)}
                />
              ))}

              {isLoading && !isDemoMode && (
                <div className="text-center py-4">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
                  <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">Loading more signals...</p>
                </div>
              )}
            </div>
          )}

          <SignalDetailModal
            signal={selectedSignal}
            isOpen={isDetailModalOpen}
            onClose={handleCloseSignalDetail}
          />
        </>
      )}
    </div>
  );
};

export default DashboardPage; 