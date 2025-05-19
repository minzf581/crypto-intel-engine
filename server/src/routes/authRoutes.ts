import express from 'express';
import { authController } from '../controllers';

const router = express.Router();

// 用户注册
router.post('/register', authController.register);

// 用户登录
router.post('/login', authController.login);

export default router; 