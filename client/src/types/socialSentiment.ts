export interface TwitterAccount {
  id: string;
  username: string;
  displayName: string;
  bio?: string;
  followersCount: number;
  followingCount?: number;
  tweetsCount?: number;
  isVerified: boolean;
  profileImageUrl?: string;
  influenceScore: number;
  relevanceScore: number;
  mentionCount?: number;
  avgSentiment?: number;
  isInfluencer?: boolean;
  accountCategory?: AccountCategory;
  recentTweets?: RecentTweet[];
  engagementMetrics?: EngagementMetrics;
}

export interface RecentTweet {
  id: string;
  text: string;
  publishedAt: string;
  retweetCount: number;
  likeCount: number;
  replyCount: number;
  sentimentScore: number;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface EngagementMetrics {
  avgLikes: number;
  avgRetweets: number;
  avgReplies: number;
  engagementRate: number;
  lastActiveDate: string;
}

export interface AccountCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
}

export interface SearchHistory {
  id: string;
  query: string;
  filters: SearchFilters;
  timestamp: string;
  resultsCount: number;
  coinSymbol: string;
  coinName: string;
  userId: string;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: SearchFilters;
  coinSymbol: string;
  coinName: string;
  userId: string;
  createdAt: string;
  lastUsed: string;
  useCount: number;
}

export interface SearchFilters {
  minFollowers: number;
  maxFollowers?: number;
  includeVerified: boolean;
  accountCategories: string[];
  minEngagementRate?: number;
  language?: string;
  location?: string;
  hasRecentActivity?: boolean;
}

export interface PopularSearch {
  query: string;
  searchCount: number;
  coinSymbol: string;
  coinName: string;
  lastSearched: string;
}

export interface PopularAccount {
  account: TwitterAccount;
  addedToMonitoringCount: number;
  coinSymbol: string;
  coinName: string;
  lastAdded: string;
}

export interface SearchResults {
  accounts: TwitterAccount[];
  totalCount: number;
  hasMore: boolean;
  currentPage: number;
  totalPages: number;
  query: string;
  searchMethod: string;
}

export interface SentimentSummary {
  coinSymbol: string;
  timeframe: string;
  totalPosts: number;
  sentimentDistribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
  avgSentimentScore: number;
  impactDistribution: {
    low: number;
    medium: number;
    high: number;
  };
  avgImpactScore: number;
  significantPosts: any[];
  trendingKeywords: {
    word: string;
    count: number;
    sentiment: number;
  }[];
}

export interface BulkImportResult {
  successful: TwitterAccount[];
  failed: {
    username: string;
    reason: string;
  }[];
  totalProcessed: number;
  successCount: number;
  failureCount: number;
}

export interface SocialSentimentDashboardProps {
  selectedCoin?: string;
  coinName?: string;
} 