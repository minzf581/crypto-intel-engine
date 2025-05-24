import { Asset, User } from '../models';
import logger from '../utils/logger';

// Default asset data with CoinGecko IDs
const assets = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    logo: 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/btc.svg',
    coingeckoId: 'bitcoin',
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    logo: 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/eth.svg',
    coingeckoId: 'ethereum',
  },
  {
    symbol: 'BNB',
    name: 'Binance Coin',
    logo: 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/bnb.svg',
    coingeckoId: 'binancecoin',
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    logo: 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/sol.svg',
    coingeckoId: 'solana',
  },
  {
    symbol: 'ADA',
    name: 'Cardano',
    logo: 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/ada.svg',
    coingeckoId: 'cardano',
  },
  {
    symbol: 'DOT',
    name: 'Polkadot',
    logo: 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/dot.svg',
    coingeckoId: 'polkadot',
  },
  {
    symbol: 'DOGE',
    name: 'Dogecoin',
    logo: 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/doge.svg',
    coingeckoId: 'dogecoin',
  },
  {
    symbol: 'TRUMP',
    name: 'TRUMP Token',
    logo: '',
    coingeckoId: undefined, // Will be auto-resolved by the service
  },
];

// Demo user data
const users = [
  {
    name: 'Demo User',
    email: 'demo@example.com',
    password: 'demo123',
    hasCompletedOnboarding: true,
    selectedAssets: ['BTC', 'ETH', 'SOL'],
  },
];

// Initialize data
export const seedData = async () => {
  try {
    // Check if assets already exist
    const assetCount = await Asset.count();
    
    if (assetCount === 0) {
      // Create default assets
      await Asset.bulkCreate(assets);
      logger.info(`Created ${assets.length} default assets`);
    } else {
      // Update existing assets with CoinGecko IDs if they don't have them
      for (const assetData of assets) {
        const existingAsset = await Asset.findOne({ where: { symbol: assetData.symbol } });
        if (existingAsset && !existingAsset.coingeckoId && assetData.coingeckoId) {
          await existingAsset.update({ coingeckoId: assetData.coingeckoId });
          logger.info(`Updated ${assetData.symbol} with CoinGecko ID: ${assetData.coingeckoId}`);
        }
      }
      
      // Add TRUMP if it doesn't exist
      const trumpExists = await Asset.findOne({ where: { symbol: 'TRUMP' } });
      if (!trumpExists) {
        await Asset.create({
          symbol: 'TRUMP',
          name: 'TRUMP Token',
          logo: '',
          coingeckoId: undefined
        });
        logger.info('Added TRUMP token for testing');
      }
    }
    
    // Check if users already exist
    const userCount = await User.count();
    
    if (userCount === 0) {
      // Create demo users
      await Promise.all(users.map(user => User.create(user)));
      logger.info(`Created ${users.length} demo users`);
    }
    
    // Log about signal generation strategy
    logger.info('⚠️  Simulated signal generation is disabled, now using real data sources');
    logger.info('📊 Signals will come from: price monitoring, sentiment analysis, and other real data sources');
    
    logger.info('Data initialization complete');
  } catch (error) {
    logger.error('Data initialization failed:', error);
  }
};

export default seedData; 