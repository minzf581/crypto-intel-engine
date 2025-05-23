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
import { InformationCircleIcon, CurrencyDollarIcon, ChartBarIcon } from '@heroicons/react/24/outline';

// 价格数据接口
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

  // Determine if using demo mode - 移除演示模式检查
  // const isDemoMode = user?.email === 'demo@example.com';
  const isDemoMode = false; // 总是使用真实数据模式
  
  // Use demo signals or actual signals based on mode
  const displaySignals = isDemoMode ? demoSignals : filteredSignals;

  // 获取价格数据
  const fetchPriceData = async () => {
    if (isDemoMode) return; // 演示模式不获取真实价格数据
    
    try {
      setPriceLoading(true);
      setPriceError(null);
      
      const response = await axios.get('/api/dashboard/data');
      
      if (response.data && response.data.success && response.data.data) {
        setPriceData(response.data.data.assets);
      } else {
        setPriceError('价格数据格式错误');
      }
    } catch (error: any) {
      console.error('获取价格数据失败:', error);
      setPriceError('无法获取价格数据');
    } finally {
      setPriceLoading(false);
    }
  };

  // 初始加载价格数据
  useEffect(() => {
    fetchPriceData();
    
    // 每分钟更新一次价格数据
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
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">仪表板</h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-1">
          监控从社交媒体平台提取的实时加密货币信号和价格数据。
        </p>
        {isDemoMode && (
          <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-md mt-2 text-sm">
            演示模式：使用示例数据，无需连接后端。
          </div>
        )}
      </div>

      {/* 价格数据部分 */}
      {!isDemoMode && (
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <CurrencyDollarIcon className="w-6 h-6 text-neutral-600 dark:text-neutral-400" />
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">实时价格</h2>
            <button
              onClick={fetchPriceData}
              disabled={priceLoading}
              className="ml-auto px-3 py-1 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {priceLoading ? '刷新中...' : '刷新'}
            </button>
          </div>
          
          {priceError && (
            <div className="bg-red-50 text-red-700 px-4 py-2 rounded-md mb-4 text-sm">
              {priceError}
            </div>
          )}
          
          {priceData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
              {priceData.map((data) => (
                <PriceCard key={data.symbol} priceData={data} />
              ))}
            </div>
          ) : !priceLoading && !priceError ? (
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 text-center text-neutral-500 dark:text-neutral-400 mb-8">
              暂无价格数据
            </div>
          ) : null}
        </div>
      )}

      {/* 市场情绪分析部分 */}
      {!isDemoMode && selectedAssets.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <ChartBarIcon className="w-6 h-6 text-neutral-600 dark:text-neutral-400" />
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">市场情绪分析</h2>
          </div>
          
          {/* 为每个选中的资产显示情绪图表 */}
          <div className="space-y-6">
            {selectedAssets.slice(0, 2).map((asset) => (
              <SentimentChart 
                key={asset.symbol} 
                symbol={asset.symbol} 
                timeRange="24h"
              />
            ))}
            
            {selectedAssets.length > 2 && (
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 text-center">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  显示了前2个资产的情绪分析。共选择了 {selectedAssets.length} 个资产。
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 信号部分 */}
      <div>
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">信号监控</h2>
        
        {selectedAssets.length === 0 && !isDemoMode ? (
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-sm border border-neutral-200 dark:border-neutral-700">
            <div className="flex justify-center items-center h-48 flex-col text-center">
              <InformationCircleIcon className="h-12 w-12 text-neutral-400 mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">未选择资产</h3>
              <p className="text-neutral-500 dark:text-neutral-400 max-w-md">
                请从侧边栏选择至少一个加密货币资产以开始接收信号。
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
                  <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">未找到信号</h3>
                  <p className="text-neutral-500 dark:text-neutral-400 max-w-md">
                    没有信号符合您当前的过滤条件。尝试调整过滤器或稍后查看。
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
                    <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">加载更多信号...</p>
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
    </div>
  );
};

export default DashboardPage; 