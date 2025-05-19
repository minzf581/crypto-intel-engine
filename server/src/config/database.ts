import { Sequelize } from 'sequelize';
import path from 'path';
import env from './env';
import logger from '../utils/logger';

// 数据库文件路径
const dbPath = path.resolve(process.cwd(), env.sqliteDbPath || 'data/crypto-intel.sqlite');

// 创建Sequelize实例
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: env.nodeEnv === 'development' ? (msg) => logger.debug(msg) : false,
});

// 连接数据库
export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info('SQLite database connected successfully');
    
    // 同步模型到数据库（开发模式下可以自动创建表）
    if (env.nodeEnv === 'development') {
      // 检查是否需要重置数据库
      const shouldResetDb = process.env.RESET_DB === 'true';
      
      if (shouldResetDb) {
        // 使用force选项重新创建所有表
        await sequelize.sync({ force: true });
        logger.info('Database has been reset and models synchronized');
      } else {
        // 使用普通同步，不尝试修改表结构
        await sequelize.sync();
        logger.info('Database models synchronized');
      }
    }
  } catch (error) {
    logger.error('Database connection error:', error);
    process.exit(1);
  }
};

// 关闭数据库连接
export const closeDB = async () => {
  try {
    await sequelize.close();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
};

// 导出Sequelize实例
export default sequelize; 