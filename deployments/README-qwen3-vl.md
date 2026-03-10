# Qwen3-VL-32B-Instruct-FP8 vLLM 推理服务

## 部署说明

- **模型路径**: `/var/data/pubmodels/Qwen3-VL-32B-Instruct-FP8`（hostPath 挂载）
- **推理框架**: vLLM
- **GPU**: 1x RTX 4090（CUDA_VISIBLE_DEVICES=0）
- **推理端口**: 9000（Pod 内）
- **NodePort**: 30090（集群外访问）

## 部署步骤

在 **k3s 控制平面节点**（有 kubeconfig 的节点）执行：

```bash
kubectl apply -f qwen3-vl-32b-vllm.yaml
```

若在本 worker 节点执行，需先拷贝控制平面的 kubeconfig：
```bash
# 在控制平面执行，将 /etc/rancher/k3s/k3s.yaml 内容拷贝到本机
export KUBECONFIG=/path/to/k3s.yaml
kubectl apply -f /root/InfiniteOS/deployments/qwen3-vl-32b-vllm.yaml
```

## 前置条件

1. k3s 集群已安装，worker 节点已加入
2. NVIDIA Device Plugin 已部署（`kubectl get pod -n kube-system | grep nvidia`）
3. 模型已下载到 `/var/data/pubmodels/Qwen3-VL-32B-Instruct-FP8`

## 访问方式

- 集群内: `http://qwen3-vl-32b-instruct-fp8-vllm:9000`
- 集群外: `http://<节点IP>:30090`

## 调整节点

若 worker 节点名不是 `4worker99.com`，修改 yaml 中的 `nodeSelector.kubernetes.io/hostname` 为实际节点名。
