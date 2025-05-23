import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ChartBarIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';

interface SentimentData {
  timestamp: string;
  sentiment: number; // 0-100
  price: number;
  volume?: number;
}

interface SentimentChartProps {
  symbol: string;
  timeRange?: '1h' | '6h' | '24h' | '7d';
}

const SentimentChart: React.FC<SentimentChartProps> = ({ 
  symbol, 
  timeRange = '24h' 
}) => {
  const [data, setData] = useState<SentimentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number | null>(null);

  // 模拟情绪数据（实际项目中应该从API获取）
  const generateMockSentimentData = (priceData: number) => {
    const now = Date.now();
    const points = timeRange === '1h' ? 12 : timeRange === '6h' ? 24 : timeRange === '24h' ? 48 : 168;
    const interval = timeRange === '1h' ? 5 * 60 * 1000 : 
                   timeRange === '6h' ? 15 * 60 * 1000 :
                   timeRange === '24h' ? 30 * 60 * 1000 : 
                   60 * 60 * 1000;

    const mockData: SentimentData[] = [];
    
    for (let i = points; i >= 0; i--) {
      const timestamp = new Date(now - (i * interval)).toISOString();
      
      // 模拟价格变化（基于真实价格）
      const priceVariation = (Math.random() - 0.5) * 0.1; // ±5%
      const price = priceData * (1 + priceVariation);
      
      // 模拟情绪与价格的相关性
      const basesentiment = 50;
      const priceInfluence = priceVariation * 200; // 价格变化影响情绪
      const randomNoise = (Math.random() - 0.5) * 30;
      const sentiment = Math.max(0, Math.min(100, basesentiment + priceInfluence + randomNoise));
      
      mockData.push({
        timestamp,
        sentiment,
        price,
        volume: Math.random() * 1000000
      });
    }
    
    return mockData;
  };

  // 获取价格数据并生成情绪数据
  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/dashboard/data');
      
      if (response.data && response.data.success && response.data.data) {
        const assets = response.data.data.assets;
        const assetData = assets.find((asset: any) => asset.symbol === symbol);
        
        if (assetData && assetData.currentPrice) {
          setCurrentPrice(assetData.currentPrice);
          setPriceChange(assetData.priceChange24h);
          
          // 生成模拟情绪数据
          const sentimentData = generateMockSentimentData(assetData.currentPrice);
          setData(sentimentData);
        }
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // 每5分钟更新一次
    const interval = setInterval(fetchData, 300000);
    
    return () => clearInterval(interval);
  }, [symbol, timeRange]);

  // 计算价格和情绪的相关性
  const calculateCorrelation = (): number => {
    if (data.length < 2) return 0;
    
    const priceChanges = data.slice(1).map((point, i) => 
      (point.price - data[i].price) / data[i].price
    );
    const sentimentChanges = data.slice(1).map((point, i) => 
      point.sentiment - data[i].sentiment
    );
    
    if (priceChanges.length === 0) return 0;
    
    const avgPriceChange = priceChanges.reduce((a, b) => a + b, 0) / priceChanges.length;
    const avgSentimentChange = sentimentChanges.reduce((a, b) => a + b, 0) / sentimentChanges.length;
    
    let numerator = 0;
    let priceVariance = 0;
    let sentimentVariance = 0;
    
    for (let i = 0; i < priceChanges.length; i++) {
      const priceDeviation = priceChanges[i] - avgPriceChange;
      const sentimentDeviation = sentimentChanges[i] - avgSentimentChange;
      
      numerator += priceDeviation * sentimentDeviation;
      priceVariance += priceDeviation * priceDeviation;
      sentimentVariance += sentimentDeviation * sentimentDeviation;
    }
    
    const denominator = Math.sqrt(priceVariance * sentimentVariance);
    return denominator === 0 ? 0 : numerator / denominator;
  };

  const correlation = calculateCorrelation();
  const currentSentiment = data.length > 0 ? data[data.length - 1].sentiment : 50;

  // 获取情绪颜色
  const getSentimentColor = (sentiment: number) => {
    if (sentiment >= 70) return 'text-green-600 dark:text-green-400';
    if (sentiment >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getSentimentLabel = (sentiment: number) => {
    if (sentiment >= 75) return '极度乐观';
    if (sentiment >= 60) return '乐观';
    if (sentiment >= 40) return '中性';
    if (sentiment >= 25) return '悲观';
    return '极度悲观';
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 border border-neutral-200 dark:border-neutral-700">
        <div className="animate-pulse">
          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2 mb-4"></div>
          <div className="h-32 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 border border-neutral-200 dark:border-neutral-700">
      {/* 标题和控件 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <ChartBarIcon className="w-6 h-6 text-neutral-600 dark:text-neutral-400" />
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {symbol} 市场情绪分析
          </h3>
        </div>
        
        <div className="flex items-center space-x-2">
          {['1h', '6h', '24h', '7d'].map((range) => (
            <button
              key={range}
              onClick={() => {/* 这里可以添加时间范围切换逻辑 */}}
              className={`px-3 py-1 text-sm rounded-md ${
                timeRange === range
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-600'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* 当前指标 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-4">
          <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">当前情绪</div>
          <div className={`text-xl font-bold ${getSentimentColor(currentSentiment)}`}>
            {currentSentiment.toFixed(0)} / 100
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-300">
            {getSentimentLabel(currentSentiment)}
          </div>
        </div>
        
        <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-4">
          <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">当前价格</div>
          <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
            ${currentPrice?.toLocaleString() || '--'}
          </div>
          {priceChange !== null && (
            <div className={`text-sm ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}% (24h)
            </div>
          )}
        </div>
        
        <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-4">
          <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">价格相关性</div>
          <div className={`text-xl font-bold ${
            Math.abs(correlation) > 0.6 ? 'text-green-600' : 
            Math.abs(correlation) > 0.3 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {(correlation * 100).toFixed(0)}%
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-300">
            {Math.abs(correlation) > 0.6 ? '强相关' : 
             Math.abs(correlation) > 0.3 ? '中等相关' : '弱相关'}
          </div>
        </div>
      </div>

      {/* 简化的图表显示 */}
      <div className="space-y-4">
        <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          情绪趋势 (最近 {timeRange})
        </div>
        
        {/* 情绪条 */}
        <div className="space-y-2">
          {data.slice(-10).map((point, index) => {
            const time = new Date(point.timestamp).toLocaleTimeString('zh-CN', { 
              hour: '2-digit', 
              minute: '2-digit' 
            });
            
            return (
              <div key={index} className="flex items-center space-x-3">
                <div className="text-xs text-neutral-500 dark:text-neutral-400 w-12">
                  {time}
                </div>
                <div className="flex-1 bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      point.sentiment >= 70 ? 'bg-green-500' :
                      point.sentiment >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${point.sentiment}%` }}
                  />
                </div>
                <div className="text-xs text-neutral-600 dark:text-neutral-400 w-8">
                  {point.sentiment.toFixed(0)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 分析说明 */}
      <div className="mt-6 p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <ArrowTrendingUpIcon className="w-4 h-4 text-primary-600" />
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            分析洞察
          </span>
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {correlation > 0.3 ? 
            `${symbol}的市场情绪与价格呈现正相关关系，情绪上升时价格倾向于上涨。` :
            correlation < -0.3 ?
            `${symbol}的市场情绪与价格呈现负相关关系，可能存在反向投资机会。` :
            `${symbol}的市场情绪与价格相关性较弱，建议结合其他指标进行分析。`
          }
          当前市场情绪为{getSentimentLabel(currentSentiment)}。
        </p>
      </div>
    </div>
  );
};

export default SentimentChart; 