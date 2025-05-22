import { Sequelize } from 'sequelize';
import path from 'path';
import env from './env';
import logger from '../utils/logger';

let sequelize: Sequelize;

// 根据环境选择数据库类型
if (env.databaseUrl) {
  // 使用PostgreSQL（生产环境）
  logger.info('使用PostgreSQL数据库连接');
  sequelize = new Sequelize(env.databaseUrl, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false // 处理自签名证书
      }
    },
    logging: env.nodeEnv === 'development' ? (msg) => logger.debug(msg) : false,
  });
} else {
  // 使用SQLite（开发环境）
  const dbPath = path.resolve(process.cwd(), env.sqliteDbPath || 'data/crypto-intel.sqlite');
  logger.info(`使用SQLite数据库: ${dbPath}`);
  
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: env.nodeEnv === 'development' ? (msg) => logger.debug(msg) : false,
  });
}

// 连接数据库
export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info('数据库连接成功');
    
    // 同步模型到数据库（开发模式下可以自动创建表）
    if (env.nodeEnv === 'development') {
      // 检查是否需要重置数据库
      const shouldResetDb = process.env.RESET_DB === 'true';
      
      if (shouldResetDb) {
        // 使用force选项重新创建所有表
        await sequelize.sync({ force: true });
        logger.info('数据库已重置且模型已同步');
      } else {
        // 使用普通同步，不尝试修改表结构
        await sequelize.sync();
        logger.info('数据库模型已同步');
      }
    } else {
      // 生产环境下也需要同步表结构
      await sequelize.sync();
      logger.info('生产环境: 数据库模型已同步');
    }
  } catch (error) {
    logger.error('数据库连接错误:', error);
    process.exit(1);
  }
};

// 关闭数据库连接
export const closeDB = async () => {
  try {
    await sequelize.close();
    logger.info('数据库连接已关闭');
  } catch (error) {
    logger.error('关闭数据库连接时出错:', error);
  }
};

// 导出Sequelize实例
export default sequelize; 