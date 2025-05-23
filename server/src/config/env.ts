import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({
  path: path.resolve(process.cwd(), '.env')
});

// Environment variable configuration
export default {
  // Server configuration
  port: process.env.PORT || 5001,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database configuration
  sqliteDbPath: process.env.SQLITE_DB_PATH || 'data/crypto-intel.sqlite',
  databaseUrl: process.env.DATABASE_URL, // PostgreSQL connection URL

  // JWT configuration
  jwtSecret: process.env.JWT_SECRET || 'your-default-secret-key-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',

  // CORS configuration
  corsOrigin: process.env.CORS_ORIGIN || 'https://crypto-front-demo.up.railway.app', // Updated to use specific frontend origin
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',

  // Mock signal configuration
  enableMockSignals: process.env.ENABLE_MOCK_SIGNALS === 'true'
}; 