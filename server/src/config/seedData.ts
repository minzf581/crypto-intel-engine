import { Asset, User, Signal } from '../models';
import { format, subDays, subHours } from 'date-fns';
import logger from '../utils/logger';

// 默认资产数据
const assets = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    logo: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png',
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
  },
  {
    symbol: 'BNB',
    name: 'Binance Coin',
    logo: 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    logo: 'https://cryptologos.cc/logos/solana-sol-logo.png',
  },
  {
    symbol: 'ADA',
    name: 'Cardano',
    logo: 'https://cryptologos.cc/logos/cardano-ada-logo.png',
  },
  {
    symbol: 'DOT',
    name: 'Polkadot',
    logo: 'https://cryptologos.cc/logos/polkadot-new-dot-logo.png',
  },
  {
    symbol: 'DOGE',
    name: 'Dogecoin',
    logo: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png',
  },
];

// 演示用户数据
const users = [
  {
    name: '演示用户',
    email: 'demo@example.com',
    password: 'demo123',
    hasCompletedOnboarding: true,
    selectedAssets: ['BTC', 'ETH', 'SOL'],
  },
];

// 信号示例生成函数
const generateDemoSignals = async () => {
  const signalTypes = ['sentiment', 'narrative'];
  const descriptions = {
    sentiment: [
      '社交媒体上对%s的讨论情绪明显转为积极',
      '交易者普遍看好%s的短期走势',
      '%s持有者的情绪指数创近期新高',
      '关于%s的负面评论数量显著减少',
      '投资者对%s的长期前景保持乐观'
    ],
    narrative: [
      '%s新技术更新吸引了广泛关注',
      '主流媒体报道增加提升了%s的曝光度',
      '%s在企业采用方面取得重大进展',
      '关于%s未来发展的新叙事正在形成',
      '%s相关生态系统扩张引发讨论热潮'
    ]
  };

  try {
    // 获取所有资产
    const allAssets = await Asset.findAll();
    
    const demoSignals = [];
    
    // 为每个资产生成多个信号
    for (const asset of allAssets) {
      // 每个资产生成3-5个信号
      const signalCount = Math.floor(Math.random() * 3) + 3;
      
      for (let i = 0; i < signalCount; i++) {
        // 随机选择信号类型
        const type = signalTypes[Math.floor(Math.random() * signalTypes.length)] as 'sentiment' | 'narrative';
        
        // 随机选择描述
        const descriptionTemplate = descriptions[type][Math.floor(Math.random() * descriptions[type].length)];
        const description = descriptionTemplate.replace('%s', asset.name);
        
        // 生成随机强度(1-100)
        const strength = Math.floor(Math.random() * 80) + 20;
        
        // 生成随机时间(过去7天内)
        const daysAgo = Math.floor(Math.random() * 7);
        const hoursAgo = Math.floor(Math.random() * 24);
        const timestamp = subHours(subDays(new Date(), daysAgo), hoursAgo);
        
        // 生成随机来源数据
        const twitterCount = Math.floor(Math.random() * 500) + 50;
        const redditCount = Math.floor(Math.random() * 300) + 30;
        
        demoSignals.push({
          assetId: asset.id,
          assetSymbol: asset.symbol,
          assetName: asset.name,
          assetLogo: asset.logo,
          type,
          strength,
          description,
          sources: [
            { platform: 'twitter' as 'twitter', count: twitterCount },
            { platform: 'reddit' as 'reddit', count: redditCount }
          ],
          timestamp
        });
      }
    }
    
    // 批量创建信号
    // @ts-ignore - 忽略类型检查问题
    await Signal.bulkCreate(demoSignals);
    logger.info(`已创建 ${demoSignals.length} 个演示信号`);
    
  } catch (error) {
    logger.error('生成演示信号失败:', error);
  }
};

// 初始化数据
export const seedData = async () => {
  try {
    // 检查是否已有资产数据
    const assetCount = await Asset.count();
    
    if (assetCount === 0) {
      // 创建默认资产
      await Asset.bulkCreate(assets);
      logger.info(`已创建 ${assets.length} 个默认资产`);
    }
    
    // 检查是否已有用户数据
    const userCount = await User.count();
    
    if (userCount === 0) {
      // 创建演示用户
      await Promise.all(users.map(user => User.create(user)));
      logger.info(`已创建 ${users.length} 个演示用户`);
    }
    
    // 检查是否已有信号数据
    const signalCount = await Signal.count();
    
    if (signalCount === 0) {
      // 生成演示信号
      await generateDemoSignals();
    }
    
    logger.info('数据初始化完成');
  } catch (error) {
    logger.error('数据初始化失败:', error);
  }
};

export default seedData; 