#!/bin/bash

# 设置环境变量
export TWITTER_BEARER_TOKEN="AAAAAAAAAAAAAAAAAAAAAMwHxgEAAAAATkG26yjdHnbj5EJONgTGGmFTnVk%3DdTKzlXs6zyBOW1XhRgGCBqFYwMQwwDVCPBYyYNYTBx7ZFUJBfB"
export TWITTER_CLIENT_ID="LTlZS0JRc0twaWx1LWFmeEhkZEk6MTpjaQ"
export TWITTER_CLIENT_SECRET="VGKKcax8RwaKPhdWwxD_WwtFjQrXTMr1h2ZVF36CVD41RvyJQG"
export JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
export JWT_EXPIRES_IN="24h"
export PORT="5001"
export NODE_ENV="development"
export CLIENT_URL="http://localhost:3000"
export DATABASE_URL="sqlite:./data/crypto-intel.sqlite"
export RESET_DB="false"
export LOG_LEVEL="info"

echo "环境变量已设置"
echo "TWITTER_BEARER_TOKEN: ${TWITTER_BEARER_TOKEN:0:20}..."
echo "启动应用程序..."

# 启动应用程序
npm run dev 