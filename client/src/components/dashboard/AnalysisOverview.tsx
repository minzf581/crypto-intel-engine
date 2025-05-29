import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ChartBarIcon, 
  NewspaperIcon, 
  ChatBubbleBottomCenterTextIcon, 
  LinkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

// Backend response interface
interface BackendAnalysisData {
  asset: {
    symbol: string;
    name: string;
    logo: string;
  };
  analysis: {
    totalSignals: number;
    avgStrength: number;
    lastSignalTime: string | null;
    breakdown: {
      sentiment: number;
      price: number;
      narrative: number;
    };
  };
  recentSignals: Array<{
    id: string;
    type: string;
    strength: number;
    description: string;
    timestamp: string;
  }>;
}

interface AnalysisOverviewProps {
  symbols: string[];
}

const safeToFixed = (value: number | null | undefined, decimals: number = 2): string => {
  if (value === null || value === undefined || isNaN(value)) return '--';
  return Number(value).toFixed(decimals);
};

const AnalysisOverview: React.FC<AnalysisOverviewProps> = ({ symbols }) => {
  const [analysisData, setAnalysisData] = useState<BackendAnalysisData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string>((symbols && symbols.length > 0) ? symbols[0] : 'BTC');

  const fetchAnalysisData = async (symbol: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`/api/analysis/comprehensive/${symbol}`);
      
      if (response.data?.success) {
        const data = response.data.data;
        const existingIndex = analysisData.findIndex(item => item.asset.symbol === symbol);
        if (existingIndex >= 0) {
          const newData = [...analysisData];
          newData[existingIndex] = data;
          setAnalysisData(newData);
        } else {
          setAnalysisData(prev => [...prev, data]);
        }
      } else {
        setError(`No analysis data available for ${symbol}`);
      }
    } catch (error: any) {
      console.error(`Failed to fetch analysis for ${symbol}:`, error);
      setError(`Failed to load analysis for ${symbol}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (symbols && symbols.length > 0) {
      fetchAnalysisData(selectedSymbol);
    }
  }, [selectedSymbol]);

  const currentAnalysis = analysisData.find(data => data.asset.symbol === selectedSymbol);

  // Generate mock sentiment and risk assessment based on signal data
  const generateMockIntelligence = (analysis: BackendAnalysisData['analysis']) => {
    const sentiment = analysis.avgStrength >= 70 ? 'bullish' : 
                     analysis.avgStrength <= 30 ? 'bearish' : 'neutral';
    
    const riskLevel = analysis.totalSignals >= 15 ? 'low' : 
                     analysis.totalSignals >= 8 ? 'medium' : 'high';
    
    const recommendation = sentiment === 'bullish' ? 'buy' : 
                          sentiment === 'bearish' ? 'sell' : 'hold';
    
    return {
      sentiment: {
        score: analysis.avgStrength / 100,
        trend: sentiment,
        confidence: Math.min(analysis.totalSignals / 20, 1)
      },
      risk: {
        level: riskLevel,
        score: 100 - analysis.avgStrength
      },
      recommendation: {
        action: recommendation,
        confidence: analysis.avgStrength / 100
      }
    };
  };

  const getSentimentColor = (trend: string) => {
    switch (trend) {
      case 'bullish': return 'text-green-600 dark:text-green-400';
      case 'bearish': return 'text-red-600 dark:text-red-400';
      default: return 'text-neutral-600 dark:text-neutral-400';
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 dark:text-green-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'high': return 'text-red-600 dark:text-red-400';
      default: return 'text-neutral-600 dark:text-neutral-400';
    }
  };

  const getRecommendationColor = (action: string) => {
    if (action.includes('buy')) return 'text-green-600 dark:text-green-400';
    if (action.includes('sell')) return 'text-red-600 dark:text-red-400';
    return 'text-neutral-600 dark:text-neutral-400';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sentiment': return <ChatBubbleBottomCenterTextIcon className="w-5 h-5" />;
      case 'price': return <CurrencyDollarIcon className="w-5 h-5" />;
      case 'narrative': return <NewspaperIcon className="w-5 h-5" />;
      case 'technical': return <ChartBarIcon className="w-5 h-5" />;
      default: return <ClockIcon className="w-5 h-5" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ChartBarIcon className="w-6 h-6 text-neutral-600 dark:text-neutral-400" />
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Comprehensive Analysis
          </h2>
        </div>
        
        {/* Symbol Selector */}
        <select
          value={selectedSymbol}
          onChange={(e) => setSelectedSymbol(e.target.value)}
          className="px-3 py-1 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-md focus:ring-2 focus:ring-primary-500"
        >
          {symbols && symbols.length > 0 ? symbols.map(symbol => (
            <option key={symbol} value={symbol}>{symbol}</option>
          )) : (
            <option value="">No assets available</option>
          )}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-4 py-3 rounded-md">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-2 text-neutral-600 dark:text-neutral-400">Loading analysis...</span>
        </div>
      )}

      {currentAnalysis && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Intelligence Summary */}
          <div className="lg:col-span-2 space-y-4">
            {/* Overall Analysis */}
            <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 border border-neutral-200 dark:border-neutral-700">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                Signal Analysis Summary
              </h3>
              
              {(() => {
                const intelligence = generateMockIntelligence(currentAnalysis.analysis);
                return (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                        {safeToFixed((intelligence.sentiment.score || 0) * 100, 0)}
                      </div>
                      <div className={`text-sm font-medium capitalize ${getSentimentColor(intelligence.sentiment.trend)}`}>
                        {intelligence.sentiment.trend}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        Overall Sentiment
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className={`text-2xl font-bold capitalize ${getRiskColor(intelligence.risk.level)}`}>
                        {intelligence.risk.level}
                      </div>
                      <div className="text-sm text-neutral-600 dark:text-neutral-400">
                        Risk: {intelligence.risk.score}/100
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        Risk Level
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className={`text-lg font-bold uppercase ${getRecommendationColor(intelligence.recommendation.action)}`}>
                        {intelligence.recommendation.action}
                      </div>
                      <div className="text-sm text-neutral-600 dark:text-neutral-400">
                        {safeToFixed((intelligence.recommendation.confidence || 0) * 100, 0)}% confidence
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        Recommendation
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Signal Breakdown */}
            <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 border border-neutral-200 dark:border-neutral-700">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                Signal Breakdown ({currentAnalysis.analysis.totalSignals} total)
              </h3>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {currentAnalysis.analysis.breakdown.sentiment}
                  </div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400">Sentiment</div>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-md">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {currentAnalysis.analysis.breakdown.price}
                  </div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400">Price</div>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-md">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {currentAnalysis.analysis.breakdown.narrative}
                  </div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400">Narrative</div>
                </div>
              </div>

              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                <div className="flex justify-between">
                  <span>Average Signal Strength:</span>
                  <span className="font-medium">{currentAnalysis.analysis.avgStrength}/100</span>
                </div>
                {currentAnalysis.analysis.lastSignalTime && (
                  <div className="flex justify-between mt-1">
                    <span>Last Signal:</span>
                    <span className="font-medium">{formatTimestamp(currentAnalysis.analysis.lastSignalTime)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Signals */}
            <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 border border-neutral-200 dark:border-neutral-700">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                Recent Signals ({currentAnalysis.recentSignals.length})
              </h3>
              
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {currentAnalysis.recentSignals.map((signal) => (
                  <div key={signal.id} className="flex items-center space-x-3 p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-md">
                    <div className="p-2 rounded-full bg-neutral-100 dark:bg-neutral-600 text-neutral-600 dark:text-neutral-400">
                      {getTypeIcon(signal.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 capitalize">
                          {signal.type} Signal
                        </span>
                        <span className="px-2 py-1 text-xs rounded-full bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-400">
                          Strength: {signal.strength}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
                        {signal.description}
                      </p>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        {formatTimestamp(signal.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Asset Info */}
          <div className="space-y-4">
            {/* Asset Details */}
            <div className="bg-white dark:bg-neutral-800 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
              <h3 className="text-md font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
                Asset Information
              </h3>
              <div className="flex items-center space-x-3">
                <img 
                  src={currentAnalysis.asset.logo} 
                  alt={currentAnalysis.asset.name}
                  className="w-10 h-10"
                />
                <div>
                  <div className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                    {currentAnalysis.asset.symbol}
                  </div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400">
                    {currentAnalysis.asset.name}
                  </div>
                </div>
              </div>
            </div>

            {/* Data Quality */}
            <div className="bg-white dark:bg-neutral-800 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
              <h3 className="text-md font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
                Data Quality
              </h3>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                  <div 
                    className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(currentAnalysis.analysis.totalSignals * 5, 100)}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {Math.min(currentAnalysis.analysis.totalSignals * 5, 100)}%
                </span>
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                Based on {currentAnalysis.analysis.totalSignals} signals
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white dark:bg-neutral-800 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
              <h3 className="text-md font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
                Quick Stats
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">Total Signals:</span>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">{currentAnalysis.analysis.totalSignals}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">Avg. Strength:</span>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">{currentAnalysis.analysis.avgStrength}/100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">Price Signals:</span>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">{currentAnalysis.analysis.breakdown.price}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">Sentiment Signals:</span>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">{currentAnalysis.analysis.breakdown.sentiment}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-center">
        <button
          onClick={() => fetchAnalysisData(selectedSymbol)}
          disabled={loading}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <ClockIcon className="w-4 h-4" />
          <span>{loading ? 'Updating...' : 'Refresh Analysis'}</span>
        </button>
      </div>
    </div>
  );
};

export default AnalysisOverview; 