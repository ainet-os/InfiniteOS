#!/bin/bash
echo "测试登录API..."
echo ""
echo "1. 直接访问后端:"
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"root","password":"test"}' | jq . || echo "失败"
echo ""
echo "2. 通过前端代理访问:"
curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"root","password":"test"}' | jq . || echo "失败"
echo ""
echo "3. 通过外部IP访问前端代理:"
curl -s -X POST http://192.168.4.39:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"root","password":"test"}' | jq . || echo "失败"
