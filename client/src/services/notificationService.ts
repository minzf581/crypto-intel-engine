import axios from 'axios';
import {
  NotificationHistory,
  NotificationGroup,
  NotificationSettings,
  VolumeAnalysis,
  VolumeAnomalyResult,
  NewsData,
  NewsSummary,
  SentimentTrend,
  PortfolioNewsImpact,
} from '../types/notification';

const API_BASE = '/api/notifications-enhanced';

export class EnhancedNotificationService {
  /**
   * Get notification history with pagination and filtering
   */
  static async getHistory(
    page: number = 1,
    limit: number = 20,
    type?: string,
    priority?: string
  ): Promise<{
    notifications: NotificationHistory[];
    total: number;
    pages: number;
  }> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (type) params.append('type', type);
    if (priority) params.append('priority', priority);

    const response = await axios.get(`${API_BASE}/history?${params}`);
    return response.data;
  }

  /**
   * Get grouped notifications
   */
  static async getGrouped(): Promise<NotificationGroup[]> {
    const response = await axios.get(`${API_BASE}/grouped`);
    return response.data;
  }

  /**
   * Update notification settings
   */
  static async updateSettings(
    settings: Partial<NotificationSettings>
  ): Promise<NotificationSettings> {
    const response = await axios.put(`${API_BASE}/settings`, settings);
    return response.data;
  }

  /**
   * Register FCM token for push notifications
   */
  static async registerFCMToken(fcmToken: string): Promise<{ success: boolean }> {
    const response = await axios.post(`${API_BASE}/fcm-token`, { fcmToken });
    return response.data;
  }

  /**
   * Send test notification
   */
  static async sendTestNotification(
    title?: string,
    message?: string,
    type?: string,
    priority?: string,
    fcmToken?: string
  ): Promise<{ success: boolean; notification: NotificationHistory }> {
    const response = await axios.post(`${API_BASE}/test`, {
      title,
      message,
      type,
      priority,
      fcmToken,
    });
    return response.data;
  }

  /**
   * Get volume analysis for a symbol
   */
  static async getVolumeAnalysis(
    symbol: string,
    days: number = 7
  ): Promise<{
    symbol: string;
    history: VolumeAnalysis[];
    anomaly: VolumeAnomalyResult;
  }> {
    const response = await axios.get(
      `${API_BASE}/volume/${symbol}?days=${days}`
    );
    return response.data;
  }

  /**
   * Get symbols with unusual volume activity
   */
  static async getUnusualVolumeSymbols(
    timeframe: number = 24
  ): Promise<VolumeAnalysis[]> {
    const response = await axios.get(
      `${API_BASE}/volume-unusual?timeframe=${timeframe}`
    );
    return response.data;
  }

  /**
   * Trigger volume analysis
   */
  static async triggerVolumeAnalysis(
    symbols: string[] = ['BTC', 'ETH', 'ADA', 'SOL']
  ): Promise<{ success: boolean; analyses: VolumeAnalysis[] }> {
    const response = await axios.post(`${API_BASE}/volume/analyze`, { symbols });
    return response.data;
  }

  /**
   * Get news analysis
   */
  static async getNewsAnalysis(
    hours: number = 24,
    sentiment?: string,
    impact?: string,
    coin?: string
  ): Promise<{
    summary: NewsSummary;
    recentNews: NewsData[];
  }> {
    const params = new URLSearchParams();
    params.append('hours', hours.toString());
    if (sentiment) params.append('sentiment', sentiment);
    if (impact) params.append('impact', impact);
    if (coin) params.append('coin', coin);

    const response = await axios.get(`${API_BASE}/news?${params}`);
    return response.data;
  }

  /**
   * Get sentiment trends for coins
   */
  static async getSentimentTrends(
    coins: string[],
    days: number = 7
  ): Promise<Record<string, SentimentTrend[]>> {
    const params = new URLSearchParams();
    params.append('coins', coins.join(','));
    params.append('days', days.toString());

    const response = await axios.get(`${API_BASE}/news/sentiment-trends?${params}`);
    return response.data;
  }

  /**
   * Get portfolio news impact
   */
  static async getPortfolioNewsImpact(
    symbols: string[]
  ): Promise<Record<string, PortfolioNewsImpact>> {
    const params = new URLSearchParams();
    params.append('symbols', symbols.join(','));

    const response = await axios.get(
      `${API_BASE}/news/portfolio-impact?${params}`
    );
    return response.data;
  }

  /**
   * Trigger news analysis
   */
  static async triggerNewsAnalysis(): Promise<{
    success: boolean;
    analyzedCount: number;
  }> {
    const response = await axios.post(`${API_BASE}/news/analyze`);
    return response.data;
  }
} 