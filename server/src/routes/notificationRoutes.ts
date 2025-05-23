import express from 'express';
import { notificationController } from '../controllers';
import { protect } from '../middlewares/auth';

const router = express.Router();

// 所有通知路由需要登录
router.use(protect);

// 获取用户通知
router.get('/', notificationController.getUserNotifications);

// 获取未读通知数量
router.get('/unread', notificationController.getUnreadNotificationsCount);

// 标记通知为已读
router.put('/:id/read', notificationController.markNotificationAsRead);

// 标记所有通知为已读
router.put('/read-all', notificationController.markAllNotificationsAsRead);

// 获取警报设置
router.get('/settings', notificationController.getAlertSettings);

// 更新警报设置
router.post('/settings', notificationController.updateAlertSettings);

// 删除警报设置
router.delete('/settings/:id', notificationController.deleteAlertSetting);

export default router; 