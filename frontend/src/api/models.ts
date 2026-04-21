import api from './index'

export type ModelTabType = 'public' | 'private'

export interface CloudLoginRequest {
  consoleUrl?: string
  email: string
  password: string
}

export interface CloudCredentials {
  consoleUrl: string
  accountName: string
  endpoint: string
  useSSL: boolean
  accessKey: string
  secretKey: string
  tenantBucket: string
  readonlyPublicBuckets: string[]
}

export interface CloudModelRequest extends CloudCredentials {
  type: ModelTabType
}

export interface ModelListItem {
  name: string
  size: string
}


export const modelsApi = {
  loginCloud: (data: CloudLoginRequest): Promise<CloudCredentials> => {
    return api.post('/models/cloud/login', data)
  },
  getLocalModels: (type: ModelTabType = 'public'): Promise<ModelListItem[]> => {
    return api.get('/models/local', { params: { type } })
  },
  getCloudModels: (data: CloudModelRequest): Promise<ModelListItem[]> => {
    return api.post('/models/cloud/list', data)
  },
  syncCloudModelToLocal: (name: string, data: CloudModelRequest): Promise<{ message: string; name: string }> => {
    return api.post(`/models/cloud/sync/${encodeURIComponent(name)}`, data)
  },
  deleteLocalModel: (name: string, type: ModelTabType = 'public'): Promise<{ message: string }> => {
    return api.delete(`/models/local/${encodeURIComponent(name)}`, { params: { type } })
  },
}
