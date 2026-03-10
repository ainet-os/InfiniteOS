# K3s 下 GPU 可见性与指定显卡部署

## 一、目标

1. **可见性**：在 k3s 里看到每个 worker 节点上有哪些 GPU 卡（型号、显存）。**通过节点标签即可获知显卡型号和显存大小**，即便同一节点上显卡型号一致，也保留这些标签便于查看与调度。
2. **指定用卡**：部署模型时指定 Pod 使用某节点上的「第几张卡」或「某张满足条件的卡」（例如 48G 显存的那张）。

---

## 二、方案概览

| 能力 | 做法 |
|------|------|
| 看到每节点有哪些 GPU | 用 **GPU 节点打标器** DaemonSet，在每台有 GPU 的节点跑 `nvidia-smi`，把每张卡信息写入 **Node Label**。 |
| 指定「用某张卡」 | 用 **Node 标签 + nodeSelector** 选「第一张卡满足条件的节点」，并 **request 1 个 `nvidia.com/gpu`**；当前 K8s 只暴露「数量」，拿到的那 1 张在多数实现里就是该节点的 **GPU 0**。 |
| 指定「用第 2/3 张卡」 | 标准 nvidia-device-plugin 只暴露 `nvidia.com/gpu` 数量，不暴露 `nvidia.com/gpu-0`、`gpu-1`，因此**无法在 Pod 里直接选「第 2 张」**。可选：该节点只暴露一张卡、或使用支持按设备暴露的插件/CDI。 |

**约定**：若同一 worker 节点上只部署**同型号 GPU**（例如全部为 4090），则只需用 nodeSelector 固定节点并 request `nvidia.com/gpu: 1`，无需按索引选卡。节点上的**显卡型号与显存仍通过上述标签获知**（`nvidia.com/gpu.<i>.name`、`nvidia.com/gpu.<i>.memory`）。

下面按「先可见、再按第一张卡选节点」的最优方案说明。

---

## 三、步骤 1：部署 GPU 节点打标器（可见性）

在 **k3s 控制平面**（或有 kubeconfig 的节点）执行：

```bash
kubectl apply -f gpu-node-labeler.yaml
```

该 DaemonSet 会：

- 在所有节点运行；无 GPU 或无法执行 `nvidia-smi` 的节点会跳过打标并 sleep。
- 用主机上的 `nvidia-smi` 查询 GPU 数量与每张卡的 name、memory。
- 给该 Node 打上标签，例如：
  - `nvidia.com/gpu.count=3`
  - `nvidia.com/gpu.0.name=NVIDIA-GeForce-RTX-4090`
  - `nvidia.com/gpu.0.memory=48Gi`
  - `nvidia.com/gpu.1.name=NVIDIA-GeForce-RTX-2080-Ti`
  - `nvidia.com/gpu.1.memory=22Gi`
  - …

打标完成后，**在 k3s 里看每个 worker 有哪些 GPU** 可以用下面命令。

### 3.1 通过标签获知显卡型号与显存

每个 GPU 节点上会写入如下标签，用于**获知显卡型号和显存大小**（同一节点同型号时同样保留，便于运维与调度）：

| 标签键 | 含义 | 示例 |
|--------|------|------|
| `nvidia.com/gpu.count` | 该节点 GPU 数量 | `3` |
| `nvidia.com/gpu.<i>.name` | 第 i 张卡的型号名 | `NVIDIA-GeForce-RTX-4090` |
| `nvidia.com/gpu.<i>.memory` | 第 i 张卡的显存大小 | `47Gi`、`22Gi` |

例如 `nvidia.com/gpu.0.name`、`nvidia.com/gpu.0.memory` 表示该节点第一张卡的型号与显存，其余卡类推。

---

## 四、在 K3s 里查看每个 Worker 的 GPU

```bash
# 看某节点所有 nvidia 相关 label
kubectl describe node <节点名> | grep nvidia.com/gpu

# 或按 key=value 列出
kubectl get node <节点名> -o jsonpath='{.metadata.labels}' | tr ',' '\n' | grep nvidia

# 看所有 GPU 节点的 GPU 数量与第一张卡显存
kubectl get nodes -l nvidia.com/gpu -o custom-columns=NAME:.metadata.name,GPU_COUNT:.metadata.labels.nvidia\.com/gpu\.count,GPU0:.metadata.labels.nvidia\.com/gpu\.0\.name,GPU0_MEM:.metadata.labels.nvidia\.com/gpu\.0\.memory
```

示例输出（片段）：

```text
NAME               GPU_COUNT   GPU0                        GPU0_MEM
4worker99.com      3           NVIDIA-GeForce-RTX-4090     48Gi
10worker223.com    1           NVIDIA-GeForce-RTX-3080     10Gi
```

这样就能在 k3s 里直接看到每个 worker 上有哪些 GPU 卡。

---

## 五、部署模型时如何「指定用哪张卡」

### 5.1 约定（重要）

