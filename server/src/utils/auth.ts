/**
 * @fileoverview Token generation and user response handling utilities
 */
import jwt from 'jsonwebtoken';
import env from '../config/env';

/**
 * Generate JWT token
 * @param userId User ID
 * @returns JWT token string
 */
export const generateToken = (userId: string): string => {
  try {
    // Create payload object
    const payload = {
      id: userId
    };
    
    // Signing options
    const options: jwt.SignOptions = {
      expiresIn: '30d'
    };
    
    // Get secret key
    const secret = env.jwtSecret || 'fallback-secret-key-for-development';
    
    // Call jwt.sign with correct parameters
    const token = jwt.sign(payload, secret, options);
    
    if (!token) {
      throw new Error('JWT token generation failed: returned null');
    }
    
    console.log('JWT token generation successful:', {
      userId,
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 10) + '...'
    });
    
    return token;
  } catch (error) {
    console.error('Error generating JWT token:', error);
    throw error;
  }
};

/**
 * Create user response object containing token
 * @param user User object
 * @returns Object containing user information and token
 */
export const createUserResponse = (user: any) => {
  const token = generateToken(user.id);
  
  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
      selectedAssets: user.selectedAssets
    }
  };
};

/**
 * Format user response, excluding sensitive fields
 * @param user User object
 * @returns Formatted user object
 */
export const formatUserResponse = (user: any) => {
  const { password, ...userWithoutPassword } = user.toJSON();
  return userWithoutPassword;
}; 