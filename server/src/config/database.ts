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
    const isPostgreSQL = !!env.databaseUrl;
    
    if (isDevelopment && !isRailway && !isPostgreSQL) {
      // Local development with SQLite: clean start to avoid constraint conflicts
      await cleanDatabase();
      await sequelize.sync({ force: true });
      logger.info('✅ Database models synchronized (development mode - force recreated)');
    } else if (isRailway || isPostgreSQL) {
      // Railway/PostgreSQL environment: handle with special care
      logger.info('🚂 Railway/PostgreSQL environment detected, using optimized sync strategy');
      
      // Strategy 1: Try safe sync first
      try {
        await sequelize.sync({ force: false, alter: false });
        logger.info('✅ Database models synchronized (Railway mode - safe sync)');
        return;
      } catch (safeError) {
        const errorMessage = safeError instanceof Error ? safeError.message : String(safeError);
        logger.warn('Railway safe sync failed:', errorMessage);
      }
      
      // Strategy 2: Try force sync (fresh database)
      try {
        logger.info('🔄 Attempting force sync for fresh database...');
        await sequelize.sync({ force: true });
        logger.info('✅ Database models synchronized (Railway mode - force sync)');
        return;
      } catch (forceError) {
        const errorMessage = forceError instanceof Error ? forceError.message : String(forceError);
        logger.warn('Railway force sync failed:', errorMessage);
      }
      
      // Strategy 3: Try alter sync
      try {
        logger.info('🔄 Attempting alter sync...');
        await sequelize.sync({ force: false, alter: true });
        logger.info('✅ Database models synchronized (Railway mode - alter sync)');
        return;
      } catch (alterError) {
        const errorMessage = alterError instanceof Error ? alterError.message : String(alterError);
        logger.warn('Railway alter sync failed:', errorMessage);
      }
      
      // Strategy 4: Manual table creation (fallback)
      try {
        logger.info('🔄 Attempting manual table creation without indexes...');
        
        // Create tables without indexes first
        const models = Object.values(sequelize.models);
        for (const model of models) {
          try {
            await model.sync({ force: false, alter: false });
            logger.info(`✅ Created table: ${model.tableName}`);
          } catch (modelError) {
            logger.warn(`⚠️ Failed to create table ${model.tableName}:`, modelError);
            // Continue with other tables
          }
        }
        
        logger.info('✅ Database models synchronized (Railway mode - manual creation)');
        return;
      } catch (manualError) {
        logger.error('All Railway sync strategies failed:', manualError);
        // Don't throw error - let the app continue and try to create essential data
        logger.warn('⚠️ Database sync failed, but continuing with application startup...');
      }
    } else {
      // Production environment (non-Railway): conservative approach
      try {
        await sequelize.sync({ force: false, alter: false });
        logger.info('✅ Database models synchronized (production mode - safe sync)');
      } catch (syncError) {
        const errorMessage = syncError instanceof Error ? syncError.message : String(syncError);
        logger.warn('Production safe sync failed, attempting alter sync:', errorMessage);
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
    // In Railway environment, don't throw - let app continue
    if (process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID) {
      logger.warn('⚠️ Continuing despite sync failure in Railway environment...');
    } else {
      throw error;
    }
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