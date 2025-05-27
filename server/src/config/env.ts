import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({
  path: path.resolve(process.cwd(), '.env')
});

// Environment variable configuration
export default {
  // Server configuration
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5001'),

  // Database configuration
  sqliteDbPath: process.env.SQLITE_DB_PATH || 'data/crypto-intel.sqlite',
  databaseUrl: process.env.DATABASE_URL, // PostgreSQL connection URL

  // JWT configuration
  jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // API Keys for Real Data Sources
  twitterBearerToken: process.env.TWITTER_BEARER_TOKEN,
  newsApiKey: process.env.NEWS_API_KEY,
  cryptoNewsApiKey: process.env.CRYPTO_NEWS_API_KEY,
  etherscanApiKey: process.env.ETHERSCAN_API_KEY,
  blockchainApiKey: process.env.BLOCKCHAIN_API_KEY || process.env.ETHERSCAN_API_KEY,
  bscApiKey: process.env.BSC_API_KEY || process.env.ETHERSCAN_API_KEY,
  coinGeckoApiKey: process.env.COINGECKO_API_KEY, // Optional - has free tier

  // Firebase
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY,
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL,

  // CORS configuration
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000', // Default to localhost for development
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
}; 