- **nvidia-device-plugin** 只上报 `nvidia.com/gpu` 的**个数**，不区分 GPU 0/1/2。
- 调度器给 Pod「1 个 GPU」时，kubelet 一般把**该节点上的第一块未占用的 GPU** 分配给 Pod，在多数环境下即 **nvidia-smi 的 GPU 0**。
- 因此：**只要把 Pod 调度到「第一张卡就是你想要的那张」的节点，并 request 1 个 GPU，就能间接做到「用这张卡」。**
- **同一节点 GPU 型号一致时**：若该 worker 上只插同型号卡（如全部 4090），用 nodeSelector 固定节点 + `nvidia.com/gpu: 1` 即可，无需再按显存/索引选卡。

### 5.2 指定「用该节点上第一张 48G 的卡」

目标：Pod 只落在「第一张卡是 48G」的节点上，并占用那张卡。

在 Deployment 的 Pod 里加 **nodeSelector**（打标器会写上 `nvidia.com/gpu.0.memory=48Gi`）：

```yaml
spec:
  template:
    spec:
      nodeSelector:
        kubernetes.io/hostname: 4worker99.com   # 可选：再限定节点名
        nvidia.com/gpu.0.memory: "48Gi"         # 第一张卡必须是 48G
      containers:
        - name: vllm
          resources:
            limits:
              nvidia.com/gpu: "1"
```

这样会：

- 只调度到**带有 `nvidia.com/gpu.0.memory=48Gi`** 的节点（且 hostname 匹配时只会在 4worker99.com）。
- 请求 1 个 `nvidia.com/gpu`，实际拿到的一般就是该节点的 **GPU 0**，即 48G 那张。

### 5.3 指定「用该节点上第一张卡（不关心型号）」

不限制型号/显存，只要求是「某节点上的第一张」：

```yaml
spec:
  template:
    spec:
      nodeSelector:
        kubernetes.io/hostname: 4worker99.com
      containers:
        - name: vllm
          resources:
            limits:
              nvidia.com/gpu: "1"
```

### 5.4 指定「任意节点上第一张 22G 的卡」

例如专门用 22G 的卡跑小模型：

```yaml
nodeSelector:
  nvidia.com/gpu.0.memory: "22Gi"
resources:
  limits:
    nvidia.com/gpu: "1"
```

### 5.5 若 48G 卡不是 GPU 0（nvidia-smi 顺序）

若某节点上 nvidia-smi 顺序是：GPU 0 = 22G，GPU 1 = 48G，GPU 2 = 22G，则：

- 打标后会是：`gpu.0.memory=22Gi`，`gpu.1.memory=48Gi`，`gpu.2.memory=22Gi`。
- 用 `nvidia.com/gpu.0.memory: "48Gi"` 的 nodeSelector **不会**选中该节点（因为 GPU 0 是 22G）。
- 此时有两种做法：
  1. **改物理/驱动顺序**：在 BIOS/OS 或驱动里调整 GPU 顺序，让 48G 成为 GPU 0（推荐，一劳永逸）。
  2. **接受「按第一张卡选节点」**：只在「第一张卡已经是 48G」的节点上跑 48G 工作负载；其他节点用 `gpu.0.memory=22Gi` 等做小模型。

标准 device plugin **不能**在 Pod 里写「我要 GPU 1 不要 GPU 0」，只能通过「选节点 + 要 1 块 GPU」间接实现。

---

## 六、Qwen3-VL 示例（指定 48G 卡）

在 `qwen3-vl-32b-vllm.yaml` 的 Pod spec 中：

```yaml
spec:
  nodeSelector:
    kubernetes.io/hostname: 4worker99.com
    nvidia.com/gpu.0.memory: "48Gi"   # 确保用该节点上第一张 48G 卡
  runtimeClassName: nvidia
  containers:
    - name: vllm
      resources:
        limits:
          nvidia.com/gpu: "1"
```

这样在 4worker99.com 上会优先使用被打标为「第一张 48G」的那张卡；若该节点只有一张 48G 且为 GPU 0，则就是这张。

---

## 七、小结

| 需求 | 做法 |
|------|------|
| **通过标签获知节点显卡型号与显存** | 部署 `gpu-node-labeler.yaml` 后，节点会有 `nvidia.com/gpu.<i>.name`（型号）、`nvidia.com/gpu.<i>.memory`（显存）、`nvidia.com/gpu.count`（数量）；同节点同型号时也保留，便于查看与调度。 |
| 在 k3s 看到每个 worker 有哪些 GPU | 用 `kubectl describe node` / `kubectl get node ... -o custom-columns` 查看上述 `nvidia.com/gpu.*` 标签。 |
| 部署时指定「用某节点第一张 48G 卡」 | nodeSelector `nvidia.com/gpu.0.memory: "48Gi"` + `limits: nvidia.com/gpu: "1"`。 |
| 部署时指定「用某节点第一张 22G 卡」 | nodeSelector `nvidia.com/gpu.0.memory: "22Gi"` + `limits: nvidia.com/gpu: "1"`。 |
| 指定「用第 2 张卡」（GPU 1） | 需该节点 GPU 0 被其他 Pod 占用，或使用支持按设备索引的 device plugin/CDI；标准方案下不直接支持。 |

以上即为在 k3s 下**看到每个 worker 的 GPU** 以及**按「第一张卡」指定用哪张卡**的最优实践。
