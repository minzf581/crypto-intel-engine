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

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  sound?: string;
  data?: any;
  actions?: PushAction[];
}

export interface PushAction {
  action: string;
  title: string;
  icon?: string;
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

export interface SignalStatistics {
  id: string;
  signalType: string;
  totalCount: number;
  successRate: number;
  averageAccuracy: number;
  lastWeekCount: number;
  lastMonthCount: number;
  performanceData: {
    date: Date;
    count: number;
    accuracy: number;
  }[];
}

export interface AnomalyDetection {
  id: string;
  symbol: string;
  type: 'price' | 'volume' | 'sentiment' | 'technical';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  confidence: number;
  timestamp: Date;
  data: any;
  resolved: boolean;
}

export interface CustomMetric {
  id: string;
  userId: string;
  name: string;
  description: string;
  formula: string;
  symbols: string[];
  alertThresholds: {
    above?: number;
    below?: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
} 