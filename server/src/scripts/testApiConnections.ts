/**
 * API Connection Test Script
 * Tests all configured APIs to ensure they're working properly
 */

import axios from 'axios';
import env from '../config/env';
import logger from '../utils/logger';

class ApiConnectionTester {
  
  /**
   * Test Twitter API connection
   */
  async testTwitterApi(): Promise<boolean> {
    try {
      if (!env.twitterBearerToken) {
        logger.warn('Twitter Bearer Token not configured');
        return false;
      }

      const response = await axios.get('https://api.twitter.com/2/users/by', {
        params: {
          usernames: 'elonmusk',
          'user.fields': 'public_metrics'
        },
        headers: {
          'Authorization': `Bearer ${env.twitterBearerToken}`
        }
      });

      if (response.data.data && response.data.data.length > 0) {
        logger.info('✅ Twitter API connection successful');
        return true;
      } else {
        logger.error('❌ Twitter API connection failed: No data returned');
        return false;
      }
    } catch (error) {
      logger.error('❌ Twitter API connection failed:', error);
      return false;
    }
  }

  /**
   * Test News API connection
   */
  async testNewsApi(): Promise<boolean> {
    try {
      if (!env.newsApiKey) {
        logger.warn('News API Key not configured');
        return false;
      }

      const response = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          q: 'bitcoin',
          language: 'en',
          pageSize: 1,
          apiKey: env.newsApiKey
        }
      });

      if (response.data.articles && response.data.articles.length > 0) {
        logger.info('✅ News API connection successful');
        return true;
      } else {
        logger.error('❌ News API connection failed: No articles returned');
        return false;
      }
    } catch (error) {
      logger.error('❌ News API connection failed:', error);
      return false;
    }
  }

  /**
   * Test Etherscan API connection
   */
  async testEtherscanApi(): Promise<boolean> {
    try {
      if (!env.etherscanApiKey) {
        logger.warn('Etherscan API Key not configured');
        return false;
      }

      const response = await axios.get('https://api.etherscan.io/api', {
        params: {
          module: 'stats',
          action: 'ethsupply',
          apikey: env.etherscanApiKey
        }
      });

      if (response.data.status === '1' && response.data.result) {
        logger.info('✅ Etherscan API connection successful');
        return true;
      } else {
        logger.error('❌ Etherscan API connection failed:', response.data.message);
        return false;
      }
    } catch (error) {
      logger.error('❌ Etherscan API connection failed:', error);
      return false;
    }
  }

  /**
   * Test CoinGecko API connection (fallback without key)
   */
  async testCoinGeckoApi(): Promise<boolean> {
    try {
      const response = await axios.get('https://api.coingecko.com/api/v3/ping');

      if (response.data.gecko_says === '(V3) To the Moon!') {
        logger.info('✅ CoinGecko API connection successful');
        return true;
      } else {
        logger.error('❌ CoinGecko API connection failed: Unexpected response');
        return false;
      }
    } catch (error) {
      logger.error('❌ CoinGecko API connection failed:', error);
      return false;
    }
  }

  /**
   * Run all API tests
   */
  async runAllTests(): Promise<void> {
    logger.info('🔍 Testing API connections...');
    logger.info('==========================================');

    const results = {
      twitter: await this.testTwitterApi(),
      news: await this.testNewsApi(),
      etherscan: await this.testEtherscanApi(),
      coingecko: await this.testCoinGeckoApi()
    };

    logger.info('==========================================');
    logger.info('📊 API Connection Test Results:');
    logger.info(`Twitter API: ${results.twitter ? '✅ Connected' : '❌ Failed'}`);
    logger.info(`News API: ${results.news ? '✅ Connected' : '❌ Failed'}`);
    logger.info(`Etherscan API: ${results.etherscan ? '✅ Connected' : '❌ Failed'}`);
    logger.info(`CoinGecko API: ${results.coingecko ? '✅ Connected' : '❌ Failed'}`);

    const connectedCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;

    logger.info(`Overall: ${connectedCount}/${totalCount} APIs connected`);

    if (connectedCount === totalCount) {
      logger.info('🎉 All APIs are working correctly! The system is ready for production.');
    } else {
      logger.warn('⚠️ Some APIs failed. Check your environment variables and API keys.');
    }
  }
}

// Export for use in other modules
export default ApiConnectionTester;

// Allow running directly with ts-node
if (require.main === module) {
  const tester = new ApiConnectionTester();
  tester.runAllTests().catch(error => {
    logger.error('Test runner failed:', error);
    process.exit(1);
  });
} 