# 🚀 自动化部署指南

本项目已配置自动环境检测，支持本地开发和Railway生产环境的无缝切换。

## 🌍 环境自动检测

### 后端环境检测
- **本地开发**: 自动检测localhost环境，允许所有本地端口
- **Railway生产**: 自动检测Railway环境变量，配置生产CORS
- **其他生产环境**: 基于NODE_ENV=production检测

### 前端环境检测
- **本地开发**: 自动连接到 `http://localhost:5001`
- **Railway生产**: 自动连接到 `https://crypto-demo.up.railway.app`
- **环境变量优先**: 如果设置了`VITE_API_URL`，优先使用

## 📋 本地开发部署

### 1. 克隆项目
```bash
git clone <repository-url>
cd CryptoData
```

### 2. 安装依赖
```bash
npm install
```

### 3. 启动开发服务
```bash
npm run dev
```

应用将自动：
- 后端运行在 `http://localhost:5001`
- 前端运行在 `http://localhost:3000`
- 自动配置CORS允许跨域请求
- 自动创建SQLite数据库

## 🚂 Railway生产部署

### 1. 后端部署

1. **连接GitHub仓库**
   - 在Railway中创建新项目
   - 连接到你的GitHub仓库
   - 选择后端服务

2. **自动环境配置**
   项目已配置自动检测Railway环境，无需手动设置大部分变量。

3. **可选环境变量**（仅在需要自定义时设置）
   ```bash
   NODE_ENV=production
   DATABASE_URL=<your-postgresql-url>
   JWT_SECRET=<your-secure-jwt-secret>
   FRONTEND_URL=https://crypto-front-demo.up.railway.app
   ```

### 2. 前端部署

1. **创建前端服务**
   - 在同一Railway项目中添加新服务
   - 连接到相同的GitHub仓库
   - 设置根目录为 `client`

2. **构建配置**
   ```bash
   # 构建命令
   npm install && npm run build
   
   # 启动命令  
   npm run preview
   ```

3. **可选环境变量**
   ```bash
   VITE_API_URL=https://crypto-demo.up.railway.app
   ```

## 🔧 环境变量配置

### 后端环境变量

#### 必需变量
```bash
NODE_ENV=production                    # 生产环境标识
DATABASE_URL=<postgresql-connection>   # PostgreSQL连接字符串
JWT_SECRET=<secure-random-string>      # JWT密钥
```

#### 可选变量（自动检测）
```bash
FRONTEND_URL=<frontend-domain>         # 前端域名
BACKEND_URL=<backend-domain>           # 后端域名
CORS_ORIGIN=<allowed-origins>          # CORS允许的源
ADDITIONAL_ORIGINS=<extra-origins>     # 额外允许的源（逗号分隔）
```

#### Railway自动变量（无需设置）
```bash
RAILWAY_ENVIRONMENT=production
RAILWAY_PROJECT_ID=<auto-set>
RAILWAY_SERVICE_ID=<auto-set>
RAILWAY_DEPLOYMENT_ID=<auto-set>
PORT=<auto-assigned>
```

### 前端环境变量

#### 可选变量（自动检测）
```bash
VITE_API_URL=<backend-api-url>         # 后端API地址
```

## 🏗️ 构建流程

### 本地构建
```bash
# 构建后端
cd server
npm run build

# 构建前端
cd client  
npm run build
```

### Railway自动构建
Railway将自动：
1. 检测项目结构
2. 安装依赖
3. 运行构建命令
4. 启动服务

## 🚦 健康检查

### 后端健康检查
访问 `/health` 端点查看服务状态：
```json
{
  "status": "OK",
  "uptime": 123.456,
  "env": "production",
  "environment": {
    "isRailway": true,
    "isProduction": true,
    "isLocal": false,
    "frontendUrl": "https://crypto-front-demo.up.railway.app",
    "backendUrl": "https://crypto-demo.up.railway.app"
  },
  "timestamp": "2024-01-24T10:30:00.000Z"
}
```

### 前端环境检查
打开浏览器控制台查看环境配置日志：
```
🌐 Frontend Environment Configuration:
   Environment: Railway
   Frontend URL: https://crypto-front-demo.up.railway.app
   API URL: https://crypto-demo.up.railway.app
   Is Local: false
   Is Railway: true
   Is Production: true
```

## 🔍 故障排除

### CORS错误
如果遇到CORS错误：
1. 检查后端环境日志中的CORS配置
2. 确认前端域名在允许列表中
3. 检查Railway环境变量设置

### 环境检测问题
如果环境检测不正确：
1. 检查环境变量是否正确设置
2. 查看健康检查端点的环境信息
3. 检查控制台日志中的环境配置

### 数据库连接问题
如果数据库连接失败：
1. 确认DATABASE_URL格式正确
2. 检查数据库服务是否正常运行
3. 验证数据库访问权限

## 📚 开发工作流

### 本地开发
```bash
# 启动开发环境
npm run dev

# 运行测试
npm test

# 代码检查
npm run lint
```

### 部署到生产
```bash
# 提交代码
git add .
git commit -m "feat: add new feature"
git push origin main

# Railway将自动部署
```

## 🔐 安全注意事项

1. **JWT密钥**: 确保生产环境使用安全的随机JWT密钥
2. **数据库访问**: 限制数据库访问权限
3. **环境变量**: 敏感信息只通过环境变量传递
4. **CORS配置**: 只允许必要的域名访问

## 📞 支持

如果遇到部署问题：
1. 检查Railway服务日志
2. 验证环境变量配置
3. 测试健康检查端点
4. 查看项目文档中的故障排除部分 