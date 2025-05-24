import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils';
import notificationService from '../services/notificationService';
import { Notification, AlertSetting } from '../models';
// import NotificationService from '../services/NotificationService'; // Using default export instead
import logger from '../utils/logger';

/**
 * Get user's notification list
 */
export const getUserNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { page = 1, limit = 20 } = req.query;
    
    // Validate parameters
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    
    if (isNaN(pageNum) || pageNum < 1) {
      return errorResponse(res, 'Invalid page number', 400);
    }
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return errorResponse(res, 'Invalid limit number (must be between 1-100)', 400);
    }
    
    // Calculate offset
    const offset = (pageNum - 1) * limitNum;
    
    // Get notifications
    const notifications = await notificationService.getUserNotifications(userId, limitNum, offset);
    
    // Get unread notification count
    const unreadCount = await notificationService.getUnreadNotificationsCount(userId);
    
    return successResponse(res, {
      notifications,
      page: pageNum,
      limit: limitNum,
      unreadCount
    });
  } catch (error) {
    return errorResponse(res, 'Failed to get notification list', 500, error);
  }
};

/**
 * Get unread notification count
 */
export const getUnreadNotificationsCount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    // Get unread notification count
    const count = await notificationService.getUnreadNotificationsCount(userId);
    
    return successResponse(res, { count });
  } catch (error) {
    return errorResponse(res, 'Failed to get unread notification count', 500, error);
  }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    
    // Mark notification as read
    const success = await notificationService.markNotificationAsRead(id, userId);
    
    if (!success) {
      return errorResponse(res, 'Notification not found or no permission', 404);
    }
    
    // Get updated unread notification count
    const unreadCount = await notificationService.getUnreadNotificationsCount(userId);
    
    return successResponse(res, { success: true, unreadCount });
  } catch (error) {
    return errorResponse(res, 'Failed to mark notification as read', 500, error);
  }
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    // Mark all notifications as read
    const count = await notificationService.markAllNotificationsAsRead(userId);
    
    return successResponse(res, { count, success: true });
  } catch (error) {
    return errorResponse(res, 'Failed to mark all notifications as read', 500, error);
  }
};

/**
 * Get user alert settings
 */
export const getAlertSettings = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { assetSymbol } = req.query;
    
    // Build query conditions
    const whereClause: any = { userId };
    
    // If asset symbol is specified, only get settings for that asset
    if (assetSymbol) {
      whereClause.assetSymbol = assetSymbol;
    }
    
    // Get user's alert settings
    const settings = await AlertSetting.findAll({
      where: whereClause,
      order: [
        ['isGlobal', 'DESC'], // Global settings first
        ['assetSymbol', 'ASC'] // Then sort by asset symbol
      ]
    });
    
    // If no settings found, return default settings
    if (settings.length === 0 && !assetSymbol) {
      const defaultSetting = {
        isGlobal: true,
        sentimentThreshold: 20,
        priceChangeThreshold: 5.0,
        enableSentimentAlerts: true,
        enablePriceAlerts: true,
        enableNarrativeAlerts: true,
        alertFrequency: 'immediate',
        emailNotifications: false,
        pushNotifications: true
      };
      
      return successResponse(res, { settings: [defaultSetting], isDefault: true });
    }
    
    return successResponse(res, { settings });
  } catch (error) {
    return errorResponse(res, 'Failed to get alert settings', 500, error);
  }
};

/**
 * Update or create alert settings
 */
export const updateAlertSettings = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const {
      assetSymbol,
      isGlobal,
      sentimentThreshold,
      priceChangeThreshold,
      enableSentimentAlerts,
      enablePriceAlerts,
      enableNarrativeAlerts,
      alertFrequency,
      emailNotifications,
      pushNotifications
    } = req.body;
    
    // Validate parameters
    if (isGlobal === false && !assetSymbol) {
      return errorResponse(res, 'Non-global settings require asset symbol', 400);
    }
    
    // Find existing settings
    let setting;
    
    if (isGlobal) {
      // Find or create global settings
      [setting] = await AlertSetting.findOrCreate({
        where: {
          userId,
          isGlobal: true
        },
        defaults: {
          userId,
          isGlobal: true,
          sentimentThreshold: 20,
          priceChangeThreshold: 5.0,
          enableSentimentAlerts: true,
          enablePriceAlerts: true,
          enableNarrativeAlerts: true,
          alertFrequency: 'immediate',
          emailNotifications: false,
          pushNotifications: true
        }
      });
    } else {
      // Find or create specific asset settings
      [setting] = await AlertSetting.findOrCreate({
        where: {
          userId,
          assetSymbol
        },
        defaults: {
          userId,
          assetSymbol,
          isGlobal: false,
          sentimentThreshold: 20,
          priceChangeThreshold: 5.0,
          enableSentimentAlerts: true,
          enablePriceAlerts: true,
          enableNarrativeAlerts: true,
          alertFrequency: 'immediate',
          emailNotifications: false,
          pushNotifications: true
        }
      });
    }
    
    // Update settings
    if (sentimentThreshold !== undefined) {
      setting.sentimentThreshold = Math.max(0, Math.min(100, sentimentThreshold));
    }
    
    if (priceChangeThreshold !== undefined) {
      setting.priceChangeThreshold = Math.max(0.1, Math.min(50, priceChangeThreshold));
    }
    
    if (enableSentimentAlerts !== undefined) {
      setting.enableSentimentAlerts = enableSentimentAlerts;
    }
    
    if (enablePriceAlerts !== undefined) {
      setting.enablePriceAlerts = enablePriceAlerts;
    }
    
    if (enableNarrativeAlerts !== undefined) {
      setting.enableNarrativeAlerts = enableNarrativeAlerts;
    }
    
    if (alertFrequency !== undefined) {
      setting.alertFrequency = alertFrequency;
    }
    
    if (emailNotifications !== undefined) {
      setting.emailNotifications = emailNotifications;
    }
    
    if (pushNotifications !== undefined) {
      setting.pushNotifications = pushNotifications;
    }
    
    // Save changes
    await setting.save();
    
    return successResponse(res, { setting });
  } catch (error) {
    return errorResponse(res, 'Failed to update alert settings', 500, error);
  }
};

