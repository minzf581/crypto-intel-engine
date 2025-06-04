import express from 'express';
import { protect } from '../middlewares/auth';
import * as notificationController from '../controllers/notificationController';
import { NotificationEnhancedController } from '../controllers/NotificationEnhancedController';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// Get user notifications
router.get('/', notificationController.getUserNotifications);

// Mark notification as read
router.put('/:id/read', notificationController.markNotificationAsRead);

// Mark all notifications as read
router.put('/read-all', notificationController.markAllNotificationsAsRead);

// Get alert settings
router.get('/settings', notificationController.getAlertSettings);

// Update alert settings
router.put('/settings', notificationController.updateAlertSettings);

// Test notifications
router.post('/test', NotificationEnhancedController.testNotification);

// Email notification routes
router.post('/email/test', NotificationEnhancedController.testNotification);
router.put('/email/settings', NotificationEnhancedController.updateEmailSettings);
router.get('/email/status', NotificationEnhancedController.getEmailServiceStatus);

export default router; 