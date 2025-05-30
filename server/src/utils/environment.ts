/**
 * Environment Detection Utility
 * Automatically detects if running locally or on Railway
 */

export interface EnvironmentConfig {
  isProduction: boolean;
  isRailway: boolean;
  isLocal: boolean;
  frontendUrl: string;
  backendUrl: string;
  allowedOrigins: (string | RegExp)[];
}

/**
 * Detect current environment and return appropriate configuration
 */
export function detectEnvironment(): EnvironmentConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const port = process.env.PORT || '5001';
  
  // Check if running on Railway
  const isRailway = !!(
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.RAILWAY_PROJECT_ID ||
    process.env.RAILWAY_SERVICE_ID ||
    process.env.RAILWAY_DEPLOYMENT_ID
  );
  
  // 修复：本地开发时，即使NODE_ENV=production也应该被视为本地环境
  const isLocal = !isRailway && (nodeEnv === 'development' || 
    (nodeEnv === 'production' && (process.cwd().includes('source code') || process.cwd().includes('localhost'))));
  const isProduction = nodeEnv === 'production' && !isLocal;
  
  let frontendUrl: string;
  let backendUrl: string;
  let allowedOrigins: (string | RegExp)[];
  
  if (isRailway) {
    // Railway production - use environment variables with fallback to actual deployed URLs
    frontendUrl = process.env.FRONTEND_URL || 'https://crypto-front-demo.up.railway.app';
    backendUrl = process.env.BACKEND_URL || 'https://crypto-demo.up.railway.app';
    allowedOrigins = [
      frontendUrl,
      backendUrl,
      'https://crypto-front-demo.up.railway.app',
      'https://crypto-demo.up.railway.app',
      // Add wildcard for broader Railway compatibility
      /^https:\/\/.*\.up\.railway\.app$/
    ];
    console.log('🚄 Running on Railway');
  } else if (isProduction) {
    // Other production environment
    frontendUrl = process.env.FRONTEND_URL || 'https://localhost:3000';
    backendUrl = process.env.BACKEND_URL || `https://localhost:${port}`;
    allowedOrigins = [
      frontendUrl,
      /^https:\/\/localhost:\d+$/
    ];
    console.log('🏭 Running in production mode');
  } else {
    // Local development - 支持HTTP连接
    frontendUrl = 'http://localhost:3000';
    backendUrl = `http://localhost:${port}`;
    allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://localhost:3004',
      'http://localhost:5001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3002',
      'http://127.0.0.1:3003',
      'http://127.0.0.1:3004',
      'http://127.0.0.1:5001',
      /^http:\/\/localhost:\d+$/,
      /^http:\/\/127\.0\.0\.1:\d+$/
    ];
    console.log('🏠 Running locally');
  }
  
  return {
    isProduction,
    isRailway,
    isLocal,
    frontendUrl,
    backendUrl,
    allowedOrigins
  };
}

/**
 * Get CORS configuration based on environment
 */
export function getCorsConfig() {
  const env = detectEnvironment();
  
  // Check if CORS_ORIGIN is set to wildcard (allows all)
  const corsOrigin = process.env.CORS_ORIGIN;
  
  if (corsOrigin === '*') {
    console.log('🌐 CORS: Allowing all origins (*)');
    return {
      origin: true, // Allow all origins
      credentials: false, // Don't allow credentials with wildcard
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
      optionsSuccessStatus: 200
    };
  }
  
  return {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }
      
      // Check if origin matches any allowed origin
      const isAllowed = env.allowedOrigins.some((allowedOrigin) => {
        if (typeof allowedOrigin === 'string') {
          return allowedOrigin === origin;
        } else if (allowedOrigin instanceof RegExp) {
          return allowedOrigin.test(origin);
        }
        return false;
      });
      
      if (isAllowed) {
        console.log(`🌐 CORS: Allowed origin: ${origin}`);
        callback(null, true);
      } else {
        console.warn(`🚫 CORS: Blocked origin: ${origin}`);
        console.log('   Allowed origins:', env.allowedOrigins);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // 允许credentials以支持WebSocket认证
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    optionsSuccessStatus: 200
  };
}

/**
 * Log environment information for debugging
 */
export function logEnvironmentInfo() {
  const env = detectEnvironment();
  
  console.log('🌍 Environment Configuration:');
  console.log(`   Environment: ${env.isRailway ? 'Railway Production' : env.isProduction ? 'Production' : 'Local Development'}`);
  console.log(`   Frontend URL: ${env.frontendUrl}`);
  console.log(`   Backend URL: ${env.backendUrl}`);
  console.log(`   Allowed Origins:`, env.allowedOrigins);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   PORT: ${process.env.PORT || '5001'}`);
}

export const getEnvironmentConfig = () => {
  const isRailway = process.env.RAILWAY_ENVIRONMENT_NAME !== undefined;
  const nodeEnv = process.env.NODE_ENV || 'development';
  const port = process.env.PORT || '5001';
  
  // 确定运行环境
  const isProduction = nodeEnv === 'production' && isRailway;
  const isDevelopment = nodeEnv === 'development' || !isRailway;
  
  console.log(`🏠 Environment detection: NODE_ENV=${nodeEnv}, RAILWAY=${isRailway}, isDev=${isDevelopment}, isProd=${isProduction}`);

  if (isProduction) {
    console.log('🏭 Running in production mode');
    return {
      environment: 'Production',
      frontendUrl: 'https://crypto-demo.up.railway.app',
      backendUrl: 'https://crypto-demo.up.railway.app',
      allowedOrigins: [
        'https://crypto-demo.up.railway.app',
        /^https:\/\/.*\.up\.railway\.app$/,
        /^https:\/\/.*\.railway\.app$/
      ],
      nodeEnv: 'production',
      port,
      corsCredentials: true,
      socketPath: '/socket.io/'
    };
  } else {
    console.log('🏠 Running locally');
    return {
      environment: 'Local Development',
      frontendUrl: 'http://localhost:3000',
      backendUrl: 'http://localhost:5001',
      allowedOrigins: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3003',
        'http://localhost:3004',
        'http://localhost:5001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:3002',
        'http://127.0.0.1:3003',
        'http://127.0.0.1:3004',
        'http://127.0.0.1:5001',
        /^http:\/\/localhost:\d+$/,
        /^http:\/\/127\.0\.0\.1:\d+$/
      ],
      nodeEnv: 'development',
      port,
      corsCredentials: true,
      socketPath: '/socket.io/'
    };
  }
}; 