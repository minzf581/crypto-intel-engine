# Railway 部署指南

本指南将帮助你在Railway平台上部署加密货币情报引擎应用。

## 准备工作

1. 确保你已经有一个Railway账户
2. 在Railway上创建一个PostgreSQL数据库服务
3. 获取PostgreSQL连接字符串

## 部署步骤

### 1. 连接到GitHub仓库

1. 登录Railway平台
2. 点击"New Project"按钮
3. 选择"Deploy from GitHub repo"
4. 选择你的加密货币情报引擎仓库
5. 点击"Deploy Now"按钮

### 2. 配置环境变量

在Railway项目的"Variables"选项卡中添加以下环境变量：

```
NODE_ENV=production
PORT=5001
DATABASE_URL=你的PostgreSQL连接字符串
JWT_SECRET=crypto-intel-secret-key-for-production
JWT_EXPIRES_IN=30d
CORS_ORIGIN=*
ENABLE_MOCK_SIGNALS=true
```

### 3. 配置项目设置

1. 确保项目中存在以下文件：
   - `railway.json` - 描述如何构建和启动项目
   - `Procfile` - 指定Web进程如何启动
   - `server.js` - 项目入口文件
   - `package.json` - 包含所有必要的依赖

2. 确保`package.json`中包含所有PostgreSQL相关依赖：
   ```json
   "dependencies": {
     "pg": "^8.11.3",
     "pg-hstore": "^2.3.4",
     "pg-cloudflare": "^1.2.5",
     "pg-pool": "^3.10.0",
     "pg-protocol": "^1.10.0",
     "pg-types": "^2.2.0",
     "pgpass": "^1.0.5",
     "underscore": "^1.13.7",
     "pg-int8": "^1.0.1",
     "postgres-array": "^2.0.0",
     "postgres-bytea": "^1.0.0",
     "postgres-date": "^1.0.7",
     "postgres-interval": "^1.2.0",
     "split2": "^4.2.0",
     "xtend": "^4.0.2"
   }
   ```

### 4. 部署应用

1. 等待Railway自动部署应用
2. 访问Railway生成的URL，测试应用是否成功运行

### 5. 故障排除

如果遇到部署问题，请检查：

1. 日志中是否有错误信息
2. 环境变量是否正确设置
3. 数据库连接是否有效
4. 是否缺少必要的依赖

## 注意事项

- 默认情况下，Railway会为你的应用程序分配一个随机的域名
- 每次提交到主分支，Railway都会自动重新部署应用
- 确保生产环境中使用安全的JWT密钥
- 根据实际需求调整CORS配置 