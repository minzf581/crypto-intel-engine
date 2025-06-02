import logger from '../utils/logger';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  retryAfterMs: number;
}

interface RequestRecord {
  timestamp: number;
  count: number;
}

class RateLimitService {
  private static instance: RateLimitService;
  private requestHistory: Map<string, RequestRecord[]> = new Map();
  
  // CoinGecko free tier limits: 10-50 requests per minute
  private readonly configs: Record<string, RateLimitConfig> = {
    coingecko: {
      maxRequests: 10, // Conservative limit for free tier
      windowMs: 60 * 1000, // 1 minute
      retryAfterMs: 60 * 1000, // Wait 1 minute on rate limit
    },
    twitter: {
      maxRequests: 300,
      windowMs: 15 * 60 * 1000, // 15 minutes
      retryAfterMs: 15 * 60 * 1000,
    },
    newsapi: {
      maxRequests: 100,
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
      retryAfterMs: 60 * 60 * 1000, // 1 hour
    }
  };

  static getInstance(): RateLimitService {
    if (!RateLimitService.instance) {
      RateLimitService.instance = new RateLimitService();
    }
    return RateLimitService.instance;
  }

  /**
   * Check if request is allowed and update rate limit counter
   */
  async checkRateLimit(service: string): Promise<{ allowed: boolean; retryAfter?: number }> {
    const config = this.configs[service];
    if (!config) {
      logger.warn(`No rate limit config found for service: ${service}`);
      return { allowed: true };
    }

    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    // Get or create request history for this service
    let history = this.requestHistory.get(service) || [];
    
    // Remove old requests outside the window
    history = history.filter(record => record.timestamp > windowStart);
    
    // Count total requests in current window
    const totalRequests = history.reduce((sum, record) => sum + record.count, 0);
    
    if (totalRequests >= config.maxRequests) {
      logger.warn(`Rate limit exceeded for ${service}: ${totalRequests}/${config.maxRequests} requests in window`);
      return { 
        allowed: false, 
        retryAfter: config.retryAfterMs 
      };
    }

    // Add current request to history
    history.push({ timestamp: now, count: 1 });
    this.requestHistory.set(service, history);
    
    logger.debug(`Rate limit check passed for ${service}: ${totalRequests + 1}/${config.maxRequests} requests`);
    return { allowed: true };
  }

  /**
   * Wait for rate limit to reset
   */
  async waitForRateLimit(service: string, retryAfter: number): Promise<void> {
    logger.info(`Waiting ${retryAfter}ms for ${service} rate limit to reset...`);
    await new Promise(resolve => setTimeout(resolve, retryAfter));
  }

  /**
   * Execute request with rate limiting and retry logic
   */
  async executeWithRateLimit<T>(
    service: string,
    requestFn: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let retries = 0;
    
    while (retries <= maxRetries) {
      // Check rate limit
      const rateLimitCheck = await this.checkRateLimit(service);
      
      if (!rateLimitCheck.allowed) {
        if (retries >= maxRetries) {
          throw new Error(`Rate limit exceeded for ${service} after ${maxRetries} retries`);
        }
        
        await this.waitForRateLimit(service, rateLimitCheck.retryAfter!);
        retries++;
        continue;
      }

      try {
        return await requestFn();
      } catch (error: any) {
        // Handle rate limit errors from the API
        if (error.response?.status === 429) {
          const retryAfter = this.parseRetryAfter(error.response.headers['retry-after']) || 
                           this.configs[service]?.retryAfterMs || 60000;
          
          logger.warn(`API returned 429 for ${service}, waiting ${retryAfter}ms...`);
          
          if (retries >= maxRetries) {
            throw new Error(`API rate limit exceeded for ${service} after ${maxRetries} retries`);
          }
          
          await this.waitForRateLimit(service, retryAfter);
          retries++;
          continue;
        }
        
        // For non-rate-limit errors, throw immediately
        throw error;
      }
    }
    
    throw new Error(`Failed to execute request for ${service} after ${maxRetries} retries`);
  }

  /**
   * Parse retry-after header value
   */
  private parseRetryAfter(retryAfter: string | undefined): number | null {
    if (!retryAfter) return null;
    
    const seconds = parseInt(retryAfter, 10);
    return isNaN(seconds) ? null : seconds * 1000;
  }

  /**
   * Get current rate limit status for a service
   */
  getRateLimitStatus(service: string): {
    requestsInWindow: number;
    maxRequests: number;
    windowMs: number;
    resetTime: number;
  } {
    const config = this.configs[service];
    if (!config) {
      return {
        requestsInWindow: 0,
        maxRequests: 0,
        windowMs: 0,
        resetTime: 0
      };
    }

    const now = Date.now();
    const windowStart = now - config.windowMs;
    const history = this.requestHistory.get(service) || [];
    
    const recentRequests = history.filter(record => record.timestamp > windowStart);
    const requestsInWindow = recentRequests.reduce((sum, record) => sum + record.count, 0);
    
    const oldestRequest = recentRequests[0];
    const resetTime = oldestRequest ? oldestRequest.timestamp + config.windowMs : now;

    return {
      requestsInWindow,
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
      resetTime
    };
  }

  /**
   * Clear rate limit history for a service (for testing)
   */
  clearRateLimitHistory(service: string): void {
    this.requestHistory.delete(service);
    logger.info(`Cleared rate limit history for ${service}`);
  }
}

export default RateLimitService.getInstance(); 