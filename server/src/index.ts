import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env, connectDatabase, syncModels } from './config';
import routes from './routes';
import { setupSocketHandlers } from './services/socket';
import { initializeSignalGenerator } from './services/signalGenerator';
import { initializePriceMonitor } from './services/priceService';
import notificationService from './services/notificationService';
import { initializeAssociations } from './models';
import logger from './utils/logger';
import { seedData } from './config/seedData';
import { initializeFirebase } from './config/firebase';
import cron from 'node-cron';
import { VolumeAnalysisService } from './services/VolumeAnalysisService';
import { NewsAnalysisService } from './services/NewsAnalysisService';
import { SocialSentimentService } from './services/socialSentimentService';
import { AddressInfo } from 'net';
import path from 'path';
import fs from 'fs';
import { getCorsConfig, logEnvironmentInfo, detectEnvironment } from './utils/environment';

const app = express();
const server = http.createServer(app);

// Log environment configuration for debugging
logEnvironmentInfo();

// Get environment-aware CORS configuration
const corsOptions = getCorsConfig();

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => {
  const environment = detectEnvironment();
  res.json({ 
    status: 'OK', 
    uptime: process.uptime(),
    env: env.nodeEnv,
    environment: {
      isRailway: environment.isRailway,
      isProduction: environment.isProduction,
      isLocal: environment.isLocal,
      frontendUrl: environment.frontendUrl,
      backendUrl: environment.backendUrl
    },
    timestamp: new Date().toISOString()
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

// Enhanced services initialization
const initializeEnhancedServices = () => {
  logger.info('Starting enhanced services initialization...');
  
  // Schedule volume analysis every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      const volumeService = VolumeAnalysisService.getInstance();
      const symbols = ['BTC', 'ETH', 'ADA', 'SOL', 'DOT', 'LINK', 'MATIC', 'AVAX'];
      
      logger.info('Running scheduled volume analysis...');
      await volumeService.analyzeMultipleSymbols(symbols);
      logger.info('Volume analysis completed');
    } catch (error) {
      logger.error('Scheduled volume analysis failed:', error);
    }
  });

  // Schedule news analysis every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    try {
      const newsService = NewsAnalysisService.getInstance();
      
      logger.info('Running scheduled news analysis...');
      await newsService.fetchAndAnalyzeNews();
      logger.info('News analysis completed');
    } catch (error) {
      logger.error('Scheduled news analysis failed:', error);
    }
  });

  // Schedule anomaly detection every hour
  cron.schedule('0 * * * *', async () => {
    try {
      const volumeService = VolumeAnalysisService.getInstance();
      const symbols = ['BTC', 'ETH', 'ADA', 'SOL'];
      
      logger.info('Running anomaly detection...');
      for (const symbol of symbols) {
        const anomaly = await volumeService.detectVolumeAnomalies(symbol);
        if (anomaly.isAnomaly) {
          logger.warn(`Volume anomaly detected for ${symbol}: ${anomaly.reason}`);
        }
      }
      logger.info('Anomaly detection completed');
    } catch (error) {
      logger.error('Anomaly detection failed:', error);
    }
  });

  // Initialize social sentiment monitoring
  try {
    const socialSentimentService = SocialSentimentService.getInstance();
    socialSentimentService.setSocketIO(io);
    socialSentimentService.startMonitoring();
    logger.info('Social sentiment monitoring started');
  } catch (error) {
    logger.error('Failed to start social sentiment monitoring:', error);
  }

  logger.info('Enhanced services cron jobs scheduled');
};

// Server initialization
const initializeServer = async () => {
  try {
    // Connect to database
    await connectDatabase();
    
    // Initialize model associations
    initializeAssociations();
    
    // Sync models
    await syncModels();
    
    // Initialize data
    await seedData();
    
    // Initialize services
    logger.info('Initializing services...');
    
    // Initialize Firebase for push notifications
    initializeFirebase();
    
    // Initialize signal generation system (real signals only)
    initializeSignalGenerator();
    
    // Initialize price monitoring service (real data)
    initializePriceMonitor();
    
    // Initialize enhanced services
    initializeEnhancedServices();
    
    logger.info('All services initialized');
    
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