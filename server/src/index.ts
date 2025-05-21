import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env, connectDB } from './config';
import routes from './routes';
import { setupSocketHandlers, initializeSignalGenerator } from './services';
import logger from './utils/logger';
import { seedData } from './config/seedData';
import { AddressInfo } from 'net';

// 创建Express应用
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: env.nodeEnv === 'production' 
      ? env.corsOrigin 
      : 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// 将日志器添加到应用程序中，以便在其他地方访问
app.set('logger', logger);

// 中间件
app.use(cors({
  origin: env.nodeEnv === 'production' ? env.corsOrigin : ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 记录所有请求
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.url}`, {
    headers: {
      authorization: req.headers.authorization ? 
        (req.headers.authorization.startsWith('Bearer') ? 
          'Bearer ' + req.headers.authorization.split(' ')[1].substring(0, 10) + '...' : 
          '[其他格式]') : 
        '无'
    },
    query: req.query,
    body: req.method !== 'GET' ? req.body : undefined
  });
  next();
});

app.use(express.json());
app.use(cookieParser());

// 路由
app.use('/api', routes);

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    uptime: process.uptime(),
    env: env.nodeEnv
  });
});

// 设置Socket.IO
setupSocketHandlers(io);

// 连接到数据库并启动服务器
connectDB()
  .then(async () => {
    // 初始化种子数据
    if (env.nodeEnv === 'development') {
      await seedData();
    }
    
    // 启动信号生成器服务
    initializeSignalGenerator(io);
    
    // 启动服务器
    const PORT = parseInt(env.port as string) || 5001;
    
    // 尝试启动服务器，添加错误处理
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`端口 ${PORT} 已被占用，请关闭占用的进程或使用其他端口`);
        // 尝试使用其他端口
        const newPort = PORT + 1;
        logger.info(`尝试使用备用端口 ${newPort}...`);
        server.listen(newPort);
      } else {
        logger.error('服务器启动错误:', error);
        process.exit(1);
      }
    });
    
    server.listen(PORT, () => {
      const addr = server.address();
      if (addr && typeof addr !== 'string') {
        logger.info(`服务器运行在端口 ${addr.port} (${env.nodeEnv} 模式)`);
      } else {
        logger.info(`服务器运行 (${env.nodeEnv} 模式)`);
      }
    });
  })
  .catch(error => {
    logger.error('服务器初始化错误:', error);
    process.exit(1);
  });

// 处理未捕获的异常
process.on('uncaughtException', (error: Error) => {
  // 检查是否是端口已占用的错误
  const nodeError = error as NodeJS.ErrnoException;
  if (nodeError.code === 'EADDRINUSE') {
    logger.error(`端口已被占用，请确保端口未被其他程序使用: ${nodeError.message}`);
    // 不退出，让nodemon重新启动
  } else {
    logger.error('未捕获的异常:', error);
    process.exit(1);
  }
});

// 处理未处理的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝:', reason);
  // 不立即退出，仅记录错误
}); 