import api from './index'

export interface VirtualMachine {
  id: string | null
  name: string
  state: string
  status: 'running' | 'stopped'
  cpu: number
  memory: string
  cpuUsage?: number
  memoryUsage?: number
  networkUsage?: number
}

export interface VMDetails {
  name: string
  id: string | null
  uuid?: string | null
  state?: string
  status: 'running' | 'stopped' | 'paused' | string
  osType: string
  vcpu: number
  cpu?: string
  ram: string
  memory?: string
  memoryKiB?: number
  storage: string
  storageBytes?: number
  networkInterfaces: Array<{
    name: string
    mac: string
    source: string
    type: string
  }>
  disks: Array<{
    target: string
    source: string
    type: string
    bus: string
  }>
}

export interface VMMonitoring {
  cpuUsage: number
  memoryUsage: number
  networkRx: number
  networkTx: number
  diskRead: number
  diskWrite: number
}

export interface CreateVMRequest {
  name: string
  osType: string
  osVersion?: string
  vcpu: number
  memory: number
  memoryUnit: 'MB' | 'GB'
  disk: number
  diskUnit: 'GB' | 'TB'
  networkType: string
  bootMode: string
  isoPath?: string
  startAfterCreate: boolean
}

export const virtualMachinesApi = {
  getVMs: (): Promise<VirtualMachine[]> => {
    return api.get('/virtual-machines')
  },
  getVMDetails: (name: string): Promise<VMDetails> => {
    return api.get(`/virtual-machines/${name}`)
  },
  createVM: (config: CreateVMRequest): Promise<{ id: string; message: string }> => {
    return api.post('/virtual-machines', config)
  },
  startVM: (name: string): Promise<{ message: string }> => {
    return api.post(`/virtual-machines/${name}/start`)
  },
  stopVM: (name: string): Promise<{ message: string }> => {
    return api.post(`/virtual-machines/${name}/stop`)
  },
  restartVM: (name: string): Promise<{ message: string }> => {
    return api.post(`/virtual-machines/${name}/restart`)
  },
  suspendVM: (name: string): Promise<{ message: string }> => {
    return api.post(`/virtual-machines/${name}/suspend`)
  },
  resumeVM: (name: string): Promise<{ message: string }> => {
    return api.post(`/virtual-machines/${name}/resume`)
  },
  deleteVM: (name: string): Promise<{ message: string }> => {
    return api.delete(`/virtual-machines/${name}`)
  },
  getVMMonitoring: (name: string): Promise<VMMonitoring> => {
    return api.get(`/virtual-machines/${name}/monitoring`)
  },
  getVMConsole: (
    name: string,
  ): Promise<{ vncPort: number; vncDisplay: string; consoleUrl: string; wsPath: string }> => {
    return api.get(`/virtual-machines/${name}/console`)
  },
}
