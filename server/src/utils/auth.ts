/**
 * @fileoverview Token生成与用户响应处理工具
 */
import jwt from 'jsonwebtoken';
import env from '../config/env';

// 确保为JWT签名定义所需的类型
interface JwtPayload {
  id: string;
}

/**
 * 生成JWT令牌
 * @param userId 用户ID
 * @returns JWT令牌字符串
 */
export const generateToken = (userId: string): string => {
  try {
    // 确保密钥为Buffer类型，提高兼容性
    const secretKey = env.jwtSecret || 'fallback-secret-key-for-development';
    const secretBuffer = Buffer.from(secretKey, 'utf8');
    
    // 简化的payload
    const payload: JwtPayload = { id: userId };
    
    // 使用Buffer密钥签发JWT
    const token = jwt.sign(
      payload,
      secretBuffer,
      { expiresIn: '30d' }
    );
    
    if (!token || typeof token !== 'string' || token.trim() === '') {
      throw new Error(`生成的JWT令牌无效: ${token}`);
    }
    
    // 打印成功日志
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
 * 创建包含令牌的用户响应对象
 * @param user 用户对象
 * @returns 包含用户信息和令牌的对象
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