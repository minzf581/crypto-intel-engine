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
      return next(new Error('未认证'));
    }

    // 验证JWT令牌
    // @ts-ignore - 忽略类型检查问题
    const decoded = jwt.verify(token, env.jwtSecret) as { id: string };
    
    if (!decoded || !decoded.id) {
      return next(new Error('无效令牌'));
    }

    // 获取用户信息
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return next(new Error('找不到用户'));
    }

    // 将用户信息添加到Socket实例
    (socket as any).user = user;
    
    next();
  } catch (error) {
    logger.error('Socket认证错误:', error);
    next(new Error('认证失败'));
  }
}; 