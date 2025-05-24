import { Signal, User, Asset, Notification, AlertSetting } from '../models';
import { Server as SocketIOServer } from 'socket.io';
import { isSignificantStrengthShift, getSignalStrengthLevel } from '../utils/signalUtils';
import logger from '../utils/logger';

/**
 * Notification Service
 */
class NotificationService {
  private io: SocketIOServer | null = null;
  
  /**
   * Set Socket.IO instance
   * @param socketIo Socket.IO server instance
   */
  setSocketIO(socketIo: SocketIOServer) {
    this.io = socketIo;
    logger.info('Notification service connected to Socket.IO');
  }
  
  /**
   * Check if signal should trigger alert
   * @param signal Signal
   * @param alertSetting Alert setting
   * @returns Whether alert should be triggered
   */
  private shouldTriggerAlert(signal: any, alertSetting: AlertSetting): boolean {
    // Check if alert should be triggered based on signal type
    switch (signal.type) {
      case 'sentiment':
        return alertSetting.enableSentimentAlerts && 
               signal.strength >= alertSetting.sentimentThreshold;
      
      case 'narrative':
        return alertSetting.enableNarrativeAlerts && 
               signal.strength >= alertSetting.sentimentThreshold;
      
      case 'price':
        if (!alertSetting.enablePriceAlerts) return false;
        
        // Price signals need to check price change percentage
        const priceSource = signal.sources.find((s: any) => s.platform === 'price');
        if (!priceSource) return false;
        
        const priceChange = Math.abs(priceSource.priceChange || 0);
        return priceChange >= alertSetting.priceChangeThreshold;
      
      default:
        return false;
    }
  }
  
  /**
   * Create new notification for user
   * @param userId User ID
   * @param signal Signal
   * @param alertSetting Alert setting that triggered notification
   * @returns Created notification
   */
  private async createNotification(userId: string, signal: any, alertSetting: AlertSetting) {
    try {
      // Build notification title and message
      let title = '';
      let message = '';
      
      switch (signal.type) {
        case 'sentiment':
          title = `${signal.assetSymbol} ${getSignalStrengthLevel(signal.strength)} sentiment change`;
          message = `${signal.description}`;
          break;
        
        case 'narrative':
          title = `${signal.assetSymbol} ${getSignalStrengthLevel(signal.strength)} narrative change`;
          message = `${signal.description}`;
          break;
        
        case 'price':
          const priceSource = signal.sources.find((s: any) => s.platform === 'price');
          const priceChange = priceSource?.priceChange || 0;
          const direction = priceChange >= 0 ? 'increase' : 'decrease';
          
          title = `${signal.assetSymbol} price ${direction} alert`;
          message = `${signal.description}`;
          break;
      }
      
      // Create notification
      const notification = await Notification.create({
        userId,
        assetId: signal.assetId,
        assetSymbol: signal.assetSymbol,
        type: signal.type === 'price' ? 'alert' : 'signal',
        title,
        message,
        read: false,
        data: { signal, triggerThreshold: signal.type === 'price' ? alertSetting.priceChangeThreshold : alertSetting.sentimentThreshold },
        timestamp: new Date()
      });
      
      return notification;
    } catch (error) {
      logger.error('Failed to create notification:', error);
      return null;
    }
  }
  
  /**
   * Send notification to user's WebSocket connection
   * @param userId User ID
   * @param notification Notification object
   */
  private sendNotificationToUserSocket(userId: string, notification: any) {
    // Skip if Socket.IO is not initialized
    if (!this.io) {
      logger.warn('Cannot send real-time notification: Socket.IO not initialized');
      return;
    }
    
    // Find user's WebSocket connections
    const sockets = Array.from(this.io.sockets.sockets.values())
      .filter(socket => socket.data && socket.data.userId === userId);
    
    if (sockets.length === 0) {
      logger.debug(`User ${userId} has no active WebSocket connections, cannot send real-time notification`);
      return;
    }
    
    // Send notification to all user connections
    logger.info(`Sending real-time notification to user ${userId}`);
    sockets.forEach(socket => {
      socket.emit('notification', notification);
    });
  }
  
