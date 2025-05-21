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
      logger.debug('认证头', { authHeader: authHeader.substring(0, 20) + '...' });
      
      const parts = authHeader.split(' ');
      if (parts.length !== 2) {
        logger.warn('无效的授权头格式，应为 "Bearer token"');
        return res.status(401).json({
          success: false,
          message: '无效的授权头格式'
        });
      }
      
      token = parts[1];
      
      // 明确检查token是否有效（不是undefined或null或空字符串）
      if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
        logger.warn('提供的令牌无效:', { token });
        return res.status(401).json({
          success: false,
          message: '提供的令牌无效'
        });
      }
      
      logger.debug('从授权头提取令牌成功', { tokenLength: token.length });
    } 
    // 从cookies获取令牌（备用方式）
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
      
      // 检查cookie中的token是否有效
      if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
        logger.warn('Cookie中的令牌无效');
        return res.status(401).json({
          success: false,
          message: 'Cookie中的令牌无效'
        });
      }
      
      logger.debug('从cookies获取令牌', { tokenLength: token.length });
    }

    // 验证令牌是否存在
    if (!token) {
      logger.warn('请求中未提供认证令牌');
      return res.status(401).json({
        success: false,
        message: '未授权，请登录'
      });
    }

    try {
      // 验证令牌
      const secretKey = env.jwtSecret || 'fallback-secret-key-for-development';
      const secretBuffer = Buffer.from(secretKey, 'utf8');
      logger.debug('验证令牌', { secretLength: secretKey.length });
      
      // 解码令牌
      const decoded = jwt.verify(token, secretBuffer) as { id: string };
      logger.debug('令牌验证成功', { userId: decoded.id });

      // 获取用户
      const user = await User.findByPk(decoded.id);
      if (!user) {
        logger.warn('找不到令牌对应的用户', { userId: decoded.id });
        return res.status(401).json({
          success: false,
          message: '无效的用户令牌'
        });
      }

      // 将用户ID添加到请求对象
      req.userId = user.id;
      logger.debug('用户认证成功', { userId: user.id });
      next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        logger.error('JWT验证错误:', error.message, { token: token.substring(0, 15) + '...' });
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
        message: '未授权，令牌无效'
      });
    }
  } catch (outerError) {
    logger.error('认证中间件未处理的错误:', outerError);
    return res.status(500).json({
      success: false,
      message: '服务器认证处理错误'
    });
  }
};

/**
 * Optional Authentication Middleware
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;

  // 从请求头或cookie获取令牌
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
    
    // 检查token是否有效
    if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
      return next();
    }
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
    
    // 检查cookie中的token是否有效
    if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
      return next();
    }
  }

  // 如果没有令牌，继续但不设置用户信息
  if (!token) {
    return next();
  }

  try {
    // 验证令牌
    const secretKey = env.jwtSecret || 'fallback-secret-key-for-development';
    const secretBuffer = Buffer.from(secretKey, 'utf8');
    const decoded = jwt.verify(token, secretBuffer) as { id: string };

    // 获取用户
    const user = await User.findByPk(decoded.id);
    if (user) {
      req.userId = user.id;
    }
    
    next();
  } catch (error) {
    // 令牌无效，但继续请求
    next();
  }
}; 