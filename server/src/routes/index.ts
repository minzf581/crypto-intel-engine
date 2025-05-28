import { Router } from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import assetRoutes from './assetRoutes';
import signalRoutes from './signalRoutes';
import notificationRoutes from './notificationRoutes';
import notificationEnhancedRoutes from './notificationEnhanced';
import dashboardRoutes from './dashboard';
import analysisRoutes from './analysisRoutes';
import enhancedRoutes from './enhanced';
import socialSentimentRoutes from './socialSentimentRoutes';
import recommendedAccountRoutes from './recommendedAccountRoutes';

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

// Enhanced notification routes
router.use('/notifications-enhanced', notificationEnhancedRoutes);

// Enhanced data features routes
router.use('/enhanced', enhancedRoutes);

// Dashboard routes
router.use('/dashboard', dashboardRoutes);

// Analysis routes
router.use('/analysis', analysisRoutes);

// Social sentiment routes
router.use('/social-sentiment', socialSentimentRoutes);

// Recommended accounts routes
router.use('/recommended-accounts', recommendedAccountRoutes);

export default router; 