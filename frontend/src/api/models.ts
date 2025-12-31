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
}

export interface ModelConfig {
  apiEndpoint: string  // MinIO API端点，例如: 100.93.0.8:32000
  webConsole?: string  // MinIO Web控制台，例如: 100.93.0.8:32081
  accessKey: string    // MinIO用户名
  secretKey: string    // MinIO密码
  bucket: string       // MinIO存储桶名称，例如: models
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

export const modelsApi = {
  getModels: (): Promise<Model[]> => {
    return api.get('/models')
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

