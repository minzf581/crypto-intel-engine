import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import env from '../config/env';
import logger from '../utils/logger';

// 扩展Request接口，添加用户属性
declare global {
  namespace Express {
    interface Request {
      user?: any;
      userId?: string;
    }
  }
}

/**
 * 验证JWT认证中间件
 */
export const protect = async (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;

  // 从头部或Cookie获取令牌
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  // 检查是否存在令牌
  if (!token) {
    return res.status(401).json({
      success: false,
      message: '未授权，请登录后重试',
    });
  }

  try {
    // 验证令牌
    // @ts-ignore - 忽略类型检查问题
    const decoded = jwt.verify(token, env.jwtSecret) as { id: string };

    // 获取用户
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '无效的用户令牌',
      });
    }

    // 将用户ID添加到请求对象
    req.userId = user.id;

    next();
  } catch (error) {
    logger.error('认证中间件错误:', error);
    return res.status(401).json({
      success: false, 
      message: '未授权，令牌无效或已过期',
    });
  }
};

/**
 * 可选认证中间件，不强制要求认证
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;

  // 从头部或Cookie获取令牌
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  // 如果不存在令牌，继续下一步
  if (!token) {
    return next();
  }

  try {
    // 验证令牌
    // @ts-ignore - 忽略类型检查问题
    const decoded = jwt.verify(token, env.jwtSecret) as { id: string };

    // 获取用户
    const user = await User.findByPk(decoded.id);

    if (user) {
      // 将用户ID添加到请求对象
      req.userId = user.id;
    }

    next();
  } catch (error) {
    // 令牌无效，但继续请求
    next();
  }
}; 