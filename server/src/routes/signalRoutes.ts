import express from 'express';
import { signalController } from '../controllers';
import { protect } from '../middlewares/auth';

const router = express.Router();

// Get signal list (no authentication required)
router.get('/', signalController.getSignals);

// Get single signal details (no authentication required)
router.get('/:id', signalController.getSignalById);

// Routes below require authentication
router.use(protect);

// Create new signal (internal or testing use only)
router.post('/', signalController.createSignal);

export default router; 