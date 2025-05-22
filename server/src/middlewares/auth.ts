import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import env from '../config/env';
import logger from '../utils/logger';

// Extend Request interface to add user properties
declare global {
  namespace Express {
    interface Request {
      user?: any;
      userId?: string;
    }
  }
}

/**
 * JWT Authentication Middleware
 */
export const protect = async (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;

  try {
    logger.debug(`${req.method} ${req.path} - 检查认证头`, {
      hasAuth: !!req.headers.authorization
    });

    // 从请求头获取令牌
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      const authHeader = req.headers.authorization;
      logger.debug('认证头', { 
        authHeader: authHeader.substring(0, 20) + '...',
        length: authHeader.length
      });
      
      const parts = authHeader.split(' ');
      if (parts.length === 2) {
        token = parts[1];
      }

      // 验证token值不是字符串"undefined"或"null"
      if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
        logger.warn('请求中的令牌为无效值', { token });
        return res.status(401).json({
          success: false,
          message: '未认证，请登录'
        });
      }

      try {
        // 获取密钥
        const secret = env.jwtSecret || 'fallback-secret-key-for-development';
        
        logger.debug('正在验证令牌...', {
          tokenLength: token.length,
          tokenPrefix: token.substring(0, 10) + '...'
        });
        
        // 解码令牌
        const decoded = jwt.verify(token, secret) as { id: string };
        
        if (!decoded || !decoded.id) {
          logger.warn('令牌解码失败或缺少id字段');
          return res.status(401).json({
            success: false,
            message: '无效令牌'
          });
        }

        // 查找用户
        const user = await User.findByPk(decoded.id);
        if (!user) {
          logger.warn('找不到令牌对应的用户');
          return res.status(401).json({
            success: false,
            message: '无效用户'
          });
        }

        // 在请求对象上设置用户
        req.userId = user.id;
        req.user = user;
        
        logger.debug('用户已认证', { userId: user.id });
        next();
      } catch (error) {
        logger.error('令牌验证失败', { error });
        return res.status(401).json({
          success: false,
          message: '无效令牌'
        });
      }
    } else {
      logger.warn('请求中未找到Bearer令牌');
      return res.status(401).json({
        success: false,
        message: '未认证，请登录'
      });
    }
  } catch (error) {
    logger.error('认证中间件错误', { error });
    return res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

/**
 * Optional Auth Middleware - 检查令牌但不要求认证
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // 如果没有令牌，继续但不设置用户
  if (!token || token === 'undefined' || token === 'null') {
    return next();
  }

  try {
    // 验证令牌
    const secret = env.jwtSecret || 'fallback-secret-key-for-development';
    const decoded = jwt.verify(token, secret) as { id: string };

    // 获取用户
    const user = await User.findByPk(decoded.id);
    if (user) {
      req.userId = user.id;
    }

    next();
  } catch (error) {
    // 忽略错误，继续处理请求
    next();
  }
}; 