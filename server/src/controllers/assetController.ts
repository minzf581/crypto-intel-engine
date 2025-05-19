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
      { symbol: 'BTC', name: 'Bitcoin', logo: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png' },
      { symbol: 'ETH', name: 'Ethereum', logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
      { symbol: 'SOL', name: 'Solana', logo: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
      { symbol: 'ADA', name: 'Cardano', logo: 'https://cryptologos.cc/logos/cardano-ada-logo.png' },
      { symbol: 'DOGE', name: 'Dogecoin', logo: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png' },
      { symbol: 'DOT', name: 'Polkadot', logo: 'https://cryptologos.cc/logos/polkadot-new-dot-logo.png' },
      { symbol: 'AVAX', name: 'Avalanche', logo: 'https://cryptologos.cc/logos/avalanche-avax-logo.png' },
      { symbol: 'MATIC', name: 'Polygon', logo: 'https://cryptologos.cc/logos/polygon-matic-logo.png' },
      { symbol: 'LINK', name: 'Chainlink', logo: 'https://cryptologos.cc/logos/chainlink-link-logo.png' },
      { symbol: 'UNI', name: 'Uniswap', logo: 'https://cryptologos.cc/logos/uniswap-uni-logo.png' },
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