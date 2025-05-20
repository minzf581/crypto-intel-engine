import { Server as SocketIOServer } from 'socket.io';
import { Asset, Signal } from '../models';
import { sendSignalToSubscribers } from './socket';
import logger from '../utils/logger';
import env from '../config/env';

// Signal types
const SIGNAL_TYPES = ['sentiment', 'narrative'];

// Social media platforms
const PLATFORMS = ['twitter', 'reddit'];

// Signal description templates
const signalTemplates = [
  'Bullish sentiment significantly increased, potentially indicating market uptrend',
  'Community sentiment turned negative, exercise caution with positions',
  'Market sentiment neutral but trending towards optimistic',
  'Suddenly appeared a large number of negative comments, possibly indicating selling pressure',
  'Bullish discussions on social media reached a new high',
];

const NARRATIVE_DESCRIPTIONS = [
  'New technology upgrade sparked community enthusiastic discussions',
  'Rumors about potential cooperation are widely spreading',
  'Regulatory concerns caused community uneasiness',
  'Well-known investors expressed support for promoting positive narrative',
  'Core development team announced new roadmap, community reaction positive',
];

/**
 * Randomly generate signal data
 * @param asset Asset data
 * @returns Generated signal object
 */
const generateRandomSignal = async (asset: any) => {
  // Randomly select signal type
  const type = SIGNAL_TYPES[Math.floor(Math.random() * SIGNAL_TYPES.length)] as 'sentiment' | 'narrative';
  
  // Randomly generate signal strength (20-95)
  const strength = Math.floor(Math.random() * 76) + 20;
  
  // Select description based on type
  const descriptions = type === 'sentiment' ? signalTemplates : NARRATIVE_DESCRIPTIONS;
  const description = descriptions[Math.floor(Math.random() * descriptions.length)];
  
  // Generate random source data
  const sourcesCount = Math.floor(Math.random() * 2) + 1; // 1-2 sources
  const sources = [];
  
  for (let i = 0; i < sourcesCount; i++) {
    const platform = PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)] as 'twitter' | 'reddit';
    const count = Math.floor(Math.random() * 500) + 50; // 50-549 mentions
    
    sources.push({ platform, count });
  }
  
  // Create new signal
  const signal = await Signal.create({
    assetId: asset.id,
    assetSymbol: asset.symbol,
    assetName: asset.name,
    assetLogo: asset.logo,
    type,
    strength,
    description,
    sources,
    timestamp: new Date()
  });
  
  return signal;
};

/**
 * Initialize signal generator service
 * @param io Socket.IO server instance
 */
export const initializeSignalGenerator = (io: SocketIOServer) => {
  // Only generate mock signals in development environment or when mock signals are enabled
  if (env.nodeEnv === 'production' && !env.enableMockSignals) {
    logger.info('Mock signal generator disabled in production environment');
    return;
  }
  
  logger.info('Initializing mock signal generator');
  
  // Generate random signal every few seconds
  setInterval(async () => {
    try {
      // Get all assets
      const assets = await Asset.findAll();
      
      if (assets.length === 0) {
        return;
      }
      
      // Randomly select an asset
      const asset = assets[Math.floor(Math.random() * assets.length)];
      
      // Generate random signal
      const signal = await generateRandomSignal(asset);
      
      logger.info(`Generated signal for ${asset.symbol}: ${signal.type} (Strength: ${signal.strength})`);
      
      // Send signal to subscribers via WebSocket
      sendSignalToSubscribers(io, asset.symbol, signal.toJSON());
    } catch (error) {
      logger.error('Error generating mock signal:', error);
    }
  }, 30000); // Generate a signal every 30 seconds
}; 