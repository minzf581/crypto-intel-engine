import React, { useState, useEffect } from 'react';
import { 
  NewspaperIcon, 
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
  ExclamationTriangleIcon,
  ArrowTopRightOnSquareIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { EnhancedNotificationService } from '../services/notificationService';
import { NewsData, NewsSummary, SentimentTrend, PortfolioNewsImpact } from '../types/notification';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';

export const NewsAnalysisDashboard: React.FC = () => {
  const [newsData, setNewsData] = useState<{
    summary: NewsSummary;
    recentNews: NewsData[];
  } | null>(null);
  const [sentimentTrends, setSentimentTrends] = useState<Record<string, SentimentTrend[]>>({});
  const [portfolioImpact, setPortfolioImpact] = useState<Record<string, PortfolioNewsImpact>>({});
  const [loading, setLoading] = useState(false);
  const [timeframe, setTimeframe] = useState(24);
  const [selectedCoins, setSelectedCoins] = useState(['BTC', 'ETH']);
  const [filters, setFilters] = useState({
    sentiment: '',
    impact: '',
    coin: '',
  });

  const coins = ['BTC', 'ETH', 'ADA', 'SOL', 'DOT', 'LINK', 'MATIC', 'AVAX'];

  useEffect(() => {
    loadNewsData();
    loadSentimentTrends();
    loadPortfolioImpact();
  }, [timeframe, filters]);

  const loadNewsData = async () => {
    setLoading(true);
    try {
      const data = await EnhancedNotificationService.getNewsAnalysis(
        timeframe,
        filters.sentiment || undefined,
        filters.impact || undefined,
        filters.coin || undefined
      );
      setNewsData(data);
    } catch (error) {
      console.error('Failed to load news data:', error);
      toast.error('Failed to load news analysis');
    } finally {
      setLoading(false);
    }
  };

  const loadSentimentTrends = async () => {
    try {
      const trends = await EnhancedNotificationService.getSentimentTrends(selectedCoins, 7);
      setSentimentTrends(trends);
    } catch (error) {
      console.error('Failed to load sentiment trends:', error);
    }
  };

  const loadPortfolioImpact = async () => {
    try {
      const impact = await EnhancedNotificationService.getPortfolioNewsImpact(selectedCoins);
      setPortfolioImpact(impact);
    } catch (error) {
      console.error('Failed to load portfolio impact:', error);
    }
  };

  const triggerAnalysis = async () => {
    try {
      await EnhancedNotificationService.triggerNewsAnalysis();
      toast.success('News analysis triggered successfully');
      await loadNewsData();
      await loadSentimentTrends();
      await loadPortfolioImpact();
    } catch (error) {
      console.error('Failed to trigger analysis:', error);
      toast.error('Failed to trigger analysis');
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <TrendingUpIcon className="w-5 h-5 text-green-600" />;
      case 'negative':
        return <TrendingDownIcon className="w-5 h-5 text-red-600" />;
      default:
        return <MinusIcon className="w-5 h-5 text-gray-600" />;
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
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-green-600 bg-green-100';
    }
  };

  // Prepare chart data
  const sentimentPieData = newsData ? [
    { name: 'Positive', value: newsData.summary.bysentiment.positive, color: '#10B981' },
    { name: 'Negative', value: newsData.summary.bysentiment.negative, color: '#EF4444' },
    { name: 'Neutral', value: newsData.summary.bysentiment.neutral, color: '#6B7280' },
  ] : [];

  const impactPieData = newsData ? [
    { name: 'High', value: newsData.summary.byImpact.high, color: '#EF4444' },
    { name: 'Medium', value: newsData.summary.byImpact.medium, color: '#F59E0B' },
    { name: 'Low', value: newsData.summary.byImpact.low, color: '#10B981' },
  ] : [];

  const topCoinsData = newsData ? 
    Object.entries(newsData.summary.topCoins)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([coin, mentions]) => ({ coin, mentions }))
    : [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <NewspaperIcon className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">News Analysis</h1>
            <p className="text-gray-600">Monitor crypto news sentiment and market impact</p>
          </div>
        </div>
        
        <button
          onClick={triggerAnalysis}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
        >
          <NewspaperIcon className="w-5 h-5" />
          <span>Trigger Analysis</span>
        </button>
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center space-x-2 mb-4">
          <FunnelIcon className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters & Settings</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Timeframe</label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(Number(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-2 w-full"
            >
              <option value={6}>6 hours</option>
              <option value={12}>12 hours</option>
              <option value={24}>24 hours</option>
              <option value={48}>48 hours</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sentiment</label>
            <select
              value={filters.sentiment}
              onChange={(e) => setFilters(prev => ({ ...prev, sentiment: e.target.value }))}
              className="border border-gray-300 rounded-md px-3 py-2 w-full"
            >
              <option value="">All</option>
              <option value="positive">Positive</option>
              <option value="negative">Negative</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Impact</label>
            <select
              value={filters.impact}
              onChange={(e) => setFilters(prev => ({ ...prev, impact: e.target.value }))}
              className="border border-gray-300 rounded-md px-3 py-2 w-full"
            >
              <option value="">All</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Coin</label>
            <select
              value={filters.coin}
              onChange={(e) => setFilters(prev => ({ ...prev, coin: e.target.value }))}
              className="border border-gray-300 rounded-md px-3 py-2 w-full"
            >
              <option value="">All</option>
              {coins.map(coin => (
                <option key={coin} value={coin}>{coin}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {newsData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total News</h3>
            <p className="text-2xl font-bold text-gray-900">{newsData.summary.total}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">High Impact</h3>
            <p className="text-2xl font-bold text-red-600">{newsData.summary.byImpact.high}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Positive Sentiment</h3>
            <p className="text-2xl font-bold text-green-600">{newsData.summary.bysentiment.positive}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Negative Sentiment</h3>
            <p className="text-2xl font-bold text-red-600">{newsData.summary.bysentiment.negative}</p>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sentiment Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sentiment Distribution</h3>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sentimentPieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {sentimentPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Impact Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Impact Distribution</h3>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={impactPieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {impactPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Mentioned Coins */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Mentioned Coins</h3>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topCoinsData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="coin" />
                <Tooltip />
                <Bar dataKey="mentions" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* High Impact News */}
      {newsData && newsData.summary.highImpactNews.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">High Impact News</h3>
            </div>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              {newsData.summary.highImpactNews.map((news) => (
                <div key={news.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900 flex-1 pr-4">{news.title}</h4>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSentimentColor(news.sentiment)}`}>
                        {news.sentiment}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getImpactColor(news.impact)}`}>
                        {news.impact}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">{news.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <span className="text-xs text-gray-500">{news.source}</span>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(news.publishedAt), { addSuffix: true })}
                      </span>
                      {news.relevantCoins.length > 0 && (
                        <div className="flex items-center space-x-1">
                          <span className="text-xs text-gray-500">Coins:</span>
                          {news.relevantCoins.slice(0, 3).map(coin => (
                            <span key={coin} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                              {coin}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <a
                      href={news.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                    >
                      <span className="text-sm">Read more</span>
                      <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent News */}
      {newsData && newsData.recentNews.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent News</h3>
          </div>
          
          <div className="p-6">
            <div className="space-y-3">
              {newsData.recentNews.slice(0, 10).map((news) => (
                <div key={news.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex-shrink-0 mt-1">
                    {getSentimentIcon(news.sentiment)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">{news.title}</h4>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{news.description}</p>
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">{news.source}</span>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(news.publishedAt), { addSuffix: true })}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getImpactColor(news.impact)}`}>
                          {news.impact}
                        </span>
                        <a
                          href={news.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 