import api from './index'

export interface StorageDisk {
  name: string
  device: string
  type: string
  size: number
  mount: string
  used: number
  available: number
  use: number
  rx: number
  wx: number
  rx_sec: number
  wx_sec: number
}

export interface StorageStats {
  fs: string
  type: string
  mount: string
  size: number
  used: number
  available: number
  use: number
  rx: number
  wx: number
  rx_sec: number
  wx_sec: number
}

export interface MountRequest {
  device: string
  mountPoint: string
  fsType?: string
}

export interface UnmountRequest {
  mountPoint: string
}

export const storageApi = {
  getDisks: (): Promise<StorageDisk[]> => {
    return api.get('/storage/disks')
  },
  getStats: (): Promise<StorageStats[]> => {
    return api.get('/storage/stats')
  },
  mountFilesystem: (data: MountRequest): Promise<{ success: boolean; message: string }> => {
    return api.post('/storage/mount', data)
  },
  unmountFilesystem: (data: UnmountRequest): Promise<{ success: boolean; message: string }> => {
    return api.post('/storage/unmount', data)
  },
}
