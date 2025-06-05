#!/usr/bin/env node

import { connectDatabase, syncModels } from '../config/database';
import { Asset } from '../models';
import logger from '../utils/logger';

const defaultAssets = [
  { symbol: 'BTC', name: 'Bitcoin', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1.png', coingeckoId: 'bitcoin' },
  { symbol: 'ETH', name: 'Ethereum', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png', coingeckoId: 'ethereum' },
  { symbol: 'SOL', name: 'Solana', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png', coingeckoId: 'solana' },
  { symbol: 'ADA', name: 'Cardano', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/2010.png', coingeckoId: 'cardano' },
  { symbol: 'DOGE', name: 'Dogecoin', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/74.png', coingeckoId: 'dogecoin' },
  { symbol: 'DOT', name: 'Polkadot', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/6636.png', coingeckoId: 'polkadot' },
  { symbol: 'AVAX', name: 'Avalanche', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5805.png', coingeckoId: 'avalanche-2' },
  { symbol: 'MATIC', name: 'Polygon', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3890.png', coingeckoId: 'matic-network' },
  { symbol: 'LINK', name: 'Chainlink', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1975.png', coingeckoId: 'chainlink' },
  { symbol: 'UNI', name: 'Uniswap', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/7083.png', coingeckoId: 'uniswap' },
];

async function initAssets() {
  try {
    console.log('🔧 Initializing assets...');
    
    // Connect to database
    await connectDatabase();
    console.log('✅ Connected to database');
    
    // Sync models
    await syncModels();
    console.log('✅ Database synced');
    
    // Check existing assets
    const existingAssets = await Asset.findAll();
    console.log(`📊 Found ${existingAssets.length} existing assets`);
    
    // Add missing assets
    for (const assetData of defaultAssets) {
      const existingAsset = await Asset.findOne({ where: { symbol: assetData.symbol } });
      
      if (!existingAsset) {
        await Asset.create(assetData);
        console.log(`✅ Created asset: ${assetData.symbol} (${assetData.name})`);
      } else {
        // Update coingeckoId if missing
        if (!existingAsset.coingeckoId && assetData.coingeckoId) {
          await existingAsset.update({ coingeckoId: assetData.coingeckoId });
          console.log(`🔄 Updated ${assetData.symbol} with CoinGecko ID`);
        } else {
          console.log(`⏭️  Asset already exists: ${assetData.symbol}`);
        }
      }
    }
    
    // Show final asset list
    const finalAssets = await Asset.findAll({ attributes: ['symbol', 'name', 'coingeckoId'] });
    console.log('\n📋 Final asset list:');
    finalAssets.forEach(asset => {
      console.log(`   - ${asset.symbol}: ${asset.name} (${asset.coingeckoId || 'no CoinGecko ID'})`);
    });
    
    console.log('\n🎉 Asset initialization completed!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error initializing assets:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initAssets();
}

export default initAssets; 