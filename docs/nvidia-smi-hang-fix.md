# nvidia-smi 卡住无输出 — 排查与修复

## 现象

- 终端执行 `nvidia-smi` 无输出、卡住
- 算力管理页面显示「未检测到算力设备」
- 系统中有多张 NVIDIA GPU（如 6× 2080 Ti），且 `/dev/nvidia0`～`/dev/nvidia5` 存在

## 常见原因

在多 GPU 环境下，若 **NVIDIA 持久化模式（Persistence Mode）未开启**，驱动会做省电管理，导致 `nvidia-smi` 在访问 GPU 时长时间等待设备响应而卡住。  
当前若存在大量卡住的 `nvidia-smi` 进程，会加重驱动/设备竞争，使问题更明显。

## 处理步骤

### 1. 开启持久化模式（推荐，治本）

在**有 NVIDIA GPU 的本机**执行：

```bash
sudo nvidia-smi -pm 1
```

- 若提示已启用或执行成功，再在终端执行一次 `nvidia-smi`，应能正常输出。
- 若本机有 **nvidia-persistenced** 且以 `--no-persistence-mode` 运行，可能与 `-pm 1` 冲突，可先停掉再开持久化：
  ```bash
  sudo systemctl stop nvidia-persistenced   # 若有该服务
  sudo nvidia-smi -pm 1
  ```

### 2. 清理已卡住的 nvidia-smi 进程

若之前多次调用导致大量卡住的进程，可先尝试清理：

```bash
# 尝试按名称结束
pkill -9 -f nvidia-smi
```

若进程处于 **D 状态（不可中断睡眠）**，`kill -9` 也可能无效，需要**重启本机**后才能完全清掉，重启后再执行一次：

```bash
sudo nvidia-smi -pm 1
```

### 3. 验证

```bash
nvidia-smi
# 或
nvidia-smi -L
```

能正常列出多张 GPU 且不卡住，即说明修复有效。之后算力管理页面刷新后应能正常显示设备。

## 本项目的兜底逻辑

- 后端调用 `nvidia-smi` 时已加 **8 秒超时**，避免接口一直卡死。
- 当 `nvidia-smi` 超时或失败时，会**自动用 lspci 兜底**，至少能列出 GPU 数量与型号（算力等详情可能显示为「需要安装相应驱动和工具」）。
- 建议在服务器上执行一次 `sudo nvidia-smi -pm 1` 并视情况重启，以便后续用完整 `nvidia-smi` 数据展示算力信息。
