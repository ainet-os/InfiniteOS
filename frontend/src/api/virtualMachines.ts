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

export interface VMOsOption {
  id: string
  label: string
}

export interface VMCapabilities {
  tools: {
    virsh: boolean
    virtInstall: boolean
    qemuImg: boolean
    virtXml: boolean
    swtpm: boolean
  }
  storagePools: Array<{
    name: string
    type: string
    active: boolean
    autostart: boolean
    targetPath: string
    capacity: string
    allocation: string
    available: string
    capacityBytes: number
    allocationBytes: number
    availableBytes: number
  }>
  libvirtNetworks: Array<{
    name: string
    active: boolean
    autostart: boolean
    mode: string
  }>
  bridgeInterfaces: Array<{
    name: string
  }>
  osOptions: VMOsOption[]
  firmware: {
    bios: boolean
    uefi: boolean
    uefiCandidates: Array<{
      code: string
      vars: string
    }>
    default: 'bios' | 'uefi'
  }
  features: {
    tpm: boolean
    graphics: Array<'vnc' | 'none' | string>
    installSources: Array<'local_iso' | 'existing_disk' | string>
    startModes: Array<'create_and_run' | 'create_and_edit' | string>
    diskFormats: Array<'qcow2' | 'raw' | string>
    diskBuses: Array<'virtio' | 'sata' | string>
    networkModes: Array<'network' | 'bridge' | 'none' | string>
  }
  defaults: {
    osId: string
    storagePool: string
    networkMode: 'network' | 'bridge' | 'none'
    networkSource: string
    firmware: 'bios' | 'uefi'
    graphics: 'vnc' | 'none'
    startMode: 'create_and_run' | 'create_and_edit'
    diskFormat: 'qcow2' | 'raw'
    diskBus: 'virtio' | 'sata'
    memoryMiB: number
    diskSizeGiB: number
  }
}

export interface CreateVMRequest {
  name: string
  osId: string
  vcpu: number
  memoryMiB: number
  installSource:
    | {
        type: 'local_iso'
        path: string
      }
    | {
        type: 'existing_disk'
      }
  disks: Array<
    | {
        kind: 'new_disk_in_pool'
        pool: string
        sizeGiB: number
        format: 'qcow2' | 'raw'
        bus: 'virtio' | 'sata'
      }
    | {
        kind: 'new_disk_at_path'
        path: string
        sizeGiB: number
        format: 'qcow2' | 'raw'
        bus: 'virtio' | 'sata'
      }
    | {
        kind: 'existing_disk'
        path: string
        bus: 'virtio' | 'sata'
      }
  >
  networks: Array<
    | {
        mode: 'network'
        source: string
      }
    | {
        mode: 'bridge'
        source: string
      }
      | {
        mode: 'none'
      }
  >
  firmware: 'bios' | 'uefi'
  tpm: boolean
  graphics: 'vnc' | 'none'
  startMode: 'create_and_run' | 'create_and_edit'
}

export interface VMCreationJob {
  id: string
  vmName: string
  status: 'queued' | 'running' | 'succeeded' | 'failed'
  stage: string
  message: string
  error: string | null
  createdAt: string
  updatedAt: string
  startedAt: string | null
  finishedAt: string | null
  logs: Array<{
    timestamp: string
    level: string
    message: string
  }>
  result: {
    vmName: string
    started: boolean
  } | null
}

export const virtualMachinesApi = {
  getVMs: (): Promise<VirtualMachine[]> => {
    return api.get('/virtual-machines')
  },
  getVMDetails: (name: string): Promise<VMDetails> => {
    return api.get(`/virtual-machines/${name}`)
  },
  getVmCapabilities: (): Promise<VMCapabilities> => {
    return api.get('/virtual-machines/capabilities')
  },
  createVM: (
    config: CreateVMRequest,
  ): Promise<{ jobId: string; vmName: string; status: string; message: string }> => {
    return api.post('/virtual-machines', config)
  },
  getVMCreationJob: (jobId: string): Promise<VMCreationJob> => {
    return api.get(`/virtual-machines/jobs/${jobId}`)
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
