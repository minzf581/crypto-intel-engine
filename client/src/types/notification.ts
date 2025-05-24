export interface NotificationSettings {
  id: string;
  userId: string;
  pushEnabled: boolean;
  soundEnabled: boolean;
  emailEnabled: boolean;
  soundType: 'default' | 'bell' | 'chime' | 'alert';
  priority: 'low' | 'medium' | 'high' | 'critical';
  groupingEnabled: boolean;
  maxPerHour: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationHistory {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'price_alert' | 'signal' | 'news' | 'system';
  priority: 'low' | 'medium' | 'high' | 'critical';
  data: any;
  read: boolean;
  archived: boolean;
  fcmToken?: string;
  sentAt: Date;
  readAt?: Date;
  groupId?: string;
  quickActions?: QuickAction[];
}

export interface QuickAction {
  id: string;
  label: string;
  action: string;
  icon?: string;
}

export interface NotificationGroup {
  id: string;
  title: string;
  count: number;
  latestNotification: NotificationHistory;
  createdAt: Date;
}

export interface VolumeAnalysis {
  id: string;
  symbol: string;
  timestamp: Date;
  volume24h: number;
  volumeChange: number;
  volumeAvg7d: number;
  volumeRatio: number;
  unusualVolumeDetected: boolean;
  volumeSpike: boolean;
}

export interface NewsData {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: Date;
  sentiment: 'positive' | 'negative' | 'neutral';
  relevantCoins: string[];
  impact: 'low' | 'medium' | 'high';
  category: string;
}

export interface VolumeAnomalyResult {
  isAnomaly: boolean;
  confidence: number;
  reason: string;
  currentVolume: number;
  averageVolume: number;
}

export interface NewsSummary {
  total: number;
  bysentiment: Record<string, number>;
  byImpact: Record<string, number>;
  topCoins: Record<string, number>;
  highImpactNews: NewsData[];
}

export interface SentimentTrend {
  date: string;
  count: number;
  positive: number;
  negative: number;
  neutral: number;
  sentimentScore: number;
}

export interface PortfolioNewsImpact {
  newsCount: number;
  sentimentScore: number;
  impactLevel: 'low' | 'medium' | 'high';
  recentNews: NewsData[];
} 