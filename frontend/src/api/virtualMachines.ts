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
  memoryMiB?: number
  cpuTopology?: {
    sockets: number
    cores: number
    threads: number
  }
  storage: string
  storageBytes?: number
  cdrom?: {
    target: string
    source: string | null
    bus: string
    format?: string
    capacityBytes?: number | null
    actualSizeBytes?: number | null
  } | null
  cdroms?: Array<{
    target: string
    source: string | null
    bus: string
    format?: string
    capacityBytes?: number | null
    actualSizeBytes?: number | null
  }>
  bootOrder?: 'disk_first' | 'cdrom_first' | 'unknown'
  bootTarget?: string | null
  bootDevices?: Array<{
    target: string
    device: 'disk' | 'cdrom'
    bus?: string
    order: number
  }>
  editable?: {
    cpuMemory: boolean
    disks: boolean
    networks: boolean
    boot: boolean
  }
  networkInterfaces: Array<{
    name: string
    mac: string
    source: string
    type: string
    model?: string
    mode?: 'bridge' | 'network' | 'unknown' | string
    editable?: boolean
  }>
  disks: Array<{
    target: string
    source: string
    type: string
    bus: string
    device?: 'disk' | 'cdrom'
    role?: 'system' | 'data'
    readonly?: boolean
    capacityBytes?: number | null
    actualSizeBytes?: number | null
    sizeGiB?: number | null
    format?: string
    sourceType?: 'file' | 'block' | string
    resizable?: boolean
    removable?: boolean
  }>
}

export interface VMMonitoring {
  cpuUsage: number
  memoryUsage: number
  memorySource?: 'guest_agent' | 'configured'
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
    diskBuses: Array<'virtio' | 'sata' | 'scsi' | string>
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
    diskBus: 'virtio' | 'sata' | 'scsi'
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
        bus: 'virtio' | 'sata' | 'scsi'
      }
    | {
        kind: 'new_disk_at_path'
        path: string
        sizeGiB: number
        format: 'qcow2' | 'raw'
        bus: 'virtio' | 'sata' | 'scsi'
      }
    | {
        kind: 'existing_disk'
        path: string
        bus: 'virtio' | 'sata' | 'scsi'
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

export interface UpdateVMCpuMemoryRequest {
  sockets: number
  cores: number
  threads: number
  memoryMiB: number
}

export interface UpdateVMSystemDiskRequest {
  bus: 'virtio' | 'sata' | 'scsi'
  sizeGiB?: number
}

export interface UpdateVMDiskRequest {
  bus: 'virtio' | 'sata' | 'scsi'
  sizeGiB?: number
}

export interface AddVMDataDiskRequest {
  path: string
  sizeGiB: number
  format: 'qcow2' | 'raw'
  bus: 'virtio' | 'sata' | 'scsi'
}

export interface DeleteVMDiskRequest {
  deleteFile?: boolean
}

export interface AddVMNetworkRequest {
  source: string
}

export interface UpdateVMBootOrderRequest {
  mode?: 'disk_first' | 'cdrom_first'
  target?: string
}

export interface InsertVMCdromRequest {
  path: string
  bus?: 'sata' | 'scsi'
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
  updateVMCpuMemory: (name: string, payload: UpdateVMCpuMemoryRequest): Promise<{ message: string }> => {
    return api.post(`/virtual-machines/${name}/config/cpu-memory`, payload)
  },
  updateVMSystemDisk: (name: string, payload: UpdateVMSystemDiskRequest): Promise<{ message: string }> => {
    return api.post(`/virtual-machines/${name}/disks/system`, payload)
  },
  updateVMDisk: (name: string, target: string, payload: UpdateVMDiskRequest): Promise<{ message: string }> => {
    return api.post(`/virtual-machines/${name}/disks/${encodeURIComponent(target)}`, payload)
  },
  addVMDataDisk: (name: string, payload: AddVMDataDiskRequest): Promise<{ message: string; target: string }> => {
    return api.post(`/virtual-machines/${name}/disks`, payload)
  },
  deleteVMDisk: (name: string, target: string, payload?: DeleteVMDiskRequest): Promise<{ message: string }> => {
    return api.delete(`/virtual-machines/${name}/disks/${encodeURIComponent(target)}`, {
      data: payload,
    })
  },
  addVMNetworkInterface: (name: string, payload: AddVMNetworkRequest): Promise<{ message: string; mac: string }> => {
    return api.post(`/virtual-machines/${name}/networks`, payload)
  },
  updateVMNetworkInterface: (name: string, mac: string, payload: AddVMNetworkRequest): Promise<{ message: string }> => {
    return api.post(`/virtual-machines/${name}/networks/${encodeURIComponent(mac)}`, payload)
  },
  deleteVMNetworkInterface: (name: string, mac: string): Promise<{ message: string }> => {
    return api.delete(`/virtual-machines/${name}/networks/${encodeURIComponent(mac)}`)
  },
  addVMCdrom: (name: string, payload: InsertVMCdromRequest): Promise<{ message: string; target: string }> => {
    return api.post(`/virtual-machines/${name}/cdroms`, payload)
  },
  ejectVMCdrom: (name: string, target: string): Promise<{ message: string }> => {
    return api.post(`/virtual-machines/${name}/cdroms/${encodeURIComponent(target)}/eject`)
  },
  insertVMCdrom: (name: string, target: string, payload: InsertVMCdromRequest): Promise<{ message: string }> => {
    return api.post(`/virtual-machines/${name}/cdroms/${encodeURIComponent(target)}/insert`, payload)
  },
  deleteVMCdrom: (name: string, target: string): Promise<{ message: string }> => {
    return api.delete(`/virtual-machines/${name}/cdroms/${encodeURIComponent(target)}`)
  },
  updateVMBootOrder: (name: string, payload: UpdateVMBootOrderRequest): Promise<{ message: string }> => {
    return api.post(`/virtual-machines/${name}/boot-order`, payload)
  },
  startVM: (name: string): Promise<{ message: string }> => {
    return api.post(`/virtual-machines/${name}/start`)
  },
  stopVM: (name: string): Promise<{ message: string }> => {
    return api.post(`/virtual-machines/${name}/stop`)
  },
  powerOffVM: (name: string): Promise<{ message: string }> => {
    return api.post(`/virtual-machines/${name}/poweroff`)
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
