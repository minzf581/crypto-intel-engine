import axios from 'axios';
import logger from '../utils/logger';

// CoinGecko API configuration
const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';

// Cache for CoinGecko coin list
let coinListCache: CoinListItem[] = [];
let coinListCacheExpiry = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface CoinListItem {
  id: string;
  symbol: string;
  name: string;
}

interface CoinSearchResult {
  id: string;
  symbol: string;
  name: string;
  confidence: number; // 0-1, how confident we are in the match
}

class CoinGeckoService {
  
  /**
   * Get the complete list of coins from CoinGecko
   */
  async getCoinList(): Promise<CoinListItem[]> {
    try {
      // Check cache first
      const now = Date.now();
      if (coinListCache.length > 0 && now < coinListCacheExpiry) {
        return coinListCache;
      }

      logger.info('Fetching CoinGecko coin list...');
      
      const response = await axios.get(`${COINGECKO_API_BASE}/coins/list`, {
        timeout: 30000
      });

      coinListCache = response.data;
      coinListCacheExpiry = now + CACHE_DURATION;

      logger.info(`Cached ${coinListCache.length} coins from CoinGecko`);
      return coinListCache;

    } catch (error: any) {
      logger.error('Failed to fetch CoinGecko coin list:', error);
      throw error;
    }
  }

  /**
   * Search for a cryptocurrency by symbol or name
   */
  async searchCoin(query: string): Promise<CoinSearchResult[]> {
    try {
      const coinList = await this.getCoinList();
      const queryLower = query.toLowerCase();
      const results: CoinSearchResult[] = [];

      for (const coin of coinList) {
        let confidence = 0;

        // Exact symbol match (highest confidence)
        if (coin.symbol.toLowerCase() === queryLower) {
          confidence = 1.0;
        }
        // Exact name match
        else if (coin.name.toLowerCase() === queryLower) {
          confidence = 0.9;
        }
        // Symbol starts with query
        else if (coin.symbol.toLowerCase().startsWith(queryLower)) {
          confidence = 0.8;
        }
        // Name starts with query
        else if (coin.name.toLowerCase().startsWith(queryLower)) {
          confidence = 0.7;
        }
        // Symbol contains query
        else if (coin.symbol.toLowerCase().includes(queryLower)) {
          confidence = 0.6;
        }
        // Name contains query
        else if (coin.name.toLowerCase().includes(queryLower)) {
          confidence = 0.5;
        }

        if (confidence > 0) {
          results.push({
            id: coin.id,
            symbol: coin.symbol,
            name: coin.name,
            confidence
          });
        }
      }

      // Sort by confidence (highest first)
      results.sort((a, b) => b.confidence - a.confidence);

      // Return top 10 results
      return results.slice(0, 10);

    } catch (error: any) {
      logger.error(`Failed to search for coin "${query}":`, error);
      return [];
    }
  }

  /**
   * Find the best CoinGecko ID for a cryptocurrency symbol
   */
  async findBestCoinId(symbol: string): Promise<string | null> {
    try {
      const searchResults = await this.searchCoin(symbol);
      
      if (searchResults.length === 0) {
        logger.warn(`No CoinGecko match found for symbol: ${symbol}`);
        return null;
      }

      // Use the highest confidence result
      const bestMatch = searchResults[0];
      
      logger.info(`Found CoinGecko ID for ${symbol}: ${bestMatch.id} (confidence: ${bestMatch.confidence})`);
      return bestMatch.id;

    } catch (error: any) {
      logger.error(`Failed to find CoinGecko ID for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Validate that a CoinGecko ID exists and can fetch price data
   */
  async validateCoinId(coinId: string): Promise<boolean> {
    try {
      const response = await axios.get(
        `${COINGECKO_API_BASE}/simple/price`,
        {
          params: {
            ids: coinId,
            vs_currencies: 'usd'
          },
          timeout: 10000
        }
      );

      return response.data && response.data[coinId] && response.data[coinId].usd;

    } catch (error: any) {
      logger.warn(`CoinGecko ID validation failed for ${coinId}:`, error.message);
      return false;
    }
  }

  /**
   * Attempt to auto-resolve CoinGecko ID for an asset
   */
  async autoResolveCoinId(symbol: string, name?: string): Promise<string | null> {
    try {
      // First try searching by symbol
      let coinId = await this.findBestCoinId(symbol);
      
      // If no good match by symbol and we have a name, try searching by name
      if (!coinId && name) {
        const nameResults = await this.searchCoin(name);
        if (nameResults.length > 0 && nameResults[0].confidence > 0.7) {
          coinId = nameResults[0].id;
        }
      }

      // Validate the found coinId
      if (coinId && await this.validateCoinId(coinId)) {
        logger.info(`Successfully resolved CoinGecko ID for ${symbol}: ${coinId}`);
        return coinId;
      }

      logger.warn(`Could not resolve valid CoinGecko ID for ${symbol}`);
      return null;

    } catch (error: any) {
      logger.error(`Failed to auto-resolve CoinGecko ID for ${symbol}:`, error);
      return null;
    }
  }
}

// Export singleton
const coinGeckoService = new CoinGeckoService();
export default coinGeckoService; 