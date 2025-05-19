import express from 'express';
import { assetController } from '../controllers';
import { protect } from '../middlewares/auth';

const router = express.Router();

// 获取所有资产 (无需认证)
router.get('/', assetController.getAllAssets);

// 获取单个资产 (无需认证)
router.get('/:id', assetController.getAssetById);

// 以下路由需要认证
router.use(protect);

// 初始化默认资产 (仅在开发/测试环境使用)
router.post('/initialize', assetController.initializeDefaultAssets);

export default router; 