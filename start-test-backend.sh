#!/bin/bash
# InfiniteOS 测试环境 - 后端 (端口 3001，与生产 3000 分离)

cd "$(dirname "$0")/backend"

echo "🚀 启动 InfiniteOS 测试环境后端 (端口 3001)..."
echo ""

if ! command -v node &> /dev/null; then
    echo "❌ 未找到 Node.js，请先安装"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

export PORT=3001
export NODE_ENV=development
npm start
