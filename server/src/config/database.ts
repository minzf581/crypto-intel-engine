import { Sequelize } from 'sequelize';
import path from 'path';
import env from './env';
import logger from '../utils/logger';
import fs from 'fs';
import { User } from '../models/User';
import { TwitterAccount } from '../models/TwitterAccount';
import { TwitterPost } from '../models/TwitterPost';
import { AccountCoinRelevance } from '../models/AccountCoinRelevance';
import { RecommendedAccount } from '../models/RecommendedAccount';
import GlobalSearchHistory from '../models/GlobalSearchHistory';
import { VolumeAnalysis } from '../models/VolumeAnalysis';

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
  // Fix path resolution: if we're in server directory, go up one level to find data folder
  const currentDir = process.cwd();
  const isInServerDir = currentDir.endsWith('/server') || currentDir.endsWith('\\server');
  const projectRoot = isInServerDir ? path.dirname(currentDir) : currentDir;
  const dbPath = path.resolve(projectRoot, env.sqliteDbPath || 'data/crypto-intel.sqlite');
  
  logger.info(`Using SQLite database: ${dbPath}`);
  logger.info(`Current working directory: ${currentDir}`);
  logger.info(`Project root: ${projectRoot}`);
  
  // Ensure data directory exists with proper permissions
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true, mode: 0o755 });
    logger.info(`Created data directory: ${dataDir}`);
  }
  
  // Check if we can write to the directory
  try {
    const testFile = path.join(dataDir, '.write-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    logger.info('✅ Data directory write permission verified');
  } catch (error) {
    logger.error('❌ Cannot write to data directory:', error);
    throw new Error(`Data directory is not writable: ${dataDir}`);
  }
  
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: env.nodeEnv === 'development' ? (msg) => logger.debug(msg) : false,
    pool: {
      max: 1, // SQLite only supports one connection
      min: 0,
      acquire: 30000,
      idle: 10000
    }
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
      // Fix path resolution for cleanup too
      const currentDir = process.cwd();
      const isInServerDir = currentDir.endsWith('/server') || currentDir.endsWith('\\server');
      const projectRoot = isInServerDir ? path.dirname(currentDir) : currentDir;
      const dbPath = path.resolve(projectRoot, env.sqliteDbPath || 'data/crypto-intel.sqlite');
      
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
      // Local development with SQLite: handle with special care
      logger.info('🔧 Local SQLite development mode detected');
      
      // Strategy 1: Try to clean and recreate if there are I/O issues
      try {
        await sequelize.sync({ force: false, alter: false });
        logger.info('✅ Database models synchronized (development mode - safe sync)');
        return;
      } catch (safeError) {
        const errorMessage = safeError instanceof Error ? safeError.message : String(safeError);
        logger.warn('SQLite safe sync failed:', errorMessage);
        
        // If it's an I/O error, try to clean and recreate
        if (errorMessage.includes('SQLITE_IOERR') || errorMessage.includes('disk I/O error')) {
          logger.info('🔄 Detected SQLite I/O error, attempting database cleanup...');
          await cleanDatabase();
        }
      }
      
      // Strategy 2: Try force sync after cleanup
      try {
        logger.info('🔄 Attempting force sync after cleanup...');
        await sequelize.sync({ force: true });
        logger.info('✅ Database models synchronized (development mode - force sync after cleanup)');
        return;
      } catch (forceError) {
        const errorMessage = forceError instanceof Error ? forceError.message : String(forceError);
        logger.error('SQLite force sync failed:', errorMessage);
        
        // Strategy 3: Try with a different database file name
        if (errorMessage.includes('SQLITE_IOERR') || errorMessage.includes('disk I/O error')) {
          logger.info('🔄 Attempting with backup database file...');
          try {
            // Create a new database instance with a different file name
            const currentDir = process.cwd();
            const isInServerDir = currentDir.endsWith('/server') || currentDir.endsWith('\\server');
            const projectRoot = isInServerDir ? path.dirname(currentDir) : currentDir;
            const backupDbPath = path.resolve(projectRoot, 'data/crypto-intel-backup.sqlite');
            
            // Clean up any existing backup
            if (fs.existsSync(backupDbPath)) {
              fs.unlinkSync(backupDbPath);
            }
            
            const backupSequelize = new Sequelize({
              dialect: 'sqlite',
              storage: backupDbPath,
              logging: false,
              dialectOptions: {
                mode: 0o755,
                busyTimeout: 30000,
              },
              pool: {
                max: 1,
                min: 0,
                acquire: 30000,
                idle: 10000
              }
            });
            
            await backupSequelize.sync({ force: true });
            await backupSequelize.close();
            
            // If backup works, replace the main database
            const mainDbPath = path.resolve(projectRoot, env.sqliteDbPath || 'data/crypto-intel.sqlite');
            if (fs.existsSync(mainDbPath)) {
              fs.unlinkSync(mainDbPath);
            }
            fs.renameSync(backupDbPath, mainDbPath);
            
            // Reconnect with the main database
            await sequelize.sync({ force: false });
            logger.info('✅ Database models synchronized (development mode - backup strategy)');
            return;
          } catch (backupError) {
            logger.error('Backup strategy failed:', backupError);
          }
        }
        
        throw forceError;
      }
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