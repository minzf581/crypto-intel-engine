# 加密货币情报引擎

实时加密货币情报引擎是一个全栈应用程序，用于从社交媒体平台提取加密货币相关的实时信号。

## 项目结构

- **client**: React前端应用，使用TypeScript和Tailwind CSS
- **server**: Node.js后端API，使用Express和SQLite

## 功能特点

- 用户认证系统(登录/注册)
- 加密货币资产选择(用户可选择3-5个资产进行跟踪)
- 实时信号显示(从Twitter/Reddit提取的情绪和叙事信号)
- 信号筛选系统(按时间、类型、强度、来源筛选)
- 信号详情视图(包含图表和来源分析)
- 通知偏好设置
- 暗色/亮色模式切换
- 用户反馈系统

## 技术栈

### 前端
- React 18
- TypeScript
- Tailwind CSS
- Vite
- React Router v6
- Chart.js (数据可视化)
- Socket.IO客户端 (实时更新)

### 后端
- Node.js
- Express
- TypeScript
- SQLite (通过Sequelize ORM)
- Socket.IO (WebSocket)
- JWT身份验证

## 安装和运行

### 前提条件
- Node.js >= 18.0.0

### 简易启动方式

```bash
# 添加执行权限
chmod +x start-service.sh

# 运行启动脚本
./start-service.sh
```

启动脚本会自动执行以下操作：
1. 检查并杀死占用端口的旧进程
2. 创建必要的目录
3. 生成环境变量文件(如果不存在)
4. 安装依赖(如果需要)
5. 启动前端和后端服务

### 手动安装依赖

```bash
# 安装所有依赖(客户端和服务器)
npm install
```

### 环境变量设置

1. 在 `server` 目录中创建 `.env` 文件
2. 添加以下环境变量:

```
# 服务器配置
PORT=5000
NODE_ENV=development

# 数据库配置
SQLITE_DB_PATH=data/crypto-intel.sqlite

# JWT配置
JWT_SECRET=crypto-intel-secret-key-for-development
JWT_EXPIRES_IN=30d

# CORS配置
CORS_ORIGIN=http://localhost:3000

# 模拟信号配置
ENABLE_MOCK_SIGNALS=true
```

### 手动运行开发服务器

```bash
# 同时运行前端和后端
npm run dev

# 仅运行前端
npm run dev:client

# 仅运行后端
npm run dev:server
```

### 构建生产版本

```bash
npm run build
```

## 初始化数据

首次运行项目时，您需要初始化默认资产数据。使用以下API端点:

```
POST /api/assets/initialize
```

您可以使用Postman或curl发送此请求。

## 演示账户

可以使用以下演示账户登录系统:

- 邮箱: demo@example.com
- 密码: demo123

## API文档

API端点:

- 认证:
  - `POST /api/auth/register` - 注册新用户
  - `POST /api/auth/login` - 用户登录

- 用户:
  - `GET /api/users/me` - 获取当前用户信息
  - `GET /api/users/assets` - 获取用户选择的资产
  - `POST /api/users/assets` - 更新用户选择的资产
  - `PUT /api/users/profile` - 更新用户资料

- 资产:
  - `GET /api/assets` - 获取所有资产
  - `GET /api/assets/:id` - 获取单个资产详情
  - `POST /api/assets/initialize` - 初始化默认资产(仅开发环境)

- 信号:
  - `GET /api/signals` - 获取信号列表
  - `GET /api/signals/:id` - 获取单个信号详情

## WebSocket

WebSocket连接用于实时信号更新，连接地址为:

```
ws://localhost:5000
```

需要在连接时提供认证令牌:

```javascript
const socket = io('http://localhost:5000', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

WebSocket事件:
- `subscribe` - 订阅资产信号
- `unsubscribe` - 取消订阅资产信号
- `newSignal` - 接收新信号

## 许可证

MIT 