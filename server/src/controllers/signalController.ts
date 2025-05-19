import { Request, Response } from 'express';
import { Signal, Asset } from '../models';
import { successResponse, errorResponse } from '../utils';
import { Op } from 'sequelize';

// 获取符合条件的信号
export const getSignals = async (req: Request, res: Response) => {
  try {
    const { page = 1, assets, limit = 20 } = req.query;
    const pageNumber = parseInt(page as string);
    const limitNumber = parseInt(limit as string);
    
    // 验证请求参数
    if (isNaN(pageNumber) || pageNumber < 1) {
      return errorResponse(res, '无效的页码', 400);
    }
    
    if (isNaN(limitNumber) || limitNumber < 1 || limitNumber > 50) {
      return errorResponse(res, '无效的限制数量(必须在1-50之间)', 400);
    }
    
    // 构建查询条件
    const whereClause: any = {};
    
    // 如果指定了资产列表
    if (assets) {
      const assetSymbols = (assets as string).split(',');
      
      if (assetSymbols.length > 0) {
        whereClause.assetSymbol = {
          [Op.in]: assetSymbols
        };
      }
    }
    
    // 计算分页
    const offset = (pageNumber - 1) * limitNumber;
    
    // 获取信号
    const { count, rows: signals } = await Signal.findAndCountAll({
      where: whereClause,
      order: [['timestamp', 'DESC']],
      offset,
      limit: limitNumber
    });
    
    // 计算是否有更多数据
    const hasMore = offset + signals.length < count;
    
    return successResponse(res, {
      signals,
      page: pageNumber,
      limit: limitNumber,
      total: count,
      hasMore
    });
  } catch (error) {
    return errorResponse(res, '获取信号列表失败', 500, error);
  }
};

// 获取单个信号详情
export const getSignalById = async (req: Request, res: Response) => {
  try {
    const signal = await Signal.findByPk(req.params.id);
    
    if (!signal) {
      return errorResponse(res, '未找到信号', 404);
    }
    
    return successResponse(res, signal);
  } catch (error) {
    return errorResponse(res, '获取信号详情失败', 500, error);
  }
};

// 创建新信号 (仅供内部或测试使用)
export const createSignal = async (req: Request, res: Response) => {
  try {
    const { assetId, type, strength, description, sources } = req.body;
    
    // 验证资产是否存在
    const asset = await Asset.findByPk(assetId);
    if (!asset) {
      return errorResponse(res, '未找到资产', 404);
    }
    
    // 创建新信号
    const signal = await Signal.create({
      assetId: asset.id,
      assetSymbol: asset.symbol,
      assetName: asset.name,
      assetLogo: asset.logo,
      type,
      strength,
      description,
      sources: sources || [],
      timestamp: new Date()
    });
    
    return successResponse(res, signal, '信号创建成功', 201);
  } catch (error) {
    return errorResponse(res, '创建信号失败', 500, error);
  }
}; 