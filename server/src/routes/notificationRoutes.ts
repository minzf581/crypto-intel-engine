import { Router } from 'express';
import { protect } from '../middlewares/auth';
import notificationController from '../controllers/notificationController';

const router = Router();

// All notification routes require login
router.use(protect);

// Get user notifications
router.get('/', notificationController.getUserNotifications);

// Get unread notification count
router.get('/unread-count', notificationController.getUnreadNotificationsCount);

// Mark notification as read
router.patch('/:id/read', notificationController.markNotificationAsRead);

// Mark all notifications as read
router.patch('/mark-all-read', notificationController.markAllNotificationsAsRead);

// Get alert settings
router.get('/settings', notificationController.getAlertSettings);

// Update alert settings
router.post('/settings', notificationController.updateAlertSettings);

// Delete alert settings
router.delete('/settings/:id', notificationController.deleteAlertSetting);

export default router; 