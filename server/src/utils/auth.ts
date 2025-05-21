import jwt from 'jsonwebtoken';
import env from '../config/env';

/**
 * Generate JWT token
 * @param userId User ID
 * @returns JWT token
 */
export const generateToken = (userId: string): string => {
  try {
    // 使用简单字符串作为密钥
    const secret = env.jwtSecret || 'fallback-secret-key-for-development';
    
    // 使用只包含id的payload
    const payload = { id: userId };
    
    // 直接使用简单方式签名
    const token = jwt.sign(payload, secret);
    
    console.log('JWT令牌生成成功:', {
      userId,
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 10) + '...'
    });
    
    return token;
  } catch (error) {
    console.error('生成JWT令牌时出错:', error);
    throw new Error('无法生成认证令牌');
  }
};

/**
 * Create user response object with token
 * @param user User object
 * @returns Object containing user info and token
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