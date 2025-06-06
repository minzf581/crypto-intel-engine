# 🌐 前端访问指南

## ✅ 当前系统状态

### 🚀 服务运行状态
- **前端应用**: ✅ 正常运行在 `http://localhost:3002/`
- **后端API**: ✅ 正常运行在 `http://localhost:5001/`
- **数据库**: ✅ SQLite 连接正常

> **重要提示**: 前端运行在端口 **3002**，不是 3000！

## 🔐 正确的访问方式

### 1. 访问登录页面
```
http://localhost:3002/
```
或者直接访问登录页面：
```
http://localhost:3002/login
```

### 2. 默认测试账户
根据后端日志，系统已创建了演示用户：
- **邮箱**: `demo@example.com`
- **密码**: `password123`

### 3. 注册新账户
如果需要创建新账户，访问：
```
http://localhost:3002/register
```

## 🛠️ 路由结构

前端应用的路由配置：

```
/ (根路径)
├── / → 重定向到 /login
├── /login → 登录页面
├── /register → 注册页面
├── /dashboard → 仪表盘 (需要认证)
├── /settings → 设置 (需要认证)
└── /onboarding → 新手引导 (需要认证)
```

## 🔧 故障排除

### 问题1: 页面无法加载
**症状**: 访问 `http://localhost:3000/` 无响应

**解决方案**: 
使用正确的端口访问：`http://localhost:3002/`

### 问题2: 登录失败
**可能原因**:
1. 后端服务未启动
2. 数据库连接问题
3. 凭据错误

**检查步骤**:
1. 确认后端API响应：
   ```bash
   curl http://localhost:5001/api/dashboard/data
   ```

2. 使用演示账户登录：
   - 邮箱: `demo@example.com`
   - 密码: `password123`

### 问题3: 前端组件错误
**症状**: 控制台显示 "Failed to resolve import" 错误

**状态**: ✅ 已修复 - `api.ts` 文件已创建

## 🎯 快速测试流程

1. **打开浏览器**，访问 `http://localhost:3002/`

2. **使用演示账户登录**:
   - 邮箱: `demo@example.com`
   - 密码: `password123`

3. **成功登录后**，您将看到：
   - 实时加密货币价格监控
   - 数据源状态面板
   - 交易量分析
   - 新闻情感分析
   - 增强通知中心

## 📱 功能特性

登录成功后，仪表盘包含以下功能：

### 🔄 实时数据监控
- 8种加密货币的实时价格
- 30秒自动刷新数据源状态
- 2分钟刷新交易量分析
- 5分钟刷新新闻分析

### 📊 数据分析面板
- **价格监控**: Bitcoin, Ethereum, BNB, Solana 等
- **数据源状态**: 价格监控、社交情绪、新闻分析、技术分析
- **交易量分析**: 异常交易量检测和趋势分析
- **新闻情感**: AI驱动的加密货币新闻情感分析

### 🔔 通知系统
- 增强通知中心
- 实时信号提醒
- 可自定义通知设置

## 🌐 网络配置

### 前端环境变量
- `VITE_API_URL`: `http://localhost:5001`
- 自动检测开发环境配置

### 后端CORS配置
允许的源地址：
```
http://localhost:3000
http://localhost:3001
http://localhost:3002
http://localhost:3003
http://localhost:3004
http://localhost:5001
```

## 🎉 成功访问确认

如果一切正常，您应该看到：

1. **登录页面**: 美观的渐变背景，带有 "Crypto Intelligence Engine" 标题
2. **登录成功**: 自动跳转到仪表盘
3. **仪表盘内容**: 实时价格卡片、分析面板、通知中心

## 📞 技术支持

如果仍然遇到问题，请检查：

1. **浏览器控制台** - 查看 JavaScript 错误
2. **网络标签** - 确认API请求状态
3. **服务器日志** - 查看后端错误信息

---

**最重要的提醒**: 请访问 `http://localhost:3002/` 而不是 `http://localhost:3000/` ！ 