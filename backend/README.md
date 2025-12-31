# InfiniteOS Backend API

InfiniteOS 后端API服务器，面向云边端一体化场景，提供完整的设备管理功能。

## 功能模块

### 1. 认证模块 (`/api/auth`)
- `POST /api/auth/login` - 用户登录

### 2. 系统模块 (`/api/system`)
- `GET /api/system/info` - 获取系统信息
- `GET /api/system/metrics` - 获取系统实时指标

### 3. 算力模块 (`/api/compute`)
- `GET /api/compute` - 获取算力资源列表
- `GET /api/compute/:id` - 获取设备详情

### 4. 虚拟机模块 (`/api/virtual-machines`)
- `GET /api/virtual-machines` - 获取虚拟机列表
- `GET /api/virtual-machines/:name` - 获取虚拟机详情
- `POST /api/virtual-machines` - 创建虚拟机
- `POST /api/virtual-machines/:name/start` - 启动虚拟机
- `POST /api/virtual-machines/:name/stop` - 停止虚拟机
- `POST /api/virtual-machines/:name/restart` - 重启虚拟机
- `POST /api/virtual-machines/:name/suspend` - 暂停虚拟机
- `POST /api/virtual-machines/:name/resume` - 恢复虚拟机
- `DELETE /api/virtual-machines/:name` - 删除虚拟机
- `GET /api/virtual-machines/:name/monitoring` - 获取监控数据

### 5. 容器模块 (`/api/containers`)
- `GET /api/containers` - 获取容器列表
- `GET /api/containers/:id` - 获取容器详情
- `POST /api/containers` - 创建容器
- `POST /api/containers/import` - 导入容器
- `POST /api/containers/:id/start` - 启动容器
- `POST /api/containers/:id/stop` - 停止容器
- `POST /api/containers/:id/restart` - 重启容器
- `DELETE /api/containers/:id` - 删除容器
- `GET /api/containers/:id/logs` - 获取容器日志
- `GET /api/containers/:id/monitoring` - 获取监控数据
- `GET /api/containers/images/list` - 获取镜像列表
- `POST /api/containers/images/pull` - 拉取镜像

### 6. 模型模块 (`/api/models`)
- `GET /api/models` - 获取模型列表
- `GET /api/models/:id` - 获取模型详情
- `POST /api/models/upload` - 上传模型
- `POST /api/models/sync` - 同步模型
- `DELETE /api/models/:id` - 删除模型
- `GET /api/models/config/repository` - 获取仓库配置
- `PUT /api/models/config/repository` - 更新仓库配置

### 7. 网络模块 (`/api/network`)
- `GET /api/network/interfaces` - 获取网络接口列表
- `GET /api/network/stats` - 获取网络统计信息

### 8. 存储模块 (`/api/storage`)
- `GET /api/storage/disks` - 获取存储磁盘列表
- `GET /api/storage/stats` - 获取存储统计信息

### 9. 服务模块 (`/api/services`)
- `GET /api/services` - 获取服务列表
- `GET /api/services/:name` - 获取服务详情
- `POST /api/services/:name/start` - 启动服务
- `POST /api/services/:name/stop` - 停止服务
- `POST /api/services/:name/restart` - 重启服务
- `GET /api/services/:name/logs` - 获取服务日志

### 10. 日志模块 (`/api/logs`)
- `GET /api/logs` - 获取系统日志（支持service、level、since、until、lines、search参数）

### 11. 用户模块 (`/api/users`)
- `GET /api/users` - 获取用户列表
- `GET /api/users/:username` - 获取用户详情
- `POST /api/users` - 创建用户
- `PUT /api/users/:username` - 更新用户
- `DELETE /api/users/:username` - 删除用户

### 12. k3s资源模块 (`/api/k8s`)
- **Pods**: `GET /api/k8s/pods`, `GET /api/k8s/pods/:namespace/:name`, `DELETE /api/k8s/pods/:namespace/:name`, `GET /api/k8s/pods/:namespace/:name/logs`
- **Deployments**: `GET /api/k8s/deployments`, `GET /api/k8s/deployments/:namespace/:name`, `POST /api/k8s/deployments/:namespace/:name/scale`, `DELETE /api/k8s/deployments/:namespace/:name`
- **Services**: `GET /api/k8s/services`, `GET /api/k8s/services/:namespace/:name`, `DELETE /api/k8s/services/:namespace/:name`
- **ConfigMaps**: `GET /api/k8s/configmaps`, `GET /api/k8s/configmaps/:namespace/:name`, `POST /api/k8s/configmaps`, `DELETE /api/k8s/configmaps/:namespace/:name`
- **Secrets**: `GET /api/k8s/secrets`, `GET /api/k8s/secrets/:namespace/:name`, `POST /api/k8s/secrets`, `DELETE /api/k8s/secrets/:namespace/:name`

## 安装和运行

### 1. 安装依赖
```bash
cd backend
npm install
```

### 2. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 文件，设置JWT_SECRET等配置
```

### 3. 启动服务器
```bash
npm start
# 或开发模式
npm run dev
```

服务器将在 `http://localhost:3000` 启动。

## 系统要求

后端需要以下系统工具：
- `virsh` - 虚拟机管理（可选）
- `docker` 或 `podman` - 容器管理（可选）
- `kubectl` - k3s资源管理（可选）
- `systemctl` - 服务管理
- `journalctl` - 日志查看
- `nvidia-smi` - NVIDIA GPU检测（可选）
- `rocm-smi` - AMD GPU检测（可选）

## 技术栈

- **Express.js** - Web框架
- **systeminformation** - 系统信息获取
- **jsonwebtoken** - JWT认证
- **child_process** - 系统命令执行

## 参考

部分实现参考了 [Cockpit](https://cockpit-project.org/) 项目的设计思路。

