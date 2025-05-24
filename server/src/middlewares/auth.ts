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
    logger.debug(`${req.method} ${req.path} - Checking authentication header`, {
      hasAuth: !!req.headers.authorization
    });

    // Get token from request headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      const authHeader = req.headers.authorization;
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      logger.debug('Authentication header found', {
        authHeader: `Bearer ${token.substring(0, 10)}...`,
        length: authHeader.length
      });
    }

    if (!token) {
      logger.warn('Authorization header missing or invalid');
      return res.status(401).json({
        success: false,
        message: 'Access denied. No valid authentication token provided.'
      });
    }

    // Check if token is literally string 'undefined' or 'null'
    if (token === 'undefined' || token === 'null' || token.trim() === '') {
      logger.warn('Token is invalid string value', { token });
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid authentication token.'
      });
    }

    logger.debug('Verifying token...', {
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 10) + '...'
    });

    // Verify JWT token
    const decoded = jwt.verify(token, env.jwtSecret) as any;
    
    if (!decoded || !decoded.id) {
      logger.warn('Token verification failed: no user ID in token');
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token format.'
      });
    }

    // Find user in database
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      logger.warn('User not found for token');
      return res.status(401).json({
        success: false,
        message: 'Access denied. User not found.'
      });
    }

    logger.debug('User authenticated', {
      userId: user.id
    });

    // Add user to request object
    req.user = user;
    req.userId = user.id;
    
    next();
  } catch (error: any) {
    logger.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Token has expired.'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Authentication verification failed.'
    });
  }
};

/**
 * Optional Auth Middleware - Check token but don't require authentication
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // If no token, continue but don't set user
  if (!token || token === 'undefined' || token === 'null') {
    return next();
  }

  try {
    // Verify token
    const secret = env.jwtSecret || 'fallback-secret-key-for-development';
    const decoded = jwt.verify(token, secret) as { id: string };

    // Get user
    const user = await User.findByPk(decoded.id);
    if (user) {
      req.userId = user.id;
    }

    next();
  } catch (error) {
    // Ignore errors, continue processing request
    next();
  }
}; 