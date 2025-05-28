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
    
    if (env.nodeEnv === 'development') {
      // In development, clean start to avoid constraint conflicts
      await cleanDatabase();
      await sequelize.sync({ force: true });
      logger.info('✅ Database models synchronized (development mode - force recreated)');
    } else {
      // In production, try gentle sync first
      try {
        await sequelize.sync({ force: false, alter: false });
        logger.info('✅ Database models synchronized (production mode - safe sync)');
      } catch (syncError) {
        logger.warn('Safe sync failed, attempting alter sync:', syncError);
        try {
          // If safe sync fails, try alter
          await sequelize.sync({ force: false, alter: true });
          logger.info('✅ Database models synchronized (production mode - alter sync)');
        } catch (alterError) {
          logger.error('Alter sync also failed:', alterError);
          // For Railway deployment, create fresh database if all else fails
          if (process.env.RAILWAY_ENVIRONMENT) {
            logger.warn('Railway environment detected, attempting force sync as last resort...');
            await sequelize.sync({ force: true });
            logger.info('✅ Database models synchronized (Railway mode - force sync)');
          } else {
            throw alterError;
          }
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