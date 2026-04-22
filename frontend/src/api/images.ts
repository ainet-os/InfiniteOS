import api from './index'

export type ImageCloudTabType = 'public' | 'private'

export interface CloudImageLoginRequest {
  consoleUrl?: string
  email: string
  password: string
}

export interface CloudImageCredentials {
  consoleUrl: string
  accountName: string
  registryUrl: string
  registryHost: string
  registryAlias: string
  privateProject: string
  publicProjects: string[]
  robotUsername: string
  apiKey: string
  scopeSummary: string
}

export interface CloudImageRequest extends CloudImageCredentials {
  type: ImageCloudTabType
}

export interface CloudImageUploadRequest extends CloudImageCredentials {
  sourceImage: string
  targetRepository: string
  targetTag: string
}

export interface LocalImage {
  id: string
  repository: string
  tag: string
  diskUsage: string
  size: string
  created: string
  image: string
}

export interface CloudImage {
  name: string
  repository: string
  tag: string
  size: string
  digest: string
  pushed: string
  project: string
  registry: string
  image: string
}

export const imagesApi = {
  loginCloud: (data: CloudImageLoginRequest): Promise<CloudImageCredentials> => {
    return api.post('/images/cloud/login', data)
  },
  getLocalImages: (): Promise<LocalImage[]> => {
    return api.get('/images/local')
  },
  deleteLocalImage: (image: Pick<LocalImage, 'id' | 'repository' | 'tag'>): Promise<{ message: string }> => {
    return api.delete('/images/local', { data: image })
  },
  getCloudImages: (data: CloudImageRequest): Promise<CloudImage[]> => {
    return api.post('/images/cloud/list', data)
  },
  syncCloudImageToLocal: (
    image: Pick<CloudImage, 'image' | 'repository' | 'tag'>,
  ): Promise<{ message: string; image: string }> => {
    return api.post('/images/cloud/sync', image)
  },
  uploadCloudImage: (
    data: CloudImageUploadRequest,
  ): Promise<{ message: string; image: string }> => {
    return api.post('/images/cloud/upload', data)
  },
}
