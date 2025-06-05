import { Router } from 'express';
import { protect } from '../middlewares/auth';
import { getCurrentUser, updateUserAssets } from '../controllers/userController';

const router = Router();

// All routes require authentication
router.use(protect);

// Get current user info (includes selectedAssets)
router.get('/', getCurrentUser);

// Get user assets (alias for getCurrentUser, returning selectedAssets)
router.get('/assets', getCurrentUser);

// Update user preferences (selected assets)
router.put('/preferences', updateUserAssets);

// Update user assets (alias for preferences)
router.post('/assets', updateUserAssets);

// Test endpoint for debugging asset validation
router.post('/assets/test', async (req, res) => {
  try {
    const { assets } = req.body;
    console.log('TEST ENDPOINT - Request body:', req.body);
    console.log('TEST ENDPOINT - Assets received:', assets);
    console.log('TEST ENDPOINT - Assets type:', typeof assets);
    console.log('TEST ENDPOINT - Is array:', Array.isArray(assets));
    
    if (Array.isArray(assets)) {
      console.log('TEST ENDPOINT - Asset items:');
      assets.forEach((asset, index) => {
        console.log(`  [${index}]: "${asset}" (type: ${typeof asset})`);
      });
    }
    
    res.json({
      success: true,
      message: 'Test endpoint received data successfully',
      received: {
        assets,
        assetsType: typeof assets,
        isArray: Array.isArray(assets),
        length: Array.isArray(assets) ? assets.length : 'N/A'
      }
    });
  } catch (error) {
    console.error('TEST ENDPOINT ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Test endpoint error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 