import { Server as SocketIOServer } from 'socket.io';
import { authenticateSocketConnection } from '../utils/socketAuth';
import logger from '../utils/logger';
import { User } from '../models';

// 存储用户的活跃连接和订阅的资产
interface ActiveSubscription {
  userId: string;
  socketId: string;
  assets: string[];
}

// 活跃订阅列表
const activeSubscriptions: ActiveSubscription[] = [];

/**
 * 设置Socket.IO连接和事件处理
 * @param io Socket.IO服务器实例
 */
export const setupSocketHandlers = (io: SocketIOServer) => {
  // 添加认证中间件
  io.use(authenticateSocketConnection);

  // 处理连接事件
  io.on('connection', (socket) => {
    const user = (socket as any).user as User;
    logger.info(`Socket已连接: ${socket.id} (用户: ${user.name})`);

    // 处理用户订阅资产
    socket.on('subscribe', (data) => {
      if (!data.assets || !Array.isArray(data.assets)) {
        socket.emit('error', { message: '无效的订阅数据' });
        return;
      }

      const assets = data.assets as string[];
      
      // 将此用户添加到订阅列表
      const existingSubscriptionIndex = activeSubscriptions.findIndex(
        (sub) => sub.userId === user.id.toString()
      );

      if (existingSubscriptionIndex >= 0) {
        // 更新现有订阅
        activeSubscriptions[existingSubscriptionIndex].assets = assets;
        activeSubscriptions[existingSubscriptionIndex].socketId = socket.id;
      } else {
        // 添加新的订阅
        activeSubscriptions.push({
          userId: user.id.toString(),
          socketId: socket.id,
          assets
        });
      }

      logger.info(`用户 ${user.name} 订阅了资产: ${assets.join(', ')}`);
      socket.emit('subscribed', { assets });
    });

    // 处理取消订阅
    socket.on('unsubscribe', () => {
      const index = activeSubscriptions.findIndex(
        (sub) => sub.socketId === socket.id
      );

      if (index >= 0) {
        activeSubscriptions.splice(index, 1);
        logger.info(`用户 ${user.name} 取消订阅了所有资产`);
      }
    });

    // 处理断开连接
    socket.on('disconnect', () => {
      const index = activeSubscriptions.findIndex(
        (sub) => sub.socketId === socket.id
      );

      if (index >= 0) {
        activeSubscriptions.splice(index, 1);
      }

      logger.info(`Socket已断开连接: ${socket.id} (用户: ${user.name})`);
    });
  });
};

/**
 * 向订阅特定资产的用户发送信号
 * @param io Socket.IO服务器实例
 * @param assetSymbol 资产符号
 * @param signal 信号数据
 */
export const sendSignalToSubscribers = (io: SocketIOServer, assetSymbol: string, signal: any) => {
  const subscribers = activeSubscriptions.filter((sub) =>
    sub.assets.includes(assetSymbol)
  );

  if (subscribers.length === 0) {
    return;
  }

  logger.info(`向 ${subscribers.length} 个订阅者发送 ${assetSymbol} 的信号`);
  
  // 向每个订阅者发送信号
  subscribers.forEach((sub) => {
    io.to(sub.socketId).emit('newSignal', signal);
  });
};

// 导出活跃订阅列表（用于内部服务）
export const getActiveSubscriptions = () => [...activeSubscriptions]; 