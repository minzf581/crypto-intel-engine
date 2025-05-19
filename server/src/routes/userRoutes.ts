import express from 'express';
import { userController } from '../controllers';
import { protect } from '../middlewares/auth';

const router = express.Router();

// 所有路由都需要认证
router.use(protect);

// 获取当前用户信息
router.get('/me', userController.getCurrentUser);

// 获取用户选择的资产
router.get('/assets', userController.getUserAssets);

// 更新用户选择的资产
router.post('/assets', userController.updateUserAssets);

// 更新用户资料
router.put('/profile', userController.updateUserProfile);

export default router; 