/**
 * Delete alert settings
 */
export const deleteAlertSetting = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    
    // Find settings
    const setting = await AlertSetting.findOne({
      where: {
        id,
        userId
      }
    });
    
    if (!setting) {
      return errorResponse(res, 'Settings not found or no permission', 404);
    }
    
    // Global settings cannot be deleted, only updated
    if (setting.isGlobal) {
      return errorResponse(res, 'Global settings cannot be deleted, please use update interface', 400);
    }
    
    // Delete settings
    await setting.destroy();
    
    return successResponse(res, { success: true });
  } catch (error) {
    return errorResponse(res, 'Failed to delete alert setting', 500, error);
  }
};

/**
 * Get notification history
 */
async function getHistory(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const type = req.query.type as string;
    const priority = req.query.priority as string;

    const result = await notificationService.getNotificationHistory(
      userId,
      page,
      limit,
      type,
      priority
    );

    res.json(result);
  } catch (error) {
    logger.error('Failed to get notification history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get grouped notifications
 */
async function getGrouped(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const groups = await notificationService.getGroupedNotifications(userId);
    res.json(groups);
  } catch (error) {
    logger.error('Failed to get grouped notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Mark notification as read
 */
async function markAsRead(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { notificationId } = req.params;
    const success = await notificationService.markAsRead(notificationId, userId);

    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Notification not found' });
    }
  } catch (error) {
    logger.error('Failed to mark notification as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Mark group as read
 */
async function markGroupAsRead(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { groupId } = req.params;
    const count = await notificationService.markGroupAsRead(groupId, userId);

    res.json({ success: true, markedCount: count });
  } catch (error) {
    logger.error('Failed to mark group as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Archive notification
 */
async function archive(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { notificationId } = req.params;
    const success = await notificationService.archiveNotification(notificationId, userId);

    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Notification not found' });
    }
  } catch (error) {
    logger.error('Failed to archive notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get unread count
 */
async function getUnreadCount(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const count = await notificationService.getUnreadCount(userId);
    res.json({ count });
  } catch (error) {
    logger.error('Failed to get unread count:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update notification settings
 */
async function updateSettings(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const settings = await notificationService.updateNotificationSettings(userId, req.body);
    res.json(settings);
  } catch (error) {
    logger.error('Failed to update notification settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Create a test notification
 */
async function createTest(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { title, message, type, priority, fcmToken } = req.body;

    const notification = await notificationService.createNotification(
      userId,
      title || 'Test Notification',
      message || 'This is a test notification',
      type || 'system',
      priority || 'medium',
      { test: true },
      fcmToken
    );

    res.json(notification);
  } catch (error) {
    logger.error('Failed to create test notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Register FCM token
 */
async function registerFCMToken(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { fcmToken } = req.body;
    if (!fcmToken) {
      return res.status(400).json({ error: 'FCM token is required' });
    }

    // Store FCM token in user settings or separate table
    // For now, we'll just acknowledge receipt
    logger.info(`FCM token registered for user ${userId}: ${fcmToken}`);
    
    res.json({ success: true, message: 'FCM token registered successfully' });
  } catch (error) {
    logger.error('Failed to register FCM token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default {
  getUserNotifications,
  getUnreadNotificationsCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getAlertSettings,
  updateAlertSettings,
  deleteAlertSetting,
  getHistory,
  getGrouped,
  markAsRead,
  markGroupAsRead,
  archive,
  getUnreadCount,
  updateSettings,
  createTest,
  registerFCMToken
}; 