#!/bin/bash
# InfiniteOS 部署脚本
# 用于将项目部署到远程服务器
# 使用方法: ./deploy.sh <目标IP> <用户名> <密码>

set -e

# 参数检查
if [ $# -lt 3 ]; then
    echo "使用方法: $0 <目标IP> <用户名> <密码>"
    echo "示例: $0 192.168.4.224 root 'password'"
    exit 1
fi

TARGET_HOST="$1"
TARGET_USER="$2"
TARGET_PASS="$3"
PROJECT_DIR="/root/iosm"
GIT_REPO="https://github.com/ainet-os/InfiniteOS.git"

echo "🚀 开始部署到 $TARGET_HOST..."

# 检查sshpass是否安装
if ! command -v sshpass &> /dev/null; then
    echo "安装sshpass..."
    apt-get update -qq
    apt-get install -y sshpass
fi

# 1. 安装Node.js和npm
echo "📦 检查并安装Node.js..."
sshpass -p "$TARGET_PASS" ssh -o StrictHostKeyChecking=no $TARGET_USER@$TARGET_HOST << 'REMOTE_SCRIPT'
set -e

# 检查Node.js是否已安装
if command -v node &> /dev/null && command -v npm &> /dev/null; then
    echo "Node.js已安装: $(node --version)"
    echo "npm已安装: $(npm --version)"
else
    echo "安装Node.js..."
    # 使用NodeSource仓库安装Node.js 20.x
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    
    echo "✅ Node.js安装完成: $(node --version)"
    echo "✅ npm安装完成: $(npm --version)"
fi
REMOTE_SCRIPT

# 2. 检查并克隆/更新项目
echo "📦 检查项目目录..."
sshpass -p "$TARGET_PASS" ssh -o StrictHostKeyChecking=no $TARGET_USER@$TARGET_HOST << 'REMOTE_SCRIPT'
set -e
cd /root

if [ -d "iosm" ]; then
    echo "项目目录已存在，更新代码..."
    cd iosm
    # 先尝试使用HTTPS克隆
    if [ -d ".git" ]; then
        git fetch origin || true
        git reset --hard origin/main || git pull origin main
        git clean -fd
    else
        rm -rf iosm
        git clone https://github.com/ainet-os/InfiniteOS.git iosm
        cd iosm
    fi
else
    echo "克隆项目..."
    git clone https://github.com/ainet-os/InfiniteOS.git iosm
    cd iosm
fi

echo "✅ 代码更新完成，当前提交: $(git log -1 --oneline)"
REMOTE_SCRIPT

# 3. 安装后端依赖
echo "📦 安装后端依赖..."
sshpass -p "$TARGET_PASS" ssh -o StrictHostKeyChecking=no $TARGET_USER@$TARGET_HOST << 'REMOTE_SCRIPT'
set -e
cd /root/iosm/backend

echo "安装后端依赖..."
npm install --production=false

echo "✅ 后端依赖安装完成"
REMOTE_SCRIPT

# 4. 安装前端依赖
echo "📦 安装前端依赖..."
sshpass -p "$TARGET_PASS" ssh -o StrictHostKeyChecking=no $TARGET_USER@$TARGET_HOST << 'REMOTE_SCRIPT'
set -e
cd /root/iosm/frontend

echo "安装前端依赖..."
npm install

echo "✅ 前端依赖安装完成"
REMOTE_SCRIPT

# 5. 创建启动脚本
echo "📝 创建启动脚本..."
sshpass -p "$TARGET_PASS" ssh -o StrictHostKeyChecking=no $TARGET_USER@$TARGET_HOST << 'REMOTE_SCRIPT'
set -e
cd /root/iosm

# 创建后端启动脚本
cat > start-backend.sh << 'EOF'
#!/bin/bash
cd /root/iosm/backend
export PORT=3000
export NODE_ENV=production
# 停止旧进程
pkill -f "node.*server.js" 2>/dev/null || true
sleep 1
# 启动新进程
nohup node server.js > /tmp/iosm-backend.log 2>&1 &
echo $! > /tmp/iosm-backend.pid
sleep 2
if ps -p $(cat /tmp/iosm-backend.pid) > /dev/null 2>&1; then
    echo "✅ 后端服务已启动，PID: $(cat /tmp/iosm-backend.pid)"
    echo "   日志: tail -f /tmp/iosm-backend.log"
else
    echo "❌ 后端服务启动失败，查看日志: tail -f /tmp/iosm-backend.log"
    exit 1
fi
EOF

# 创建前端启动脚本
cat > start-frontend.sh << 'EOF'
#!/bin/bash
cd /root/iosm/frontend
# 停止旧进程
pkill -f "vite" 2>/dev/null || true
sleep 1
# 启动新进程
nohup npm run dev > /tmp/iosm-frontend.log 2>&1 &
echo $! > /tmp/iosm-frontend.pid
sleep 3
if ps -p $(cat /tmp/iosm-frontend.pid) > /dev/null 2>&1; then
    echo "✅ 前端服务已启动，PID: $(cat /tmp/iosm-frontend.pid)"
    echo "   日志: tail -f /tmp/iosm-frontend.log"
else
    echo "❌ 前端服务启动失败，查看日志: tail -f /tmp/iosm-frontend.log"
    exit 1
fi
EOF

# 创建停止脚本
cat > stop.sh << 'EOF'
#!/bin/bash
echo "停止服务..."
if [ -f /tmp/iosm-backend.pid ]; then
    kill $(cat /tmp/iosm-backend.pid) 2>/dev/null && rm /tmp/iosm-backend.pid && echo "✅ 后端服务已停止"
fi
if [ -f /tmp/iosm-frontend.pid ]; then
    kill $(cat /tmp/iosm-frontend.pid) 2>/dev/null && rm /tmp/iosm-frontend.pid && echo "✅ 前端服务已停止"
fi
pkill -f "node.*server.js" 2>/dev/null && echo "✅ 清理后端进程"
pkill -f "vite" 2>/dev/null && echo "✅ 清理前端进程"
echo "✅ 所有服务已停止"
EOF

# 创建重启脚本
cat > restart.sh << 'EOF'
#!/bin/bash
cd /root/iosm
./stop.sh
sleep 2
./start-backend.sh
sleep 2
./start-frontend.sh
echo ""
echo "✅ 服务重启完成"
echo "   后端: http://$(hostname -I | awk '{print $1}'):3000"
echo "   前端: http://$(hostname -I | awk '{print $1}'):8080"
EOF

chmod +x start-backend.sh start-frontend.sh stop.sh restart.sh
echo "✅ 启动脚本创建完成"
REMOTE_SCRIPT

echo ""
echo "✅ 部署完成！"
echo ""
echo "在目标设备上运行以下命令："
echo "  cd /root/iosm"
echo "  ./start-backend.sh   # 启动后端服务"
echo "  ./start-frontend.sh  # 启动前端服务"
echo "  ./restart.sh         # 重启所有服务"
echo "  ./stop.sh            # 停止所有服务"
echo ""
echo "访问地址："
echo "  后端API: http://$TARGET_HOST:3000/api"
echo "  前端界面: http://$TARGET_HOST:8080"

