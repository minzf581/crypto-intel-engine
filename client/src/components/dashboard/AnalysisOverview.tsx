import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ChartBarIcon, 
  NewspaperIcon, 
  ChatBubbleBottomCenterTextIcon, 
  LinkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface AnalysisData {
  symbol: string;
  intelligence: {
    overallSentiment: {
      score: number;
      trend: 'bullish' | 'bearish' | 'neutral';
      confidence: number;
    };
    riskAssessment: {
      level: 'low' | 'medium' | 'high';
      factors: string[];
      score: number;
    };
    investmentRecommendation: {
      action: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
      reasoning: string[];
      confidence: number;
      timeHorizon: 'short' | 'medium' | 'long';
    };
    dataQuality: {
      overall: number;
    };
  };
  signals: Array<{
    id: string;
    type: 'buy' | 'sell' | 'hold';
    source: 'social' | 'news' | 'technical' | 'onchain' | 'combined';
    strength: number;
    confidence: number;
    title: string;
    description: string;
    timeframe: string;
  }>;
  marketInsights: {
    keyTrends: string[];
    opportunities: string[];
    risks: string[];
    catalysts: string[];
  };
  lastUpdated: string;
}

interface AnalysisOverviewProps {
  symbols: string[];
}

const AnalysisOverview: React.FC<AnalysisOverviewProps> = ({ symbols }) => {
  const [analysisData, setAnalysisData] = useState<AnalysisData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string>(symbols[0] || 'BTC');

  const fetchAnalysisData = async (symbol: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`/api/analysis/comprehensive/${symbol}`);
      
      if (response.data?.success) {
        const existingIndex = analysisData.findIndex(data => data.symbol === symbol);
        if (existingIndex >= 0) {
          const newData = [...analysisData];
          newData[existingIndex] = response.data.data;
          setAnalysisData(newData);
        } else {
          setAnalysisData(prev => [...prev, response.data.data]);
        }
      }
    } catch (error: any) {
      console.error(`Failed to fetch analysis for ${symbol}:`, error);
      setError(`Failed to load analysis for ${symbol}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (symbols.length > 0) {
      fetchAnalysisData(selectedSymbol);
    }
  }, [selectedSymbol]);

  const currentAnalysis = analysisData.find(data => data.symbol === selectedSymbol);

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

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'social': return <ChatBubbleBottomCenterTextIcon className="w-5 h-5" />;
      case 'news': return <NewspaperIcon className="w-5 h-5" />;
      case 'technical': return <ChartBarIcon className="w-5 h-5" />;
      case 'onchain': return <LinkIcon className="w-5 h-5" />;
      case 'combined': return <CheckCircleIcon className="w-5 h-5" />;
      default: return <ClockIcon className="w-5 h-5" />;
    }
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
          {symbols.map(symbol => (
            <option key={symbol} value={symbol}>{symbol}</option>
          ))}
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
            {/* Overall Sentiment */}
            <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 border border-neutral-200 dark:border-neutral-700">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                Market Intelligence
              </h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {(currentAnalysis.intelligence.overallSentiment.score * 100).toFixed(0)}
                  </div>
                  <div className={`text-sm font-medium capitalize ${getSentimentColor(currentAnalysis.intelligence.overallSentiment.trend)}`}>
                    {currentAnalysis.intelligence.overallSentiment.trend}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    Overall Sentiment
                  </div>
                </div>
                
                <div className="text-center">
                  <div className={`text-2xl font-bold capitalize ${getRiskColor(currentAnalysis.intelligence.riskAssessment.level)}`}>
                    {currentAnalysis.intelligence.riskAssessment.level}
                  </div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400">
                    Risk: {currentAnalysis.intelligence.riskAssessment.score}/100
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    Risk Level
                  </div>
                </div>
                
                <div className="text-center">
                  <div className={`text-lg font-bold uppercase ${getRecommendationColor(currentAnalysis.intelligence.investmentRecommendation.action)}`}>
                    {currentAnalysis.intelligence.investmentRecommendation.action.replace('_', ' ')}
                  </div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400">
                    {(currentAnalysis.intelligence.investmentRecommendation.confidence * 100).toFixed(0)}% confidence
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    Recommendation
                  </div>
                </div>
              </div>

              {/* Investment Reasoning */}
              {currentAnalysis.intelligence.investmentRecommendation.reasoning.length > 0 && (
                <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                  <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                    Key Reasoning:
                  </h4>
                  <ul className="space-y-1">
                    {currentAnalysis.intelligence.investmentRecommendation.reasoning.slice(0, 3).map((reason, index) => (
                      <li key={index} className="text-sm text-neutral-600 dark:text-neutral-400 flex items-start space-x-2">
                        <span className="text-primary-600 mt-1">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Active Signals */}
            <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 border border-neutral-200 dark:border-neutral-700">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                Active Signals ({currentAnalysis.signals.length})
              </h3>
              
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {currentAnalysis.signals.slice(0, 5).map((signal) => (
                  <div key={signal.id} className="flex items-center space-x-3 p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-md">
                    <div className={`p-2 rounded-full ${getSentimentColor(signal.type)}`}>
                      {getSourceIcon(signal.source)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {signal.title}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          signal.type === 'buy' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                          signal.type === 'sell' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                          'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-400'
                        }`}>
                          {signal.type.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
                        {signal.description}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                          Strength: {signal.strength}
                        </span>
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                          Confidence: {(signal.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Market Insights */}
          <div className="space-y-4">
            {/* Data Quality */}
            <div className="bg-white dark:bg-neutral-800 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
              <h3 className="text-md font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
                Data Quality
              </h3>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                  <div 
                    className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(currentAnalysis.intelligence.dataQuality.overall * 100)}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {(currentAnalysis.intelligence.dataQuality.overall * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            {/* Key Trends */}
            {currentAnalysis.marketInsights.keyTrends.length > 0 && (
              <div className="bg-white dark:bg-neutral-800 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
                <h3 className="text-md font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
                  Key Trends
                </h3>
                <ul className="space-y-2">
                  {currentAnalysis.marketInsights.keyTrends.slice(0, 3).map((trend, index) => (
                    <li key={index} className="text-sm text-neutral-600 dark:text-neutral-400 flex items-start space-x-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>{trend}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Opportunities */}
            {currentAnalysis.marketInsights.opportunities.length > 0 && (
              <div className="bg-white dark:bg-neutral-800 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
                <h3 className="text-md font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
                  Opportunities
                </h3>
                <ul className="space-y-2">
                  {currentAnalysis.marketInsights.opportunities.slice(0, 3).map((opportunity, index) => (
                    <li key={index} className="text-sm text-neutral-600 dark:text-neutral-400 flex items-start space-x-2">
                      <span className="text-green-600 mt-1">•</span>
                      <span>{opportunity}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Risks */}
            {currentAnalysis.marketInsights.risks.length > 0 && (
              <div className="bg-white dark:bg-neutral-800 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
                <h3 className="text-md font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
                  Risks
                </h3>
                <ul className="space-y-2">
                  {currentAnalysis.marketInsights.risks.slice(0, 3).map((risk, index) => (
                    <li key={index} className="text-sm text-neutral-600 dark:text-neutral-400 flex items-start space-x-2">
                      <span className="text-red-600 mt-1">•</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
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