/**
 * Enhanced Notification Service
 * Supports grouping, prioritization, and push notifications
 */

import logger from '../utils/logger';
import { Notification } from '../models/Notification';
// import { io } from '../index'; // Will be injected via setIO method

export interface NotificationGroup {
  id: string;
  title: string;
  type: 'price_alerts' | 'news_updates' | 'system_alerts' | 'trading_signals';
  notifications: EnhancedNotification[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  summary: string;
  actionRequired: boolean;
}

export interface EnhancedNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'price_alert' | 'news_signal' | 'volume_spike' | 'anomaly_detected' | 'system';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assetSymbol?: string;
  data: any;
  read: boolean;
  dismissed: boolean;
  groupId?: string;
  actionButtons?: NotificationAction[];
  expiresAt?: Date;
  soundEnabled: boolean;
  pushSent: boolean;
  timestamp: Date;
}

export interface NotificationAction {
  id: string;
  label: string;
  action: 'view_asset' | 'trade_now' | 'set_alert' | 'dismiss' | 'snooze';
  data?: any;
}

export interface NotificationSettings {
  userId: string;
  soundEnabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  groupingEnabled: boolean;
  priorityThreshold: 'low' | 'medium' | 'high';
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string;   // HH:mm format
  };
  frequencyLimits: {
    priceAlerts: number; // max per hour
    newsAlerts: number;  // max per hour
    systemAlerts: number; // max per hour
  };
}

class EnhancedNotificationService {
  private notificationGroups: Map<string, NotificationGroup> = new Map();
  private userSettings: Map<string, NotificationSettings> = new Map();
  private rateLimits: Map<string, { count: number; resetTime: number }> = new Map();
  private io: any = null;
  
  setIO(ioInstance: any) {
    this.io = ioInstance;
  }
  
  /**
   * Send an enhanced notification with grouping and prioritization
   */
  async sendEnhancedNotification(notification: Omit<EnhancedNotification, 'id' | 'timestamp' | 'read' | 'dismissed' | 'pushSent'>): Promise<void> {
    try {
      const enhancedNotification: EnhancedNotification = {
        ...notification,
        id: this.generateNotificationId(),
        timestamp: new Date(),
        read: false,
        dismissed: false,
        pushSent: false
      };
      
      // Check rate limits
      if (!this.checkRateLimit(notification.userId, notification.type)) {
        logger.warn(`Rate limit exceeded for user ${notification.userId}, type ${notification.type}`);
        return;
      }
      
      // Check user settings
      const settings = this.getUserSettings(notification.userId);
      if (!this.shouldSendNotification(enhancedNotification, settings)) {
        logger.debug(`Notification filtered by user settings: ${notification.title}`);
        return;
      }
      
      // Group notification if enabled
      if (settings.groupingEnabled) {
        await this.addToGroup(enhancedNotification);
      }
      
      // Save to database
      await this.saveNotification(enhancedNotification);
      
      // Send real-time notification
      await this.sendRealTimeNotification(enhancedNotification);
      
      // Send push notification if enabled
      if (settings.pushEnabled && !this.isQuietHours(settings)) {
        await this.sendPushNotification(enhancedNotification);
      }
      
      logger.info(`Enhanced notification sent to user ${notification.userId}: ${notification.title}`);
    } catch (error) {
      logger.error('Failed to send enhanced notification:', error);
    }
  }
  
  /**
   * Get notification groups for a user
   */
  async getNotificationGroups(userId: string): Promise<NotificationGroup[]> {
    const userGroups = Array.from(this.notificationGroups.values())
      .filter(group => group.notifications.some(n => n.userId === userId))
      .sort((a, b) => this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority));
    
