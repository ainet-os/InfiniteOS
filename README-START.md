# InfiniteOS 启动指南

## 快速启动

### 1. 启动后端服务

```bash
# 方式1: 使用启动脚本
./start-backend.sh

# 方式2: 手动启动
cd backend
npm install  # 首次运行需要安装依赖
npm start
```

后端服务将运行在: `http://localhost:3000`

### 2. 启动前端服务

```bash
cd frontend
npm install  # 首次运行需要安装依赖
npm run dev
```

前端服务将运行在: `http://localhost:5173`

## 配置说明

### 后端配置

- 默认端口: `3000`
- API路径: `/api`
- 环境变量: 可在 `backend/.env` 中配置

### 前端配置

- 默认端口: `5173`
- API地址: 在 `frontend/.env` 中配置 `VITE_API_BASE_URL=http://localhost:3000/api`

## 登录说明

- 使用Linux系统账号登录（如：root）
- 密码为Linux系统账号密码
- 认证方式：PAM（Pluggable Authentication Modules）

## 常见问题

### 1. Network Error

**问题**: 前端提示 Network Error

**解决方案**:
- 检查后端服务是否运行: `curl http://localhost:3000/api/health`
- 检查端口是否被占用: `netstat -tlnp | grep 3000`
- 检查前端.env配置是否正确

### 2. 后端服务无法启动

**解决方案**:
- 检查Node.js版本: `node --version` (需要 >= 18)
- 检查依赖是否安装: `cd backend && npm install`
- 查看错误日志

### 3. 登录失败

**解决方案**:
- 确认使用正确的Linux系统账号和密码
- 检查PAM认证是否正常: `pamtester login root authenticate`
- 查看后端日志

## 服务管理

### 后台运行后端服务

```bash
cd backend
nohup npm start > backend.log 2>&1 &
```

### 停止后端服务

```bash
# 查找进程
ps aux | grep "node.*server.js"

# 停止进程
kill <PID>
```

### 查看后端日志

```bash
tail -f backend/backend.log
```

