import { setupSocketHandlers, sendSignalToSubscribers, getActiveSubscriptions } from './socket';
import { initializeSignalGenerator } from './signalGenerator';

// Import all services
import SocialSentimentService from './socialSentimentService';
import NewsSentimentService from './newsSentimentService';
import TechnicalIndicatorService from './technicalIndicatorService';

// Create service instances
export const socialSentimentService = new SocialSentimentService();
export const newsSentimentService = new NewsSentimentService();
export const technicalIndicatorService = new TechnicalIndicatorService();

export {
  setupSocketHandlers,
  sendSignalToSubscribers,
  getActiveSubscriptions,
  initializeSignalGenerator
}; 