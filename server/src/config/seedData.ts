import { Asset, User, Signal } from '../models';
import { format, subDays, subHours } from 'date-fns';
import logger from '../utils/logger';

// Default asset data
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

// Demo signal generation function
const generateDemoSignals = async () => {
  const signalTypes = ['sentiment', 'narrative'];
  const descriptions = {
    sentiment: [
      'Social media discussions about %s have turned notably positive',
      'Traders are generally bullish on %s short-term trend',
      'Sentiment index for %s holders has reached a recent high',
      'Significant decrease in negative comments about %s',
      'Investors remain optimistic about %s long-term prospects'
    ],
    narrative: [
      'New technical updates for %s have attracted widespread attention',
      'Increased mainstream media coverage has boosted %s exposure',
      '%s has made significant progress in enterprise adoption',
      'New narratives about %s future development are forming',
      'Expansion of %s ecosystem is generating discussion'
    ]
  };

  try {
    // Get all assets
    const allAssets = await Asset.findAll();
    
    const demoSignals = [];
    
    // Generate multiple signals for each asset
    for (const asset of allAssets) {
      // Generate 3-5 signals per asset
      const signalCount = Math.floor(Math.random() * 3) + 3;
      
      for (let i = 0; i < signalCount; i++) {
        // Randomly select signal type
        const type = signalTypes[Math.floor(Math.random() * signalTypes.length)] as 'sentiment' | 'narrative';
        
        // Randomly select description
        const descriptionTemplate = descriptions[type][Math.floor(Math.random() * descriptions[type].length)];
        const description = descriptionTemplate.replace('%s', asset.name);
        
        // Generate random strength (1-100)
        const strength = Math.floor(Math.random() * 80) + 20;
        
        // Generate random time (within past 7 days)
        const daysAgo = Math.floor(Math.random() * 7);
        const hoursAgo = Math.floor(Math.random() * 24);
        const timestamp = subHours(subDays(new Date(), daysAgo), hoursAgo);
        
        // Generate random source data
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
    
    // Bulk create signals
    // @ts-ignore - ignore type check issues
    await Signal.bulkCreate(demoSignals);
    logger.info(`Created ${demoSignals.length} demo signals`);
    
  } catch (error) {
    logger.error('Failed to generate demo signals:', error);
  }
};

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
    
    // Check if signals already exist
    const signalCount = await Signal.count();
    
    if (signalCount === 0) {
      // Generate demo signals
      await generateDemoSignals();
    }
    
    logger.info('Data initialization complete');
  } catch (error) {
    logger.error('Data initialization failed:', error);
  }
};

export default seedData; 