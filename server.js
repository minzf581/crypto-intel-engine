// 这是为Railway部署创建的入口文件
// 它会启动编译后的服务器

const path = require('path');

// 检查环境变量
if (!process.env.DATABASE_URL) {
  console.log('警告: 未设置DATABASE_URL环境变量，将使用SQLite数据库');
}

// 确保日志目录存在
if (process.env.NODE_ENV === 'production') {
  const fs = require('fs');
  const logDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

// 使用Railway提供的PORT环境变量，这是关键
const PORT = process.env.PORT || 5001;
console.log(`应用将在端口 ${PORT} 上启动`);

// 启动服务
console.log('启动加密货币情报引擎...');
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`PORT: ${PORT}`);
require('./server/dist/index.js'); 