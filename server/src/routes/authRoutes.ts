import { Router } from 'express';
import { register, login } from '../controllers/authController';

const router = Router();

// User registration
router.post('/register', register);

// User login
router.post('/login', login);

export default router; 