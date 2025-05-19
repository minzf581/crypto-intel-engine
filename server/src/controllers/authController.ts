import { Request, Response } from 'express';
import { User } from '../models';
import { generateToken, createUserResponse, successResponse, errorResponse } from '../utils';

// 用户注册
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    // 检查是否已存在相同邮箱
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return errorResponse(res, '此邮箱已被注册', 400);
    }

    // 创建新用户
    const user = await User.create({
      name,
      email,
      password,
      hasCompletedOnboarding: false,
      selectedAssets: []
    });

    // 生成包含用户信息和令牌的响应
    const userResponse = createUserResponse(user);

    return successResponse(res, userResponse, '用户注册成功', 201);
  } catch (error) {
    return errorResponse(res, '注册用户时出错', 500, error);
  }
};

// 用户登录
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // 查找用户
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return errorResponse(res, '邮箱或密码无效', 401);
    }

    // 验证密码
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return errorResponse(res, '邮箱或密码无效', 401);
    }

    // 生成包含用户信息和令牌的响应
    const userResponse = createUserResponse(user);

    return successResponse(res, userResponse, '登录成功');
  } catch (error) {
    return errorResponse(res, '登录时出错', 500, error);
  }
}; 