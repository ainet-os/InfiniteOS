#!/bin/bash
# 在 k3s/rancher master 节点上执行：诊断 GPU 节点与 nvidia-device-plugin，并修复
# 用法: bash k8s-diagnose-and-fix-gpu.sh
# 或: scp 到 master 后执行

set -e
echo "========== 1. 节点状态 =========="
kubectl get nodes -o wide

echo ""
echo "========== 2. 4worker99.com 的 Capacity/Allocatable（含 nvidia.com/gpu）=========="
kubectl describe node 4worker99.com | grep -A 5 -E "Capacity:|Allocatable:" || true
kubectl get node 4worker99.com -o jsonpath='{.status.capacity}' 2>/dev/null | jq . 2>/dev/null || kubectl get node 4worker99.com -o yaml | grep -A 20 "capacity:"

echo ""
echo "========== 3. nvidia 相关 Pod =========="
kubectl get pods -A -o wide | grep -E "nvidia|NAME"

echo ""
echo "========== 4. 4worker99.com 上的所有 Pod =========="
kubectl get pods -A -o wide --field-selector spec.nodeName=4worker99.com

echo ""
echo "========== 5. 修复：删除 4worker99.com 上的 nvidia-device-plugin Pod 以强制重建 =========="
NVIDIA_POD=$(kubectl get pods -A -o wide --field-selector spec.nodeName=4worker99.com -o name | grep -i nvidia || true)
if [ -n "$NVIDIA_POD" ]; then
  echo "删除: $NVIDIA_POD"
  kubectl delete $NVIDIA_POD --wait=false
  echo "已触发删除，DaemonSet 将重新创建 Pod。"
else
  echo "未在 4worker99.com 上找到 nvidia-device-plugin Pod（可能尚未调度或名称不同）。"
  echo "列出 kube-system 中名称含 nvidia 的 Pod："
  kubectl get pods -n kube-system -o wide | grep -i nvidia || true
  # 按标签删常见 DaemonSet 名
  for label in "app.kubernetes.io/name=nvidia-device-plugin" "name=nvidia-device-plugin-ds"; do
    POD=$(kubectl get pods -n kube-system -l "$label" --field-selector spec.nodeName=4worker99.com -o name 2>/dev/null | head -1)
    if [ -n "$POD" ]; then
      echo "按标签删除: $POD"
      kubectl delete $POD --wait=false
      break
    fi
  done
fi

echo ""
echo "========== 6. 等待 15 秒后再次检查 =========="
sleep 15
kubectl get pods -A -o wide | grep -E "nvidia|4worker99|NAME"
echo ""
echo "4worker99.com Allocatable 中的 nvidia.com/gpu："
kubectl get node 4worker99.com -o jsonpath='{.status.allocatable}' 2>/dev/null | jq . 2>/dev/null || kubectl describe node 4worker99.com | grep -A 2 Allocatable

echo ""
echo "========== 7. Qwen3-VL 相关 Pod =========="
kubectl get pods -A -o wide | grep -E "qwen|NAME"

echo ""
echo "完成。若 nvidia.com/gpu 仍为 0，请检查 worker 节点："
echo "  - 镜像拉取：rancher/mirrored-pause:3.6 与 nvidia-device-plugin 镜像是否可拉取；"
echo "  - 若本机无法访问 docker.io，需配置 containerd 镜像加速或私有仓库。"
