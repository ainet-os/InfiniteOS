#!/bin/bash
# 停止测试环境（仅停止 3001 后端与 8090 前端，不影响生产 3000/8080）

echo "停止测试环境..."

if [ -f /tmp/iosm-test-backend.pid ]; then
    kill $(cat /tmp/iosm-test-backend.pid) 2>/dev/null && rm /tmp/iosm-test-backend.pid && echo "✅ 测试后端(3001)已停止"
fi
if [ -f /tmp/iosm-test-frontend.pid ]; then
    kill $(cat /tmp/iosm-test-frontend.pid) 2>/dev/null && rm /tmp/iosm-test-frontend.pid && echo "✅ 测试前端(8090)已停止"
fi

# 按端口清理残留进程（仅 3001、8090，不影响生产 3000/8080）
for port in 3001 8090; do
  pid=$(lsof -ti :$port 2>/dev/null)
  [ -n "$pid" ] && kill $pid 2>/dev/null && echo "✅ 端口 $port 已释放"
done
echo "✅ 测试环境已停止"
