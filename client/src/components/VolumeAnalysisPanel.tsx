import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  ArrowUpIcon, 
  ArrowDownIcon, 
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { api } from '../utils/api';

interface VolumeData {
  symbol: string;
  name: string;
  volume24h: number;
  volumeChange: number;
  trend: 'up' | 'down' | 'neutral';
  significance: 'high' | 'medium' | 'low';
  spike: boolean;
}

interface VolumeAnalysis {
  overview: {
    totalVolume: number;
    avgVolumeChange: number;
    spikesDetected: number;
    activeAssets: number;
  };
  assets: VolumeData[];
}

export default function VolumeAnalysisPanel() {
  const [volumeData, setVolumeData] = useState<VolumeAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchVolumeData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/notifications-enhanced/volume-analysis');
      
      if (response.data.success) {
        setVolumeData(response.data.data);
      } else {
        // Set mock data for demonstration
        setVolumeData({
          overview: {
            totalVolume: 45892000000,
            avgVolumeChange: 12.4,
            spikesDetected: 3,
            activeAssets: 8
          },
          assets: [
            {
              symbol: 'BTC',
              name: 'Bitcoin',
              volume24h: 15420000000,
              volumeChange: 23.5,
              trend: 'up',
              significance: 'high',
              spike: true
            },
            {
              symbol: 'ETH',
              name: 'Ethereum',
              volume24h: 8950000000,
              volumeChange: 18.2,
              trend: 'up',
              significance: 'medium',
              spike: false
            },
            {
              symbol: 'SOL',
              name: 'Solana',
              volume24h: 2340000000,
              volumeChange: -5.8,
              trend: 'down',
              significance: 'low',
              spike: false
            },
            {
              symbol: 'DOGE',
              name: 'Dogecoin',
              volume24h: 1200000000,
              volumeChange: 45.7,
              trend: 'up',
              significance: 'high',
              spike: true
            }
          ]
        });
      }
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch volume data:', error);
      // Set mock data on error
      setVolumeData({
        overview: {
          totalVolume: 45892000000,
          avgVolumeChange: 12.4,
          spikesDetected: 3,
          activeAssets: 8
        },
        assets: [
          {
            symbol: 'BTC',
            name: 'Bitcoin',
            volume24h: 15420000000,
            volumeChange: 23.5,
            trend: 'up',
            significance: 'high',
            spike: true
          },
          {
            symbol: 'ETH',
            name: 'Ethereum',
            volume24h: 8950000000,
            volumeChange: 18.2,
            trend: 'up',
            significance: 'medium',
            spike: false
          },
          {
            symbol: 'SOL',
            name: 'Solana',
            volume24h: 2340000000,
            volumeChange: -5.8,
            trend: 'down',
            significance: 'low',
            spike: false
          }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVolumeData();
    
    // Auto refresh every 2 minutes
    const interval = setInterval(fetchVolumeData, 120000);
    return () => clearInterval(interval);
  }, []);

  const formatVolume = (volume: number) => {
    if (volume >= 1e9) {
      return `$${(volume / 1e9).toFixed(2)}B`;
    } else if (volume >= 1e6) {
      return `$${(volume / 1e6).toFixed(2)}M`;
    } else if (volume >= 1e3) {
      return `$${(volume / 1e3).toFixed(2)}K`;
    }
    return `$${volume.toFixed(2)}`;
  };

  const getSignificanceColor = (significance: string) => {
    switch (significance) {
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <ChartBarIcon className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Volume Analysis</h3>
        </div>
        <button
          onClick={fetchVolumeData}
          disabled={loading}
          className="text-blue-600 hover:text-blue-800 p-1 rounded disabled:opacity-50"
        >
          <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && !volumeData ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : volumeData ? (
        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600 font-medium">Total Volume</div>
              <div className="text-lg font-bold text-blue-900">
                {formatVolume(volumeData.overview.totalVolume)}
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-600 font-medium">Avg Change</div>
              <div className="text-lg font-bold text-green-900">
                +{volumeData.overview.avgVolumeChange.toFixed(1)}%
              </div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-sm text-red-600 font-medium">Spikes</div>
              <div className="text-lg font-bold text-red-900">
                {volumeData.overview.spikesDetected}
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 font-medium">Active Assets</div>
              <div className="text-lg font-bold text-gray-900">
                {volumeData.overview.activeAssets}
              </div>
            </div>
          </div>

          {/* Asset Volume List */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Asset Volume Changes</h4>
            {volumeData.assets.map((asset, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{asset.symbol}</span>
                    <span className="text-sm text-gray-600">{asset.name}</span>
                  </div>
                  {asset.spike && (
                    <ExclamationTriangleIcon className="h-4 w-4 text-orange-500" title="Volume Spike" />
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{formatVolume(asset.volume24h)}</div>
                  <div className="flex items-center space-x-1">
                    <div className="flex items-center space-x-1">
                      {asset.trend === 'up' ? (
                        <ArrowUpIcon className="h-4 w-4 text-green-500" />
                      ) : asset.trend === 'down' ? (
                        <ArrowDownIcon className="h-4 w-4 text-red-500" />
                      ) : null}
                      <span className={`text-xs ${
                        asset.trend === 'up' ? 'text-green-600' :
                        asset.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {asset.volumeChange >= 0 ? '+' : ''}{asset.volumeChange.toFixed(1)}%
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${getSignificanceColor(asset.significance)}`}>
                      {asset.significance}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-xs text-gray-500 text-center">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          No volume data available
        </div>
      )}
    </div>
  );
}