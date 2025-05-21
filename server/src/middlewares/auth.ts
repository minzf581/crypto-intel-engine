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
    logger.debug('Checking authorization header:', {
      hasAuth: !!req.headers.authorization,
      authHeader: req.headers.authorization ? req.headers.authorization.substring(0, 15) + '...' : 'none'
    });

    // 获取令牌从请求头
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      try {
        const authHeader = req.headers.authorization;
        logger.debug('Authorization header:', authHeader);
        
        const parts = authHeader.split(' ');
        if (parts.length !== 2) {
          logger.warn('无效的授权头格式，应为 "Bearer token"');
          return res.status(401).json({
            success: false,
            message: '无效的授权头格式',
          });
        }
        
        token = parts[1];
        if (!token || token.trim() === '') {
          logger.warn('令牌为空');
          return res.status(401).json({
            success: false,
            message: '无效的令牌',
          });
        }
        
        logger.debug('从授权头获取令牌成功', { 
          tokenLength: token.length,
          tokenPrefix: token.substring(0, 10) + '...'
        });
      } catch (error) {
        logger.error('解析授权头出错:', error);
        return res.status(401).json({
          success: false,
          message: '处理授权头时出错',
        });
      }
    } else if (req.cookies && req.cookies.token) {
      // 确保明确检查cookies对象存在
      const cookieToken = req.cookies.token;
      if (typeof cookieToken === 'string' && cookieToken.trim() !== '') {
        token = cookieToken;
        logger.debug('从 cookies 获取令牌:', { 
          tokenLength: token.length,
          tokenPrefix: token.substring(0, 10) + '...'
        });
      }
    }

    // 检查令牌是否存在
    if (!token) {
      logger.warn('请求中未提供令牌');
      return res.status(401).json({
        success: false,
        message: '未授权，请登录',
      });
    }

    try {
      // 验证令牌
      logger.debug('正在验证令牌...');
      // 使用相同的密钥格式
      const secret = env.jwtSecret || 'fallback-secret-key-for-development';
      
      // 直接验证JWT
      const decoded = jwt.verify(token, secret) as { id: string };
      logger.debug('令牌验证成功', { userId: decoded.id });

      // 获取用户
      const user = await User.findByPk(decoded.id);

      if (!user) {
        logger.warn('找不到令牌对应的用户', { userId: decoded.id });
        return res.status(401).json({
          success: false,
          message: '无效的用户令牌',
        });
      }

      // 将用户ID添加到请求对象
      req.userId = user.id;
      logger.debug('用户认证成功', { userId: user.id });

      next();
    } catch (error) {
      // 单独处理 JWT 错误
      if (error instanceof jwt.JsonWebTokenError) {
        logger.error('JWT验证错误:', error.message);
        return res.status(401).json({
          success: false,
          message: '令牌格式错误或无效',
          error: error.message
        });
      } else if (error instanceof jwt.TokenExpiredError) {
        logger.error('令牌已过期:', error.message);
        return res.status(401).json({
          success: false,
          message: '令牌已过期',
          error: error.message
        });
      }
      
      logger.error('认证中间件错误:', error);
      return res.status(401).json({
        success: false, 
        message: '未授权，令牌无效或已过期',
      });
    }
  } catch (outerError) {
    logger.error('认证中间件未处理的错误:', outerError);
    return res.status(500).json({
      success: false,
      message: '服务器认证处理错误',
    });
  }
};

/**
 * Optional Authentication Middleware
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;

  // Get token from header or cookie
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    // 确保明确检查cookies对象存在
    const cookieToken = req.cookies.token;
    if (typeof cookieToken === 'string' && cookieToken.trim() !== '') {
      token = cookieToken;
    }
  }

  // If no token exists, continue
  if (!token) {
    return next();
  }

  try {
    // Verify token
    const secret = env.jwtSecret || 'fallback-secret-key-for-development';
    const decoded = jwt.verify(token, secret) as { id: string };

    // Get user
    const user = await User.findByPk(decoded.id);

    if (user) {
      // Add user ID to request object
      req.userId = user.id;
    }

    next();
  } catch (error) {
    // Token invalid, but continue request
    next();
  }
}; 