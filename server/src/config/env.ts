import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
dotenv.config({
  path: path.resolve(process.cwd(), '.env')
});

// 环境变量配置
export default {
  // 服务器配置
  port: process.env.PORT || 5001,
  nodeEnv: process.env.NODE_ENV || 'development',

  // 数据库配置
  sqliteDbPath: process.env.SQLITE_DB_PATH || 'data/crypto-intel.sqlite',
  databaseUrl: process.env.DATABASE_URL, // PostgreSQL连接URL

  // JWT配置
  jwtSecret: process.env.JWT_SECRET || 'your-default-secret-key-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',

  // CORS配置
  corsOrigin: process.env.CORS_ORIGIN || 'https://crypto-front-demo.up.railway.app', // Updated to use specific frontend origin
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',

  // 模拟信号配置
  enableMockSignals: process.env.ENABLE_MOCK_SIGNALS === 'true'
}; 