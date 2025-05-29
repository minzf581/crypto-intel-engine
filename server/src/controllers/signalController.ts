import { Request, Response } from 'express';
import { Signal, Asset } from '../models';
import { successResponse, errorResponse } from '../utils';
import { Op } from 'sequelize';

// Get qualified signals
export const getSignals = async (req: Request, res: Response) => {
  try {
    const { page = 1, assets, limit = 20 } = req.query;
    const pageNumber = parseInt(page as string);
    const limitNumber = parseInt(limit as string);
    
    // Validate request parameters
    if (isNaN(pageNumber) || pageNumber < 1) {
      return errorResponse(res, 'Invalid page number', 400);
    }
    
    if (isNaN(limitNumber) || limitNumber < 1 || limitNumber > 50) {
      return errorResponse(res, 'Invalid limit number (must be between 1-50)', 400);
    }
    
    // Build query conditions
    const whereClause: any = {};
    
    // If asset list is specified
    if (assets) {
      const assetList = (assets as string).split(',');
      
      if (assetList.length > 0) {
        // Check if the first item looks like a UUID (asset ID) or symbol
        const firstItem = assetList[0];
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(firstItem);
        
        if (isUUID) {
          // If asset IDs are provided, convert to symbols
          const assetRecords = await Asset.findAll({
            where: { id: { [Op.in]: assetList } },
            attributes: ['symbol']
          });
          
          const assetSymbols = assetRecords.map(asset => asset.symbol);
          
          if (assetSymbols.length > 0) {
            whereClause.assetSymbol = {
              [Op.in]: assetSymbols
            };
          }
        } else {
          // If symbols are provided directly
          whereClause.assetSymbol = {
            [Op.in]: assetList
          };
        }
      }
    }
    
    // Calculate pagination
    const offset = (pageNumber - 1) * limitNumber;
    
    // Get signals
    const { count, rows: signals } = await Signal.findAndCountAll({
      where: whereClause,
      order: [['timestamp', 'DESC']],
      offset,
      limit: limitNumber
    });
    
    // Calculate if there is more data
    const hasMore = offset + signals.length < count;
    
    return successResponse(res, {
      signals,
      page: pageNumber,
      limit: limitNumber,
      total: count,
      hasMore
    });
  } catch (error) {
    return errorResponse(res, 'Failed to get signal list', 500, error);
  }
};

// Get single signal details
export const getSignalById = async (req: Request, res: Response) => {
  try {
    const signal = await Signal.findByPk(req.params.id);
    
    if (!signal) {
      return errorResponse(res, 'Signal not found', 404);
    }
    
    return successResponse(res, signal);
  } catch (error) {
    return errorResponse(res, 'Failed to get signal details', 500, error);
  }
};

// Create new signal (for internal or testing use only)
export const createSignal = async (req: Request, res: Response) => {
  try {
    const { assetId, type, strength, description, sources } = req.body;
    
    // Validate if asset exists
    const asset = await Asset.findByPk(assetId);
    if (!asset) {
      return errorResponse(res, 'Asset not found', 404);
    }
    
    // Create new signal
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
    
    return successResponse(res, signal, 'Signal created successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create signal', 500, error);
  }
}; 