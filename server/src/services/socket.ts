import { Server as SocketIOServer } from 'socket.io';
import { authenticateSocketConnection } from '../utils/socketAuth';
import logger from '../utils/logger';
import { User } from '../models';

// Store user's active connections and subscribed assets
interface ActiveSubscription {
  userId: string;
  socketId: string;
  assets: string[];
  socialSentimentCoins: string[];
}

// Active subscription list
const activeSubscriptions: ActiveSubscription[] = [];

/**
 * Set up Socket.IO connection and event handling
 * @param io Socket.IO server instance
 */
export const setupSocketHandlers = (io: SocketIOServer) => {
  // Add authentication middleware
  io.use(authenticateSocketConnection);

  // Handle connection event
  io.on('connection', (socket) => {
    const user = socket.data.user as User;
    
    if (!user) {
      logger.error('Socket connection user data does not exist');
      socket.disconnect();
      return;
    }

    // Add more detailed user information logs with null checks
    logger.info(`Socket connected: ${socket.id}`, {
      userId: user.id || 'unknown',
      userName: user.name || 'Unknown User',
      userEmail: user.email || 'unknown@example.com'
    });

    // Handle user subscribing to assets
    socket.on('subscribe', (data) => {
      if (!data.assets || !Array.isArray(data.assets)) {
        socket.emit('error', { message: 'Invalid subscription data' });
        return;
      }

      const assets = data.assets as string[];
      
      // Add this user to the subscription list
      const existingSubscriptionIndex = activeSubscriptions.findIndex(
        (sub) => sub.userId === user.id.toString()
      );

      if (existingSubscriptionIndex >= 0) {
        // Update existing subscription
        activeSubscriptions[existingSubscriptionIndex].assets = assets;
        activeSubscriptions[existingSubscriptionIndex].socketId = socket.id;
      } else {
        // Add new subscription
        activeSubscriptions.push({
          userId: user.id.toString(),
          socketId: socket.id,
          assets,
          socialSentimentCoins: []
        });
      }

      logger.info(`User ${user.name || user.email || 'Unknown'} subscribed to assets: ${assets.join(', ')}`);
      socket.emit('subscribed', { assets });
    });

    // Handle unsubscribing
    socket.on('unsubscribe', () => {
      const index = activeSubscriptions.findIndex(
        (sub) => sub.socketId === socket.id
      );

      if (index >= 0) {
        activeSubscriptions.splice(index, 1);
        logger.info(`User ${user.name || user.email || 'Unknown'} unsubscribed from all assets`);
      }
    });

    // Handle social sentiment subscription
    socket.on('subscribe_social_sentiment', (data) => {
      if (!data.coinSymbol || typeof data.coinSymbol !== 'string') {
        socket.emit('error', { message: 'Invalid social sentiment subscription data' });
        return;
      }

      const coinSymbol = data.coinSymbol;
      
      // Find or create user subscription
      let userSubscription = activeSubscriptions.find(
        (sub) => sub.userId === user.id.toString()
      );

      if (!userSubscription) {
        userSubscription = {
          userId: user.id.toString(),
          socketId: socket.id,
          assets: [],
          socialSentimentCoins: []
        };
        activeSubscriptions.push(userSubscription);
      }

      // Add coin to social sentiment subscription if not already subscribed
      if (!userSubscription.socialSentimentCoins.includes(coinSymbol)) {
        userSubscription.socialSentimentCoins.push(coinSymbol);
        logger.info(`User ${user.name || user.email || 'Unknown'} subscribed to social sentiment for ${coinSymbol}`);
      }

      socket.emit('social_sentiment_subscribed', { 
        coinSymbol,
        message: `Subscribed to social sentiment updates for ${coinSymbol}`
      });
    });

    // Handle social sentiment unsubscription
    socket.on('unsubscribe_social_sentiment', (data) => {
      if (!data.coinSymbol || typeof data.coinSymbol !== 'string') {
        socket.emit('error', { message: 'Invalid social sentiment unsubscription data' });
        return;
      }

      const coinSymbol = data.coinSymbol;
      
      const userSubscription = activeSubscriptions.find(
        (sub) => sub.userId === user.id.toString()
      );

      if (userSubscription) {
        const coinIndex = userSubscription.socialSentimentCoins.indexOf(coinSymbol);
        if (coinIndex >= 0) {
          userSubscription.socialSentimentCoins.splice(coinIndex, 1);
          logger.info(`User ${user.name || user.email || 'Unknown'} unsubscribed from social sentiment for ${coinSymbol}`);
        }
      }

      socket.emit('social_sentiment_unsubscribed', { 
        coinSymbol,
        message: `Unsubscribed from social sentiment updates for ${coinSymbol}`
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      const index = activeSubscriptions.findIndex(
        (sub) => sub.socketId === socket.id
      );

      if (index >= 0) {
        activeSubscriptions.splice(index, 1);
      }

      logger.info(`Socket disconnected: ${socket.id}`, {
        userId: user.id || 'unknown',
        userName: user.name || user.email || 'Unknown'
      });
    });
  });
};

/**
 * Send signal to subscribers of specific assets
 * @param io Socket.IO server instance
 * @param assetSymbol Asset symbol
 * @param signal Signal data
 */
export const sendSignalToSubscribers = (io: SocketIOServer, assetSymbol: string, signal: any) => {
  const subscribers = activeSubscriptions.filter((sub) =>
    sub.assets.includes(assetSymbol)
  );

  if (subscribers.length === 0) {
    return;
  }

  logger.info(`Sending signal to ${subscribers.length} subscribers of ${assetSymbol}`);
  
  // Send signal to each subscriber
  subscribers.forEach((sub) => {
    io.to(sub.socketId).emit('newSignal', signal);
  });
};

/**
 * Send social sentiment alert to subscribers of specific coin
 * @param io Socket.IO server instance
 * @param coinSymbol Coin symbol
 * @param alert Alert data
 */
export const sendSocialSentimentAlert = (io: SocketIOServer, coinSymbol: string, alert: any) => {
  const subscribers = activeSubscriptions.filter((sub) =>
    sub.socialSentimentCoins.includes(coinSymbol)
  );

  if (subscribers.length === 0) {
    return;
  }

  logger.info(`Sending social sentiment alert to ${subscribers.length} subscribers of ${coinSymbol}`);
  
  // Send alert to each subscriber
  subscribers.forEach((sub) => {
    io.to(sub.socketId).emit('social_sentiment_alert', {
      coinSymbol,
      alert,
      timestamp: new Date().toISOString(),
    });
  });
};

/**
 * Send real-time sentiment update to subscribers
 * @param io Socket.IO server instance
 * @param coinSymbol Coin symbol
 * @param update Sentiment update data
 */
export const sendSentimentUpdate = (io: SocketIOServer, coinSymbol: string, update: any) => {
  const subscribers = activeSubscriptions.filter((sub) =>
    sub.socialSentimentCoins.includes(coinSymbol)
  );

  if (subscribers.length === 0) {
    return;
  }

  logger.info(`Sending sentiment update to ${subscribers.length} subscribers of ${coinSymbol}`);
  
  // Send update to each subscriber
  subscribers.forEach((sub) => {
    io.to(sub.socketId).emit('sentiment_update', {
      coinSymbol,
      update,
      timestamp: new Date().toISOString(),
    });
  });
};

/**
 * Send account monitoring status update
 * @param io Socket.IO server instance
 * @param coinSymbol Coin symbol
 * @param accountUpdate Account update data
 */
export const sendAccountMonitoringUpdate = (io: SocketIOServer, coinSymbol: string, accountUpdate: any) => {
  const subscribers = activeSubscriptions.filter((sub) =>
    sub.socialSentimentCoins.includes(coinSymbol)
  );

  if (subscribers.length === 0) {
    return;
  }

  logger.info(`Sending account monitoring update to ${subscribers.length} subscribers of ${coinSymbol}`);
  
  // Send update to each subscriber
  subscribers.forEach((sub) => {
    io.to(sub.socketId).emit('account_monitoring_update', {
      coinSymbol,
      accountUpdate,
      timestamp: new Date().toISOString(),
    });
  });
};

// Export active subscription list (for internal service)
export const getActiveSubscriptions = () => [...activeSubscriptions]; 