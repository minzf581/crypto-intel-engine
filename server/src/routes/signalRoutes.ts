import express from 'express';
import { signalController } from '../controllers';
import { protect } from '../middlewares/auth';

const router = express.Router();

// 获取信号列表 (无需认证)
router.get('/', signalController.getSignals);

// 获取单个信号详情 (无需认证)
router.get('/:id', signalController.getSignalById);

// 以下路由需要认证
router.use(protect);

// 创建新信号 (仅供内部或测试使用)
router.post('/', signalController.createSignal);

export default router; 