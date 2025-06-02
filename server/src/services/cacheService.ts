import logger from '../utils/logger';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheConfig {
  defaultTtl: number; // Time to live in milliseconds
  maxSize: number;    // Maximum number of items in cache
}

class CacheService {
  private static instance: CacheService;
  private cache: Map<string, CacheItem<any>> = new Map();
  
  private readonly config: CacheConfig = {
    defaultTtl: 5 * 60 * 1000, // 5 minutes default
    maxSize: 1000
  };

  // Different TTL for different data types
  private readonly ttlConfig: Record<string, number> = {
    'coingecko:price': 1 * 60 * 1000,      // 1 minute for prices
    'coingecko:coinlist': 24 * 60 * 60 * 1000, // 24 hours for coin list
    'coingecko:volume': 5 * 60 * 1000,     // 5 minutes for volume data
    'coingecko:market': 2 * 60 * 1000,     // 2 minutes for market data
    'twitter:search': 10 * 60 * 1000,      // 10 minutes for Twitter search
    'news:articles': 30 * 60 * 1000,       // 30 minutes for news
  };

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Get data from cache
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if item has expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      logger.debug(`Cache item expired and removed: ${key}`);
      return null;
    }

    logger.debug(`Cache hit: ${key}`);
    return item.data;
  }

  /**
   * Set data in cache
   */
  set<T>(key: string, data: T, customTtl?: number): void {
    // Determine TTL
    const ttl = customTtl || this.getTtlForKey(key) || this.config.defaultTtl;
    const expiresAt = Date.now() + ttl;

    // Check cache size and evict oldest items if necessary
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldestItems(Math.floor(this.config.maxSize * 0.1)); // Remove 10% of items
    }

    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiresAt
    };

    this.cache.set(key, item);
    logger.debug(`Cache set: ${key} (expires in ${ttl}ms)`);
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete specific key from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      logger.debug(`Cache item deleted: ${key}`);
    }
    return deleted;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.info(`Cache cleared: ${size} items removed`);
  }

  /**
   * Get or set pattern - execute function if cache miss
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    customTtl?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - fetch data
    logger.debug(`Cache miss: ${key}, fetching data...`);
    const data = await fetchFn();
    
    // Store in cache
    this.set(key, data, customTtl);
    
    return data;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    oldestItem: string | null;
    newestItem: string | null;
  } {
    let oldestTimestamp = Date.now();
    let newestTimestamp = 0;
    let oldestKey: string | null = null;
    let newestKey: string | null = null;

    for (const [key, item] of this.cache.entries()) {
      if (item.timestamp < oldestTimestamp) {
        oldestTimestamp = item.timestamp;
        oldestKey = key;
      }
      if (item.timestamp > newestTimestamp) {
        newestTimestamp = item.timestamp;
        newestKey = key;
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: 0, // Would need to track hits/misses for accurate calculation
      oldestItem: oldestKey,
      newestItem: newestKey
    };
  }

  /**
   * Remove expired items from cache
   */
  cleanupExpired(): number {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      logger.info(`Cache cleanup: removed ${removedCount} expired items`);
    }

    return removedCount;
  }

  /**
   * Generate cache key for CoinGecko API calls
   */
  static generateCoinGeckoKey(endpoint: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    return `coingecko:${endpoint}:${sortedParams}`;
  }

  /**
   * Generate cache key for Twitter API calls
   */
  static generateTwitterKey(endpoint: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    return `twitter:${endpoint}:${sortedParams}`;
  }

  /**
   * Private methods
   */
  private getTtlForKey(key: string): number | null {
    for (const [pattern, ttl] of Object.entries(this.ttlConfig)) {
      if (key.startsWith(pattern)) {
        return ttl;
      }
    }
    return null;
  }

  private evictOldestItems(count: number): void {
    const items = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp)
      .slice(0, count);

    for (const [key] of items) {
      this.cache.delete(key);
    }

    logger.debug(`Evicted ${count} oldest cache items`);
  }
}

export { CacheService };
export default CacheService.getInstance(); 