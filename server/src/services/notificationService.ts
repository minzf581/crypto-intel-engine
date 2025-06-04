import { Signal, User, Asset, Notification, AlertSetting } from '../models';
import { Server as SocketIOServer } from 'socket.io';
import { isSignificantStrengthShift, getSignalStrengthLevel } from '../utils/signalUtils';
import logger from '../utils/logger';
import { getMessaging } from '../config/firebase';
import { NotificationHistory } from '../models/NotificationHistory';
import { NotificationSettings } from '../models/NotificationSettings';
import { PushNotificationPayload, NotificationGroup, QuickAction } from '../types/notification';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import EmailService, { EmailNotificationData } from './EmailService';

/**
 * Notification Service
 */
class NotificationService {
  private io: SocketIOServer | null = null;
  private messaging = getMessaging();
  private emailService = EmailService;
  
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
   * Send notification to user's WebSocket connection
   * @param userId User ID
   * @param notification Notification object
   */
  private sendNotificationToUserSocket(userId: string, notification: NotificationHistory) {
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

    // Also try sending to browser notification API
    this.sendBrowserNotification(userId, notification);
  }

  /**
   * Send browser native notification
   * @param userId User ID
   * @param notification Notification object
   */
  private sendBrowserNotification(userId: string, notification: NotificationHistory) {
    try {
      // Send browser notification request via WebSocket
      const sockets = Array.from(this.io?.sockets.sockets.values() || [])
        .filter(socket => socket.data && socket.data.userId === userId);
      
      sockets.forEach(socket => {
        socket.emit('browser_notification', {
          title: notification.title,
          body: notification.message,
          icon: '/favicon.ico',
          tag: `notification-${notification.id}`,
          requireInteraction: notification.priority === 'critical',
          data: {
            notificationId: notification.id,
            type: notification.type,
            priority: notification.priority,
          }
        });
      });
    } catch (error) {
      logger.error('Failed to send browser notification:', error);
    }
  }

