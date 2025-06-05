import { Request, Response } from 'express';
import { User, Asset } from '../models';
import { successResponse, errorResponse } from '../utils';

// Get current user information
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    // Get user ID from authentication middleware
    const userId = req.userId;
    console.log('Getting current user info, user ID:', userId);
    
    if (!userId) {
      console.error('Missing user ID in request');
      return errorResponse(res, 'Unauthorized request, missing user ID', 401);
    }
    
    // Find user
    console.log('Attempting to find user in database:', userId);
    const user = await User.findByPk(userId);
    
    if (!user) {
      console.error('User not found:', userId);
      return errorResponse(res, 'User not found', 404);
    }
    
    console.log('Successfully found user:', user.id, user.email);
    
    // Build user response object (excluding password)
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
      selectedAssets: user.selectedAssets || []
    };
    
    console.log('Returning user data, user ID:', user.id);
    return successResponse(res, userResponse);
  } catch (error) {
    console.error('Error occurred while getting user data:', error);
    return errorResponse(res, 'Error getting user data', 500, error);
  }
};

// Get user selected assets
export const getUserAssets = async (req: Request, res: Response) => {
  try {
    // Get user ID from authentication middleware
    const userId = req.userId;
    
    // Find user
    const user = await User.findByPk(userId);
    
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }
    
    // Find all user selected assets
    const assets = await Asset.findAll({
      where: {
        symbol: user.selectedAssets
      }
    });
    
    return successResponse(res, assets);
  } catch (error) {
    return errorResponse(res, 'Error getting user assets', 500, error);
  }
};

// Update user selected assets
export const updateUserAssets = async (req: Request, res: Response) => {
  try {
    const { assets } = req.body;
    const userId = req.userId;
    
    console.log('Updating user assets - Assets received:', assets);
    console.log('User ID:', userId);
    
    // Validate provided assets
    if (!Array.isArray(assets)) {
      console.error('Assets validation failed: not an array');
      return errorResponse(res, 'Assets must be an array', 400);
    }
    
    // Check if at least one asset is selected
    if (assets.length < 1) {
      console.error('Assets validation failed: empty array');
      return errorResponse(res, 'You must select at least 1 asset', 400);
    }
    
    console.log('Validating asset symbols in database...');
    
    // Get all assets in database for debugging
    const allAssets = await Asset.findAll({ attributes: ['symbol', 'name'] });
    console.log('All assets in database:', allAssets.map(a => a.symbol));
    
    // Find existing assets
    const existingAssets = await Asset.findAll({
      where: { symbol: assets },
      attributes: ['symbol']
    });
    const existingSymbols = existingAssets.map(a => a.symbol);
    const missingSymbols = assets.filter(symbol => !existingSymbols.includes(symbol));
    
    console.log('Existing symbols:', existingSymbols);
    console.log('Missing symbols:', missingSymbols);
    
    // Auto-create missing assets with default data
    if (missingSymbols.length > 0) {
      console.log('Auto-creating missing assets:', missingSymbols);
      
      for (const symbol of missingSymbols) {
        try {
          await Asset.create({
            symbol: symbol,
            name: symbol, // Use symbol as fallback name
            logo: `https://via.placeholder.com/64x64/6366f1/ffffff?text=${symbol}`, // Placeholder logo
            coingeckoId: undefined // Will be resolved later by price service
          });
          console.log(`Created asset: ${symbol}`);
        } catch (createError) {
          console.error(`Failed to create asset ${symbol}:`, createError);
          // Continue with next asset instead of failing completely
        }
      }
    }
    
    // Now validate again after creating missing assets
    const finalAssetCount = await Asset.count({
      where: { symbol: assets }
    });
    
    console.log(`Final asset count check: expected ${assets.length}, found ${finalAssetCount}`);
    
    if (finalAssetCount !== assets.length) {
      const stillMissingAssets = await Asset.findAll({
        where: { symbol: assets },
        attributes: ['symbol']
      });
      const stillMissingSymbols = assets.filter(symbol => 
        !stillMissingAssets.map(a => a.symbol).includes(symbol)
      );
      
      console.error('Still missing assets after creation:', stillMissingSymbols);
      return errorResponse(res, `Could not create or find assets: ${stillMissingSymbols.join(', ')}`, 400);
    }
    
    // Find user
    const user = await User.findByPk(userId);
    
    if (!user) {
      console.error('User not found:', userId);
      return errorResponse(res, 'User not found', 404);
    }
    
    console.log('Current user selected assets:', user.selectedAssets);
    
    // Update user asset selection
    user.selectedAssets = assets;
    
    // If user hasn't completed onboarding, set that flag as well
    if (!user.hasCompletedOnboarding) {
      user.hasCompletedOnboarding = true;
    }
    
    await user.save();
    
    console.log('Successfully updated user assets to:', assets);
    
    return successResponse(res, { selectedAssets: assets }, 'User assets updated successfully');
  } catch (error) {
    console.error('Error updating user assets:', error);
    return errorResponse(res, 'Error updating user assets', 500, error);
  }
};

// Update user profile
export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const userId = req.userId;
    
    // Find user
    const user = await User.findByPk(userId);
    
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }
    
    // Update user name
    if (name) {
      user.name = name;
    }
    
    await user.save();
    
    // Build user response object (excluding password)
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      hasCompletedOnboarding: user.hasCompletedOnboarding
    };
    
    return successResponse(res, userResponse, 'Profile updated successfully');
  } catch (error) {
    return errorResponse(res, 'Error updating profile', 500, error);
  }
}; 