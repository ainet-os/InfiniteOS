import api from './index'

export interface ComputeDevice {
  id: number
  name: string
  vendor: string
  compute: string
  memory: string
  memoryUsed?: string
  memoryUsage?: number
  utilization: number
  temperature: number | null
  power: string | null
  driver?: string
  cudaVersion?: string
  computeCapability?: string
  powerLimit?: string
  status: 'available' | 'unavailable'
  note?: string
}

export const computeApi = {
  getComputeResources: (): Promise<ComputeDevice[]> => {
    return api.get('/compute')
  },
  getDeviceDetails: (id: number): Promise<ComputeDevice> => {
    return api.get(`/compute/${id}`)
  },
}
