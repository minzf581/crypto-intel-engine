import { Request, Response } from 'express';
import { Asset } from '../models';
import { successResponse, errorResponse } from '../utils';
import env from '../config/env';

// 获取所有可用资产
export const getAllAssets = async (req: Request, res: Response) => {
  try {
    const assets = await Asset.findAll({
      order: [['symbol', 'ASC']]
    });
    return successResponse(res, assets);
  } catch (error) {
    return errorResponse(res, '获取资产列表失败', 500, error);
  }
};

// 获取单个资产详情
export const getAssetById = async (req: Request, res: Response) => {
  try {
    const asset = await Asset.findByPk(req.params.id);
    
    if (!asset) {
      return errorResponse(res, '未找到资产', 404);
    }
    
    return successResponse(res, asset);
  } catch (error) {
    return errorResponse(res, '获取资产详情失败', 500, error);
  }
};

// 初始化默认资产 (仅在开发/测试环境使用)
export const initializeDefaultAssets = async (req: Request, res: Response) => {
  // 仅在开发或测试环境允许此操作
  if (env.nodeEnv === 'production') {
    return errorResponse(res, '此操作在生产环境中不被允许', 403);
  }
  
  try {
    // 默认资产列表
    const defaultAssets = [
      { symbol: 'BTC', name: 'Bitcoin', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1.png' },
      { symbol: 'ETH', name: 'Ethereum', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png' },
      { symbol: 'SOL', name: 'Solana', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png' },
      { symbol: 'ADA', name: 'Cardano', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/2010.png' },
      { symbol: 'DOGE', name: 'Dogecoin', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/74.png' },
      { symbol: 'DOT', name: 'Polkadot', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/6636.png' },
      { symbol: 'AVAX', name: 'Avalanche', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5805.png' },
      { symbol: 'MATIC', name: 'Polygon', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3890.png' },
      { symbol: 'LINK', name: 'Chainlink', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1975.png' },
      { symbol: 'UNI', name: 'Uniswap', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/7083.png' },
    ];
    
    // 清空现有资产
    await Asset.destroy({ where: {}, truncate: true });
    
    // 创建默认资产
    await Asset.bulkCreate(defaultAssets);
    
    const assets = await Asset.findAll({
      order: [['symbol', 'ASC']]
    });
    
    return successResponse(res, assets, '默认资产初始化成功');
  } catch (error) {
    return errorResponse(res, '初始化默认资产失败', 500, error);
  }
}; 