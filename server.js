// 这是为Railway部署创建的入口文件
// 它会启动编译后的服务器

const path = require('path');
const express = require('express');
const fs = require('fs');

// 检查环境变量
if (!process.env.DATABASE_URL) {
  console.log('警告: 未设置DATABASE_URL环境变量，将使用SQLite数据库');
}

// 确保日志目录存在
if (process.env.NODE_ENV === 'production') {
  const logDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

// 使用Railway提供的PORT环境变量，这是关键
const PORT = process.env.PORT || 5001;
console.log(`应用将在端口 ${PORT} 上启动`);

// 设置环境变量，确保内部API服务使用相同的端口
process.env.PORT = PORT.toString();

// 启动服务
console.log('启动加密货币情报引擎...');
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`PORT: ${PORT}`);

// 确保CORS配置正确
if (process.env.NODE_ENV === 'production') {
  process.env.CORS_ORIGIN = '*';
}

// 引入后端API服务 - 服务器将在内部创建并监听端口
require('./server/dist/index.js');

// 注意：我们不在这里创建新的Express应用，而是让内部API服务处理所有请求
// 内部API服务会提供/health和其他API端点
console.log('API服务已初始化，等待连接...'); 