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

    // 记录令牌信息用于调试
    logger.debug('正在验证Socket连接令牌', {
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 10) + '...'
    });

    // 使用与其他地方相同的密钥和验证方式
    const secretKey = env.jwtSecret || 'fallback-secret-key-for-development';
    const secretBuffer = Buffer.from(secretKey, 'utf8');
    
    // 验证JWT令牌
    const decoded = jwt.verify(token, secretBuffer) as { id: string };
    
    if (!decoded || !decoded.id) {
      logger.warn('Socket连接令牌解码后无效');
      return next(new Error('无效令牌'));
    }

    logger.debug('Socket连接令牌有效，用户ID:', decoded.id);

    // 获取用户信息
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      logger.warn('Socket连接令牌对应的用户不存在', { userId: decoded.id });
      return next(new Error('找不到用户'));
    }

    // 将用户信息添加到Socket实例
    (socket as any).user = user;
    logger.debug('Socket用户认证成功', { userId: user.id, username: user.name });
    
    next();
  } catch (error) {
    // 详细记录错误类型
    if (error instanceof jwt.JsonWebTokenError) {
      logger.error('Socket认证JWT错误:', error.message);
      return next(new Error(`令牌格式错误: ${error.message}`));
    } else if (error instanceof jwt.TokenExpiredError) {
      logger.error('Socket认证令牌过期:', error.message);
      return next(new Error('令牌已过期'));
    }
    
    logger.error('Socket认证错误:', error);
    next(new Error('认证失败'));
  }
}; 