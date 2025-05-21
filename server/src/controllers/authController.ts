import { Request, Response } from 'express';
import { User } from '../models';
import { generateToken, createUserResponse, successResponse, errorResponse } from '../utils';

// User registration
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return errorResponse(res, 'Email already registered', 400);
    }

    // Create new user
    const user = await User.create({
      name,
      email,
      password,
      hasCompletedOnboarding: false,
      selectedAssets: []
    });

    // Generate response with user info and token
    const userResponse = createUserResponse(user);

    return successResponse(res, userResponse, 'User registered successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Error registering user', 500, error);
  }
};

// User login
export const login = async (req: Request, res: Response) => {
  try {
    console.log('登录请求接收：', { email: req.body.email });
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      console.log('登录失败：找不到用户', { email });
      return errorResponse(res, 'Invalid email or password', 401);
    }

    console.log('用户找到，正在验证密码', { userId: user.id });
    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('登录失败：密码不匹配', { userId: user.id });
      return errorResponse(res, 'Invalid email or password', 401);
    }

    console.log('密码验证成功，生成JWT令牌', { userId: user.id });
    // Generate JWT token
    const token = generateToken(user.id);
    console.log('JWT令牌生成成功', { 
      userId: user.id, 
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 10) + '...'
    });

    // Generate response data
    const responseData = {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        hasCompletedOnboarding: user.hasCompletedOnboarding,
        selectedAssets: user.selectedAssets
      }
    };
    
    console.log('登录响应数据准备完成', { userId: user.id });
    return successResponse(res, responseData, 'Login successful');
  } catch (error) {
    console.error('登录过程中发生错误', error);
    return errorResponse(res, 'Error during login', 500, error);
  }
}; 