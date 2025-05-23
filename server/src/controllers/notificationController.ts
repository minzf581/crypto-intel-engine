import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils';
import notificationService from '../services/notificationService';
import { Notification, AlertSetting } from '../models';

/**
 * 获取用户的通知列表
 */
export const getUserNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { page = 1, limit = 20 } = req.query;
    
    // 验证参数
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    
    if (isNaN(pageNum) || pageNum < 1) {
      return errorResponse(res, '无效的页码', 400);
    }
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return errorResponse(res, '无效的限制数量(必须在1-100之间)', 400);
    }
    
    // 计算偏移量
    const offset = (pageNum - 1) * limitNum;
    
    // 获取通知
    const notifications = await notificationService.getUserNotifications(userId, limitNum, offset);
    
    // 获取未读通知数量
    const unreadCount = await notificationService.getUnreadNotificationsCount(userId);
    
    return successResponse(res, {
      notifications,
      page: pageNum,
      limit: limitNum,
      unreadCount
    });
  } catch (error) {
    return errorResponse(res, '获取通知列表失败', 500, error);
  }
};

/**
 * 获取未读通知数量
 */
export const getUnreadNotificationsCount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    // 获取未读通知数量
    const count = await notificationService.getUnreadNotificationsCount(userId);
    
    return successResponse(res, { count });
  } catch (error) {
    return errorResponse(res, '获取未读通知数量失败', 500, error);
  }
};

/**
 * 标记通知为已读
 */
export const markNotificationAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    
    // 标记通知为已读
    const success = await notificationService.markNotificationAsRead(id, userId);
    
    if (!success) {
      return errorResponse(res, '通知不存在或无权限', 404);
    }
    
    // 获取更新后的未读通知数量
    const unreadCount = await notificationService.getUnreadNotificationsCount(userId);
    
    return successResponse(res, { success: true, unreadCount });
  } catch (error) {
    return errorResponse(res, '标记通知为已读失败', 500, error);
  }
};

/**
 * 标记所有通知为已读
 */
export const markAllNotificationsAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    // 标记所有通知为已读
    const count = await notificationService.markAllNotificationsAsRead(userId);
    
    return successResponse(res, { count, success: true });
  } catch (error) {
    return errorResponse(res, '标记所有通知为已读失败', 500, error);
  }
};

/**
 * 获取用户警报设置
 */
export const getAlertSettings = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { assetSymbol } = req.query;
    
    // 构建查询条件
    const whereClause: any = { userId };
    
    // 如果指定了资产符号，只获取该资产的设置
    if (assetSymbol) {
      whereClause.assetSymbol = assetSymbol;
    }
    
    // 获取用户的警报设置
    const settings = await AlertSetting.findAll({
      where: whereClause,
      order: [
        ['isGlobal', 'DESC'], // 全局设置排在前面
        ['assetSymbol', 'ASC'] // 然后按资产符号排序
      ]
    });
    
    // 如果没有设置，返回默认设置
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
    return errorResponse(res, '获取警报设置失败', 500, error);
  }
};

/**
 * 更新或创建警报设置
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
    
    // 验证参数
    if (isGlobal === false && !assetSymbol) {
      return errorResponse(res, '非全局设置需要指定资产符号', 400);
    }
    
    // 查找现有设置
    let setting;
    
    if (isGlobal) {
      // 查找或创建全局设置
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
      // 查找或创建特定资产的设置
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
    
    // 更新设置
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
    
    // 保存更改
    await setting.save();
    
    return successResponse(res, { setting });
  } catch (error) {
    return errorResponse(res, '更新警报设置失败', 500, error);
  }
};

/**
 * 删除警报设置
 */
export const deleteAlertSetting = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    
    // 查找设置
    const setting = await AlertSetting.findOne({
      where: {
        id,
        userId
      }
    });
    
    if (!setting) {
      return errorResponse(res, '设置不存在或无权限', 404);
    }
    
    // 全局设置不能删除，只能更新
    if (setting.isGlobal) {
      return errorResponse(res, '全局设置不能删除，请使用更新接口', 400);
    }
    
    // 删除设置
    await setting.destroy();
    
    return successResponse(res, { success: true });
  } catch (error) {
    return errorResponse(res, '删除警报设置失败', 500, error);
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