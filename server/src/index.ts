import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env, connectDB } from './config';
import routes from './routes';
import { setupSocketHandlers } from './services/socket';
import { initializeSignalGenerator } from './services/signalGenerator';
import { initializePriceMonitor } from './services/priceService';
import notificationService from './services/notificationService';
import { initializeAssociations } from './models';
import logger from './utils/logger';
import { seedData } from './config/seedData';
import { AddressInfo } from 'net';
import path from 'path';
import fs from 'fs';

const app = express();
const server = http.createServer(app);

// Configure CORS
const corsOptions = {
  origin: [env.clientUrl, 'http://localhost:3000'],
  credentials: true, // 启用credentials支持WebSocket认证
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    uptime: process.uptime(),
    env: env.nodeEnv
  });
});

// API routes
app.use('/api', routes);

// Serve static files in production
if (env.nodeEnv === 'production') {
  const buildPath = path.join(__dirname, '../../client/dist');
  
  if (fs.existsSync(buildPath)) {
    app.use(express.static(buildPath));
    
    // Handle client-side routing
    app.get('*', (req, res) => {
      res.sendFile(path.join(buildPath, 'index.html'));
    });
  } else {
    logger.warn('Client build directory not found');
  }
}

// Initialize Socket.IO
const io = new SocketIOServer(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling']
});

// Setup socket handlers
setupSocketHandlers(io);

// Set up notification service with Socket.IO
notificationService.setSocketIO(io);

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: env.nodeEnv === 'production' ? 'Internal server error' : err.message,
    ...(env.nodeEnv !== 'production' && { stack: err.stack })
  });
});

// Server initialization
const initializeServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Initialize model associations
    initializeAssociations();
    
    // Initialize data
    await seedData();
    
    // Initialize services
    logger.info('初始化服务...');
    
    // 初始化真实信号生成器（现在只记录状态，不生成模拟信号）
    initializeSignalGenerator();
    
    // 初始化价格监控服务（真实数据）
    initializePriceMonitor();
    
    logger.info('所有服务初始化完成');
    
    // Start server
    const PORT = env.port || 5001;
    server.listen(PORT, () => {
      const address = server.address() as AddressInfo;
      logger.info(`Server running on port ${address.port} (${env.nodeEnv} mode)`);
    });
    
  } catch (error: any) {
    logger.error('Server initialization error:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Start the server
initializeServer(); 