# Railway Environment Variables Setup

## 必需的环境变量

在Railway项目设置中，确保设置以下环境变量：

### 基础配置
```
NODE_ENV=production
HOST=0.0.0.0
PORT=5001
```

### 数据库配置 (Railway会自动提供)
```
DATABASE_URL=${DATABASE_URL}  # Railway自动设置
```

### CORS配置
```
CORS_ORIGIN=${RAILWAY_PUBLIC_DOMAIN}
```

### 可选的API配置 (如果需要外部API)
```
COINGECKO_API_KEY=your_api_key_here
NEWS_API_KEY=your_api_key_here
TWITTER_BEARER_TOKEN=your_token_here
```

## Railway CLI 设置命令

如果使用Railway CLI，可以运行以下命令：

```bash
# 基础环境变量
railway variables set NODE_ENV=production
railway variables set HOST=0.0.0.0
railway variables set PORT=5001

# CORS配置
railway variables set CORS_ORIGIN=$RAILWAY_PUBLIC_DOMAIN
```

## 验证环境变量

部署后，访问 `/health` 端点查看环境变量是否正确设置：

```
GET https://your-app.railway.app/health
```

响应应该包含：
```json
{
  "status": "OK",
  "env": "production",
  "host": "0.0.0.0",
  "port": "5001",
  "railway": {
    "environment": "production",
    "service_id": "...",
    "project_id": "..."
  }
}
```

## 故障排除

如果健康检查仍然失败：

1. **检查端口绑定**：确保 `HOST=0.0.0.0`
2. **检查健康检查路径**：确保 `/health` 端点可访问
3. **检查启动时间**：服务器可能需要更多时间启动
4. **查看日志**：在Railway控制台查看详细日志

## 部署后验证

1. 访问根路径：`https://your-app.railway.app/`
2. 访问健康检查：`https://your-app.railway.app/health`
3. 检查API：`https://your-app.railway.app/api/health`

所有端点都应该返回200状态码。 