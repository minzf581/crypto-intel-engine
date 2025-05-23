import { Server as SocketIOServer } from 'socket.io';
import { authenticateSocketConnection } from '../utils/socketAuth';
import logger from '../utils/logger';
import { User } from '../models';

// Store user's active connections and subscribed assets
interface ActiveSubscription {
  userId: string;
  socketId: string;
  assets: string[];
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
          assets
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

// Export active subscription list (for internal service)
export const getActiveSubscriptions = () => [...activeSubscriptions]; 