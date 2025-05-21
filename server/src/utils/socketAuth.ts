import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import env from '../config/env';
import logger from './logger';

/**
 * Socket.IO authentication middleware
 * @param socket Socket instance
 * @param next Next middleware function
 */
export const authenticateSocketConnection = async (socket: Socket, next: (err?: Error) => void) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    // Verify JWT token
    const secret = env.jwtSecret || 'fallback-secret-key-for-development';
    const decoded = jwt.verify(token, secret) as { id: string };
    
    if (!decoded || !decoded.id) {
      return next(new Error('Invalid token'));
    }

    // Get user information
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return next(new Error('User not found'));
    }

    // Add user info to Socket instance
    (socket as any).user = user;
    
    next();
  } catch (error) {
    logger.error('Socket authentication error:', error);
    next(new Error('Authentication failed'));
  }
}; 