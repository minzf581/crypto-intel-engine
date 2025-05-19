#!/bin/bash

# 定义要检查的端口
PORTS=(3000 5000 5001)

# 输出彩色文本的函数
print_green() {
  echo -e "\033[0;32m$1\033[0m"
}

print_yellow() {
  echo -e "\033[0;33m$1\033[0m"
}

print_red() {
  echo -e "\033[0;31m$1\033[0m"
}

print_green "========================================================"
print_green "    加密货币情报引擎 - 清理脚本"
print_green "========================================================"
echo ""

# 杀死占用特定端口的进程
for PORT in "${PORTS[@]}"; do
  print_yellow "检查端口 $PORT 是否被占用..."
  PID=$(lsof -t -i:$PORT)
  
  if [ ! -z "$PID" ]; then
    print_yellow "发现端口 $PORT 被进程 $PID 占用，正在终止该进程..."
    kill -9 $PID
    sleep 2
    
    # 再次检查
    CHECK_PID=$(lsof -t -i:$PORT)
    if [ ! -z "$CHECK_PID" ]; then
      print_red "无法终止进程，请尝试手动终止: kill -9 $CHECK_PID"
    else
      print_green "进程已终止，端口 $PORT 已释放"
    fi
  else
    print_green "端口 $PORT 未被占用"
  fi
done

# 杀死可能的node进程
print_yellow "清理所有可能的Node.js服务进程..."
pkill -f "node.*index.ts" || true
pkill -f "nodemon" || true
pkill -f "ts-node" || true
sleep 1

# 检查SQLite文件锁
print_yellow "检查SQLite数据库锁..."
DB_PATH="server/data/crypto-intel.sqlite"

if [ -f "$DB_PATH" ]; then
  print_yellow "解除数据库文件锁..."
  fuser -k "$DB_PATH" 2>/dev/null || true
  sleep 1
  print_green "完成"
else
  print_green "数据库文件不存在，无需解锁"
fi

print_green "清理完成。现在可以重新运行 ./start-service.sh 启动应用" 