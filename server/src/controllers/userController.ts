import { Request, Response } from 'express';
import { User, Asset } from '../models';
import { successResponse, errorResponse } from '../utils';

// 获取当前用户信息
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    // 从身份验证中间件获取用户ID
    const userId = req.userId;
    console.log('获取当前用户信息，用户ID:', userId);
    
    if (!userId) {
      console.error('请求中缺少用户ID');
      return errorResponse(res, '未授权的请求，缺少用户ID', 401);
    }
    
    // 查找用户
    console.log('尝试从数据库查找用户:', userId);
    const user = await User.findByPk(userId);
    
    if (!user) {
      console.error('找不到用户:', userId);
      return errorResponse(res, '找不到用户', 404);
    }
    
    console.log('成功找到用户:', user.id, user.email);
    
    // 构建用户响应对象（不包含密码）
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
      selectedAssets: user.selectedAssets || []
    };
    
    console.log('返回用户数据，用户ID:', user.id);
    return successResponse(res, userResponse);
  } catch (error) {
    console.error('获取用户数据时发生错误:', error);
    return errorResponse(res, '获取用户数据时出错', 500, error);
  }
};

// 获取用户选择的资产
export const getUserAssets = async (req: Request, res: Response) => {
  try {
    // 从身份验证中间件获取用户ID
    const userId = req.userId;
    
    // 查找用户
    const user = await User.findByPk(userId);
    
    if (!user) {
      return errorResponse(res, '找不到用户', 404);
    }
    
    // 查找用户选择的所有资产
    const assets = await Asset.findAll({
      where: {
        symbol: user.selectedAssets
      }
    });
    
    return successResponse(res, assets);
  } catch (error) {
    return errorResponse(res, '获取用户资产时出错', 500, error);
  }
};

// 更新用户选择的资产
export const updateUserAssets = async (req: Request, res: Response) => {
  try {
    const { assets } = req.body;
    const userId = req.userId;
    
    // 验证提供的资产是否有效
    if (!Array.isArray(assets)) {
      return errorResponse(res, '资产必须是一个数组', 400);
    }
    
    // 检查资产数量是否在允许范围内
    if (assets.length < 3 || assets.length > 5) {
      return errorResponse(res, '您必须选择3到5个资产', 400);
    }
    
    // 验证所有资产符号是否存在
    const assetCount = await Asset.count({
      where: {
        symbol: assets
      }
    });
    
    if (assetCount !== assets.length) {
      return errorResponse(res, '一个或多个资产符号无效', 400);
    }
    
    // 查找用户
    const user = await User.findByPk(userId);
    
    if (!user) {
      return errorResponse(res, '找不到用户', 404);
    }
    
    // 更新用户资产选择
    user.selectedAssets = assets;
    
    // 如果用户尚未完成引导流程，同时设置该标志
    if (!user.hasCompletedOnboarding) {
      user.hasCompletedOnboarding = true;
    }
    
    await user.save();
    
    return successResponse(res, assets, '用户资产更新成功');
  } catch (error) {
    return errorResponse(res, '更新用户资产时出错', 500, error);
  }
};

// 更新用户资料
export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const userId = req.userId;
    
    // 查找用户
    const user = await User.findByPk(userId);
    
    if (!user) {
      return errorResponse(res, '找不到用户', 404);
    }
    
    // 更新用户名
    if (name) {
      user.name = name;
    }
    
    await user.save();
    
    // 构建用户响应对象（不包含密码）
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      hasCompletedOnboarding: user.hasCompletedOnboarding
    };
    
    return successResponse(res, userResponse, '资料更新成功');
  } catch (error) {
    return errorResponse(res, '更新资料时出错', 500, error);
  }
}; 