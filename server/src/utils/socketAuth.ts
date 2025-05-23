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

    // Log token information for debugging
    logger.debug('Verifying Socket connection token', {
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 10) + '...'
    });

    // Use the same method to verify token
    const secret = env.jwtSecret || 'fallback-secret-key-for-development';
    const decoded = jwt.verify(token, secret) as { id: string };

    if (!decoded || !decoded.id) {
      logger.warn('Socket connection token decoding failed');
      return next(new Error('Invalid token'));
    }

    // Get user
    const user = await User.findByPk(decoded.id);
    if (!user) {
      logger.warn(`Socket connection could not find user for token: ${decoded.id}`);
      return next(new Error('User not found'));
    }

    logger.debug(`Socket connection authenticated: ${user.id}`);
    
    // Add user information to socket object
    socket.data.user = user;
    socket.data.userId = user.id;
    
    next();
  } catch (error) {
    logger.error('Socket connection authentication failed:', error);
    return next(new Error('Authentication failed'));
  }
}; 