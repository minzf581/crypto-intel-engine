import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env, connectDB } from './config';
import routes from './routes';
import { setupSocketHandlers, initializeSignalGenerator } from './services';
import logger from './utils/logger';
import { seedData } from './config/seedData';
import { AddressInfo } from 'net';
import path from 'path';
import fs from 'fs';

// Create Express application
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: env.nodeEnv === 'production' 
      ? env.corsOrigin 
      : 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Add logger to the application for access elsewhere
app.set('logger', logger);

// Middleware
app.use(cors({
  origin: env.nodeEnv === 'production' ? env.corsOrigin : ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Log all requests
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.url}`, {
    headers: {
      authorization: req.headers.authorization ? 
        (req.headers.authorization.startsWith('Bearer') ? 
          'Bearer ' + req.headers.authorization.split(' ')[1].substring(0, 10) + '...' : 
          '[other format]') : 
        'none'
    },
    query: req.query,
    body: req.method !== 'GET' ? req.body : undefined
  });
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// In production environment, add a root path API info response
app.get('/', (req, res) => {
  // Try to load static page
  const staticHtmlPath = path.resolve(__dirname, '../../../static-index.html');
  if (fs.existsSync(staticHtmlPath)) {
    res.sendFile(staticHtmlPath);
  } else {
    res.status(200).json({
      name: 'Cryptocurrency Intelligence Engine API',
      status: 'running',
      version: '1.0.0',
      env: env.nodeEnv,
      uptime: process.uptime()
    });
  }
});

// Static file service - serve frontend build files in production
if (env.nodeEnv === 'production') {
  // Try to load frontend build directory
  const clientBuildPath = path.resolve(__dirname, '../../../client/dist');
  
  // Check if frontend build directory exists
  if (fs.existsSync(clientBuildPath)) {
    logger.info(`Serving frontend static files from: ${clientBuildPath}`);
    
    // Set up static file middleware
    app.use(express.static(clientBuildPath));
    
    // Catch all other frontend routes and return index.html (support SPA routing)
    // Note: This route is placed after API routes to ensure it doesn't override them
    app.get('/app/*', (req, res) => {
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
  } else {
    logger.warn('Frontend build directory does not exist, only providing API service');
  }
}

// Routes
app.use('/api', routes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    uptime: process.uptime(),
    env: env.nodeEnv
  });
});

// Set up Socket.IO
setupSocketHandlers(io);

// Connect to the database and start the server
connectDB()
  .then(async () => {
    // Initialize seed data
    if (env.nodeEnv === 'development') {
      await seedData();
    }
    
    // Start signal generator service
    initializeSignalGenerator(io);
    
    // Start the server
    const PORT = parseInt(env.port as string) || 5001;
    
    // Try to start the server, add error handling
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use, please close the occupying process or use another port`);
        // Try to use another port
        const newPort = PORT + 1;
        logger.info(`Trying alternate port ${newPort}...`);
        server.listen(newPort);
      } else {
        logger.error('Server startup error:', error);
        process.exit(1);
      }
    });
    
    // Ensure listening on all network interfaces, not just localhost
    server.listen(PORT, '0.0.0.0', () => {
      const addr = server.address();
      if (addr && typeof addr !== 'string') {
        logger.info(`Server running on port ${addr.port} (${env.nodeEnv} mode)`);
      } else {
        logger.info(`Server running (${env.nodeEnv} mode)`);
      }
    });
  })
  .catch(error => {
    logger.error('Server initialization error:', error);
    process.exit(1);
  });

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  // Check if it's a port in use error
  const nodeError = error as NodeJS.ErrnoException;
  if (nodeError.code === 'EADDRINUSE') {
    logger.error(`Port is already in use, please ensure the port is not used by another program: ${nodeError.message}`);
    // Don't exit, let nodemon restart
  } else {
    logger.error('Uncaught exception:', error);
    process.exit(1);
  }
});

// Handle unhandled Promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise rejection:', reason);
  // Don't exit immediately, just log the error
}); 