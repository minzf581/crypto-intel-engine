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
  
  const isProduction = nodeEnv === 'production';
  const isLocal = !isRailway && !isProduction;
  
  let frontendUrl: string;
  let backendUrl: string;
  let allowedOrigins: (string | RegExp)[];
  
  if (isRailway) {
    // Railway production
    frontendUrl = 'https://crypto-intelligence-engine-production.up.railway.app';
    backendUrl = 'https://crypto-intelligence-engine-production.up.railway.app';
    allowedOrigins = [
      'https://crypto-intelligence-engine-production.up.railway.app',
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
    // Local development
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
        callback(null, true);
      } else {
        console.warn(`CORS: Blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: !env.isRailway, // Allow credentials for local development
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