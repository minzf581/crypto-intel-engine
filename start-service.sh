#!/bin/bash

# 定义前端和后端端口
CLIENT_PORT=3000
SERVER_PORT=5001

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

# 杀死进程并验证函数
kill_and_verify() {
  local port=$1
  local pid=$(lsof -t -i:$port)
  
  if [ ! -z "$pid" ]; then
    print_yellow "发现端口 $port 被进程 $pid 占用，正在终止该进程..."
    kill -9 $pid
    sleep 2
    
    # 再次检查端口是否已释放
    local check_pid=$(lsof -t -i:$port)
    if [ ! -z "$check_pid" ]; then
      print_red "端口 $port 仍被进程 $check_pid 占用，尝试强制终止..."
      kill -9 $check_pid
      sleep 3
      
      # 最后检查
      check_pid=$(lsof -t -i:$port)
      if [ ! -z "$check_pid" ]; then
        print_red "警告：无法释放端口 $port，可能导致服务启动失败"
      else
        print_green "端口 $port 已成功释放"
      fi
    else
      print_green "端口 $port 已释放"
    fi
  else
    print_green "端口 $port 未被占用"
  fi
}

# 根据系统类型选择合适的sed命令
sed_inplace() {
  local pattern=$1
  local file=$2
  
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "$pattern" "$file"
  else
    # Linux 或其他系统
    sed -i "$pattern" "$file"
  fi
}

# 显示横幅
print_green "========================================================"
print_green "    加密货币情报引擎 - 启动脚本"
print_green "========================================================"
echo ""

# 检查并创建数据目录
if [ ! -d "server/data" ]; then
  print_yellow "创建数据目录..."
  mkdir -p server/data
fi

# 终止并检查可能占用端口的进程
print_yellow "检查端口使用情况..."

# 检查并杀死占用前端端口的进程
kill_and_verify $CLIENT_PORT

# 检查并杀死占用后端端口的进程
kill_and_verify $SERVER_PORT

# 确保没有可能正在运行的node进程
print_yellow "检查可能的node进程..."
pkill -f "node.*index.ts" 2>/dev/null || true
sleep 1

# 确保SQLite数据库文件不被锁定
print_yellow "确保数据库文件不被锁定..."
fuser -k server/data/crypto-intel.sqlite 2>/dev/null || true
sleep 1

# 检查数据库文件是否存在，询问是否重置
DB_FILE="server/data/crypto-intel.sqlite"
RESET_DB="false"

if [ -f "$DB_FILE" ]; then
  print_yellow "数据库文件已存在，是否重置数据库? (y/n)"
  read -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_yellow "将重置数据库..."
    rm -f "$DB_FILE"
    RESET_DB="true"
  else
    print_green "将使用现有数据库"
  fi
else
  print_yellow "数据库文件不存在，将创建新数据库"
  RESET_DB="true"
fi

# 检查.env文件是否存在，若不存在则创建
if [ ! -f "server/.env" ]; then
  print_yellow "未找到环境变量文件，正在创建默认.env文件..."
  cat > server/.env << EOL
# 服务器配置
PORT=5001
NODE_ENV=development

# 数据库配置
SQLITE_DB_PATH=data/crypto-intel.sqlite
RESET_DB=$RESET_DB

# JWT配置
JWT_SECRET=crypto-intel-secret-key-for-development
JWT_EXPIRES_IN=30d

# CORS配置
CORS_ORIGIN=http://localhost:3000

# 模拟信号配置
ENABLE_MOCK_SIGNALS=true
EOL
  print_green ".env文件已创建"
else
  # 更新现有的.env文件中的RESET_DB值
  print_yellow "更新环境变量文件中的RESET_DB值..."
  if grep -q "RESET_DB=" server/.env; then
    sed_inplace "s/RESET_DB=.*/RESET_DB=$RESET_DB/" server/.env
  else
    echo "RESET_DB=$RESET_DB" >> server/.env
  fi
  
  # 确保PORT值为5001
  if grep -q "PORT=" server/.env; then
    sed_inplace "s/PORT=.*/PORT=5001/" server/.env
  else
    echo "PORT=5001" >> server/.env
  fi
  
  print_green "环境变量已更新"
fi

# 检查依赖是否已安装
print_yellow "检查依赖是否已安装..."
if [ ! -d "node_modules" ] || [ ! -d "client/node_modules" ] || [ ! -d "server/node_modules" ]; then
  print_yellow "安装依赖..."
  npm install
else
  print_green "依赖已安装"
fi

# 启动应用
print_green "启动应用..."
npm run dev

# 脚本结束时清理
cleanup() {
  print_yellow "正在停止服务..."
  
  # 关闭前端和后端服务
  CLIENT_PID=$(lsof -t -i:$CLIENT_PORT)
  SERVER_PID=$(lsof -t -i:$SERVER_PORT)
  
  if [ ! -z "$CLIENT_PID" ]; then
    kill -9 $CLIENT_PID
  fi
  
  if [ ! -z "$SERVER_PID" ]; then
    kill -9 $SERVER_PID
  fi
  
  # 杀死所有可能的node进程
  pkill -f "node.*index.ts" 2>/dev/null || true
  
  print_green "服务已停止"
  exit 0
}

# 注册信号处理器
trap cleanup SIGINT SIGTERM

# 等待用户按Ctrl+C
wait 