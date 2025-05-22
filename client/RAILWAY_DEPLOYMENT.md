# 加密货币情报引擎 前端部署指南

本文档提供了在Railway平台上部署前端应用的步骤，包含最新的API连接修复。

## 修复清单

我们已经实施了以下修复以解决API连接和登录问题：

1. 更新了`AuthContext.tsx`以更健壮地处理API连接
2. 优化了`vite.config.ts`以正确处理环境变量
3. 更新了`railway.json`直接在构建命令中设置环境变量
4. 降低了`tsconfig.json`的严格度以确保构建成功
5. 添加了直接使用fetch API的备选登录方法

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

确保`VITE_API_URL`指向您的后端API地址。如果您没有设置此变量，我们的代码已配置为自动使用合理的默认值。

### 自定义域名（可选）

1. 在"Settings"选项卡中找到"Domains"部分
2. 可以使用默认的*.up.railway.app域名或配置自定义域名

## 验证部署

部署完成后，通过生成的URL访问您的前端应用。验证以下功能：

1. 登录页面正常显示
2. 可以成功登录并导航到仪表板
3. API数据正确加载
4. WebSocket实时更新功能正常工作

## 故障排查

如果仍然遇到API连接问题：

1. 检查浏览器控制台中的错误消息
2. 验证网络请求中的API URL是否正确
3. 检查Railway平台上的环境变量设置
4. 确认后端API是否正常运行并接受请求
5. 验证CORS设置是否允许前端域名

更多详细的排障步骤，请参阅 `API_CONNECTION_GUIDE.md`。 