import { Request, Response } from 'express';
import { Signal, Asset } from '../models';
import { Op } from 'sequelize';

// Helper function to check if a string is a UUID
const isUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Helper function to convert asset IDs to symbols
const convertAssetIdsToSymbols = async (assetList: string[]): Promise<string[]> => {
  const uuids = assetList.filter(isUUID);
  const symbols = assetList.filter(asset => !isUUID(asset));
  
  if (uuids.length > 0) {
    console.log(`🔄 Converting ${uuids.length} asset IDs to symbols...`);
    const assets = await Asset.findAll({
      where: { id: { [Op.in]: uuids } },
      attributes: ['id', 'symbol']
    });
    
    const convertedSymbols = assets.map(asset => asset.symbol);
    console.log(`✅ Converted asset IDs to symbols: ${convertedSymbols.join(', ')}`);
    symbols.push(...convertedSymbols);
  }
  
  return symbols;
};

// Error response helper
const errorResponse = (res: Response, message: string, statusCode: number = 400) => {
  return res.status(statusCode).json({
    success: false,
    error: message,
    data: [],
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0
    }
  });
};

// Success response helper
const successResponse = (res: Response, data: any, message: string = 'Success', statusCode: number = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

// Get qualified signals
export const getSignals = async (req: Request, res: Response) => {
  try {
    const { page = 1, assets, limit = 20 } = req.query;
    const pageNumber = parseInt(page as string);
    const limitNumber = parseInt(limit as string);
    
    console.log(`🔍 Signal query - page: ${pageNumber}, limit: ${limitNumber}, assets: ${assets}`);
    
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
      const assetList = (assets as string).split(',').map(asset => asset.trim());
      console.log(`📋 Original asset list: ${assetList.join(', ')}`);
      
      // Convert asset IDs to symbols if needed
      const symbolList = await convertAssetIdsToSymbols(assetList);
      console.log(`🎯 Final symbol list for query: ${symbolList.join(', ')}`);
      
      if (symbolList.length > 0) {
        whereClause.assetSymbol = { [Op.in]: symbolList };
      } else {
        console.log('⚠️ No valid symbols found, returning empty result');
        return res.json({
          success: true,
          message: 'Success',
          data: {
            signals: [],
            page: pageNumber,
            limit: limitNumber,
            total: 0,
            hasMore: false
          }
        });
      }
    }
    
    // Get total count
    const total = await Signal.count({ where: whereClause });
    console.log(`📊 Total signals found: ${total}`);
    
    // Calculate pagination
    const totalPages = Math.ceil(total / limitNumber);
    const offset = (pageNumber - 1) * limitNumber;
    
    // Get signals with pagination
    const signals = await Signal.findAll({
      where: whereClause,
      order: [['timestamp', 'DESC']],
      limit: limitNumber,
      offset: offset
    });
    
    console.log(`✅ Returning ${signals.length} signals for page ${pageNumber}`);
    
    // Calculate if there is more data
    const hasMore = offset + signals.length < total;
    
    res.json({
      success: true,
      message: 'Success',
      data: {
        signals,
        page: pageNumber,
        limit: limitNumber,
        total,
        hasMore
      }
    });
  } catch (error) {
    console.error('❌ Error fetching signals:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
};

// Get single signal details
export const getSignalById = async (req: Request, res: Response) => {
  try {
    const signal = await Signal.findByPk(req.params.id);
    
    if (!signal) {
      return res.status(404).json({
        success: false,
        error: 'Signal not found'
      });
    }
    
    return successResponse(res, signal);
  } catch (error) {
    console.error('❌ Error fetching signal:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get signal details'
    });
  }
};

// Create new signal (for internal or testing use only)
export const createSignal = async (req: Request, res: Response) => {
  try {
    const { assetId, type, strength, description, sources } = req.body;
    
    // Validate if asset exists
    const asset = await Asset.findByPk(assetId);
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found'
      });
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
    console.error('❌ Error creating signal:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create signal'
    });
  }
}; 