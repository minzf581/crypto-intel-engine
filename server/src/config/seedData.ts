import { Asset, User } from '../models';
import logger from '../utils/logger';

// Default asset data
const assets = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    logo: 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/btc.svg',
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    logo: 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/eth.svg',
  },
  {
    symbol: 'BNB',
    name: 'Binance Coin',
    logo: 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/bnb.svg',
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    logo: 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/sol.svg',
  },
  {
    symbol: 'ADA',
    name: 'Cardano',
    logo: 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/ada.svg',
  },
  {
    symbol: 'DOT',
    name: 'Polkadot',
    logo: 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/dot.svg',
  },
  {
    symbol: 'DOGE',
    name: 'Dogecoin',
    logo: 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/doge.svg',
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