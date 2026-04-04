import api from './index'

export type NetworkDeviceType = 'ethernet' | 'bridge' | 'bond' | 'vlan' | 'wifi' | 'other'
export type NetworkDeviceRole = 'physical' | 'logical' | 'system'

export interface NetworkInterface {
  name: string
  type: NetworkDeviceType
  role: NetworkDeviceRole
  managed: boolean
  editable: boolean
  deletable: boolean
  mac: string
  ip4: string
  ip6: string
  status: 'up' | 'down'
  speed: number
  rx_bytes: number
  tx_bytes: number
  rx_sec: number
  tx_sec: number
  interfaces?: string[]
  link?: string
  vlanId?: number
  bondMode?: string
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
  type: NetworkDeviceType
  role: NetworkDeviceRole
  managed: boolean
  editable: boolean
  deletable: boolean
  method: 'auto' | 'static'
  ip4: string
  ip6: string
  gateway: string
  dns: string[]
  mac: string
  interfaces: string[]
  link: string
  vlanId?: number
  bondMode?: string
}

export interface UpdateNetworkRequest {
  method?: 'auto' | 'static'
  ip4?: string
  gateway?: string
  dns?: string[]
}

export interface ApplyNetworkOperation {
  action: 'upsert' | 'delete'
  targetType: 'ethernet' | 'bridge' | 'bond' | 'vlan'
  name: string
  config?: {
    method?: 'auto' | 'static'
    ip4?: string
    gateway?: string
    dns?: string[]
    interfaces?: string[]
    link?: string
    vlanId?: number
    bondMode?: string
  }
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
  updateInterface: (name: string, config: UpdateNetworkRequest): Promise<{ success: boolean; message: string }> => {
    return api.put(`/network/interfaces/${encodeURIComponent(name)}`, config)
  },
  applyChanges: (operations: ApplyNetworkOperation[]): Promise<{ success: boolean; message: string }> => {
    return api.post('/network/apply', { operations })
  },
  toggleInterface: (name: string, enable: boolean): Promise<{ success: boolean; message: string }> => {
    return api.post(`/network/interfaces/${encodeURIComponent(name)}/toggle`, { enable })
  },
}
