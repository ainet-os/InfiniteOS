import api from './index'

export interface Pod {
  name: string
  namespace: string
  status: string
  node: string
  restarts: number
  age: string
}

// 注意：Deployments、Services、ConfigMaps、Secrets 是集群级别的资源管理功能
// 由于本系统用于管理单个设备节点，已移除这些集群级别的资源管理功能
// 仅保留 Pods 管理，因为 Pods 是运行在节点上的容器

export const k8sApi = {
  // Pods - 运行在节点上的容器
  getPods: (namespace?: string): Promise<Pod[]> => {
    return api.get('/k8s/pods', { params: { namespace } })
  },
  getPodDetails: (namespace: string, name: string): Promise<Pod> => {
    return api.get(`/k8s/pods/${namespace}/${name}`)
  },
  deletePod: (namespace: string, name: string): Promise<{ message: string }> => {
    return api.delete(`/k8s/pods/${namespace}/${name}`)
  },
  getPodLogs: (namespace: string, name: string, lines?: number): Promise<{ logs: string[] }> => {
    return api.get(`/k8s/pods/${namespace}/${name}/logs`, { params: { lines } })
  },
}

