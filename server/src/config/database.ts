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

// Sync database models
export const syncModels = async () => {
  try {
    await sequelize.sync({ force: false, alter: false });
    logger.info('Database models synchronized');
  } catch (error) {
    logger.error('Model synchronization failed:', error);
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