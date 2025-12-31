import api from './index'

export interface Container {
  id: string
  name: string
  image: string
  status: string
  state: string
  ports: string
  created: string
}

export interface ContainerDetails {
  id: string
  name: string
  image: string
  status: string
  created: string
  command: string
  ports: Array<{
    container: string
    host: string
    type: string
  }>
  environment: string[]
  volumes: Array<{
    hostPath: string
    containerPath: string
    readOnly: boolean
  }>
}

export interface ContainerMonitoring {
  cpuUsage: number
  memoryUsage: number
  networkRx: number
  networkTx: number
  diskRead: number
  diskWrite: number
}

export interface CreateContainerRequest {
  name: string
  image: string
  tag?: string
  cpuLimit?: string
  memoryLimit: number
  memoryUnit: 'MB' | 'GB'
  ports: Array<{ host: string; container: string }>
  networkMode: string
  volumes: Array<{ hostPath: string; containerPath: string; readOnly: boolean }>
  environment: Array<{ key: string; value: string }>
  command?: string
  autoStart: boolean
  interactive: boolean
}

export interface ImportContainerRequest {
  importType: 'image' | 'tar'
  imageName?: string
  tarPath?: string
  importedImageName?: string
  containerName?: string
  pullIfNotExists?: boolean
  startAfterImport?: boolean
}

export interface Image {
  id: string
  repository: string
  tag: string
  size: string
  created: string
}

export const containersApi = {
  getContainers: (): Promise<Container[]> => {
    return api.get('/containers')
  },
  getContainerDetails: (id: string): Promise<ContainerDetails> => {
    return api.get(`/containers/${id}`)
  },
  createContainer: (config: CreateContainerRequest): Promise<{ id: string; message: string }> => {
    return api.post('/containers', config)
  },
  importContainer: (config: ImportContainerRequest): Promise<{ id: string; message: string }> => {
    return api.post('/containers/import', config)
  },
  startContainer: (id: string): Promise<{ message: string }> => {
    return api.post(`/containers/${id}/start`)
  },
  stopContainer: (id: string): Promise<{ message: string }> => {
    return api.post(`/containers/${id}/stop`)
  },
  restartContainer: (id: string): Promise<{ message: string }> => {
    return api.post(`/containers/${id}/restart`)
  },
  deleteContainer: (id: string): Promise<{ message: string }> => {
    return api.delete(`/containers/${id}`)
  },
  updateContainerPorts: (id: string, ports: Array<{ host: string; container: string; type?: string }>): Promise<{ id: string; message: string }> => {
    return api.post(`/containers/${id}/ports`, { ports })
  },
  getContainerLogs: (id: string, lines?: number, tail?: boolean): Promise<{ logs: string[] }> => {
    return api.get(`/containers/${id}/logs`, { params: { lines, tail } })
  },
  getContainerMonitoring: (id: string): Promise<ContainerMonitoring> => {
    return api.get(`/containers/${id}/monitoring`)
  },
  getImages: (): Promise<Image[]> => {
    return api.get('/containers/images/list')
  },
  pullImage: (imageName: string): Promise<{ message: string }> => {
    return api.post('/containers/images/pull', { imageName })
  },
}
