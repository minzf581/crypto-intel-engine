import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import env from '../config/env';
import logger from './logger';

/**
 * Socket.IO身份验证中间件
 * @param socket Socket实例
 * @param next 下一个中间件
 */
export const authenticateSocketConnection = async (socket: Socket, next: (err?: Error) => void) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      logger.warn('Socket连接未提供认证令牌');
      return next(new Error('未认证'));
    }

    // 检查token是否为字符串"undefined"或"null"
    if (token === 'undefined' || token === 'null') {
      logger.warn('Socket连接提供了无效令牌值:', { token });
      return next(new Error('无效令牌'));
    }

    // 记录令牌信息用于调试
    logger.debug('正在验证Socket连接令牌', {
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 10) + '...'
    });

    // 使用相同的方式验证令牌
    const secret = env.jwtSecret || 'fallback-secret-key-for-development';
    const decoded = jwt.verify(token, secret) as { id: string };

    // 获取用户信息
    const user = await User.findByPk(decoded.id);
    if (!user) {
      logger.warn(`Socket连接认证失败：未找到用户 ${decoded.id}`);
      return next(new Error('用户不存在'));
    }

    // 在socket实例上存储用户信息
    (socket as any).user = user;
    logger.debug(`Socket连接已认证: ${user.id}`);
    
    next();
  } catch (error) {
    logger.error('Socket连接认证错误', error);
    next(new Error('认证失败'));
  }
}; 