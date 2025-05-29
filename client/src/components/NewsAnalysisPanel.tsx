import React, { useState, useEffect } from 'react';
import { 
  ArrowUpIcon,
  ArrowDownIcon,
  NewspaperIcon,
  ClockIcon,
  TagIcon,
  FlagIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { api } from '../utils/api';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  impact: 'high' | 'medium' | 'low';
  relatedAssets: string[];
}

interface SentimentTrend {
  asset: string;
  trend: 'bullish' | 'bearish' | 'neutral';
  score: number;
  change24h: number;
}

interface PortfolioImpact {
  overallSentiment: 'positive' | 'negative' | 'neutral';
  impactScore: number;
  affectedAssets: number;
  keyTopics: string[];
}

export default function NewsAnalysisPanel() {
  const [newsData, setNewsData] = useState<NewsItem[]>([]);
  const [sentimentTrends, setSentimentTrends] = useState<SentimentTrend[]>([]);
  const [portfolioImpact, setPortfolioImpact] = useState<PortfolioImpact | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchNewsData = async () => {
    try {
      setLoading(true);
      
      // Fetch latest news
      const newsResponse = await api.get('/api/notifications-enhanced/news');
      if (newsResponse.data.success) {
        setNewsData(newsResponse.data.data.slice(0, 10)); // Show top 10 news
      }
      
      // Fetch sentiment trends - 添加必需的coins参数
      const defaultCoins = ['BTC', 'ETH', 'SOL', 'ADA'];
      const trendsResponse = await api.get('/api/notifications-enhanced/news/sentiment-trends', {
        params: {
          coins: defaultCoins.join(','),
          days: 7
        }
      });
      if (trendsResponse.data.success) {
        setSentimentTrends(trendsResponse.data.data);
      }
      
      // Fetch portfolio impact - 添加必需的symbols参数
      const impactResponse = await api.get('/api/notifications-enhanced/news/portfolio-impact', {
        params: {
          symbols: defaultCoins.join(',')
        }
      });
      if (impactResponse.data.success) {
        setPortfolioImpact(impactResponse.data.data);
      }
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch news data:', error);
      // Set mock data for demonstration
      setNewsData([
        {
          id: '1',
          title: 'Bitcoin reaches new all-time high as institutional adoption grows',
          summary: 'Major corporations continue to add Bitcoin to their treasury reserves...',
          url: '#',
          source: 'CoinDesk',
          publishedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          sentiment: 'positive',
          impact: 'high',
          relatedAssets: ['BTC', 'ETH']
        },
        {
          id: '2',
          title: 'Ethereum 2.0 staking rewards attract more validators',
          summary: 'The Ethereum network sees increased participation in staking...',
          url: '#',
          source: 'Cointelegraph',
          publishedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          sentiment: 'positive',
          impact: 'medium',
          relatedAssets: ['ETH']
        },
        {
          id: '3',
          title: 'Regulatory concerns dampen altcoin market sentiment',
          summary: 'New regulatory proposals could impact several altcoins...',
          url: '#',
          source: 'Decrypt',
          publishedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          sentiment: 'negative',
          impact: 'medium',
          relatedAssets: ['ADA', 'SOL', 'DOT']
        }
      ]);
      
      setSentimentTrends([
        { asset: 'BTC', trend: 'bullish', score: 0.75, change24h: 15.2 },
        { asset: 'ETH', trend: 'bullish', score: 0.68, change24h: 8.7 },
        { asset: 'SOL', trend: 'bearish', score: -0.45, change24h: -12.3 },
        { asset: 'ADA', trend: 'neutral', score: 0.05, change24h: 2.1 }
      ]);
      
      setPortfolioImpact({
        overallSentiment: 'positive',
        impactScore: 0.62,
        affectedAssets: 6,
        keyTopics: ['Institutional Adoption', 'ETH 2.0', 'Regulation']
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNewsData();
    
    // Auto refresh every 5 minutes
    const interval = setInterval(fetchNewsData, 300000);
    return () => clearInterval(interval);
  }, []);

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <ArrowUpIcon className="h-4 w-4 text-green-500" />;
      case 'negative':
        return <ArrowDownIcon className="h-4 w-4 text-red-500" />;
      default:
        return <ClockIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-600 bg-green-100';
      case 'negative':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
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

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <NewspaperIcon className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">News Analysis</h3>
        </div>
        <button
          onClick={fetchNewsData}
          disabled={loading}
          className="text-blue-600 hover:text-blue-800 p-1 rounded disabled:opacity-50"
        >
          <ClockIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && newsData.length === 0 ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Portfolio Impact Summary */}
          {portfolioImpact && (
            <div className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center space-x-2 mb-3">
                <ExclamationTriangleIcon className="h-5 w-5 text-blue-500" />
                <h4 className="font-medium text-gray-900">Portfolio Impact</h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Overall Sentiment</span>
                    <div className="flex items-center space-x-1">
                      {getSentimentIcon(portfolioImpact.overallSentiment)}
                      <span className={`text-sm font-medium capitalize ${
                        portfolioImpact.overallSentiment === 'positive' ? 'text-green-600' :
                        portfolioImpact.overallSentiment === 'negative' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {portfolioImpact.overallSentiment}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Impact Score</span>
                    <span className="font-medium">{(portfolioImpact.impactScore * 100).toFixed(0)}%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Affected Assets</span>
                    <span className="font-medium">{portfolioImpact.affectedAssets}/8</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Key Topics</span>
                    <span className="text-sm">{portfolioImpact.keyTopics.length} topics</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sentiment Trends */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Sentiment Trends</h4>
            <div className="space-y-2">
              {sentimentTrends.map((trend, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-3">
                    <span className="font-medium">{trend.asset}</span>
                    <div className="flex items-center space-x-1">
                      {trend.trend === 'bullish' ? (
                        <ArrowUpIcon className="h-4 w-4 text-green-500" />
                      ) : trend.trend === 'bearish' ? (
                        <ArrowDownIcon className="h-4 w-4 text-red-500" />
                      ) : (
                        <ClockIcon className="h-4 w-4 text-gray-500" />
                      )}
                      <span className={`text-sm capitalize ${
                        trend.trend === 'bullish' ? 'text-green-600' :
                        trend.trend === 'bearish' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {trend.trend}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">Score: {trend.score.toFixed(2)}</div>
                    <div className={`text-xs ${trend.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {trend.change24h >= 0 ? '+' : ''}{trend.change24h.toFixed(1)}% (24h)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Latest News */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Latest News</h4>
            <div className="space-y-3">
              {newsData.slice(0, 5).map((news) => (
                <div key={news.id} className="p-3 border border-gray-200 rounded">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900 text-sm leading-tight mb-1">
                        {news.title}
                      </h5>
                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                        {news.summary}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">{news.source}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">{formatTimeAgo(news.publishedAt)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-2 py-1 rounded ${getSentimentColor(news.sentiment)}`}>
                        {news.sentiment}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${getImpactColor(news.impact)}`}>
                        {news.impact}
                      </span>
                    </div>
                  </div>
                  {news.relatedAssets.length > 0 && (
                    <div className="mt-2 flex items-center space-x-1">
                      <span className="text-xs text-gray-500">Assets:</span>
                      {news.relatedAssets.map((asset, i) => (
                        <span key={i} className="text-xs bg-blue-100 text-blue-600 px-1 rounded">
                          {asset}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-gray-500 text-center">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
} 