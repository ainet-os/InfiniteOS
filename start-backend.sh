#!/bin/bash

# InfiniteOS 后端服务启动脚本

cd "$(dirname "$0")/backend"

echo "🚀 启动 InfiniteOS 后端服务..."
echo ""

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js，请先安装 Node.js"
    exit 1
fi

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

# 启动服务
echo "✅ 启动后端服务..."
npm start

