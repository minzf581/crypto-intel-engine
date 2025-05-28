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
import { initializeRecommendedAccounts } from './scripts/initializeRecommendedAccounts';
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

// Health check endpoint - Available immediately (MUST be before static files)
let serverReady = false;
let servicesReady = false;
let initializationError: string | null = null;

// Simple health check at root path for Railway
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'OK',
    service: 'Crypto Intelligence Engine',
    timestamp: new Date().toISOString()
  });
});

// Detailed health check endpoint - Always return 200 for Railway
app.get('/health', (req, res) => {
  // Always return 200 status for Railway health checks
  res.status(200).json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    env: env.nodeEnv,
    port: process.env.PORT || env.port || 5001
  });
});

// API routes (MUST be before static files)
app.use('/api', routes);

// Serve static files in production (MUST be after API routes and health check)
if (env.nodeEnv === 'production') {
  const buildPath = path.join(__dirname, '../../client/dist');
  
  if (fs.existsSync(buildPath)) {
    // Serve static files with conditional middleware to avoid conflicts
    app.use((req, res, next) => {
      // Skip static file serving for API routes, auth routes, health checks, and root health check
      if (req.path.startsWith('/api') || req.path.startsWith('/auth') || req.path === '/health' || req.path === '/') {
        return next();
      }
      
      // Use express.static for other requests
      express.static(buildPath)(req, res, next);
    });
    
    // Handle client-side routing - catch-all for frontend routes
    // CRITICAL: Explicitly exclude /health, /api, /auth routes, and root path
    app.get('*', (req, res, next) => {
      // Skip if it's an API route, auth route, health check, or root path
      if (req.path.startsWith('/api') || req.path.startsWith('/auth') || req.path === '/health' || req.path === '/') {
        return next();
      }
      
      // Only serve index.html for frontend routes
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
    // Get port from Railway environment or fallback
    const PORT = parseInt(process.env.PORT || env.port?.toString() || '5001', 10);
    const HOST = process.env.HOST || '0.0.0.0'; // Railway requires binding to 0.0.0.0
    
    console.log(`🚀 Starting server on ${HOST}:${PORT}`);
    
    // Start server immediately for Railway health checks
    server.listen(PORT, HOST, () => {
      console.log(`✅ Server listening on ${HOST}:${PORT} (${env.nodeEnv} mode)`);
      console.log('🔗 Health check available at /health');
      
      // Mark server as ready
      serverReady = true;
      
      // Initialize services in background after server is listening
      setImmediate(() => {
        initializeServicesAsync().catch(error => {
          console.error('Background service initialization failed:', error);
        });
      });
    });
    
  } catch (error: any) {
    console.error('Server startup error:', error);
    process.exit(1);
  }
};

// Async service initialization
const initializeServicesAsync = async () => {
  try {
    logger.info('🔄 Starting background service initialization...');
    
    // Connect to database
    logger.info('📊 Connecting to database...');
    await connectDatabase();
    logger.info('✅ Database connected');
    
    // Initialize model associations
    logger.info('🔗 Initializing model associations...');
    initializeAssociations();
    logger.info('✅ Model associations initialized');
    
    // Sync models
    logger.info('🔄 Syncing database models...');
    await syncModels();
    logger.info('✅ Database models synced');
    
    // Initialize data
    logger.info('📝 Initializing seed data...');
    await seedData();
    logger.info('✅ Seed data initialized');
    
    // Initialize recommended accounts
    logger.info('👥 Initializing recommended accounts...');
    await initializeRecommendedAccounts();
    logger.info('✅ Recommended accounts initialized');
    
    // Initialize services
    logger.info('⚙️ Initializing core services...');
    
    // Initialize Firebase for push notifications
    initializeFirebase();
    
    // Initialize signal generation system (real signals only)
    initializeSignalGenerator();
    
    // Initialize price monitoring service (real data)
    initializePriceMonitor();
    
    // Initialize enhanced services
    initializeEnhancedServices();
    
    // Mark services as ready
    servicesReady = true;
    logger.info('🎉 All services initialized - Server fully ready!');
    
  } catch (error: any) {
    logger.error('❌ Service initialization error:', error);
    initializationError = error.message || 'Unknown initialization error';
    
    // Don't exit in production - let health check show error state
    if (env.nodeEnv !== 'production') {
      process.exit(1);
    }
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