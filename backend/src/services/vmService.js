import { access, unlink, writeFile } from 'fs/promises'
import { constants as fsConstants } from 'fs'
import { tmpdir } from 'os'
import { dirname, isAbsolute, join } from 'path'
import { randomUUID } from 'crypto'
import { execFileCommand, execSudoFile } from '../utils/exec.js'

const VM_JOB_RETENTION_MS = 24 * 60 * 60 * 1000
const MAX_JOB_LOGS = 200
const VM_JOBS = new Map()

const UEFI_FIRMWARE_CANDIDATES = [
  {
    code: '/usr/share/OVMF/OVMF_CODE.fd',
    vars: '/usr/share/OVMF/OVMF_VARS.fd',
  },
  {
    code: '/usr/share/OVMF/OVMF_CODE.secboot.fd',
    vars: '/usr/share/OVMF/OVMF_VARS.fd',
  },
  {
    code: '/usr/share/edk2/ovmf/OVMF_CODE.fd',
    vars: '/usr/share/edk2/ovmf/OVMF_VARS.fd',
  },
  {
    code: '/usr/share/AAVMF/AAVMF_CODE.fd',
    vars: '/usr/share/AAVMF/AAVMF_VARS.fd',
  },
]

const GENERIC_VM_OS_OPTION = {
  id: 'generic',
  label: '通用 / 未识别系统',
}

const VM_OS_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._+-]*$/

class HttpError extends Error {
  constructor(status, message, details) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.details = details
  }
}

const parseDominfo = (stdout) => {
  const info = {}
  const lines = String(stdout || '').split('\n')
  for (const line of lines) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim()
    if (key) info[key] = value
  }
  return info
}

const normalizeVmStatus = (state) => {
  const s = String(state || '').toLowerCase()
  if (s.includes('running')) return 'running'
  if (s.includes('paused')) return 'paused'
  return 'stopped'
}

const parseMemToKiB = (memStr) => {
  const s = String(memStr || '').trim()
  const m = s.match(/^(\d+(?:\.\d+)?)\s*(kib|kb|mib|mb|gib|gb)$/i)
  if (!m) return null
  const n = Number(m[1])
  const unit = m[2].toLowerCase()
  if (!Number.isFinite(n)) return null
  if (unit === 'kib' || unit === 'kb') return Math.round(n)
  if (unit === 'mib' || unit === 'mb') return Math.round(n * 1024)
  if (unit === 'gib' || unit === 'gb') return Math.round(n * 1024 * 1024)
  return null
}

const formatKiB = (kib) => {
  const n = Number(kib)
  if (!Number.isFinite(n) || n <= 0) return '0'
  const mib = n / 1024
  const gib = mib / 1024
  if (gib >= 1) return `${gib.toFixed(gib >= 10 ? 0 : 1)} GB`
  if (mib >= 1) return `${mib.toFixed(mib >= 10 ? 0 : 1)} MB`
  return `${Math.round(n)} KiB`
}

const formatBytes = (bytes) => {
  const n = Number(bytes)
  if (!Number.isFinite(n) || n <= 0) return '0'
  const kib = n / 1024
  const mib = kib / 1024
  const gib = mib / 1024
  const tib = gib / 1024
  if (tib >= 1) return `${tib.toFixed(tib >= 10 ? 0 : 1)} TB`
  if (gib >= 1) return `${gib.toFixed(gib >= 10 ? 0 : 1)} GB`
  if (mib >= 1) return `${mib.toFixed(mib >= 10 ? 0 : 1)} MB`
  if (kib >= 1) return `${kib.toFixed(kib >= 10 ? 0 : 1)} KB`
  return `${Math.round(n)} B`
}

const parseSizeToBytes = (value) => {
  const s = String(value || '').trim()
  const m = s.match(/^(\d+(?:\.\d+)?)\s*(b|bytes|kib|kb|mib|mb|gib|gb|tib|tb)$/i)
  if (!m) return null
  const n = Number(m[1])
  const unit = m[2].toLowerCase()
  if (!Number.isFinite(n)) return null
  if (unit === 'b' || unit === 'bytes') return Math.round(n)
  if (unit === 'kib' || unit === 'kb') return Math.round(n * 1024)
  if (unit === 'mib' || unit === 'mb') return Math.round(n * 1024 * 1024)
  if (unit === 'gib' || unit === 'gb') return Math.round(n * 1024 * 1024 * 1024)
  if (unit === 'tib' || unit === 'tb') return Math.round(n * 1024 * 1024 * 1024 * 1024)
  return null
}

const parseYesNo = (value) => String(value || '').trim().toLowerCase() === 'yes'

