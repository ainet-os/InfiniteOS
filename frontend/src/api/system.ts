import api from './index'

export interface SystemInfo {
  os: {
    hostname: string
    platform: string
    distro: string
    release: string
    arch: string
    uptime: number
  }
  cpu: {
    manufacturer: string
    brand: string
    cores: number
    physicalCores: number
    processors: number
  }
  memory: {
    total: number
    free: number
    used: number
    active: number
    available: number
  }
  disk: Array<{
    fs: string
    type: string
    size: number
    used: number
    available: number
    use: number
    mount: string
  }>
}

export interface SystemMetrics {
  cpu: {
    currentLoad: number
    currentLoadUser: number
    currentLoadSystem: number
    cores: Array<{
      load: number
      loadUser: number
      loadSystem: number
    }>
  }
  memory: {
    total: number
    free: number
    used: number
    active: number
    available: number
    usage: string
  }
  network: Array<{
    iface: string
    operstate: string
    rx_bytes: number
    tx_bytes: number
    rx_sec: number
    tx_sec: number
  }>
  disk: {
    rx: number
    wx: number
    rx_sec: number
    wx_sec: number
  }
}

export interface SystemOverview {
  os: SystemInfo['os']
  cpu: SystemInfo['cpu'] & {
    currentLoad: number
    currentLoadUser: number
    currentLoadSystem: number
  }
  memory: SystemInfo['memory'] & {
    usage: string
  }
  disk: SystemInfo['disk']
  network: SystemMetrics['network']
  diskIO: SystemMetrics['disk']
}

export interface OverviewSummary {
  resourceStats: {
    compute: number
    vms: number
    containers: number
    models: number
  }
  services: Array<{
    name: string
    description: string
    status: string
  }>
  networkInterfaces: Array<{
    name: string
    ip: string
    status: string
  }>
  disks: Array<{
    device: string
    mountpoint: string
    usage: number
  }>
}

export const systemApi = {
  getSystemInfo: (): Promise<SystemInfo> => {
    return api.get('/system/info')
  },
  getSystemMetrics: (): Promise<SystemMetrics> => {
    return api.get('/system/metrics')
  },
  getSystemOverview: (): Promise<SystemOverview> => {
    return api.get('/system/overview')
  },
  getOverviewSummary: (): Promise<OverviewSummary> => {
    return api.get('/system/overview-summary')
  },
}
