// 这是为Railway部署创建的入口文件
// 它会启动编译后的服务器

const path = require('path');

// 检查环境变量
if (!process.env.DATABASE_URL) {
  console.error('未设置DATABASE_URL环境变量');
  process.exit(1);
}

// 启动服务
console.log('启动加密货币情报引擎...');
require('./server/dist/index.js'); 