    return userGroups;
  }
  
  /**
   * Get notification history with pagination and filtering
   */
  async getNotificationHistory(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      type?: string;
      priority?: string;
      assetSymbol?: string;
      dateFrom?: Date;
      dateTo?: Date;
    } = {}
  ): Promise<{
    notifications: EnhancedNotification[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        page = 1,
        limit = 50,
        type,
        priority,
        assetSymbol,
        dateFrom,
        dateTo
      } = options;
      
      // This would typically query the database
      // For now, we'll simulate with in-memory data
      let notifications = Array.from(this.notificationGroups.values())
        .flatMap(group => group.notifications)
        .filter(n => n.userId === userId);
      
      // Apply filters
      if (type) notifications = notifications.filter(n => n.type === type);
      if (priority) notifications = notifications.filter(n => n.priority === priority);
      if (assetSymbol) notifications = notifications.filter(n => n.assetSymbol === assetSymbol);
      if (dateFrom) notifications = notifications.filter(n => n.timestamp >= dateFrom);
      if (dateTo) notifications = notifications.filter(n => n.timestamp <= dateTo);
      
      // Sort by timestamp (newest first)
      notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      const total = notifications.length;
      const totalPages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const paginatedNotifications = notifications.slice(startIndex, startIndex + limit);
      
      return {
        notifications: paginatedNotifications,
        total,
        page,
        totalPages
      };
    } catch (error) {
      logger.error('Failed to get notification history:', error);
      return { notifications: [], total: 0, page: 1, totalPages: 0 };
    }
  }
  
  /**
   * Update notification settings for a user
   */
  async updateNotificationSettings(userId: string, settings: Partial<NotificationSettings>): Promise<void> {
    const currentSettings = this.getUserSettings(userId);
    const updatedSettings = { ...currentSettings, ...settings };
    this.userSettings.set(userId, updatedSettings);
    
    logger.info(`Updated notification settings for user ${userId}`);
  }
  
  /**
   * Mark notifications as read
   */
  async markAsRead(userId: string, notificationIds: string[]): Promise<void> {
    try {
      // Update database
      await Notification.update(
        { read: true },
        { where: { userId, id: notificationIds } }
      );
      
      // Update in-memory groups
      for (const group of this.notificationGroups.values()) {
        for (const notification of group.notifications) {
          if (notification.userId === userId && notificationIds.includes(notification.id)) {
            notification.read = true;
          }
        }
      }
      
      logger.info(`Marked ${notificationIds.length} notifications as read for user ${userId}`);
    } catch (error) {
      logger.error('Failed to mark notifications as read:', error);
    }
  }
  
  /**
   * Dismiss notifications
   */
  async dismissNotifications(userId: string, notificationIds: string[]): Promise<void> {
    try {
      // Update in-memory groups
      for (const group of this.notificationGroups.values()) {
        group.notifications = group.notifications.filter(n => 
          !(n.userId === userId && notificationIds.includes(n.id))
        );
      }
      
      // Clean up empty groups
      for (const [groupId, group] of this.notificationGroups.entries()) {
        if (group.notifications.length === 0) {
          this.notificationGroups.delete(groupId);
        }
      }
      
      logger.info(`Dismissed ${notificationIds.length} notifications for user ${userId}`);
    } catch (error) {
      logger.error('Failed to dismiss notifications:', error);
    }
  }
  
  /**
   * Execute notification action
   */
  async executeNotificationAction(
    userId: string,
    notificationId: string,
    actionId: string
  ): Promise<{ success: boolean; data?: any }> {
    try {
      // Find the notification
      let targetNotification: EnhancedNotification | undefined;
      for (const group of this.notificationGroups.values()) {
        targetNotification = group.notifications.find(n => 
          n.id === notificationId && n.userId === userId
        );
        if (targetNotification) break;
      }
      
      if (!targetNotification) {
        return { success: false };
      }
      
      const action = targetNotification.actionButtons?.find(a => a.id === actionId);
      if (!action) {
        return { success: false };
      }
      
      // Execute action based on type
      switch (action.action) {
        case 'dismiss':
          await this.dismissNotifications(userId, [notificationId]);
          break;
        case 'snooze':
          // Implement snooze logic
          targetNotification.expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
          break;
        case 'view_asset':
          // Return data for frontend to handle
          return { success: true, data: { action: 'view_asset', symbol: targetNotification.assetSymbol } };
        case 'trade_now':
          return { success: true, data: { action: 'trade_now', symbol: targetNotification.assetSymbol } };
        case 'set_alert':
          return { success: true, data: { action: 'set_alert', symbol: targetNotification.assetSymbol } };
      }
      
      return { success: true };
    } catch (error) {
      logger.error('Failed to execute notification action:', error);
      return { success: false };
    }
  }
  
  /**
   * Private helper methods
   */
  
  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private getUserSettings(userId: string): NotificationSettings {
    if (!this.userSettings.has(userId)) {
      // Default settings
      this.userSettings.set(userId, {
        userId,
        soundEnabled: true,
        pushEnabled: true,
        emailEnabled: false,
        groupingEnabled: true,
        priorityThreshold: 'medium',
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '08:00'
        },
        frequencyLimits: {
          priceAlerts: 10,
          newsAlerts: 5,
          systemAlerts: 3
        }
      });
    }
    
    return this.userSettings.get(userId)!;
  }
  
  private checkRateLimit(userId: string, type: string): boolean {
    const key = `${userId}_${type}`;
    const now = Date.now();
    const hourInMs = 60 * 60 * 1000;
    
    const limit = this.rateLimits.get(key);
    if (!limit || now > limit.resetTime) {
      this.rateLimits.set(key, { count: 1, resetTime: now + hourInMs });
      return true;
    }
    
    const settings = this.getUserSettings(userId);
    const maxCount = settings.frequencyLimits[type as keyof typeof settings.frequencyLimits] || 10;
    
    if (limit.count >= maxCount) {
      return false;
    }
    
    limit.count++;
    return true;
  }
  
  private shouldSendNotification(notification: EnhancedNotification, settings: NotificationSettings): boolean {
    // Check priority threshold
    const priorityWeight = this.getPriorityWeight(notification.priority);
    const thresholdWeight = this.getPriorityWeight(settings.priorityThreshold);
    
    if (priorityWeight < thresholdWeight) {
      return false;
    }
    
    // Check quiet hours
    if (this.isQuietHours(settings)) {
      return notification.priority === 'urgent';
    }
    
    return true;
  }
  
  private isQuietHours(settings: NotificationSettings): boolean {
    if (!settings.quietHours.enabled) return false;
    
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const { start, end } = settings.quietHours;
    
    if (start < end) {
      return currentTime >= start && currentTime <= end;
    } else {
      // Quiet hours span midnight
      return currentTime >= start || currentTime <= end;
    }
  }
  
  private getPriorityWeight(priority: string): number {
    const weights = { low: 1, medium: 2, high: 3, urgent: 4 };
    return weights[priority as keyof typeof weights] || 1;
  }
  
  private async addToGroup(notification: EnhancedNotification): Promise<void> {
    const groupKey = `${notification.type}_${notification.assetSymbol || 'general'}`;
    
    let group = this.notificationGroups.get(groupKey);
    if (!group) {
      group = {
        id: this.generateNotificationId(),
        title: this.generateGroupTitle(notification),
        type: this.mapNotificationTypeToGroupType(notification.type),
        notifications: [],
        priority: notification.priority,
        createdAt: new Date(),
        summary: '',
        actionRequired: false
      };
      this.notificationGroups.set(groupKey, group);
    }
    
    group.notifications.push(notification);
    notification.groupId = group.id;
    
    // Update group properties
    const priorities = group.notifications.map(n => this.getPriorityWeight(n.priority));
    const maxPriority = Math.max(...priorities);
    group.priority = Object.entries({ low: 1, medium: 2, high: 3, urgent: 4 })
      .find(([, weight]) => weight === maxPriority)?.[0] as any || 'low';
    
    group.summary = this.generateGroupSummary(group);
    group.actionRequired = group.notifications.some(n => n.actionButtons && n.actionButtons.length > 0);
  }
  
  private generateGroupTitle(notification: EnhancedNotification): string {
    if (notification.assetSymbol) {
      return `${notification.assetSymbol} Alerts`;
    }
    
    const typeLabels = {
      price_alert: 'Price Alerts',
      news_signal: 'News Updates',
      volume_spike: 'Volume Alerts',
      anomaly_detected: 'Anomaly Alerts',
      system: 'System Alerts'
    };
    
    return typeLabels[notification.type] || 'General Alerts';
  }
  
  private mapNotificationTypeToGroupType(type: string): NotificationGroup['type'] {
    const mapping = {
      price_alert: 'price_alerts',
      volume_spike: 'price_alerts',
      anomaly_detected: 'trading_signals',
      news_signal: 'news_updates',
      system: 'system_alerts'
    };
    
    return mapping[type as keyof typeof mapping] as NotificationGroup['type'] || 'system_alerts';
  }
  
  private generateGroupSummary(group: NotificationGroup): string {
    const count = group.notifications.length;
    if (count === 1) {
      return group.notifications[0].message;
    }
    
    return `${count} new ${group.type.replace('_', ' ')} notifications`;
  }
  
  private async saveNotification(notification: EnhancedNotification): Promise<void> {
    try {
      await Notification.create({
        userId: notification.userId,
        assetSymbol: notification.assetSymbol,
        type: notification.type as any,
        title: notification.title,
        message: notification.message,
        read: notification.read,
        data: notification.data,
        timestamp: notification.timestamp
      });
    } catch (error) {
      logger.error('Failed to save notification to database:', error);
    }
  }
  
  private async sendRealTimeNotification(notification: EnhancedNotification): Promise<void> {
    try {
      if (this.io) {
        this.io.to(`user_${notification.userId}`).emit('notification', {
          ...notification,
          soundEnabled: this.getUserSettings(notification.userId).soundEnabled
        });
      }
    } catch (error) {
      logger.error('Failed to send real-time notification:', error);
    }
  }
  
  private async sendPushNotification(notification: EnhancedNotification): Promise<void> {
    try {
      // This would integrate with Firebase Cloud Messaging
      // For now, we'll just log the intent
      logger.info(`Would send push notification to user ${notification.userId}: ${notification.title}`);
      
      // TODO: Implement Firebase integration
      // const message = {
      //   notification: {
      //     title: notification.title,
      //     body: notification.message
      //   },
      //   data: {
      //     type: notification.type,
      //     assetSymbol: notification.assetSymbol || '',
      //     notificationId: notification.id
      //   },
      //   token: userFcmToken
      // };
      // 
      // await admin.messaging().send(message);
      
      notification.pushSent = true;
    } catch (error) {
      logger.error('Failed to send push notification:', error);
    }
  }
}

export const enhancedNotificationService = new EnhancedNotificationService(); 