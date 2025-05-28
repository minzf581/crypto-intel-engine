import { Sequelize } from 'sequelize';
import path from 'path';
import env from './env';
import logger from '../utils/logger';
import fs from 'fs';

let sequelize: Sequelize;

// Choose database type based on environment
if (env.databaseUrl) {
  // Use PostgreSQL (production environment)
  logger.info('Using PostgreSQL database connection');
  sequelize = new Sequelize(env.databaseUrl, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false // Handle self-signed certificates
      }
    },
    logging: env.nodeEnv === 'development' ? (msg) => logger.debug(msg) : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });
} else {
  // Use SQLite (development environment)
  const dbPath = path.resolve(process.cwd(), env.sqliteDbPath || 'data/crypto-intel.sqlite');
  logger.info(`Using SQLite database: ${dbPath}`);
  
  // Ensure data directory exists
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: env.nodeEnv === 'development' ? (msg) => logger.debug(msg) : false,
  });
}

// Test database connection
export const connectDatabase = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection successful');
  } catch (error) {
    logger.error('Database connection failed:', error);
    process.exit(1);
  }
};

// Clean database for fresh start (development only)
const cleanDatabase = async () => {
  if (env.nodeEnv === 'development' && !env.databaseUrl) {
    try {
      const dbPath = path.resolve(process.cwd(), env.sqliteDbPath || 'data/crypto-intel.sqlite');
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
        logger.info('Cleaned existing SQLite database');
      }
    } catch (error) {
      logger.warn('Failed to clean database:', error);
    }
  }
};

// Sync database models with improved error handling
export const syncModels = async () => {
  try {
    logger.info('🔄 Starting database synchronization...');
    
    // Check if we're in Railway environment
    const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID;
    const isDevelopment = env.nodeEnv === 'development';
    
    if (isDevelopment && !isRailway) {
      // Local development: clean start to avoid constraint conflicts
      await cleanDatabase();
      await sequelize.sync({ force: true });
      logger.info('✅ Database models synchronized (development mode - force recreated)');
    } else if (isRailway) {
      // Railway environment: handle with special care
      logger.info('🚂 Railway environment detected, using Railway-optimized sync strategy');
      try {
        // First try: safe sync
        await sequelize.sync({ force: false, alter: false });
        logger.info('✅ Database models synchronized (Railway mode - safe sync)');
      } catch (safeError) {
        logger.warn('Railway safe sync failed, trying force sync:', safeError.message);
        try {
          // Railway fallback: force sync (Railway provides fresh database)
          await sequelize.sync({ force: true });
          logger.info('✅ Database models synchronized (Railway mode - force sync)');
        } catch (forceError) {
          logger.error('Railway force sync failed:', forceError);
          // Last resort: try without any constraints
          try {
            await sequelize.query('PRAGMA foreign_keys = OFF;');
            await sequelize.sync({ force: true });
            await sequelize.query('PRAGMA foreign_keys = ON;');
            logger.info('✅ Database models synchronized (Railway mode - constraint-free sync)');
          } catch (finalError) {
            logger.error('All Railway sync strategies failed:', finalError);
            throw finalError;
          }
        }
      }
    } else {
      // Production environment (non-Railway): conservative approach
      try {
        await sequelize.sync({ force: false, alter: false });
        logger.info('✅ Database models synchronized (production mode - safe sync)');
      } catch (syncError) {
        logger.warn('Production safe sync failed, attempting alter sync:', syncError.message);
        try {
          await sequelize.sync({ force: false, alter: true });
          logger.info('✅ Database models synchronized (production mode - alter sync)');
        } catch (alterError) {
          logger.error('Production alter sync failed:', alterError);
          throw alterError;
        }
      }
    }
  } catch (error) {
    logger.error('❌ Model synchronization failed:', error);
    throw error;
  }
};

// Close database connection
export const closeDB = async () => {
  try {
    await sequelize.close();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
};

// Export Sequelize instance
export default sequelize; 