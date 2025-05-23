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
    
    // Validate provided assets
    if (!Array.isArray(assets)) {
      return errorResponse(res, 'Assets must be an array', 400);
    }
    
    // Check if asset count is within allowed range
    if (assets.length < 3 || assets.length > 5) {
      return errorResponse(res, 'You must select 3 to 5 assets', 400);
    }
    
    // Validate all asset symbols exist
    const assetCount = await Asset.count({
      where: {
        symbol: assets
      }
    });
    
    if (assetCount !== assets.length) {
      return errorResponse(res, 'One or more asset symbols are invalid', 400);
    }
    
    // Find user
    const user = await User.findByPk(userId);
    
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }
    
    // Update user asset selection
    user.selectedAssets = assets;
    
    // If user hasn't completed onboarding, set that flag as well
    if (!user.hasCompletedOnboarding) {
      user.hasCompletedOnboarding = true;
    }
    
    await user.save();
    
    return successResponse(res, assets, 'User assets updated successfully');
  } catch (error) {
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