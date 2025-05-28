# Railway部署修复指南

## 问题诊断

基于日志分析，主要问题包括：

### 1. 健康检查失败
- **原因**: Railway无法访问健康检查端点
- **解决方案**: 已修复健康检查路径为 `/health`

### 2. 构建配置问题
- **原因**: 多个配置文件冲突，deprecated包依赖
- **解决方案**: 
  - 移除deprecated `crypto` 包
  - 统一构建配置
  - 优化nixpacks配置

### 3. 启动脚本问题
- **原因**: 缺少故障处理机制
- **解决方案**: 增强错误处理和fallback服务器

## 修复内容

### 📁 根目录文件

#### `package.json`
```json
{
  "scripts": {
    "build": "npm run install:deps && npm run build:server && npm run build:client",
    "build:prod": "npm run install:prod && npm run build:server && npm run build:client",
    "start": "node server.js"
  }
}
```

#### `server.js`
- ✅ 增加fallback健康检查服务器
- ✅ 增强错误处理
- ✅ 支持Railway的PORT环境变量

#### `nixpacks.toml`
```toml
[phases.setup]
nixPkgs = ["nodejs_20"]

[phases.install]
cmds = ["npm ci"]

[phases.build]
cmds = [
  "npm run build:server",
  "npm run build:client"
]

[start]
cmd = "npm start"

[variables]
NODE_ENV = "production"
```

#### `railway.toml`
```toml
[build]
builder = "nixpacks"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 300
healthcheckInterval = 30
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 5
startCommand = "npm start"

[env]
NODE_ENV = "production"
CORS_ORIGIN = "${{RAILWAY_PUBLIC_DOMAIN}}"
```

### 📁 server/package.json
- ✅ 移除deprecated `crypto` 包依赖
- ✅ 使用Node.js内置crypto模块

### 📁 健康检查端点
- ✅ `/` - 简单状态检查
- ✅ `/health` - 详细健康检查

## 部署步骤

### 1. 验证本地构建
```bash
# 清理并重新构建
npm run clean
npm install
npm run build

# 验证构建结果
ls -la server/dist/index.js
ls -la client/dist/index.html
```

### 2. 推送到Git
```bash
git add .
git commit -m "Fix Railway deployment issues"
git push origin main
```

### 3. Railway部署
1. 连接到Railway项目
2. 确保环境变量设置正确
3. 触发重新部署

### 4. 验证部署
```bash
# 检查健康状态
curl https://your-railway-domain.up.railway.app/health

# 检查基本响应
curl https://your-railway-domain.up.railway.app/
```

## 环境变量配置

### 必需环境变量
```bash
NODE_ENV=production
```

### 可选环境变量（推荐）
```bash
CORS_ORIGIN=https://your-frontend-domain.com
JWT_SECRET=your-jwt-secret
COINGECKO_API_KEY=your-api-key
NEWSAPI_KEY=your-news-api-key
```

## 故障排除

### 如果健康检查仍然失败

1. **检查日志**
   ```bash
   railway logs --tail
   ```

2. **验证端口**
   - Railway会自动设置 `PORT` 环境变量
   - 应用会自动使用Railway提供的端口

3. **检查构建状态**
   ```bash
   # 在Railway环境中验证
   ls -la server/dist/
   ls -la client/dist/
   ```

### 如果应用启动失败

1. **检查依赖安装**
   - 确保所有npm包正确安装
   - 检查Node.js版本兼容性

2. **验证构建输出**
   - `server/dist/index.js` 必须存在
   - `client/dist/` 目录必须存在

3. **检查环境配置**
   - 确保NODE_ENV=production
   - 验证其他必需的环境变量

## 预期结果

✅ **健康检查通过**: `/health` 返回200状态码  
✅ **应用可访问**: 主页面正常加载  
✅ **API正常**: `/api` 端点响应正常  
✅ **WebSocket连接**: 实时功能正常工作

## 监控和维护

### 1. 日志监控
```bash
railway logs --tail
```

### 2. 性能监控
- 检查响应时间
- 监控内存使用
- 观察错误率

### 3. 定期检查
- 健康检查端点状态
- API响应性能
- WebSocket连接稳定性

## 联系支持

如果问题持续存在：
1. 收集详细的错误日志
2. 记录重现步骤
3. 检查Railway服务状态
4. 联系Railway技术支持

---

**最后更新**: 2024年12月
**版本**: 2.0 (健康检查修复版) 