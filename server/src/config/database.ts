import { Sequelize } from 'sequelize';
import path from 'path';
import env from './env';
import logger from '../utils/logger';

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
  });
} else {
  // Use SQLite (development environment)
  const dbPath = path.resolve(process.cwd(), env.sqliteDbPath || 'data/crypto-intel.sqlite');
  logger.info(`Using SQLite database: ${dbPath}`);
  
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: env.nodeEnv === 'development' ? (msg) => logger.debug(msg) : false,
  });
}

// Connect to database
export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection successful');
    
    // Sync models to database (can automatically create tables in development mode)
    if (env.nodeEnv === 'development') {
      // Check if database reset is needed
      const shouldResetDb = process.env.RESET_DB === 'true';
      
      if (shouldResetDb) {
        // Use force option to recreate all tables
        await sequelize.sync({ force: true });
        logger.info('Database has been reset and models synchronized');
      } else {
        // Use normal sync, do not attempt to modify table structure
        await sequelize.sync();
        logger.info('Database models synchronized');
      }
    } else {
      // Production environment also needs to sync table structure
      await sequelize.sync();
      logger.info('Production environment: Database models synchronized');
    }
  } catch (error) {
    logger.error('Database connection error:', error);
    process.exit(1);
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