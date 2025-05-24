import { Router } from 'express';
import { protect } from '../middlewares/auth';
import { getCurrentUser, updateUserAssets } from '../controllers/userController';

const router = Router();

// All routes require authentication
router.use(protect);

// Get current user information
router.get('/me', getCurrentUser);

// Get user assets (alias for getCurrentUser, returning selectedAssets)
router.get('/assets', getCurrentUser);

// Update user preferences (selected assets)
router.put('/preferences', updateUserAssets);

// Update user assets (alias for preferences)
router.post('/assets', updateUserAssets);

export default router; 