import api from './index'

export interface NetworkInterface {
  name: string
  type: string
  mac: string
  ip4: string
  ip6: string
  status: 'up' | 'down'
  speed: number
  rx_bytes: number
  tx_bytes: number
  rx_sec: number
  tx_sec: number
}

export interface NetworkStats {
  iface: string
  operstate: string
  rx_bytes: number
  tx_bytes: number
  rx_sec: number
  tx_sec: number
  rx_dropped: number
  tx_dropped: number
  rx_errors: number
  tx_errors: number
}

export interface NetworkInterfaceDetails {
  name: string
  type: string
  method: 'auto' | 'static' | 'manual'
  ip4: string
  ip6: string
  gateway: string
  dns: string[]
  mac: string
}

export interface CreateNetworkRequest {
  name: string
  type?: string
  method?: 'auto' | 'static'
  ip4?: string
  gateway?: string
  dns?: string[]
  mac?: string
}

export interface UpdateNetworkRequest {
  method?: 'auto' | 'static'
  ip4?: string
  gateway?: string
  dns?: string[]
}

export const networkApi = {
  getInterfaces: (): Promise<NetworkInterface[]> => {
    return api.get('/network/interfaces')
  },
  getStats: (): Promise<NetworkStats[]> => {
    return api.get('/network/stats')
  },
  getInterfaceDetails: (name: string): Promise<NetworkInterfaceDetails> => {
    return api.get(`/network/interfaces/${encodeURIComponent(name)}`)
  },
  createInterface: (config: CreateNetworkRequest): Promise<{ success: boolean; message: string }> => {
    return api.post('/network/interfaces', config)
  },
  updateInterface: (name: string, config: UpdateNetworkRequest): Promise<{ success: boolean; message: string }> => {
    return api.put(`/network/interfaces/${encodeURIComponent(name)}`, config)
  },
  deleteInterface: (name: string): Promise<{ success: boolean; message: string }> => {
    return api.delete(`/network/interfaces/${encodeURIComponent(name)}`)
  },
  toggleInterface: (name: string, enable: boolean): Promise<{ success: boolean; message: string }> => {
    return api.post(`/network/interfaces/${encodeURIComponent(name)}/toggle`, { enable })
  },
}
