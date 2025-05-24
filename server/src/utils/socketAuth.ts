import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import env from '../config/env';
import logger from './logger';

/**
 * Socket.IO authentication middleware
 * @param socket Socket instance
 * @param next Next middleware
 */
export const authenticateSocketConnection = async (socket: Socket, next: (err?: Error) => void) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      logger.warn('Socket connection did not provide an authentication token');
      return next(new Error('Unauthenticated'));
    }

    // Check if token is string "undefined" or "null"
    if (token === 'undefined' || token === 'null') {
      logger.warn('Socket connection provided an invalid token value:', { token });
      return next(new Error('Invalid token'));
    }

    logger.debug('Verifying Socket connection token', {
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 10) + '...'
    });

    // Verify JWT token
    const decoded = jwt.verify(token, env.jwtSecret) as any;
    
    if (!decoded || !decoded.id) {
      logger.warn('Socket token verification failed: no user ID in token');
      return next(new Error('Invalid token format'));
    }

    // Find user in database
    const user = await User.findByPk(decoded.id);
    if (!user) {
      logger.warn('Socket user not found for token');
      return next(new Error('User not found'));
    }

    logger.debug('Socket connection authenticated:', decoded.id);

    // Add user to socket data
    socket.data.user = user;
    socket.data.userId = user.id;

    next();
  } catch (error: any) {
    logger.error('Socket authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return next(new Error('Invalid token'));
    }
    
    if (error.name === 'TokenExpiredError') {
      return next(new Error('Token expired'));
    }
    
    return next(new Error('Authentication failed'));
  }
}; 