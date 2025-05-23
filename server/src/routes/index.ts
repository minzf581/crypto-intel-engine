import express from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import assetRoutes from './assetRoutes';
import signalRoutes from './signalRoutes';
import notificationRoutes from './notificationRoutes';

const router = express.Router();

// 认证路由
router.use('/auth', authRoutes);

// 用户路由
router.use('/users', userRoutes);

// 资产路由
router.use('/assets', assetRoutes);

// 信号路由
router.use('/signals', signalRoutes);

// 通知路由
router.use('/notifications', notificationRoutes);

export default router; 