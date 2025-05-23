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
      logger.info(`创建了 ${assets.length} 个默认资产`);
    }
    
    // Check if users already exist
    const userCount = await User.count();
    
    if (userCount === 0) {
      // Create demo users
      await Promise.all(users.map(user => User.create(user)));
      logger.info(`创建了 ${users.length} 个演示用户`);
    }
    
    // 不再生成模拟信号
    logger.info('⚠️  模拟信号生成已禁用，现在使用真实数据源');
    logger.info('📊 信号将来自：价格监控、情感分析等真实数据源');
    
    logger.info('数据初始化完成');
  } catch (error) {
    logger.error('数据初始化失败:', error);
  }
};

export default seedData; 