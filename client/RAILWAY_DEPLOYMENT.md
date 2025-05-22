# 加密货币情报引擎 前端部署指南

本文档提供了在Railway平台上部署前端应用的步骤。

## 部署准备

已经为您准备了以下文件：

1. `railway.json` - Railway部署配置
2. `nixpacks.toml` - Nixpacks构建配置
3. `Procfile` - 应用启动配置
4. 更新了`package.json`添加serve依赖
5. 更新了`vite.config.ts`支持环境变量

## 部署步骤

### 在Railway平台创建新服务

1. 登录Railway平台 (https://railway.app/)
2. 点击"New Project"按钮
3. 选择"Deploy from GitHub repo"
4. 选择您的仓库

### 配置环境变量

在新项目的"Variables"选项卡中添加：

```
VITE_API_URL=https://crypto-demo.up.railway.app
PORT=3000
```

确保`VITE_API_URL`指向您的后端API地址。

### 自定义域名（可选）

1. 在"Settings"选项卡中找到"Domains"部分
2. 可以使用默认的*.up.railway.app域名或配置自定义域名

## 验证部署

部署完成后，通过生成的URL访问您的前端应用。验证以下功能：

1. 登录页面正常显示
2. 可以成功登录并导航到仪表板
3. API数据正确加载
4. WebSocket实时更新功能正常工作

## 问题排查

如果遇到问题：

1. 检查环境变量是否正确设置
2. 查看Railway的构建和部署日志
3. 确认API后端服务运行正常
4. 验证CORS设置允许前端域名访问 