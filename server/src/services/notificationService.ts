import { Signal, User, Asset, Notification, AlertSetting } from '../models';
import { Server as SocketIOServer } from 'socket.io';
import { isSignificantStrengthShift, getSignalStrengthLevel } from '../utils/signalUtils';
import logger from '../utils/logger';

/**
 * 通知服务
 */
class NotificationService {
  private io: SocketIOServer | null = null;
  
  /**
   * 设置Socket.IO实例
   * @param socketIo Socket.IO服务器实例
   */
  setSocketIO(socketIo: SocketIOServer) {
    this.io = socketIo;
  }
  
  /**
   * 检查信号是否应该触发警报
   * @param signal 信号
   * @param alertSetting 警报设置
   * @returns 是否应该触发警报
   */
  private shouldTriggerAlert(signal: any, alertSetting: AlertSetting): boolean {
    // 根据信号类型检查是否应该触发警报
    switch (signal.type) {
      case 'sentiment':
        return alertSetting.enableSentimentAlerts && 
               signal.strength >= alertSetting.sentimentThreshold;
      
      case 'narrative':
        return alertSetting.enableNarrativeAlerts && 
               signal.strength >= alertSetting.sentimentThreshold;
      
      case 'price':
        if (!alertSetting.enablePriceAlerts) return false;
        
        // 价格信号需要检查价格变化百分比
        const priceSource = signal.sources.find((s: any) => s.platform === 'price');
        if (!priceSource) return false;
        
        const priceChange = Math.abs(priceSource.priceChange || 0);
        return priceChange >= alertSetting.priceChangeThreshold;
      
      default:
        return false;
    }
  }
  
  /**
   * 为用户创建新的通知
   * @param userId 用户ID
   * @param signal 信号
   * @param alertSetting 触发通知的警报设置
   * @returns 创建的通知
   */
  private async createNotification(userId: string, signal: any, alertSetting: AlertSetting) {
    try {
      // 构建通知标题和消息
      let title = '';
      let message = '';
      
      switch (signal.type) {
        case 'sentiment':
          title = `${signal.assetSymbol}的${getSignalStrengthLevel(signal.strength)}情绪变化`;
          message = `${signal.description}`;
          break;
        
        case 'narrative':
          title = `${signal.assetSymbol}的${getSignalStrengthLevel(signal.strength)}叙事变化`;
          message = `${signal.description}`;
          break;
        
        case 'price':
          const priceSource = signal.sources.find((s: any) => s.platform === 'price');
          const priceChange = priceSource?.priceChange || 0;
          const direction = priceChange >= 0 ? '上涨' : '下跌';
          
          title = `${signal.assetSymbol}价格${direction}警报`;
          message = `${signal.description}`;
          break;
      }
      
      // 创建通知
      const notification = await Notification.create({
        userId,
        assetId: signal.assetId,
        assetSymbol: signal.assetSymbol,
        type: signal.type === 'price' ? 'price' : 'signal',
        title,
        message,
        read: false,
        data: { signal, triggerThreshold: signal.type === 'price' ? alertSetting.priceChangeThreshold : alertSetting.sentimentThreshold },
        timestamp: new Date()
      });
      
      return notification;
    } catch (error) {
      logger.error('创建通知失败:', error);
      return null;
    }
  }
  
  /**
   * 发送通知到用户的WebSocket连接
   * @param userId 用户ID
   * @param notification 通知对象
   */
  private sendNotificationToUserSocket(userId: string, notification: any) {
    // 如果没有初始化Socket.IO，则跳过
    if (!this.io) {
      logger.warn('无法发送实时通知: Socket.IO未初始化');
      return;
    }
    
    // 查找用户的WebSocket连接
    const sockets = Array.from(this.io.sockets.sockets.values())
      .filter(socket => socket.data && socket.data.userId === userId);
    
    if (sockets.length === 0) {
      logger.debug(`用户${userId}没有活动的WebSocket连接，无法发送实时通知`);
      return;
    }
    
    // 向用户的所有连接发送通知
    logger.info(`向用户${userId}发送实时通知`);
    sockets.forEach(socket => {
      socket.emit('notification', notification);
    });
  }
  
  /**
   * 处理新信号，并检查是否需要发送通知
   * @param signal 新的信号
   */
  async processNewSignal(signal: any) {
    try {
      // 1. 查找订阅了该资产的用户
      const users = await User.findAll({
        include: {
          model: Asset,
          as: 'selectedAssets',
          where: { symbol: signal.assetSymbol },
          required: true,
        }
      });
      
      if (users.length === 0) {
        logger.debug(`没有用户订阅${signal.assetSymbol}，跳过通知处理`);
        return;
      }
      
      // 2. 对每个用户处理通知
      for (const user of users) {
        // 2.1. 查找用户对此资产的警报设置
        let alertSettings = await AlertSetting.findAll({
          where: {
            userId: user.id,
            assetSymbol: signal.assetSymbol
          }
        });
        
        // 2.2. 如果没有特定资产的设置，查找全局设置
        if (alertSettings.length === 0) {
          alertSettings = await AlertSetting.findAll({
            where: {
              userId: user.id,
              isGlobal: true
            }
          });
        }
        
        // 2.3. 如果仍然没有设置，使用默认设置
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
        
        // 2.4. 检查每个警报设置
        for (const alertSetting of alertSettings) {
          // 2.4.1. 检查是否应该触发警报
          if (this.shouldTriggerAlert(signal, alertSetting)) {
            // 2.4.2. 创建新的通知
            const notification = await this.createNotification(user.id, signal, alertSetting);
            
            if (notification) {
              // 2.4.3. 发送实时通知
              if (alertSetting.pushNotifications) {
                this.sendNotificationToUserSocket(user.id, notification.toJSON());
              }
              
              // 2.4.4. 发送邮件通知 (如果配置了)
              if (alertSetting.emailNotifications) {
                // 这里将集成邮件服务
                logger.info(`应该向用户${user.id}发送邮件通知，但邮件服务尚未实现`);
              }
            }
          }
        }
      }
    } catch (error) {
      logger.error('处理信号通知时出错:', error);
    }
  }
  
  /**
   * 获取用户的未读通知
   * @param userId 用户ID
   * @param limit 数量限制
   * @param offset 偏移量
   * @returns 通知列表
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
      logger.error(`获取用户${userId}的通知失败:`, error);
      return [];
    }
  }
  
  /**
   * 获取用户的未读通知数量
   * @param userId 用户ID
   * @returns 未读通知数量
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
      logger.error(`获取用户${userId}的未读通知数量失败:`, error);
      return 0;
    }
  }
  
  /**
   * 标记通知为已读
   * @param notificationId 通知ID
   * @param userId 用户ID (用于验证所有权)
   * @returns 是否成功
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
      logger.error(`标记通知${notificationId}为已读失败:`, error);
      return false;
    }
  }
  
  /**
   * 标记用户的所有通知为已读
   * @param userId 用户ID
   * @returns 更新的通知数量
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
      
      return result[0]; // 返回影响的行数
    } catch (error) {
      logger.error(`标记用户${userId}的所有通知为已读失败:`, error);
      return 0;
    }
  }
}

// 导出单例实例
export default new NotificationService(); 