const extractDisksFromXml = (xml) => {
  const disks = []
  const diskBlocks = String(xml || '').match(/<disk\b[\s\S]*?<\/disk>/g) || []
  for (const block of diskBlocks) {
    if (!/device=['"]disk['"]/.test(block)) continue
    const target = block.match(/<target[^>]*\sdev=['"]([^'"]+)['"][^>]*>/i)?.[1] || ''
    const bus = block.match(/<target[^>]*\sbus=['"]([^'"]+)['"][^>]*>/i)?.[1] || ''
    const source =
      block.match(/<source[^>]*\sfile=['"]([^'"]+)['"][^>]*>/i)?.[1] ||
      block.match(/<source[^>]*\sdev=['"]([^'"]+)['"][^>]*>/i)?.[1] ||
      ''
    const type = block.match(/<driver[^>]*\stype=['"]([^'"]+)['"][^>]*>/i)?.[1] || ''
    if (target || source) {
      disks.push({ target, source, type, bus })
    }
  }
  return disks
}

const extractIfacesFromXml = (xml) => {
  const ifaces = []
  const ifaceBlocks = String(xml || '').match(/<interface\b[\s\S]*?<\/interface>/g) || []
  for (const block of ifaceBlocks) {
    const name = block.match(/<target[^>]*\sdev=['"]([^'"]+)['"][^>]*>/i)?.[1] || ''
    const mac = block.match(/<mac[^>]*\saddress=['"]([^'"]+)['"][^>]*>/i)?.[1] || ''
    const model = block.match(/<model[^>]*\stype=['"]([^'"]+)['"][^>]*>/i)?.[1] || ''
    const source =
      block.match(/<source[^>]*\snetwork=['"]([^'"]+)['"][^>]*>/i)?.[1] ||
      block.match(/<source[^>]*\sbridge=['"]([^'"]+)['"][^>]*>/i)?.[1] ||
      block.match(/<source[^>]*\sdev=['"]([^'"]+)['"][^>]*>/i)?.[1] ||
      ''

    if (name || mac || source) {
      ifaces.push({
        name,
        mac,
        source,
        type: model || '',
      })
    }
  }
  return ifaces
}

const cloneJob = (job) => ({
  ...job,
  logs: [...job.logs],
  result: job.result ? { ...job.result } : null,
})

const pruneOldJobs = () => {
  const now = Date.now()
  for (const [jobId, job] of VM_JOBS.entries()) {
    if (now - new Date(job.updatedAt).getTime() > VM_JOB_RETENTION_MS) {
      VM_JOBS.delete(jobId)
    }
  }
}

const createVmJobRecord = (vmName) => {
  pruneOldJobs()
  const job = {
    id: randomUUID(),
    vmName,
    status: 'queued',
    stage: 'queued',
    message: '虚拟机创建任务已提交',
    error: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    startedAt: null,
    finishedAt: null,
    logs: [],
    result: null,
  }
  VM_JOBS.set(job.id, job)
  return cloneJob(job)
}

const mutateVmJob = (jobId, updater) => {
  const current = VM_JOBS.get(jobId)
  if (!current) return null
  updater(current)
  current.updatedAt = new Date().toISOString()
  VM_JOBS.set(jobId, current)
  return cloneJob(current)
}

const appendVmJobLog = (jobId, level, message) => {
  mutateVmJob(jobId, (job) => {
    job.logs.push({
      timestamp: new Date().toISOString(),
      level,
      message,
    })
    if (job.logs.length > MAX_JOB_LOGS) {
      job.logs = job.logs.slice(-MAX_JOB_LOGS)
    }
    job.message = message
  })
}

const setVmJobStage = (jobId, status, stage, message) => {
  mutateVmJob(jobId, (job) => {
    job.status = status
    job.stage = stage
    if (!job.startedAt && status === 'running') {
      job.startedAt = new Date().toISOString()
    }
    if (message) job.message = message
  })
  if (message) appendVmJobLog(jobId, status === 'failed' ? 'error' : 'info', message)
}

const completeVmJob = (jobId, result, message) => {
  mutateVmJob(jobId, (job) => {
    job.status = 'succeeded'
    job.stage = 'completed'
    job.result = result
    job.message = message
    job.finishedAt = new Date().toISOString()
  })
  appendVmJobLog(jobId, 'info', message)
}

const failVmJob = (jobId, error) => {
  const message = error instanceof Error ? error.message : String(error)
  mutateVmJob(jobId, (job) => {
    job.status = 'failed'
    job.stage = 'failed'
    job.error = message
    job.message = message
    job.finishedAt = new Date().toISOString()
  })
  appendVmJobLog(jobId, 'error', message)
}

const runVirsh = (args, options = {}) => {
  return execSudoFile('virsh', args, {
    timeout: 20000,
    ...options,
  })
}

const runVirtInstall = (args, options = {}) => {
  return execSudoFile('virt-install', args, {
    timeout: 60000,
    ...options,
  })
}

const runQemuImg = (args, options = {}) => {
  return execSudoFile('qemu-img', args, {
    timeout: 30000,
    ...options,
  })
}

const commandExists = async (command) => {
  const { success } = await execFileCommand('which', [command], { timeout: 5000 })
  return success
}

const fileExists = async (targetPath) => {
  try {
    await access(targetPath, fsConstants.F_OK)
    return true
  } catch {
    return false
  }
}

const sudoTest = async (flag, targetPath) => {
  const { success } = await execSudoFile('test', [flag, targetPath], { timeout: 5000 })
  return success
}

const safeUnlink = async (filePath) => {
  if (!filePath) return
  try {
    await unlink(filePath)
  } catch {
    // ignore
  }
}

const safeRemoveFile = async (filePath) => {
  if (!filePath) return
  await execSudoFile('rm', ['-f', filePath], { timeout: 10000 })
}

const getFilesystemAvailableBytes = async (targetPath) => {
  const { stdout, success } = await execSudoFile(
    'df',
    ['-B1', '--output=avail', targetPath],
    { timeout: 10000 }
  )
  if (!success) return null
  const lines = stdout.split('\n').map((line) => line.trim()).filter(Boolean)
  if (lines.length < 2) return null
  const value = Number(lines[lines.length - 1])
  return Number.isFinite(value) ? value : null
}

const escapeVirtInstallValue = (value) => String(value || '').replaceAll(',', '\\,')

const buildDiskArg = (storage, diskPath) => {
  const parts = [`path=${escapeVirtInstallValue(diskPath)}`]
  if (storage.kind !== 'existing_disk') {
    parts.push(`format=${storage.format}`)
  }
  parts.push(`bus=${storage.bus}`)
  return parts.join(',')
}

const buildNetworkArg = (network) => {
  if (network.mode === 'none') return 'none'
  if (network.mode === 'bridge') {
    return `bridge=${escapeVirtInstallValue(network.source)},model=virtio`
  }
  return `network=${escapeVirtInstallValue(network.source)},model=virtio`
}

const buildVmInstallArgs = (request, diskPaths, options = {}) => {
  const { printXmlStep = null } = options
  const args = [
    '--name',
    request.name,
    '--memory',
    String(request.memoryMiB),
    '--vcpus',
    String(request.vcpu),
    '--osinfo',
    `detect=on,require=off,name=${request.osId}`,
    '--graphics',
    request.graphics === 'none' ? 'none' : 'vnc,listen=127.0.0.1',
    '--serial',
    'pty',
    '--console',
    'pty,target_type=serial',
    '--noautoconsole',
  ]

  if (printXmlStep !== null) {
    args.push('--dry-run')
    if (printXmlStep === true) {
      args.push('--print-xml')
    } else {
      args.push('--print-xml', String(printXmlStep))
    }
  }

  for (const [index, disk] of request.disks.entries()) {
    args.push('--disk', buildDiskArg(disk, diskPaths[index]))
  }

  for (const network of request.networks) {
    args.push('--network', buildNetworkArg(network))
  }

  if (request.firmware === 'uefi') {
    args.push('--boot', 'uefi')
  }

  if (request.installSource.type === 'local_iso') {
    args.push('--cdrom', request.installSource.path)
  } else {
    args.push('--import')
  }

  return args
}

const extractDomainXml = (output) => {
  const matches = String(output || '').match(/<domain\b[\s\S]*?<\/domain>/g)
  if (matches && matches.length > 0) {
    return matches[0].trim()
  }
  return String(output || '').trim()
}

const parsePoolTargetPath = (xml) => {
  return String(xml || '').match(/<target>\s*<path>([^<]+)<\/path>/i)?.[1]?.trim() || ''
}

const parseNetworkMode = (xml) => {
  const forwardMode = String(xml || '').match(/<forward[^>]*mode=['"]([^'"]+)['"]/i)?.[1]
  if (forwardMode) return forwardMode
  return 'isolated'
}

const buildVmOsOption = (id, label) => {
  const normalizedId = String(id || '').trim()
  if (!normalizedId || !VM_OS_ID_PATTERN.test(normalizedId)) {
    return null
  }
  if (/^short[\s-]?id$/i.test(normalizedId) || /^id$/i.test(normalizedId)) {
    return null
  }

  const normalizedLabel = String(label || '').trim()
  if (normalizedId === GENERIC_VM_OS_OPTION.id) {
    return { ...GENERIC_VM_OS_OPTION }
  }

  return {
    id: normalizedId,
    label:
      normalizedLabel && !normalizedLabel.toLowerCase().includes(normalizedId.toLowerCase())
        ? `${normalizedLabel} (${normalizedId})`
        : normalizedLabel || normalizedId,
  }
}

const parseVmOsOptionLine = (line) => {
  const text = String(line || '').trim()
  if (!text || /^-+$/.test(text)) {
    return null
  }
  if (/^short[\s-]?id(?:\s*\||\s{2,})/i.test(text)) {
    return null
  }

  if (text.includes('|')) {
    const [id, ...labelParts] = text.split('|').map((part) => part.trim())
    return buildVmOsOption(id, labelParts.join(' | '))
  }

  const columns = text
    .split(/\s{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (columns.length >= 2) {
    return buildVmOsOption(columns[0], columns.slice(1).join(' '))
  }

  return buildVmOsOption(text, '')
}

const normalizeVmOsOptions = (options) => {
  const optionMap = new Map()

  for (const option of options) {
    const normalized = buildVmOsOption(option?.id, option?.label)
    if (!normalized) continue
    optionMap.set(normalized.id, normalized)
  }

  if (optionMap.size === 0) {
    return []
  }

  optionMap.set(GENERIC_VM_OS_OPTION.id, optionMap.get(GENERIC_VM_OS_OPTION.id) || GENERIC_VM_OS_OPTION)

  const genericOption = optionMap.get(GENERIC_VM_OS_OPTION.id)
  const remainingOptions = [...optionMap.values()]
    .filter((option) => option.id !== GENERIC_VM_OS_OPTION.id)
    .sort((left, right) => left.label.localeCompare(right.label, 'en', { sensitivity: 'base' }))

  return genericOption ? [genericOption, ...remainingOptions] : remainingOptions
}

const getVmOsOptionsFromOsinfoQuery = async () => {
  const result = await execFileCommand('osinfo-query', ['os', '--fields=short-id,name'], {
    timeout: 15000,
  })
  if (!result.success) {
    return []
  }

  return result.stdout
    .split('\n')
    .map(parseVmOsOptionLine)
    .filter(Boolean)
}

const getVmOsOptionsFromVirtInstall = async () => {
  const result = await execFileCommand('virt-install', ['--osinfo', 'list'], {
    timeout: 15000,
  })
  if (!result.success) {
    return []
  }

  return result.stdout
    .split('\n')
    .map(parseVmOsOptionLine)
    .filter(Boolean)
}

const getVmOsOptions = async () => {
  const osinfoQueryOptions = await getVmOsOptionsFromOsinfoQuery()
  if (osinfoQueryOptions.length > 0) {
    return normalizeVmOsOptions(osinfoQueryOptions)
  }

  const virtInstallOptions = await getVmOsOptionsFromVirtInstall()
  return normalizeVmOsOptions(virtInstallOptions)
}

const getVmNames = async () => {
  const { stdout, success, stderr } = await runVirsh(['list', '--all', '--name'])
  if (!success) {
    if (String(stderr || '').includes('command not found')) return []
    return []
  }
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

const getVmDominfo = async (vmName) => {
  const { stdout, success } = await runVirsh(['dominfo', vmName])
  if (!success) return null
  return parseDominfo(stdout)
}

const getVmXml = async (vmName) => {
  const { stdout, success } = await runVirsh(['dumpxml', vmName], {
    timeout: 30000,
  })
  return success ? stdout : ''
}

const getDefaultNetworkName = (networks) => {
  return networks.find((network) => network.name === 'default')?.name || networks[0]?.name || ''
}

const getDefaultPoolName = (storagePools) => {
  return storagePools.find((pool) => pool.name === 'default')?.name || storagePools[0]?.name || ''
}

const getUefiCapability = async () => {
  const matches = []
  for (const candidate of UEFI_FIRMWARE_CANDIDATES) {
    const codeExists = await fileExists(candidate.code)
    const varsExists = await fileExists(candidate.vars)
    if (codeExists && varsExists) {
      matches.push(candidate)
    }
  }
  return {
    supported: matches.length > 0,
    candidates: matches,
  }
}

const getBridgeInterfaces = async () => {
  const { stdout, success } = await execFileCommand(
    'ip',
    ['-json', 'link', 'show', 'type', 'bridge'],
    { timeout: 10000 }
  )
  if (!success) return []
  try {
    const parsed = JSON.parse(stdout)
    return parsed
      .map((item) => ({
        name: item.ifname,
      }))
      .filter((item) => item.name)
  } catch {
    return []
  }
}

const getLibvirtNetworks = async () => {
  const namesResult = await runVirsh(['net-list', '--all', '--name'])
  if (!namesResult.success) return []

  const names = namesResult.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const networks = []
  for (const name of names) {
    const infoResult = await runVirsh(['net-info', name])
    const info = infoResult.success ? parseDominfo(infoResult.stdout) : {}
    const xmlResult = await runVirsh(['net-dumpxml', name], { timeout: 15000 })
    const mode = xmlResult.success ? parseNetworkMode(xmlResult.stdout) : 'unknown'
    networks.push({
      name,
      active: parseYesNo(info.Active),
      autostart: parseYesNo(info.Autostart),
      mode,
    })
  }
  return networks
}

const getStoragePools = async () => {
  const namesResult = await runVirsh(['pool-list', '--all', '--name'])
  if (!namesResult.success) return []

  const names = namesResult.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const pools = []
  for (const name of names) {
    const infoResult = await runVirsh(['pool-info', name])
    const info = infoResult.success ? parseDominfo(infoResult.stdout) : {}
    const xmlResult = await runVirsh(['pool-dumpxml', name], { timeout: 15000 })
    const targetPath = xmlResult.success ? parsePoolTargetPath(xmlResult.stdout) : ''
    pools.push({
      name,
      type: info.Type || 'dir',
      active: parseYesNo(info.Active),
      autostart: parseYesNo(info.Autostart),
      targetPath,
      capacity: info.Capacity || '0',
      allocation: info.Allocation || '0',
      available: info.Available || '0',
      capacityBytes: parseSizeToBytes(info.Capacity) ?? 0,
      allocationBytes: parseSizeToBytes(info.Allocation) ?? 0,
      availableBytes: parseSizeToBytes(info.Available) ?? 0,
    })
  }
  return pools
}

const getVmCapabilitiesInternal = async () => {
  const [virsh, virtInstall, qemuImg, virtXml, swtpm, storagePools, networks, bridges, uefi, osOptions] =
    await Promise.all([
      commandExists('virsh'),
      commandExists('virt-install'),
      commandExists('qemu-img'),
      commandExists('virt-xml'),
      commandExists('swtpm'),
      getStoragePools(),
      getLibvirtNetworks(),
      getBridgeInterfaces(),
      getUefiCapability(),
      getVmOsOptions(),
    ])

  return {
    tools: {
      virsh,
      virtInstall,
      qemuImg,
      virtXml,
      swtpm,
    },
    storagePools,
    libvirtNetworks: networks,
    bridgeInterfaces: bridges,
    firmware: {
      bios: true,
      uefi: uefi.supported,
      uefiCandidates: uefi.candidates,
      default: uefi.supported ? 'uefi' : 'bios',
    },
    osOptions,
    features: {
      tpm: false,
      graphics: ['vnc', 'none'],
      installSources: ['local_iso', 'existing_disk'],
      startModes: ['create_and_run', 'create_and_edit'],
      diskFormats: ['qcow2', 'raw'],
      diskBuses: ['virtio', 'sata'],
      networkModes: ['network', 'bridge', 'none'],
    },
    defaults: {
      osId: GENERIC_VM_OS_OPTION.id,
      storagePool: getDefaultPoolName(storagePools),
      networkMode: networks.length > 0 ? 'network' : bridges.length > 0 ? 'bridge' : 'none',
      networkSource: getDefaultNetworkName(networks),
      firmware: uefi.supported ? 'uefi' : 'bios',
      graphics: 'vnc',
      startMode: 'create_and_run',
      diskFormat: 'qcow2',
      diskBus: 'virtio',
      memoryMiB: 2048,
      diskSizeGiB: 20,
    },
  }
}

const isLegacyCreateRequest = (raw) => {
  return raw && typeof raw === 'object' && ('memoryUnit' in raw || 'diskUnit' in raw || 'bootMode' in raw)
}

const mapLegacyCreateRequest = (raw) => {
  const memory = Number(raw.memory)
  const disk = Number(raw.disk)
  const memoryMiB = raw.memoryUnit === 'GB' ? memory * 1024 : memory
  const diskGiB = raw.diskUnit === 'TB' ? disk * 1024 : disk
  const bootMode = raw.bootMode === 'network' ? 'pxe' : raw.bootMode === 'disk' ? 'existing_disk' : 'local_iso'
  const networkMode = raw.networkType === 'bridge' ? 'bridge' : raw.networkType === 'isolated' ? 'network' : 'network'
  const networkSource = raw.networkType === 'isolated' ? 'isolated' : 'default'
  const storage =
    bootMode === 'existing_disk'
      ? {
          kind: 'existing_disk',
          path: raw.isoPath || '',
          bus: 'virtio',
        }
      : {
          kind: 'new_disk_in_pool',
          pool: 'default',
          sizeGiB: diskGiB,
          format: 'qcow2',
          bus: 'virtio',
        }

  return {
    name: raw.name,
    osId: 'generic',
    vcpu: raw.vcpu,
    memoryMiB,
    installSource:
      bootMode === 'local_iso'
        ? {
            type: 'local_iso',
            path: raw.isoPath || '',
          }
        : {
            type: bootMode,
          },
    disks: [storage],
    networks: [
      networkMode === 'none'
        ? {
            mode: 'none',
          }
        : {
            mode: networkMode,
            source: networkSource,
          },
    ],
    firmware: 'bios',
    tpm: false,
    graphics: 'vnc',
    startMode: raw.startAfterCreate ? 'create_and_run' : 'create_and_edit',
  }
}

const normalizeDiskConfig = (disk) => ({
  kind: String(disk?.kind || '').trim(),
  pool: typeof disk?.pool === 'string' ? disk.pool.trim() : '',
  path: typeof disk?.path === 'string' ? disk.path.trim() : '',
  sizeGiB: Number(disk?.sizeGiB),
  format: disk?.format === 'raw' ? 'raw' : 'qcow2',
  bus: disk?.bus === 'sata' ? 'sata' : 'virtio',
})

const normalizeNetworkConfig = (network) => ({
  mode: network?.mode === 'bridge' ? 'bridge' : network?.mode === 'none' ? 'none' : 'network',
  source: typeof network?.source === 'string' ? network.source.trim() : '',
})

const normalizeCreateVMRequest = (raw) => {
  const source = isLegacyCreateRequest(raw) ? mapLegacyCreateRequest(raw) : raw
  if (!source || typeof source !== 'object') {
    throw new HttpError(400, '创建虚机请求体无效')
  }

  const installSource = source.installSource || {}
  const disks = Array.isArray(source.disks)
    ? source.disks
    : source.storage
      ? [source.storage]
      : []
  const networks = Array.isArray(source.networks)
    ? source.networks
    : source.network
      ? [source.network]
      : []

  return {
    name: String(source.name || '').trim(),
    osId: String(source.osId || 'generic').trim() || 'generic',
    vcpu: Number(source.vcpu),
    memoryMiB: Number(source.memoryMiB),
    installSource: {
      type: String(installSource.type || '').trim(),
      path: typeof installSource.path === 'string' ? installSource.path.trim() : '',
    },
    disks: disks.map(normalizeDiskConfig),
    networks: (networks.length > 0 ? networks : [{ mode: 'none' }]).map(normalizeNetworkConfig),
    firmware: source.firmware === 'uefi' ? 'uefi' : 'bios',
    tpm: Boolean(source.tpm),
    graphics: source.graphics === 'none' ? 'none' : 'vnc',
    startMode: source.startMode === 'create_and_edit' ? 'create_and_edit' : 'create_and_run',
  }
}

const ensureAbsolutePath = (targetPath, label) => {
  if (!isAbsolute(targetPath)) {
    throw new HttpError(400, `${label}必须使用绝对路径`)
  }
}

const getDiskLabel = (index) => (index === 0 ? '系统磁盘' : `第 ${index + 1} 块磁盘`)

const getPoolVolumeName = (vmName, disk, index) => {
  const extension = disk.format === 'raw' ? 'img' : 'qcow2'
  return index === 0 ? `${vmName}.${extension}` : `${vmName}-disk${index + 1}.${extension}`
}

const validateVmCreationRequest = async (request, capabilities) => {
  if (!request.name) {
    throw new HttpError(400, '虚拟机名称不能为空')
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,62}$/.test(request.name)) {
    throw new HttpError(400, '虚拟机名称仅允许字母、数字、点、下划线和中划线，且长度不超过 63')
  }
  if (!Number.isInteger(request.vcpu) || request.vcpu < 1 || request.vcpu > 64) {
    throw new HttpError(400, 'vCPU 数量必须在 1 到 64 之间')
  }
  if (!Number.isFinite(request.memoryMiB) || request.memoryMiB <= 0) {
    throw new HttpError(400, '内存必须大于 0 MiB')
  }
  if (!capabilities.tools.virsh || !capabilities.tools.virtInstall) {
    throw new HttpError(400, '宿主机缺少 virsh 或 virt-install，无法创建虚拟机')
  }
  if (request.firmware === 'uefi' && !capabilities.firmware.uefi) {
    throw new HttpError(400, '当前宿主机未检测到可用的 UEFI 固件')
  }
  if (request.tpm) {
    throw new HttpError(400, '当前版本不支持启用 vTPM 2.0')
  }

  if (!['local_iso', 'existing_disk'].includes(request.installSource.type)) {
    throw new HttpError(400, '不支持的安装源类型')
  }
  if (!Array.isArray(request.disks) || request.disks.length === 0) {
    throw new HttpError(400, '至少需要配置一块磁盘')
  }

  if (request.installSource.type === 'local_iso') {
    if (!request.installSource.path) {
      throw new HttpError(400, '本地 ISO 安装需要提供镜像路径')
    }
    ensureAbsolutePath(request.installSource.path, 'ISO 路径')
    if (!(await sudoTest('-r', request.installSource.path))) {
      throw new HttpError(400, 'ISO 路径不存在或当前服务无权读取')
    }
  }

  const primaryDisk = request.disks[0]
  if (request.installSource.type === 'existing_disk' && primaryDisk.kind !== 'existing_disk') {
    throw new HttpError(400, '现有磁盘导入时，系统磁盘必须选择现有磁盘')
  }
  if (request.installSource.type === 'local_iso' && primaryDisk.kind !== 'new_disk_at_path') {
    throw new HttpError(400, 'ISO 安装时，系统磁盘必须创建在自定义路径')
  }

  const pathSet = new Set()
  const poolRequirements = new Map()
  const directoryRequirements = new Map()
  let needsQemuImg = false

  for (const [index, disk] of request.disks.entries()) {
    const label = getDiskLabel(index)
    if (!['new_disk_in_pool', 'new_disk_at_path', 'existing_disk'].includes(disk.kind)) {
      throw new HttpError(400, `${label}使用了不支持的存储类型`)
    }

    if (disk.kind === 'new_disk_in_pool' && request.installSource.type === 'local_iso') {
      throw new HttpError(400, '选择 ISO 安装时，不支持使用 libvirt 存储池创建磁盘')
    }

    if (disk.kind === 'existing_disk') {
      if (!disk.path) {
        throw new HttpError(400, `${label}需要提供磁盘路径`)
      }
      ensureAbsolutePath(disk.path, `${label}路径`)
      if (pathSet.has(disk.path)) {
        throw new HttpError(400, `${label}与其他磁盘使用了相同路径`)
      }
      pathSet.add(disk.path)
      if (!(await sudoTest('-r', disk.path))) {
        throw new HttpError(400, `${label}路径不存在或当前服务无权读取`)
      }
      continue
    }

    if (!Number.isFinite(disk.sizeGiB) || disk.sizeGiB < 1) {
      throw new HttpError(400, `${label}容量至少为 1 GiB`)
    }

    if (disk.kind === 'new_disk_in_pool') {
      if (!disk.pool) {
        throw new HttpError(400, `${label}请选择存储池`)
      }
      const pool = capabilities.storagePools.find((item) => item.name === disk.pool)
      if (!pool) {
        throw new HttpError(400, `${label}选择的存储池 ${disk.pool} 不存在`)
      }
      if (!pool.active) {
        throw new HttpError(400, `${label}选择的存储池 ${disk.pool} 当前未激活`)
      }
      const requiredBytes = Math.round(disk.sizeGiB * 1024 * 1024 * 1024)
      poolRequirements.set(disk.pool, (poolRequirements.get(disk.pool) || 0) + requiredBytes)
      continue
    }

    needsQemuImg = true
    if (!disk.path) {
      throw new HttpError(400, `${label}需要提供磁盘文件路径`)
    }
    ensureAbsolutePath(disk.path, `${label}路径`)
    if (pathSet.has(disk.path)) {
      throw new HttpError(400, `${label}与其他磁盘使用了相同路径`)
    }
    pathSet.add(disk.path)
    if (await sudoTest('-e', disk.path)) {
      throw new HttpError(400, `${label}目标磁盘路径已存在，请更换路径`)
    }
    const parentDir = dirname(disk.path)
    if (!(await sudoTest('-d', parentDir))) {
      throw new HttpError(400, `${label}目标磁盘目录不存在`)
    }
    const requiredBytes = Math.round(disk.sizeGiB * 1024 * 1024 * 1024)
    directoryRequirements.set(parentDir, (directoryRequirements.get(parentDir) || 0) + requiredBytes)
  }

  if (needsQemuImg && !capabilities.tools.qemuImg) {
    throw new HttpError(400, '当前宿主机缺少 qemu-img，无法创建自定义路径磁盘')
  }

  for (const [poolName, requiredBytes] of poolRequirements.entries()) {
    const pool = capabilities.storagePools.find((item) => item.name === poolName)
    if (pool && pool.availableBytes > 0 && requiredBytes > pool.availableBytes) {
      throw new HttpError(400, `存储池 ${poolName} 剩余空间不足，当前可用 ${pool.available}`)
    }
  }

  for (const [targetDir, requiredBytes] of directoryRequirements.entries()) {
    const availableBytes = await getFilesystemAvailableBytes(targetDir)
    if (availableBytes && requiredBytes > availableBytes) {
      throw new HttpError(400, `目录 ${targetDir} 剩余空间不足，当前可用 ${formatBytes(availableBytes)}`)
    }
  }

  if (!Array.isArray(request.networks) || request.networks.length === 0) {
    throw new HttpError(400, '网络配置无效')
  }

  const noneNetworkCount = request.networks.filter((network) => network.mode === 'none').length
  if (noneNetworkCount > 0 && request.networks.length > 1) {
    throw new HttpError(400, '无网络模式不能与其他网卡同时使用')
  }

  for (const network of request.networks) {
    if (network.mode === 'none') {
      continue
    }

    if (network.mode === 'network') {
      if (!network.source) {
        throw new HttpError(400, '请选择 libvirt 网络')
      }
      const matchedNetwork = capabilities.libvirtNetworks.find((item) => item.name === network.source)
      if (!matchedNetwork) {
        throw new HttpError(400, `libvirt 网络 ${network.source} 不存在`)
      }
      if (!matchedNetwork.active) {
        throw new HttpError(400, `libvirt 网络 ${network.source} 当前未激活`)
      }
      continue
    }

    if (!network.source) {
      throw new HttpError(400, '桥接模式需要选择桥接网卡')
    }
    const bridge = capabilities.bridgeInterfaces.find((item) => item.name === network.source)
    if (!bridge) {
      throw new HttpError(400, `桥接网卡 ${network.source} 不存在`)
    }
  }

  if (await getVmDominfo(request.name)) {
    throw new HttpError(409, `虚拟机 ${request.name} 已存在`)
  }
}

const prepareVmDisk = async (request, disk, index) => {
  if (disk.kind === 'existing_disk') {
    return {
      path: disk.path,
      cleanup: async () => {},
    }
  }

  if (disk.kind === 'new_disk_in_pool') {
    const volumeName = getPoolVolumeName(request.name, disk, index)
    const existingVolume = await runVirsh(['vol-info', volumeName, '--pool', disk.pool])
    if (existingVolume.success) {
      throw new HttpError(409, `存储池中已存在同名卷 ${volumeName}`)
    }

    const createResult = await runVirsh([
      'vol-create-as',
      disk.pool,
      volumeName,
      `${disk.sizeGiB}G`,
      '--format',
      disk.format,
    ])
    if (!createResult.success) {
      throw new Error(createResult.stderr || createResult.stdout || '创建存储卷失败')
    }

    const pathResult = await runVirsh(['vol-path', volumeName, '--pool', disk.pool])
    if (!pathResult.success || !pathResult.stdout) {
      throw new Error(pathResult.stderr || '获取存储卷路径失败')
    }

    return {
      path: pathResult.stdout.trim(),
      cleanup: async () => {
        await runVirsh(['vol-delete', volumeName, '--pool', disk.pool], {
          timeout: 20000,
        })
      },
    }
  }

  const createResult = await runQemuImg([
    'create',
    '-f',
    disk.format,
    disk.path,
    `${disk.sizeGiB}G`,
  ])
  if (!createResult.success) {
    throw new Error(createResult.stderr || createResult.stdout || '创建磁盘镜像失败')
  }

  return {
    path: disk.path,
    cleanup: async () => {
      await safeRemoveFile(disk.path)
    },
  }
}

const prepareVmDisks = async (request) => {
  const preparedDisks = []
  try {
    for (const [index, disk] of request.disks.entries()) {
      preparedDisks.push(await prepareVmDisk(request, disk, index))
    }
    return preparedDisks
  } catch (error) {
    for (const preparedDisk of preparedDisks.reverse()) {
      await preparedDisk.cleanup()
    }
    throw error
  }
}

const createVmXmlDefinition = async (request, diskPaths) => {
  const args = buildVmInstallArgs(request, diskPaths, {
    printXmlStep: request.installSource.type === 'local_iso' ? 1 : true,
  })
  const result = await runVirtInstall(args)
  if (!result.success || !result.stdout) {
    throw new Error(result.stderr || result.stdout || '生成虚拟机定义失败')
  }
  const xml = extractDomainXml(result.stdout)
  if (!xml.startsWith('<domain')) {
    throw new Error('virt-install 未返回有效的虚拟机定义 XML')
  }
  return xml
}

const createVmWithVirtInstall = async (request, diskPaths) => {
  const args = buildVmInstallArgs(request, diskPaths)
  const result = await runVirtInstall(args)
  if (!result.success) {
    throw new Error(result.stderr || result.stdout || '创建虚拟机失败')
  }
}

const defineVmFromXml = async (jobId, request, xml) => {
  const xmlPath = join(tmpdir(), `infiniteos-vm-${jobId}.xml`)
  await writeFile(xmlPath, xml, 'utf8')
  try {
    const result = await runVirsh(['define', xmlPath], { timeout: 30000 })
    if (!result.success) {
      throw new Error(result.stderr || result.stdout || '定义虚拟机失败')
    }
  } finally {
    await safeUnlink(xmlPath)
  }
}

const undefineVm = async (vmName) => {
  await runVirsh(['destroy', vmName], { timeout: 15000 })
  const withNvram = await runVirsh(['undefine', vmName, '--nvram'], { timeout: 20000 })
  if (!withNvram.success) {
    await runVirsh(['undefine', vmName], { timeout: 20000 })
  }
}

const executeCreateVmJob = async (jobId, request) => {
  const createdArtifacts = {
    domainDefined: false,
    diskCleanup: async () => {},
  }

  try {
    setVmJobStage(jobId, 'running', 'validating', '正在校验宿主机能力和创建参数')
    const capabilities = await getVmCapabilitiesInternal()
    await validateVmCreationRequest(request, capabilities)

    setVmJobStage(jobId, 'running', 'creating_storage', '正在准备虚拟机磁盘')
    const preparedDisks = await prepareVmDisks(request)
    createdArtifacts.diskCleanup = async () => {
      for (const preparedDisk of [...preparedDisks].reverse()) {
        await preparedDisk.cleanup()
      }
    }

    const diskPaths = preparedDisks.map((disk) => disk.path)

    if (request.startMode === 'create_and_run') {
      setVmJobStage(jobId, 'running', 'defining_domain', '正在通过 virt-install 创建并启动虚拟机')
      await createVmWithVirtInstall(request, diskPaths)
      createdArtifacts.domainDefined = true

      completeVmJob(
        jobId,
        {
          vmName: request.name,
          started: true,
        },
        '虚拟机创建成功并已启动'
      )
      return
    }

    setVmJobStage(jobId, 'running', 'generating_definition', '正在生成虚拟机定义')
    const xml = await createVmXmlDefinition(request, diskPaths)

    setVmJobStage(jobId, 'running', 'defining_domain', '正在写入 libvirt 域定义')
    await defineVmFromXml(jobId, request, xml)
    createdArtifacts.domainDefined = true

    completeVmJob(
      jobId,
      {
        vmName: request.name,
        started: false,
      },
      '虚拟机创建成功，当前保持关机状态'
    )
  } catch (error) {
    if (createdArtifacts.domainDefined) {
      await undefineVm(request.name)
    }
    await createdArtifacts.diskCleanup()
    failVmJob(jobId, error)
  }
}

/**
 * 获取虚拟机列表
 */
export const getVMs = async () => {
  try {
    const names = await getVmNames()
    const vms = []

    for (const name of names) {
      const info = await getVmDominfo(name)
      if (!info) continue

      const stateRaw = info.State || 'unknown'
      const status = normalizeVmStatus(stateRaw)
      const vcpu = parseInt(info['CPU(s)']) || 1
      const maxMemKiB = parseMemToKiB(info['Max memory']) ?? 0

      vms.push({
        id: info.Id && info.Id !== '-' ? info.Id : null,
        name,
        state: stateRaw.toLowerCase(),
        status,
        cpu: vcpu,
        memory: maxMemKiB ? formatKiB(maxMemKiB) : info['Max memory'] || '0',
        cpuUsage: 0,
        memoryUsage: 0,
        networkUsage: 0,
      })
    }

    return vms
  } catch (error) {
    console.error('获取虚拟机列表错误:', error)
    throw error
  }
}

/**
 * 获取虚拟机详情
 */
export const getVMDetails = async (vmName) => {
  try {
    const info = await getVmDominfo(vmName)
    if (!info) return null

    const stateRaw = info.State || 'unknown'
    const status = normalizeVmStatus(stateRaw)
    const vcpu = parseInt(info['CPU(s)']) || 1
    const maxMemKiB = parseMemToKiB(info['Max memory']) ?? 0
    const xml = await getVmXml(vmName)
    const disks = extractDisksFromXml(xml)
    const networkInterfaces = extractIfacesFromXml(xml)

    let storageBytes = 0
    for (const disk of disks) {
      if (!disk.target) continue
      const blkInfoResult = await runVirsh(['domblkinfo', vmName, disk.target])
      if (!blkInfoResult.success) continue
      const capacityLine = blkInfoResult.stdout
        .split('\n')
        .find((line) => line.toLowerCase().startsWith('capacity:'))
      if (!capacityLine) continue
      const capacity = Number(capacityLine.split(':')[1].trim())
      if (Number.isFinite(capacity) && capacity > 0) {
        storageBytes += capacity
      }
    }

    return {
      name: vmName,
      id: info.Id && info.Id !== '-' ? info.Id : null,
      uuid: info.UUID || null,
      state: stateRaw,
      status,
      osType: info['OS Type'] || 'hvm',
      vcpu,
      cpu: `${vcpu} vCPU`,
      ram: maxMemKiB ? formatKiB(maxMemKiB) : info['Max memory'] || '0',
      memory: maxMemKiB ? formatKiB(maxMemKiB) : info['Used memory'] || '0',
      memoryKiB: maxMemKiB,
      storage: storageBytes ? formatBytes(storageBytes) : disks.length > 0 ? '已配置' : '未配置',
      storageBytes,
      networkInterfaces,
      disks,
    }
  } catch (error) {
    console.error('获取虚拟机详情错误:', error)
    return null
  }
}

/**
 * 获取虚机创建能力
 */
export const getVmCapabilities = async () => {
  return getVmCapabilitiesInternal()
}

/**
 * 提交创建虚机任务
 */
export const createVM = async (config) => {
  const request = normalizeCreateVMRequest(config)
  const capabilities = await getVmCapabilitiesInternal()
  await validateVmCreationRequest(request, capabilities)

  const job = createVmJobRecord(request.name)
  appendVmJobLog(job.id, 'info', '任务已进入队列')

  void executeCreateVmJob(job.id, request)

  return {
    jobId: job.id,
    vmName: request.name,
    status: job.status,
    message: '虚拟机创建任务已提交',
  }
}

/**
 * 获取创建任务状态
 */
export const getVMCreationJob = async (jobId) => {
  pruneOldJobs()
  const job = VM_JOBS.get(jobId)
  if (!job) {
    throw new HttpError(404, '创建任务不存在或已过期')
  }
  return cloneJob(job)
}

/**
 * 启动虚拟机
 */
export const startVM = async (vmName) => {
  const info = await getVmDominfo(vmName)
  if (!info) {
    throw new Error(`虚拟机 ${vmName} 不存在`)
  }

  if (normalizeVmStatus(info.State) === 'running') {
    return { message: '虚拟机已在运行中' }
  }

  const result = await runVirsh(['start', vmName], { timeout: 20000 })
  if (!result.success) {
    throw new Error(result.stderr || result.stdout || '启动虚拟机失败')
  }
  return { message: '虚拟机启动成功' }
}

/**
 * 停止虚拟机
 */
export const stopVM = async (vmName) => {
  const info = await getVmDominfo(vmName)
  if (!info) {
    throw new Error(`虚拟机 ${vmName} 不存在`)
  }
  if (normalizeVmStatus(info.State) !== 'running') {
    return { message: '虚拟机已停止' }
  }

  const result = await runVirsh(['shutdown', vmName], { timeout: 20000 })
  if (!result.success) {
    throw new Error(result.stderr || result.stdout || '停止虚拟机失败')
  }
  return { message: '虚拟机停止成功' }
}

/**
 * 重启虚拟机
 */
export const restartVM = async (vmName) => {
  const result = await runVirsh(['reboot', vmName], { timeout: 20000 })
  if (!result.success) {
    throw new Error(result.stderr || result.stdout || '重启虚拟机失败')
  }
  return { message: '虚拟机重启成功' }
}

/**
 * 暂停虚拟机
 */
export const suspendVM = async (vmName) => {
  const result = await runVirsh(['suspend', vmName], { timeout: 20000 })
  if (!result.success) {
    throw new Error(result.stderr || result.stdout || '暂停虚拟机失败')
  }
  return { message: '虚拟机暂停成功' }
}

/**
 * 恢复虚拟机
 */
export const resumeVM = async (vmName) => {
  const result = await runVirsh(['resume', vmName], { timeout: 20000 })
  if (!result.success) {
    throw new Error(result.stderr || result.stdout || '恢复虚拟机失败')
  }
  return { message: '虚拟机恢复成功' }
}

/**
 * 删除虚拟机
 */
export const deleteVM = async (vmName) => {
  try {
    await runVirsh(['shutdown', vmName], { timeout: 15000 })
    await new Promise((resolve) => setTimeout(resolve, 2000))
  } catch {
    // ignore
  }

  const withNvram = await runVirsh(['undefine', vmName, '--nvram'], { timeout: 20000 })
  if (!withNvram.success) {
    const fallback = await runVirsh(['undefine', vmName], { timeout: 20000 })
    if (!fallback.success) {
      throw new Error(fallback.stderr || fallback.stdout || '删除虚拟机失败')
    }
  }

  return { message: '虚拟机删除成功' }
}

/**
 * 获取虚拟机监控数据
 */
export const getVMMonitoring = async (vmName) => {
  try {
    const { stdout, success } = await runVirsh(['domstats', vmName], {
      timeout: 15000,
    })

    if (!success) {
      return {
        cpuUsage: 0,
        memoryUsage: 0,
        networkRx: 0,
        networkTx: 0,
        diskRead: 0,
        diskWrite: 0,
      }
    }

    const stats = {}
    const lines = stdout.split('\n')
    for (const line of lines) {
      if (!line.includes('=')) continue
      const [key, value] = line.split('=').map((item) => item.trim())
      stats[key] = value
    }

    return {
      cpuUsage: parseFloat(stats['cpu.time']) || 0,
      memoryUsage: parseInt(stats['balloon.current']) || 0,
      networkRx: parseInt(stats['net.0.rx.bytes']) || 0,
      networkTx: parseInt(stats['net.0.tx.bytes']) || 0,
      diskRead: parseInt(stats['block.0.rd.bytes']) || 0,
      diskWrite: parseInt(stats['block.0.wr.bytes']) || 0,
    }
  } catch (error) {
    console.error('获取虚拟机监控数据错误:', error)
    return {
      cpuUsage: 0,
      memoryUsage: 0,
      networkRx: 0,
      networkTx: 0,
      diskRead: 0,
      diskWrite: 0,
    }
  }
}

/**
 * 获取虚拟机控制台信息
 */
export const getVMConsole = async (vmName) => {
  try {
    const info = await getVmDominfo(vmName)
    if (!info) {
      throw new HttpError(404, `虚拟机 ${vmName} 不存在`)
    }

    if (normalizeVmStatus(info.State) === 'stopped') {
      throw new HttpError(409, '虚拟机已关机，请先启动后再打开控制台')
    }

    const { stdout, success } = await runVirsh(['vncdisplay', vmName], {
      timeout: 10000,
    })
    if (!success || !stdout.trim()) {
      throw new HttpError(409, '虚拟机当前不可用控制台')
    }

    const vncDisplay = stdout.trim()
    const portMatch = vncDisplay.match(/:(\d+)/)
    if (!portMatch) {
      throw new Error('无法解析VNC端口')
    }

    const vncPort = parseInt(portMatch[1], 10) + 5900
    return {
      vncPort,
      vncDisplay,
      consoleUrl: `/virtual-machines/${encodeURIComponent(vmName)}/console`,
      wsPath: `/api/virtual-machines/${encodeURIComponent(vmName)}/ws`,
    }
  } catch (error) {
    console.error('获取虚拟机控制台信息错误:', error)
    throw error
  }
}

export { HttpError }