  /**
   * Process new signal and check if notifications need to be sent
   * @param signal New signal
   */
  async processNewSignal(signal: any) {
    try {
      // 1. Find users subscribed to this asset from their selectedAssets field
      const users = await User.findAll();
      
      // Filter users who have this asset in their selectedAssets
      const subscribedUsers = users.filter(user => {
        if (!user.selectedAssets) return false;
        
        try {
          const selectedAssets = typeof user.selectedAssets === 'string' 
            ? JSON.parse(user.selectedAssets) 
            : user.selectedAssets;
          
          // Check if selectedAssets is array and contains the asset symbol
          return Array.isArray(selectedAssets) && selectedAssets.includes(signal.assetSymbol);
        } catch {
          return false;
        }
      });
      
      if (subscribedUsers.length === 0) {
        logger.debug(`No users subscribed to ${signal.assetSymbol}, skipping notification processing`);
        return;
      }
      
      logger.info(`Found ${subscribedUsers.length} users subscribed to ${signal.assetSymbol}`);
      
      // 2. Process notifications for each subscribed user
      for (const user of subscribedUsers) {
        // 2.1. Find user's alert settings for this asset
        let alertSettings = await AlertSetting.findAll({
          where: {
            userId: user.id,
            assetSymbol: signal.assetSymbol
          }
        });
        
        // 2.2. If no asset-specific settings, find global settings
        if (alertSettings.length === 0) {
          alertSettings = await AlertSetting.findAll({
            where: {
              userId: user.id,
              isGlobal: true
            }
          });
        }
        
        // 2.3. If still no settings, use default settings
        if (alertSettings.length === 0) {
          alertSettings = [{
            id: 'default',
            userId: user.id,
            isGlobal: true,
            sentimentThreshold: 20,
            priceChangeThreshold: 5.0,
            enableSentimentAlerts: true,
            enablePriceAlerts: true,
            enableNarrativeAlerts: true,
            alertFrequency: 'immediate',
            emailNotifications: false,
            pushNotifications: true
          } as any];
        }
        
        // 2.4. Check each alert setting
        for (const alertSetting of alertSettings) {
          // 2.4.1. Check if alert should be triggered
          if (this.shouldTriggerAlert(signal, alertSetting)) {
            // 2.4.2. Create new notification
            const notification = await this.createNotification(user.id, signal, alertSetting);
            
            if (notification) {
              // 2.4.3. Send real-time notification
              this.sendNotificationToUserSocket(user.id, notification);
              
              logger.info(`Created new notification for user ${user.id}: ${notification.title}`);
            }
          }
        }
      }
    } catch (error) {
      logger.error('Failed to process signal notification:', error);
    }
  }
  
  /**
   * processSignal method alias, compatible with new price service
   */
  async processSignal(signal: any) {
    return this.processNewSignal(signal);
  }
  
  /**
   * Get user's unread notifications
   * @param userId User ID
   * @param limit Number limit
   * @param offset Offset
   * @returns Notification list
   */
  async getUserNotifications(userId: string, limit = 20, offset = 0) {
    try {
      const notifications = await Notification.findAll({
        where: { userId },
        order: [['timestamp', 'DESC']],
        limit,
        offset
      });
      
      return notifications;
    } catch (error) {
      logger.error(`Failed to get notifications for user ${userId}:`, error);
      return [];
    }
  }
  
  /**
   * Get user's unread notifications count
   * @param userId User ID
   * @returns Unread notifications count
   */
  async getUnreadNotificationsCount(userId: string) {
    try {
      const count = await Notification.count({
        where: {
          userId,
          read: false
        }
      });
      
      return count;
    } catch (error) {
      logger.error(`Failed to get unread notifications count for user ${userId}:`, error);
      return 0;
    }
  }
  
  /**
   * Mark notification as read
   * @param notificationId Notification ID
   * @param userId User ID (for ownership verification)
   * @returns Whether successful
   */
  async markNotificationAsRead(notificationId: string, userId: string) {
    try {
      const notification = await Notification.findOne({
        where: {
          id: notificationId,
          userId
        }
      });
      
      if (!notification) {
        return false;
      }
      
      notification.read = true;
      await notification.save();
      
      return true;
    } catch (error) {
      logger.error(`Failed to mark notification ${notificationId} as read:`, error);
      return false;
    }
  }
  
  /**
   * Mark all user's notifications as read
   * @param userId User ID
   * @returns Updated notification count
   */
  async markAllNotificationsAsRead(userId: string) {
    try {
      const result = await Notification.update(
        { read: true },
        {
          where: {
            userId,
            read: false
          }
        }
      );
      
      return result[0]; // Return affected row count
    } catch (error) {
      logger.error(`Failed to mark all notifications for user ${userId} as read:`, error);
      return 0;
    }
  }
}

// Export singleton instance
export default new NotificationService(); 