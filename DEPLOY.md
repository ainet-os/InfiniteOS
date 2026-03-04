# InfiniteOS 部署指南

## 快速部署

使用自动化部署脚本一键部署到远程服务器：

```bash
./deploy.sh <目标IP> <用户名> <密码>
```

### 示例

```bash
./deploy.sh 192.168.4.224 root 'clouds*#123'
```

## 部署脚本功能

1. **自动安装Node.js**：如果目标服务器没有Node.js，会自动安装Node.js 20.x
2. **克隆/更新代码**：从GitHub自动克隆或更新项目代码
3. **安装依赖**：自动安装后端和前端的所有依赖包
4. **创建启动脚本**：自动创建启动、停止、重启脚本

## 部署后的操作

部署完成后，在目标服务器上执行：

```bash
cd /root/iosm

# 启动服务
./start-backend.sh   # 启动后端服务（端口3000）
./start-frontend.sh  # 启动前端服务（端口8080）

# 或者一键重启
./restart.sh

# 停止服务
./stop.sh
```

## 访问地址

部署成功后，可以通过以下地址访问：

- **后端API**: `http://<目标IP>:3000/api`
- **前端界面**: `http://<目标IP>:8080`

## 查看日志

```bash
# 后端日志
tail -f /tmp/iosm-backend.log

# 前端日志
tail -f /tmp/iosm-frontend.log
```

## 手动部署

如果不使用自动化脚本，可以手动执行以下步骤：

### 1. 安装Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
```

### 2. 克隆项目

```bash
cd /root
git clone https://github.com/ainet-os/InfiniteOS.git iosm
cd iosm
```

### 3. 安装依赖

```bash
# 后端依赖
cd backend
npm install

# 前端依赖
cd ../frontend
npm install
```

### 4. 启动服务

```bash
# 后端
cd /root/iosm/backend
export PORT=3000
nohup node server.js > /tmp/iosm-backend.log 2>&1 &

# 前端
cd /root/iosm/frontend
nohup npm run dev > /tmp/iosm-frontend.log 2>&1 &
```

## 系统要求

- **操作系统**: Ubuntu 20.04+ / Debian 10+
- **Node.js**: 20.x 或更高版本
- **内存**: 至少 2GB RAM
- **磁盘**: 至少 5GB 可用空间

## 注意事项

1. 确保目标服务器可以访问GitHub（用于克隆代码）
2. 确保目标服务器的3000和8080端口未被占用
3. 如果使用SSH密钥认证，可以修改脚本使用密钥而不是密码
4. 生产环境建议使用PM2或systemd管理服务进程

## 故障排查

### 服务无法启动

1. 检查端口是否被占用：
   ```bash
   netstat -tlnp | grep -E ':3000|:8080'
   ```

2. 查看日志文件：
   ```bash
   tail -50 /tmp/iosm-backend.log
   tail -50 /tmp/iosm-frontend.log
   ```

3. 检查Node.js版本：
   ```bash
   node --version
   npm --version
   ```

### 依赖安装失败

1. 清除npm缓存：
   ```bash
   npm cache clean --force
   ```

2. 删除node_modules重新安装：
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```



