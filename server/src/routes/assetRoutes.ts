import express from 'express';
import { assetController } from '../controllers';
import { protect } from '../middlewares/auth';

const router = express.Router();

// Get all assets (no authentication required)
router.get('/', assetController.getAllAssets);

// Get single asset (no authentication required)
router.get('/:id', assetController.getAssetById);

// Following routes require authentication
router.use(protect);

// Add new cryptocurrency asset
router.post('/', assetController.addAsset);

// Initialize default assets (only for development/testing environment)
router.post('/initialize', assetController.initializeDefaultAssets);

export default router; 