import api from './index'

export interface Model {
  id: number
  name: string
  version: string
  type: string
  source: 'cloud' | 'local'
  size: string
  status: 'ready' | 'syncing' | 'error'
  description?: string
  files?: string[]
}

export interface ModelConfig {
  apiEndpoint: string  // 云端仓库API端点，例如: 100.93.0.8:32000
  webConsole?: string  // 云端仓库Web控制台，例如: 100.93.0.8:32081
  accessKey: string    // 云端仓库用户名
  secretKey: string    // 云端仓库密码
  bucket: string       // 云端仓库存储桶名称，例如: models
  useSSL?: boolean     // 是否使用SSL，默认false
  syncInterval: 'manual' | 'hourly' | 'daily' | 'weekly'
  autoSync: boolean
}

export interface UploadModelRequest {
  name: string
  version?: string
  type: string
  files: File[]
  description?: string
}

export interface DeployModelRequest {
  modelId: number
  serviceName: string
  framework: 'vllm' | 'ollama' | 'tgi' | 'transformers'
  apiPort: number
  healthPort?: number
  gpuDevices?: string
  cpuLimit?: string
  memoryLimit?: string
  envVars?: Record<string, string>
  autoStart?: boolean
}

/** 列表项：本地或云端模型（目录/前缀名为模型名） */
export interface ModelListItem {
  name: string
  size: string
}

/** 模型详情（含文件列表，用于详情页） */
export interface ModelDetail {
  name: string
  size: string
  files: Array<{ name: string; size: number | string }>
}

export const modelsApi = {
  getModels: (): Promise<Model[]> => {
    return api.get('/models')
  },
  /** 本地模型列表（/var/data/pubmodels 下子目录） */
  getLocalModels: (): Promise<ModelListItem[]> => {
    return api.get('/models/local')
  },
  /** 云端模型列表（存储桶中按前缀） */
  getCloudModels: (): Promise<ModelListItem[]> => {
    return api.get('/models/cloud')
  },
  /** 本地模型详情（含文件列表） */
  getLocalModelDetail: (name: string): Promise<ModelDetail> => {
    return api.get(`/models/local/${encodeURIComponent(name)}`)
  },
  /** 云端模型详情（含文件列表） */
  getCloudModelDetail: (name: string): Promise<ModelDetail> => {
    return api.get(`/models/cloud/${encodeURIComponent(name)}`)
  },
  /** 同步单个云端模型到本地 */
  syncModelByName: (name: string): Promise<{ message: string; name: string }> => {
    return api.post(`/models/sync/${encodeURIComponent(name)}`)
  },
  /** 删除本地模型 */
  deleteLocalModel: (name: string): Promise<{ message: string }> => {
    return api.delete(`/models/local/${encodeURIComponent(name)}`)
  },
  getModelDetails: (id: number): Promise<Model> => {
    return api.get(`/models/${id}`)
  },
  uploadModel: (data: UploadModelRequest): Promise<Model> => {
    const formData = new FormData()
    formData.append('name', data.name)
    if (data.version) formData.append('version', data.version)
    formData.append('type', data.type)
    if (data.description) formData.append('description', data.description)
    data.files.forEach((file) => {
      formData.append('files', file)
    })
    return api.post('/models/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
  syncModels: (): Promise<{ message: string; synced: number; models: Model[] }> => {
    return api.post('/models/sync')
  },
  deleteModel: (id: number): Promise<{ message: string }> => {
    return api.delete(`/models/${id}`)
  },
  updateModel: (id: number, data: { name: string; version?: string; type: string; description?: string }): Promise<Model> => {
    return api.put(`/models/${id}`, data)
  },
  getModelConfig: (): Promise<ModelConfig> => {
    return api.get('/models/config/repository')
  },
  updateModelConfig: (config: ModelConfig): Promise<{ message: string }> => {
    return api.put('/models/config/repository', config)
  },
  deployModel: (data: DeployModelRequest): Promise<{ message: string; serviceId?: string }> => {
    return api.post('/models/deploy', data)
  },
}

