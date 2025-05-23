import { Request, Response } from 'express';
import { Asset } from '../models';
import { successResponse, errorResponse } from '../utils';
import env from '../config/env';

// Get all available assets
export const getAllAssets = async (req: Request, res: Response) => {
  try {
    const assets = await Asset.findAll({
      order: [['symbol', 'ASC']]
    });
    return successResponse(res, assets);
  } catch (error) {
    return errorResponse(res, 'Failed to get asset list', 500, error);
  }
};

// Get single asset details
export const getAssetById = async (req: Request, res: Response) => {
  try {
    const asset = await Asset.findByPk(req.params.id);
    
    if (!asset) {
      return errorResponse(res, 'Asset not found', 404);
    }
    
    return successResponse(res, asset);
  } catch (error) {
    return errorResponse(res, 'Failed to get asset details', 500, error);
  }
};

// Add new cryptocurrency asset
export const addAsset = async (req: Request, res: Response) => {
  try {
    const { symbol, name, logo } = req.body;

    // Validate required fields
    if (!symbol || !name) {
      return errorResponse(res, 'Symbol and name are required', 400);
    }

    // Check if asset already exists
    const existingAsset = await Asset.findOne({ where: { symbol: symbol.toUpperCase() } });
    if (existingAsset) {
      return errorResponse(res, 'Asset already exists', 409);
    }

    // Create new asset
    const asset = await Asset.create({
      symbol: symbol.toUpperCase(),
      name,
      logo: logo || `https://via.placeholder.com/64x64/6366f1/ffffff?text=${symbol.toUpperCase()}`
    });

    return successResponse(res, asset, 'Asset added successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to add asset', 500, error);
  }
};

// Initialize default assets (only for development/testing environment)
export const initializeDefaultAssets = async (req: Request, res: Response) => {
  // Only allow this operation in development or testing environment
  if (env.nodeEnv === 'production') {
    return errorResponse(res, 'This operation is not allowed in production environment', 403);
  }
  
  try {
    // Default asset list
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
    
    // Clear existing assets
    await Asset.destroy({ where: {}, truncate: true });
    
    // Create default assets
    await Asset.bulkCreate(defaultAssets);
    
    const assets = await Asset.findAll({
      order: [['symbol', 'ASC']]
    });
    
    return successResponse(res, assets, 'Default assets initialized successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to initialize default assets', 500, error);
  }
}; 