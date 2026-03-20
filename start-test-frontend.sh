#!/bin/bash
# InfiniteOS 测试环境 - 前端 (端口 8090，API 代理到后端 3001)

cd "$(dirname "$0")/frontend"

echo "🚀 启动 InfiniteOS 测试环境前端 (端口 8090)..."
echo ""

if ! command -v node &> /dev/null; then
    echo "❌ 未找到 Node.js，请先安装"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

# 测试环境：前端 8090，后端代理到 3001
export VITE_DEV_PORT=8090
export VITE_DEV_BACKEND_URL=http://localhost:3001
npm run dev
