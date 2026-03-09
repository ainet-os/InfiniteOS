import api from './index'

export interface InfiniteUnoStatus {
  registration: 'success' | 'failed' | 'unregistered'
  network: 'online' | 'offline'
  pool: 'in' | 'out'
  config: {
    address: string
    username: string
    hasPassword: boolean
    hasAuthKey: boolean
  }
}

export interface LicenseInfo {
  version: string
  edition: 'community' | 'enterprise'
  expiry: string | null
  noExpiry: boolean
}

export const settingsApi = {
  getInfiniteUno() {
    return api.get<InfiniteUnoStatus>('/settings/infiniteuno')
  },
  updateInfiniteUno(data: { address?: string; username?: string; password?: string; authKey?: string }) {
    return api.post<InfiniteUnoStatus>('/settings/infiniteuno', data)
  },
  registerInfiniteUno() {
    return api.post<InfiniteUnoStatus & { message: string }>('/settings/infiniteuno/register')
  },
  joinNetworkInfiniteUno() {
    return api.post<InfiniteUnoStatus & { message: string }>('/settings/infiniteuno/network', {}, {
      timeout: 120000,
    })
  },
  leaveNetworkInfiniteUno() {
    return api.post<InfiniteUnoStatus & { message: string }>('/settings/infiniteuno/network/leave')
  },
  joinPoolInfiniteUno() {
    return api.post<InfiniteUnoStatus & { message: string }>('/settings/infiniteuno/pool')
  },
  getNodeType() {
    return api.get<{ nodeType: string }>('/settings/nodetype')
  },
  setNodeType(nodeType: string) {
    return api.post<{ nodeType: string }>('/settings/nodetype', { nodeType })
  },
  getLicense() {
    return api.get<LicenseInfo>('/settings/license')
  },
  uploadLicense(file: File) {
    const form = new FormData()
    form.append('file', file)
    return api.post<LicenseInfo>('/settings/license/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
