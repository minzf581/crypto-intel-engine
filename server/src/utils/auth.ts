import jwt from 'jsonwebtoken';
import env from '../config/env';

/**
 * 生成JWT令牌
 * @param userId 用户ID
 * @returns JWT令牌
 */
export const generateToken = (userId: string): string => {
  // @ts-ignore - 忽略类型检查问题
  return jwt.sign({ id: userId }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn
  });
};

/**
 * 生成带有用户信息的响应对象
 * @param user 用户对象
 * @returns 包含用户信息和令牌的对象
 */
export const createUserResponse = (user: any) => {
  const token = generateToken(user.id);
  
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    hasCompletedOnboarding: user.hasCompletedOnboarding,
    selectedAssets: user.selectedAssets,
    token
  };
}; 