  /**
   * Create new notification for user
   * @param userId User ID
   * @param title Notification title
   * @param message Notification message
   * @param type Notification type
   * @param priority Notification priority
   * @param data Additional data
   * @param fcmToken FCM token for push notifications
   * @param quickActions Quick actions for the notification
   * @returns Created notification
   */
  async createNotification(
    userId: string,
    title: string,
    message: string,
    type: 'price_alert' | 'signal' | 'news' | 'system',
    priority: 'low' | 'medium' | 'high' | 'critical',
    data?: any,
    fcmToken?: string,
    quickActions?: QuickAction[]
  ): Promise<NotificationHistory | null> {
    try {
      const settings = await NotificationSettings.findOne({ where: { userId } });
      
      let groupId: string | undefined;
      if (settings?.groupingEnabled) {
        groupId = await this.getOrCreateGroupId(userId, type, title);
      }

      const notification = await NotificationHistory.create({
        id: uuidv4(),
        userId,
        title,
        message,
        type,
        priority,
        data,
        fcmToken,
        sentAt: new Date(),
        groupId,
        quickActions,
        read: false,
        archived: false,
      });

      // Send push notification if FCM token is provided
      if (fcmToken && settings?.pushEnabled) {
        await this.sendPushNotification(userId, fcmToken, {
          title,
          body: message,
          data,
          actions: quickActions?.map(action => ({
            action: action.action,
            title: action.label,
            icon: action.icon,
          })),
        });
      }

      // Send email notification if enabled
      if (settings?.emailEnabled && this.emailService.isReady()) {
        const emailData: EmailNotificationData = {
          userId,
          title,
          message,
          type,
          priority,
          data,
          actionUrl: data?.actionUrl || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/notifications`,
        };
        
        await this.emailService.sendNotificationEmail(emailData);
      }

      // Send real-time notification
      this.sendNotificationToUserSocket(userId, notification);

      return notification;
    } catch (error) {
      logger.error('Failed to create notification:', error);
      return null;
    }
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
            assetSymbol: signal.assetSymbol,
            isGlobal: false,
            enablePriceAlerts: true,
            enableSentimentAlerts: true,
            enableNarrativeAlerts: true,
            priceChangeThreshold: 5,
            sentimentThreshold: 70,
            createdAt: new Date(),
            updatedAt: new Date()
          } as any];
        }
        
        // 2.4. Check each alert setting
        for (const alertSetting of alertSettings) {
          if (this.shouldTriggerAlert(signal, alertSetting)) {
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
            
            // Create notification using the new method
            await this.createNotification(
              user.id,
              title,
              message,
              signal.type === 'price' ? 'price_alert' : 'signal',
              'medium',
              { signal, triggerThreshold: signal.type === 'price' ? alertSetting.priceChangeThreshold : alertSetting.sentimentThreshold }
            );
            
            logger.info(`Notification sent to user ${user.id} for ${signal.assetSymbol} ${signal.type} signal`);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to process new signal for notifications:', error);
    }
  }

  /**
   * Send push notification via Firebase
   */
  async sendPushNotification(
    userId: string,
    fcmToken: string,
    payload: PushNotificationPayload
  ): Promise<boolean> {
    try {
      if (!this.messaging) {
        logger.warn('Firebase messaging not initialized. Skipping push notification.');
        return false;
      }

      const settings = await NotificationSettings.findOne({ where: { userId } });
      if (!settings?.pushEnabled) {
        logger.info(`Push notifications disabled for user ${userId}`);
        return false;
      }

      // Check rate limiting
      const isRateLimited = await this.checkRateLimit(userId, settings.maxPerHour);
      if (isRateLimited) {
        logger.warn(`Rate limit exceeded for user ${userId}`);
        return false;
      }

      const message = {
        token: fcmToken,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.icon,
        },
        data: payload.data ? Object.fromEntries(
          Object.entries(payload.data).map(([key, value]) => [key, String(value)])
        ) : {},
        android: {
          notification: {
            sound: settings.soundEnabled ? (settings.soundType || 'default') : undefined,
            priority: this.mapPriorityToAndroid(settings.priority),
            channelId: 'crypto_signals',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: settings.soundEnabled ? `${settings.soundType}.caf` : undefined,
              badge: 1,
            },
          },
        },
        webpush: {
          notification: {
            icon: payload.icon || '/icon-192x192.png',
            badge: payload.badge || '/badge-72x72.png',
            actions: payload.actions?.map(action => ({
              action: action.action,
              title: action.title,
              icon: action.icon,
            })),
          },
        },
      };

      const response = await this.messaging.send(message);
      logger.info(`Push notification sent successfully: ${response}`);
      return true;
    } catch (error) {
      logger.error('Failed to send push notification:', error);
      return false;
    }
  }

  /**
   * Get notification history with pagination and filtering
   */
  async getNotificationHistory(
    userId: string,
    page: number = 1,
    limit: number = 20,
    type?: string,
    priority?: string
  ): Promise<{ notifications: NotificationHistory[]; total: number; pages: number }> {
    const whereClause: any = { userId };
    
    if (type) whereClause.type = type;
    if (priority) whereClause.priority = priority;

    const { count, rows } = await NotificationHistory.findAndCountAll({
      where: whereClause,
      order: [['sentAt', 'DESC']],
      limit,
      offset: (page - 1) * limit,
    });

    return {
      notifications: rows,
      total: count,
      pages: Math.ceil(count / limit),
    };
  }

  /**
   * Get grouped notifications
   */
  async getGroupedNotifications(userId: string): Promise<NotificationGroup[]> {
    const notifications = await NotificationHistory.findAll({
      where: {
        userId,
        groupId: { [Op.not]: null as any },
        archived: false,
      },
      order: [['sentAt', 'DESC']],
    });

    const groups = new Map<string, NotificationGroup>();
    
    for (const notification of notifications) {
      if (!notification.groupId) continue;
      
      if (!groups.has(notification.groupId)) {
        groups.set(notification.groupId, {
          id: notification.groupId,
          title: this.generateGroupTitle(notification.type, notification.title),
          count: 0,
          latestNotification: notification,
          createdAt: notification.sentAt,
        });
      }
      
      const group = groups.get(notification.groupId)!;
      group.count++;
      
      if (notification.sentAt > group.latestNotification.sentAt) {
        group.latestNotification = notification;
      }
    }

    return Array.from(groups.values()).sort((a, b) => 
      b.latestNotification.sentAt.getTime() - a.latestNotification.sentAt.getTime()
    );
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const [affectedRows] = await NotificationHistory.update(
      { read: true, readAt: new Date() },
      { where: { id: notificationId, userId } }
    );
    
    return affectedRows > 0;
  }

  /**
   * Mark group as read
   */
  async markGroupAsRead(groupId: string, userId: string): Promise<number> {
    const [affectedRows] = await NotificationHistory.update(
      { read: true, readAt: new Date() },
      { where: { groupId, userId, read: false } }
    );
    
    return affectedRows;
  }

  /**
   * Archive notification
   */
  async archiveNotification(notificationId: string, userId: string): Promise<boolean> {
    const [affectedRows] = await NotificationHistory.update(
      { archived: true },
      { where: { id: notificationId, userId } }
    );
    
    return affectedRows > 0;
  }

  /**
   * Get unread notifications count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return await NotificationHistory.count({
      where: {
        userId,
        read: false,
        archived: false,
      },
    });
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(
    userId: string,
    settings: Partial<NotificationSettings>
  ): Promise<NotificationSettings> {
    const [notification, created] = await NotificationSettings.findOrCreate({
      where: { userId },
      defaults: {
        id: uuidv4(),
        userId,
        pushEnabled: true,
        soundEnabled: true,
        emailEnabled: false,
        soundType: 'default',
        priority: 'medium',
        groupingEnabled: true,
        maxPerHour: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    if (!created) {
      await notification.update(settings);
    }

    return notification;
  }

  /**
   * Legacy methods for backward compatibility
   */
  async processSignal(signal: any) {
    return this.processNewSignal(signal);
  }

  async getUserNotifications(userId: string, limit = 20, offset = 0) {
    const { notifications } = await this.getNotificationHistory(userId, Math.floor(offset / limit) + 1, limit);
    return notifications;
  }

  async getUnreadNotificationsCount(userId: string) {
    return this.getUnreadCount(userId);
  }

  async markNotificationAsRead(notificationId: string, userId: string) {
    return this.markAsRead(notificationId, userId);
  }

  async markAllNotificationsAsRead(userId: string) {
    const [affectedRows] = await NotificationHistory.update(
      { read: true, readAt: new Date() },
      { where: { userId, read: false } }
    );
    
    return affectedRows;
  }

  /**
   * Private helper methods
   */
  private async checkRateLimit(userId: string, maxPerHour: number): Promise<boolean> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const count = await NotificationHistory.count({
      where: {
        userId,
        sentAt: {
          [Op.gte]: oneHourAgo,
        },
      },
    });

    return count >= maxPerHour;
  }

  private async getOrCreateGroupId(userId: string, type: string, title: string): Promise<string> {
    // Group notifications by type and similar titles within the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const existingNotification = await NotificationHistory.findOne({
      where: {
        userId,
        type,
        title: {
          [Op.like]: `%${title.split(' ').slice(0, 3).join(' ')}%`,
        },
        sentAt: {
          [Op.gte]: oneHourAgo,
        },
        groupId: {
          [Op.not]: null as any,
        },
      },
      order: [['sentAt', 'DESC']],
    });

    return existingNotification?.groupId || uuidv4();
  }

  private generateGroupTitle(type: string, originalTitle: string): string {
    const typeMap: Record<string, string> = {
      price_alert: 'Price Alerts',
      signal: 'Trading Signals',
      news: 'News Updates',
      system: 'System Notifications',
    };

    return typeMap[type] || 'Notifications';
  }

  private mapPriorityToAndroid(priority: string): 'default' | 'min' | 'low' | 'high' | 'max' {
    const priorityMap: Record<string, 'default' | 'min' | 'low' | 'high' | 'max'> = {
      low: 'low',
      medium: 'default',
      high: 'high',
      critical: 'max',
    };

    return priorityMap[priority] || 'default';
  }
}

export default new NotificationService(); 