import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { EnhancedNotificationService } from '../services/notificationService';
import { VolumeAnalysis, VolumeAnomalyResult } from '../types/notification';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';

export const VolumeAnalysisDashboard: React.FC = () => {
  const [selectedSymbol, setSelectedSymbol] = useState('BTC');
  const [volumeData, setVolumeData] = useState<{
    symbol: string;
    history: VolumeAnalysis[];
    anomaly: VolumeAnomalyResult;
  } | null>(null);
  const [unusualVolumeSymbols, setUnusualVolumeSymbols] = useState<VolumeAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeframe, setTimeframe] = useState(7);

  const symbols = ['BTC', 'ETH', 'ADA', 'SOL', 'DOT', 'LINK', 'MATIC', 'AVAX'];

  useEffect(() => {
    loadVolumeData();
    loadUnusualVolumeSymbols();
  }, [selectedSymbol, timeframe]);

  const loadVolumeData = async () => {
    setLoading(true);
    try {
      const data = await EnhancedNotificationService.getVolumeAnalysis(selectedSymbol, timeframe);
      setVolumeData(data);
    } catch (error) {
      console.error('Failed to load volume data:', error);
      toast.error('Failed to load volume analysis');
    } finally {
      setLoading(false);
    }
  };

  const loadUnusualVolumeSymbols = async () => {
    try {
      const symbols = await EnhancedNotificationService.getUnusualVolumeSymbols(24);
      setUnusualVolumeSymbols(symbols);
    } catch (error) {
      console.error('Failed to load unusual volume symbols:', error);
    }
  };

  const triggerAnalysis = async () => {
    try {
      await EnhancedNotificationService.triggerVolumeAnalysis(symbols);
      toast.success('Volume analysis triggered successfully');
      await loadVolumeData();
      await loadUnusualVolumeSymbols();
    } catch (error) {
      console.error('Failed to trigger analysis:', error);
      toast.error('Failed to trigger analysis');
    }
  };

  // 安全的数值格式化函数
  const safeToFixed = (value: number | null | undefined, decimals: number = 2): string => {
    if (value === null || value === undefined || isNaN(value)) return '--';
    return value.toFixed(decimals);
  };

  // Format volume with safe checking
  const formatVolume = (volume: number | null | undefined): string => {
    if (volume === null || volume === undefined || isNaN(volume)) return '--';
    
    if (volume >= 1e9) {
      return `$${safeToFixed(volume / 1e9, 2)}B`;
    } else if (volume >= 1e6) {
      return `$${safeToFixed(volume / 1e6, 2)}M`;
    } else if (volume >= 1e3) {
      return `$${safeToFixed(volume / 1e3, 2)}K`;
    } else {
      return `$${safeToFixed(volume, 2)}`;
    }
  };

  const getAnomalyColor = (confidence: number) => {
    if (confidence >= 80) return 'text-red-600 bg-red-100';
    if (confidence >= 60) return 'text-orange-600 bg-orange-100';
    if (confidence >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const chartData = volumeData?.history.map(item => ({
    date: format(new Date(item.timestamp), 'MMM dd'),
    volume: item.volume24h,
    volumeRatio: item.volumeRatio,
    volumeChange: item.volumeChange,
    isAnomaly: item.unusualVolumeDetected,
  })) || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ChartBarIcon className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Volume Analysis</h1>
            <p className="text-gray-600">Monitor trading volume anomalies and trends</p>
          </div>
        </div>
        
        <button
          onClick={triggerAnalysis}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
        >
          <MagnifyingGlassIcon className="w-5 h-5" />
          <span>Trigger Analysis</span>
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center space-x-4 bg-white p-4 rounded-lg shadow">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Symbol</label>
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2"
          >
            {symbols.map(symbol => (
              <option key={symbol} value={symbol}>{symbol}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Timeframe</label>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-2"
          >
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
          </select>
        </div>
      </div>

      {/* Anomaly Alert */}
      {volumeData?.anomaly.isAnomaly && (
        <div className={`p-4 rounded-lg border ${getAnomalyColor(volumeData.anomaly.confidence)}`}>
          <div className="flex items-center space-x-3">
            <ExclamationTriangleIcon className="w-6 h-6" />
            <div>
              <h3 className="font-semibold">Volume Anomaly Detected</h3>
              <p className="text-sm mt-1">{volumeData.anomaly.reason}</p>
              <p className="text-xs mt-1">
                Confidence: {volumeData.anomaly.confidence}% | 
                Current: {formatVolume(volumeData.anomaly.currentVolume)} | 
                Average: {formatVolume(volumeData.anomaly.averageVolume)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volume Trend Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Volume Trend - {selectedSymbol}</h3>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={formatVolume} />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'volume' ? formatVolume(value as number) : value,
                    name === 'volume' ? 'Volume' : 'Volume Ratio'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="volume" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={(props) => props.payload?.isAnomaly ? 
                    { fill: '#EF4444', r: 6 } : { fill: '#3B82F6', r: 3 }
                  }
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Volume Ratio Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Volume Ratio</h3>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [value, 'Volume Ratio']}
                />
                <Bar 
                  dataKey="volumeRatio" 
                  fill={(entry: any) => entry?.isAnomaly ? '#EF4444' : '#10B981'}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Unusual Volume Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Unusual Volume Activity (24h)</h3>
        </div>
        
        <div className="p-6">
          {unusualVolumeSymbols.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <ChartBarIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No unusual volume activity detected</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unusualVolumeSymbols.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{item.symbol}</h4>
                    <div className="flex items-center space-x-2">
                      {item.volumeSpike && (
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                          Spike
                        </span>
                      )}
                      {item.unusualVolumeDetected && (
                        <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                          Unusual
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">24h Volume:</span>
                      <span className="font-medium">{formatVolume(item.volume24h)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Change:</span>
                      <span className={`font-medium flex items-center space-x-1 ${
                        item.volumeChange >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {item.volumeChange >= 0 ? (
                          <ArrowTrendingUpIcon className="w-4 h-4" />
                        ) : (
                          <ArrowTrendingDownIcon className="w-4 h-4" />
                        )}
                        <span>{safeToFixed(item.volumeChange, 2)}%</span>
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ratio:</span>
                      <span className="font-medium">{safeToFixed(item.volumeRatio, 2)}x</span>
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 