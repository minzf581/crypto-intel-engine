/**
 * @fileoverview Token生成与用户响应处理工具
 */
import jwt from 'jsonwebtoken';
import env from '../config/env';

/**
 * 生成JWT令牌
 * @param userId 用户ID
 * @returns JWT令牌字符串
 */
export const generateToken = (userId: string): string => {
  try {
    // 创建payload对象
    const payload = {
      id: userId
    };
    
    // 获取密钥
    const secret = env.jwtSecret || 'fallback-secret-key-for-development';
    
    // 签名选项
    const options: jwt.SignOptions = {
      expiresIn: '30d'
    };
    
    // 使用正确的参数顺序和类型生成JWT
    const token = jwt.sign(payload, secret, options);
    
    if (!token) {
      throw new Error('JWT令牌生成失败: 返回空值');
    }
    
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