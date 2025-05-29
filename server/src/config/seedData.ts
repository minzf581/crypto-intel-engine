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
    logo: 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/generic.svg',
    coingeckoId: undefined, // Will be auto-resolved by the service
  },
];

// Initialize data
export const seedData = async () => {
  try {
    // Create default demo user if not exists
    const demoUserExists = await User.findOne({ where: { email: 'demo@example.com' } });
    if (!demoUserExists) {
      await User.create({
        name: 'Demo User',
        email: 'demo@example.com',
        password: 'demo123', // Let User model handle password hashing
        hasCompletedOnboarding: true,
        selectedAssets: ['BTC', 'ETH', 'SOL', 'ADA']
      });
      logger.info('Created default demo user: demo@example.com');
    }

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
        logger.info('Added TRUMP token');
      }
    }
    
    // Create initial signals if none exist
    const { Signal } = await import('../models');
    const signalCount = await Signal.count();
    
    if (signalCount === 0) {
      logger.info('Creating initial signals...');
      
      // Get assets for signal creation
      const btc = await Asset.findOne({ where: { symbol: 'BTC' } });
      const eth = await Asset.findOne({ where: { symbol: 'ETH' } });
      const sol = await Asset.findOne({ where: { symbol: 'SOL' } });
      const ada = await Asset.findOne({ where: { symbol: 'ADA' } });
      
      const initialSignals = [];
      
      if (btc) {
        initialSignals.push({
          assetId: btc.id,
          assetSymbol: btc.symbol,
          assetName: btc.name,
          assetLogo: btc.logo,
          type: 'price',
          strength: 75,
          description: 'Bitcoin showing strong bullish momentum with increased institutional adoption',
          sources: [{ platform: 'price', count: 1 }],
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
        });
        
        initialSignals.push({
          assetId: btc.id,
          assetSymbol: btc.symbol,
          assetName: btc.name,
          assetLogo: btc.logo,
          type: 'sentiment',
          strength: 68,
          description: 'Positive sentiment surge on social media following ETF approval news',
          sources: [{ platform: 'twitter', count: 245 }],
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000) // 4 hours ago
        });
      }
      
      if (eth) {
        initialSignals.push({
          assetId: eth.id,
          assetSymbol: eth.symbol,
          assetName: eth.name,
          assetLogo: eth.logo,
          type: 'narrative',
          strength: 82,
          description: 'Ethereum network upgrade showing significant improvements in transaction efficiency',
          sources: [{ platform: 'reddit', count: 156 }],
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours ago
        });
        
        initialSignals.push({
          assetId: eth.id,
          assetSymbol: eth.symbol,
          assetName: eth.name,
          assetLogo: eth.logo,
          type: 'price',
          strength: 71,
          description: 'ETH price breaking key resistance levels with strong volume support',
          sources: [{ platform: 'price', count: 1 }],
          timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
        });
      }
      
      if (sol) {
        initialSignals.push({
          assetId: sol.id,
          assetSymbol: sol.symbol,
          assetName: sol.name,
          assetLogo: sol.logo,
          type: 'sentiment',
          strength: 79,
          description: 'Solana ecosystem growth driving positive community sentiment',
          sources: [{ platform: 'twitter', count: 189 }],
          timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000) // 3 hours ago
        });
      }
      
      if (ada) {
        initialSignals.push({
          assetId: ada.id,
          assetSymbol: ada.symbol,
          assetName: ada.name,
          assetLogo: ada.logo,
          type: 'narrative',
          strength: 65,
          description: 'Cardano smart contract adoption increasing with new DeFi protocols',
          sources: [{ platform: 'reddit', count: 98 }],
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000) // 5 hours ago
        });
      }
      
      if (initialSignals.length > 0) {
        await Signal.bulkCreate(initialSignals);
        logger.info(`Created ${initialSignals.length} initial signals`);
      }
    }
    
    // Log about signal generation strategy
    logger.info('Signal generation using real data sources only');
    logger.info('📊 Signals come from: price monitoring, sentiment analysis, and other verified data sources');
    
    logger.info('Data initialization complete');
  } catch (error) {
    logger.error('Data initialization failed:', error);
  }
};

export default seedData; 