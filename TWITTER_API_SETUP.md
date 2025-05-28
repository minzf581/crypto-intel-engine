# Twitter API 配置指南

## ⚠️ 重要提醒

**本系统严禁使用模拟/演示数据，因为会误导投资者并可能导致法律纠纷。**
系统已完全移除所有模拟数据回退机制，只能使用真实的Twitter API数据。

## 1. 获取Twitter API访问权限

### 申请开发者账户
1. 访问 [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. 使用Twitter账户登录
3. 申请开发者访问权限
4. 填写应用详情和使用目的

### 创建应用
1. 在开发者控制台创建新应用
2. 获取以下凭证：
   - **Bearer Token** (必需)
   - **Client ID** (可选，用于OAuth)
   - **Client Secret** (可选，用于OAuth)

## 2. 配置环境变量

### 方法1：直接设置环境变量
```bash
export TWITTER_BEARER_TOKEN="your-bearer-token-here"
export TWITTER_CLIENT_ID="your-client-id-here"
export TWITTER_CLIENT_SECRET="your-client-secret-here"
```

### 方法2：创建.env文件
在项目根目录创建`.env`文件：
```env
# Twitter API Configuration (REQUIRED)
TWITTER_BEARER_TOKEN=your-bearer-token-here
TWITTER_CLIENT_ID=your-client-id-here
TWITTER_CLIENT_SECRET=your-client-secret-here

# Other configuration
NODE_ENV=development
PORT=5001
JWT_SECRET=your-jwt-secret-here
DATABASE_URL=
CORS_ORIGIN=http://localhost:3000
```

## 3. API权限要求

### 必需的API访问级别
- **Essential Access** (免费) - 基础搜索功能
- **Elevated Access** (免费，需申请) - 增强搜索和用户查找
- **Academic Research** (免费，需申请) - 高级搜索和历史数据

### 推荐权限配置
- **Read** permissions for tweets and users
- **Tweet.read** scope
- **Users.read** scope
- **Offline.access** scope (如果使用OAuth)

## 4. 验证配置

### 检查环境变量
```bash
echo "Bearer Token: ${TWITTER_BEARER_TOKEN:-NOT SET}"
```

### 测试API连接
启动服务器后访问：
```
GET /api/social-sentiment/search-accounts-query?query=Bitcoin&limit=1
```

应该返回真实的Twitter数据，而不是错误信息。

## 5. 错误处理

### 常见错误及解决方案

#### 1. 认证失败 (401)
```
Twitter API authentication failed. Please check TWITTER_BEARER_TOKEN configuration.
```
**解决方案**: 检查Bearer Token是否正确设置

#### 2. 权限不足 (403)
```
Twitter API access forbidden. Please check API permissions and endpoints.
```
**解决方案**: 确保应用有适当的权限级别

#### 3. 速率限制 (429)
```
Twitter API rate limit exceeded. Please wait before making more requests.
```
**解决方案**: 等待速率限制重置，或升级API访问级别

#### 4. 未配置API
```
Twitter API Bearer Token is required. Demo data is prohibited for financial applications.
```
**解决方案**: 设置TWITTER_BEARER_TOKEN环境变量

## 6. API限制和配额

### 免费级别限制
- **Tweet searches**: 300 requests per 15-minute window
- **User lookups**: 300 requests per 15-minute window
- **User timeline**: 1,500 tweets per month

### 提高配额
1. 申请Elevated Access
2. 考虑Academic Research Access (如果符合条件)
3. 联系Twitter API支持团队

## 7. 最佳实践

### 错误处理
- 系统会在API失败时提供详细错误信息
- **不会**回退到模拟数据
- 建议实现客户端错误处理

### 缓存策略
- 实现适当的缓存机制减少API调用
- 缓存用户信息和推文数据
- 遵守Twitter的缓存政策

### 监控使用情况
- 监控API使用量和剩余配额
- 实现速率限制处理
- 记录API错误和性能指标

## 8. 合规要求

### Twitter API政策
- 遵守Twitter开发者协议
- 正确归属数据来源
- 实施数据保护措施

### 金融应用要求
- **绝对禁止**使用模拟/演示数据
- 确保数据准确性和实时性
- 实施适当的免责声明

## 9. 故障排除

### 调试步骤
1. 检查环境变量是否正确设置
2. 验证Bearer Token是否有效
3. 确认应用权限配置
4. 检查网络连接和防火墙设置
5. 查看服务器日志获取详细错误信息

### 日志检查
服务器启动时会显示：
```
Twitter service initialized with real API token
```

如果看到错误信息，请按照错误提示解决配置问题。

## 10. 支持联系

如果遇到配置问题：
1. 检查Twitter开发者文档
2. 验证API权限设置
3. 确保环境变量正确配置
4. 查看系统错误日志获取详细信息

**记住：本系统设计用于生产环境，不允许使用任何形式的模拟数据。** 