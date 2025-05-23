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
      logger.debug('Authentication header', {
        authHeader: authHeader.substring(0, 20) + '...',
        length: authHeader.length
      });
      
      const parts = authHeader.split(' ');
      if (parts.length === 2) {
        token = parts[1];
      }

      // Verify token value is not string "undefined" or "null"
      if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
        logger.warn('Received invalid token value:', { token });
        return res.status(401).json({
          success: false,
          message: 'Invalid token value'
        });
      }

      try {
        // Get secret key
        const secret = env.jwtSecret || 'fallback-secret-key-for-development';
        
        logger.debug('Starting token verification...', {
          tokenLength: token.length,
          tokenPrefix: token.substring(0, 10) + '...'
        });
        
        // Decode token
        const decoded = jwt.verify(token, secret) as { id: string };
        
        if (!decoded || !decoded.id) {
          logger.warn('Token decoding failed, no user ID');
          return res.status(401).json({
            success: false,
            message: 'Invalid token format'
          });
        }

        // Find user
        const user = await User.findByPk(decoded.id);
        if (!user) {
          logger.warn('User not found for token');
          return res.status(401).json({
            success: false,
            message: 'User not found'
          });
        }

        // Set user on request object
        req.userId = user.id;
        req.user = user;
        
        logger.debug('User authentication successful:', { userId: user.id });
        next();
      } catch (error) {
        logger.error('Token verification failed', { error });
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      }
    } else {
      logger.warn('Authorization header missing or invalid');
      return res.status(401).json({
        success: false,
        message: 'Authorization header missing or invalid'
      });
    }
  } catch (error) {
    logger.error('Authentication middleware error', { error });
    return res.status(500).json({
      success: false,
      message: 'Server error'
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