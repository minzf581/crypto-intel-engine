import { Router } from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import assetRoutes from './assetRoutes';
import signalRoutes from './signalRoutes';
import notificationRoutes from './notificationRoutes';
import dashboardRoutes from './dashboard';

const router = Router();

// Authentication routes
router.use('/auth', authRoutes);

// User routes
router.use('/users', userRoutes);

// Asset routes
router.use('/assets', assetRoutes);

// Signal routes
router.use('/signals', signalRoutes);

// Notification routes
router.use('/notifications', notificationRoutes);

// Dashboard routes
router.use('/dashboard', dashboardRoutes);

export default router; 