import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils';
import notificationService from '../services/notificationService';
import { Notification, AlertSetting } from '../models';

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

export default {
  getUserNotifications,
  getUnreadNotificationsCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getAlertSettings,
  updateAlertSettings,
  deleteAlertSetting
}; 