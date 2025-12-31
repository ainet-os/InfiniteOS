import api from './index'

export interface SystemService {
  name: string
  status: 'running' | 'stopped'
  state: string
  description: string
  pid: string | null
  memory: string
}

export interface ServiceDetails {
  name: string
  status: string
  state: string
  description: string
  pid: string | null
  memory: string
  loadState: string
  activeState: string
  subState: string
}

export const servicesApi = {
  getServices: (): Promise<SystemService[]> => {
    return api.get('/services')
  },
  getServiceDetails: (name: string): Promise<ServiceDetails> => {
    return api.get(`/services/${name}`)
  },
  startService: (name: string): Promise<{ message: string }> => {
    return api.post(`/services/${name}/start`)
  },
  stopService: (name: string): Promise<{ message: string }> => {
    return api.post(`/services/${name}/stop`)
  },
  restartService: (name: string): Promise<{ message: string }> => {
    return api.post(`/services/${name}/restart`)
  },
  getServiceLogs: (name: string, lines?: number): Promise<{ logs: string[] }> => {
    return api.get(`/services/${name}/logs`, { params: { lines } })
  },
  enableService: (name: string): Promise<{ message: string }> => {
    return api.post(`/services/${name}/enable`)
  },
  disableService: (name: string): Promise<{ message: string }> => {
    return api.post(`/services/${name}/disable`)
  },
  isServiceEnabled: (name: string): Promise<{ enabled: boolean }> => {
    return api.get(`/services/${name}/enabled`)
  },
}
