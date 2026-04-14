import { XMLBuilder, XMLParser } from 'fast-xml-parser'

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: false,
  trimValues: false,
})

const xmlBuilder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  format: true,
  suppressEmptyNode: false,
})

const toArray = (value) => {
  if (Array.isArray(value)) return value
  if (value === undefined || value === null) return []
  return [value]
}

const setArrayValue = (target, key, values) => {
  if (!values || values.length === 0) {
    delete target[key]
    return
  }
  target[key] = values.length === 1 ? values[0] : values
}

const getSourcePath = (device) => {
  return device?.source?.['@_file'] || device?.source?.['@_dev'] || ''
}

const getTextNodeValue = (value) => {
  if (value && typeof value === 'object') {
    return String(value['#text'] || '').trim()
  }
  return String(value || '').trim()
}

const setTextNodeValue = (current, text, forcedAttrs = {}) => {
  const nextAttrs = {}
  if (current && typeof current === 'object') {
    for (const [key, value] of Object.entries(current)) {
      if (key.startsWith('@_')) {
        nextAttrs[key] = value
      }
    }
  }
  Object.assign(nextAttrs, forcedAttrs)
  if (Object.keys(nextAttrs).length === 0) {
    return String(text)
  }
  return {
    ...nextAttrs,
    '#text': String(text),
  }
}

const getInterfaceMode = (iface) => {
  if (iface?.['@_type'] === 'bridge') return 'bridge'
  if (iface?.['@_type'] === 'network') return 'network'
  return 'unknown'
}

const getDiskCapacityGiB = (capacityBytes) => {
  if (!Number.isFinite(capacityBytes) || capacityBytes <= 0) return null
  return Math.max(1, Math.round(capacityBytes / 1024 / 1024 / 1024))
}

const getBootOrderValue = (device) => {
  const order = Number(toArray(device?.boot)[0]?.['@_order'])
  return Number.isFinite(order) && order > 0 ? order : null
}

const isVmBootableDevice = (device) => device?.['@_device'] === 'disk' || device?.['@_device'] === 'cdrom'

const getVmBootDeviceKey = (device) =>
  `${String(device?.['@_device'] || '').trim()}:${String(device?.target?.['@_dev'] || '').trim()}`

const getVmBootDeviceDescriptors = (domain) => {
  return getVmDomainDisks(domain)
    .map((device, index) => {
      if (!isVmBootableDevice(device)) return null
      const target = String(device?.target?.['@_dev'] || '').trim()
      if (!target) return null
      return {
        index,
        key: getVmBootDeviceKey(device),
        target,
        device: device?.['@_device'] === 'cdrom' ? 'cdrom' : 'disk',
        bus: String(device?.target?.['@_bus'] || '').trim(),
        bootOrder: getBootOrderValue(device),
      }
    })
    .filter(Boolean)
}

const getVmResolvedBootDeviceDescriptors = (domain) => {
  const descriptors = getVmBootDeviceDescriptors(domain)
  if (descriptors.length === 0) return []

  const explicit = descriptors.filter((item) => item.bootOrder !== null)
  if (explicit.length > 0) {
    const ordered = explicit
      .slice()
      .sort((left, right) => {
        if ((left.bootOrder || 0) !== (right.bootOrder || 0)) {
          return (left.bootOrder || 0) - (right.bootOrder || 0)
        }
        return left.index - right.index
      })
    const usedKeys = new Set(ordered.map((item) => item.key))
    return [...ordered, ...descriptors.filter((item) => !usedKeys.has(item.key))]
  }

  const osBootEntries = toArray(domain?.os?.boot)
    .map((item) => String(item?.['@_dev'] || '').trim().toLowerCase())
    .filter(Boolean)

  if (osBootEntries.length > 0) {
    const preferredTypes = []
    for (const entry of osBootEntries) {
      if (entry === 'hd' && !preferredTypes.includes('disk')) preferredTypes.push('disk')
      if (entry === 'cdrom' && !preferredTypes.includes('cdrom')) preferredTypes.push('cdrom')
    }

    const ordered = []
    const usedKeys = new Set()
    for (const preferredType of preferredTypes) {
      for (const descriptor of descriptors) {
        if (descriptor.device !== preferredType || usedKeys.has(descriptor.key)) continue
        ordered.push(descriptor)
        usedKeys.add(descriptor.key)
      }
    }

    return [...ordered, ...descriptors.filter((item) => !usedKeys.has(item.key))]
  }

  return descriptors
}

const normalizeDiskBus = (bus) => (bus === 'sata' || bus === 'scsi' ? bus : 'virtio')

const normalizeCdromBus = (bus) => (bus === 'scsi' ? 'scsi' : 'sata')

const getDiskPrefix = (bus) => (bus === 'sata' || bus === 'scsi' ? 'sd' : 'vd')

const formatDeviceSuffix = (index) => {
  let current = index
  let suffix = ''
  do {
    suffix = String.fromCharCode(97 + (current % 26)) + suffix
    current = Math.floor(current / 26) - 1
  } while (current >= 0)
  return suffix
}

export const parseVmDomainXml = (xml) => {
  const parsed = xmlParser.parse(String(xml || ''))
  if (!parsed?.domain) {
    throw new Error('虚拟机定义 XML 无效')
  }
  return parsed.domain
}

export const buildVmDomainXml = (domain) => {
  domain.devices = domain.devices || {}

  const channels = toArray(domain.devices.channel)
  const hasGuestAgentChannel = channels.some(
    (channel) =>
      channel?.target?.['@_type'] === 'virtio' &&
      String(channel?.target?.['@_name'] || '').trim() === 'org.qemu.guest_agent.0'
  )

  if (!hasGuestAgentChannel) {
    channels.push({
      '@_type': 'unix',
      target: {
        '@_type': 'virtio',
        '@_name': 'org.qemu.guest_agent.0',
      },
    })
    setArrayValue(domain.devices, 'channel', channels)
  }

  return xmlBuilder.build({ domain })
}

export const getVmDomainDisks = (domain) => toArray(domain?.devices?.disk)

export const setVmDomainDisks = (domain, disks) => {
  domain.devices = domain.devices || {}
  setArrayValue(domain.devices, 'disk', disks)
}

export const getVmDomainInterfaces = (domain) => toArray(domain?.devices?.interface)

export const setVmDomainInterfaces = (domain, interfaces) => {
  domain.devices = domain.devices || {}
  setArrayValue(domain.devices, 'interface', interfaces)
}

export const getVmDomainControllers = (domain) => toArray(domain?.devices?.controller)

export const setVmDomainControllers = (domain, controllers) => {
  domain.devices = domain.devices || {}
  setArrayValue(domain.devices, 'controller', controllers)
}

const ensureScsiController = (domain) => {
  const controllers = getVmDomainControllers(domain)
  const existing = controllers.find((controller) => controller?.['@_type'] === 'scsi')
  if (existing) return existing

  const nextController = {
    '@_type': 'scsi',
    '@_index': '0',
    '@_model': 'virtio-scsi',
  }
  controllers.push(nextController)
  setVmDomainControllers(domain, controllers)
  return nextController
}

const ensureDiskBusPrerequisites = (domain, bus) => {
  if (bus === 'scsi') {
    ensureScsiController(domain)
  }
}

export const getVmCpuTopology = (domain, fallbackVcpu = 1) => {
  const topology = domain?.cpu?.topology || {}
  const sockets = Number(topology['@_sockets']) || 1
  const cores = Number(topology['@_cores']) || Math.max(1, Number(fallbackVcpu) || 1)
  const threads = Number(topology['@_threads']) || 1
  return {
    sockets,
    cores,
    threads,
  }
}

export const getVmMemoryKiB = (domain, fallbackKiB = 0) => {
  const current = Number(getTextNodeValue(domain?.currentMemory))
  if (Number.isFinite(current) && current > 0) {
    return current
  }
  const total = Number(getTextNodeValue(domain?.memory))
  if (Number.isFinite(total) && total > 0) {
    return total
  }
  return Number(fallbackKiB) || 0
}

export const getVmBootOrder = (domain) => {
  const firstDevice = getVmResolvedBootDeviceDescriptors(domain)[0]
  if (!firstDevice) return 'unknown'
  return firstDevice.device === 'cdrom' ? 'cdrom_first' : 'disk_first'
}

export const getVmBootTarget = (domain) => {
  return getVmResolvedBootDeviceDescriptors(domain)[0]?.target || null
}

export const getVmBootDevices = (domain) => {
  return getVmResolvedBootDeviceDescriptors(domain).map((device, index) => ({
    target: device.target,
    device: device.device,
    bus: device.bus,
    order: index + 1,
  }))
}

export const setVmBootTarget = (domain, target) => {
  const normalizedTarget = String(target || '').trim()
  if (!normalizedTarget) return false

  const resolvedDevices = getVmResolvedBootDeviceDescriptors(domain)
  const primaryDevice = resolvedDevices.find((item) => item.target === normalizedTarget)
  if (!primaryDevice) return false

  const orderedKeys = [
    primaryDevice.key,
    ...resolvedDevices.filter((item) => item.key !== primaryDevice.key).map((item) => item.key),
  ]
  const orderByKey = new Map(orderedKeys.map((key, index) => [key, index + 1]))
  const disks = getVmDomainDisks(domain).map((disk) => {
    const next = { ...disk }
    if (isVmBootableDevice(disk)) {
      const order = orderByKey.get(getVmBootDeviceKey(disk))
      if (order) {
        next.boot = {
          '@_order': String(order),
        }
      } else {
        delete next.boot
      }
    } else {
      delete next.boot
    }
    return next
  })

  if (domain.os && 'boot' in domain.os) {
    delete domain.os.boot
  }
  setVmDomainDisks(domain, disks)
  return true
}

export const setVmBootOrder = (domain, mode) => {
  const resolvedDevices = getVmResolvedBootDeviceDescriptors(domain)
  const selectedDevice =
    mode === 'cdrom_first'
      ? resolvedDevices.find((item) => item.device === 'cdrom')
      : resolvedDevices.find((item) => item.device === 'disk')

  if (selectedDevice) {
    setVmBootTarget(domain, selectedDevice.target)
    return
  }

  domain.os = domain.os || {}
  domain.os.boot =
    mode === 'cdrom_first'
      ? [{ '@_dev': 'cdrom' }, { '@_dev': 'hd' }]
      : [{ '@_dev': 'hd' }, { '@_dev': 'cdrom' }]

  const disks = getVmDomainDisks(domain).map((disk) => {
    const next = { ...disk }
    delete next.boot
    return next
  })
  setVmDomainDisks(domain, disks)
}

export const getVmCdrom = (domain) => {
  const cdrom = getVmDomainDisks(domain).find((disk) => disk?.['@_device'] === 'cdrom')
  if (!cdrom) return null
  return {
    target: cdrom?.target?.['@_dev'] || '',
    source: getSourcePath(cdrom) || null,
    bus: cdrom?.target?.['@_bus'] || '',
  }
}

export const getVmCdroms = (domain) => {
  return getVmDomainDisks(domain)
    .filter((disk) => disk?.['@_device'] === 'cdrom')
    .map((cdrom) => ({
      target: cdrom?.target?.['@_dev'] || '',
      source: getSourcePath(cdrom) || null,
      bus: cdrom?.target?.['@_bus'] || '',
    }))
}

export const ejectVmCdrom = (domain) => {
  const disks = getVmDomainDisks(domain)
  const index = disks.findIndex((disk) => disk?.['@_device'] === 'cdrom')
  if (index === -1) return false

  const next = {
    ...disks[index],
  }
  delete next.source
  disks[index] = next
  setVmDomainDisks(domain, disks)
  return true
}

export const ejectVmCdromByTarget = (domain, target) => {
  const normalizedTarget = String(target || '').trim()
  const disks = getVmDomainDisks(domain)
  const index = disks.findIndex(
    (disk) => disk?.['@_device'] === 'cdrom' && String(disk?.target?.['@_dev'] || '').trim() === normalizedTarget
  )
  if (index === -1) return false

  const next = {
    ...disks[index],
  }
  delete next.source
  disks[index] = next
  setVmDomainDisks(domain, disks)
  return true
}

export const addVmCdrom = (domain, { path, bus = 'sata' }) => {
  const requestedBus = normalizeCdromBus(bus)
  ensureDiskBusPrerequisites(domain, requestedBus)
  const disks = getVmDomainDisks(domain)
  const target = allocateVmDiskTarget(domain, requestedBus)
  disks.push({
    '@_type': 'file',
    '@_device': 'cdrom',
    driver: {
      '@_name': 'qemu',
      '@_type': 'raw',
    },
    source: {
      '@_file': path,
    },
    target: {
      '@_dev': target,
      '@_bus': requestedBus,
    },
    readonly: '',
  })
  setVmDomainDisks(domain, disks)
  return target
}

export const upsertVmCdrom = (domain, { path, bus = 'sata' }) => {
  const requestedBus = normalizeCdromBus(bus)
  ensureDiskBusPrerequisites(domain, requestedBus)
  const disks = getVmDomainDisks(domain)
  const index = disks.findIndex((disk) => disk?.['@_device'] === 'cdrom')

  if (index === -1) {
    const target = allocateVmDiskTarget(domain, requestedBus)
    disks.push({
      '@_type': 'file',
      '@_device': 'cdrom',
      driver: {
        '@_name': 'qemu',
        '@_type': 'raw',
      },
      source: {
        '@_file': path,
      },
      target: {
        '@_dev': target,
        '@_bus': requestedBus,
      },
      readonly: '',
    })
    setVmDomainDisks(domain, disks)
    return target
  }

  const current = disks[index]
  const nextBus = normalizeCdromBus(bus || current?.target?.['@_bus'] || 'sata')
  ensureDiskBusPrerequisites(domain, nextBus)
  disks[index] = {
    ...current,
    '@_type': 'file',
    driver: {
      ...(current?.driver || {}),
      '@_name': 'qemu',
      '@_type': 'raw',
    },
    source: {
      '@_file': path,
    },
    target: {
      ...(current?.target || {}),
      '@_dev': allocateVmDiskTarget(domain, nextBus, current),
      '@_bus': nextBus,
    },
    readonly: current?.readonly ?? '',
  }
  setVmDomainDisks(domain, disks)
  return disks[index]?.target?.['@_dev'] || ''
}

export const insertVmCdromMediaByTarget = (domain, target, { path }) => {
  const normalizedTarget = String(target || '').trim()
  const disks = getVmDomainDisks(domain)
  const index = disks.findIndex(
    (disk) => disk?.['@_device'] === 'cdrom' && String(disk?.target?.['@_dev'] || '').trim() === normalizedTarget
  )
  if (index === -1) return false

  const current = disks[index]
  disks[index] = {
    ...current,
    '@_type': 'file',
    driver: {
      ...(current?.driver || {}),
      '@_name': 'qemu',
      '@_type': 'raw',
    },
    source: {
      '@_file': path,
    },
    readonly: current?.readonly ?? '',
  }
  setVmDomainDisks(domain, disks)
  return true
}

export const removeVmCdrom = (domain) => {
  const disks = getVmDomainDisks(domain)
  const index = disks.findIndex((disk) => disk?.['@_device'] === 'cdrom')
  if (index === -1) return false
  disks.splice(index, 1)
  setVmDomainDisks(domain, disks)
  return true
}

export const removeVmCdromByTarget = (domain, target) => {
  const normalizedTarget = String(target || '').trim()
  const disks = getVmDomainDisks(domain)
  const index = disks.findIndex(
    (disk) => disk?.['@_device'] === 'cdrom' && String(disk?.target?.['@_dev'] || '').trim() === normalizedTarget
  )
  if (index === -1) return false
  disks.splice(index, 1)
  setVmDomainDisks(domain, disks)
  return true
}

export const getVmDiskSummaries = (domain, capacityByTarget = new Map()) => {
  return getVmDomainDisks(domain)
    .filter((disk) => disk?.['@_device'] === 'disk')
    .map((disk, index) => {
      const target = disk?.target?.['@_dev'] || ''
      const capacityBytes = capacityByTarget.get(target) ?? null
      const sizeGiB = getDiskCapacityGiB(capacityBytes)
      const source = getSourcePath(disk)
      const sourceType = disk?.source?.['@_dev'] ? 'block' : 'file'
      const bus = disk?.target?.['@_bus'] || 'virtio'
      return {
        target,
        source,
        type: disk?.driver?.['@_type'] || '',
        bus,
        device: 'disk',
        role: index === 0 ? 'system' : 'data',
        readonly: 'readonly' in (disk || {}),
        capacityBytes,
        sizeGiB,
        format: disk?.driver?.['@_type'] || '',
        sourceType,
        resizable: sourceType === 'file' && !!source,
        removable: index > 0,
      }
    })
}

export const getVmNetworkSummaries = (domain) => {
  return getVmDomainInterfaces(domain).map((iface, index) => ({
    name: iface?.target?.['@_dev'] || `nic${index + 1}`,
    mac: iface?.mac?.['@_address'] || '',
    source:
      iface?.source?.['@_bridge'] ||
      iface?.source?.['@_network'] ||
      iface?.source?.['@_dev'] ||
      '',
    type: iface?.model?.['@_type'] || '',
    model: iface?.model?.['@_type'] || '',
    mode: getInterfaceMode(iface),
    editable: getInterfaceMode(iface) === 'bridge',
  }))
}

export const updateVmCpuMemoryDomain = (domain, { sockets, cores, threads, memoryKiB }) => {
  const totalVcpu = sockets * cores * threads
  domain.vcpu = setTextNodeValue(domain.vcpu, totalVcpu)
  domain.cpu = domain.cpu || {}
  domain.cpu.topology = {
    '@_sockets': String(sockets),
    '@_cores': String(cores),
    '@_threads': String(threads),
  }
  domain.memory = setTextNodeValue(domain.memory, memoryKiB, { '@_unit': 'KiB' })
  domain.currentMemory = setTextNodeValue(domain.currentMemory, memoryKiB, { '@_unit': 'KiB' })
}

export const getVmSystemDisk = (domain) => {
  return getVmDomainDisks(domain).find((disk) => disk?.['@_device'] === 'disk') || null
}

export const updateVmSystemDiskBus = (domain, bus) => {
  const nextBus = normalizeDiskBus(bus)
  ensureDiskBusPrerequisites(domain, nextBus)
  const disks = getVmDomainDisks(domain)
  const index = disks.findIndex((disk) => disk?.['@_device'] === 'disk')
  if (index === -1) return null
  const next = {
    ...disks[index],
    target: {
      ...(disks[index]?.target || {}),
      '@_bus': nextBus,
      '@_dev': allocateVmDiskTarget(domain, nextBus, disks[index]),
    },
  }
  delete next.address
  disks[index] = next
  setVmDomainDisks(domain, disks)
  return next
}

export const updateVmDiskBus = (domain, target, bus) => {
  const nextBus = normalizeDiskBus(bus)
  ensureDiskBusPrerequisites(domain, nextBus)
  const disks = getVmDomainDisks(domain)
  const index = disks.findIndex((disk) => disk?.['@_device'] === 'disk' && disk?.target?.['@_dev'] === target)
  if (index === -1) return null
  const next = {
    ...disks[index],
    target: {
      ...(disks[index]?.target || {}),
      '@_bus': nextBus,
      '@_dev': allocateVmDiskTarget(domain, nextBus, disks[index]),
    },
  }
  delete next.address
  disks[index] = next
  setVmDomainDisks(domain, disks)
  return next
}

export const allocateVmDiskTarget = (domain, bus, currentDisk = null) => {
  const prefix = getDiskPrefix(bus)
  const usedTargets = new Set(
    getVmDomainDisks(domain)
      .filter((disk) => disk !== currentDisk)
      .map((disk) => String(disk?.target?.['@_dev'] || '').trim())
      .filter(Boolean)
  )

  for (let index = 0; index < 128; index += 1) {
    const candidate = `${prefix}${formatDeviceSuffix(index)}`
    if (!usedTargets.has(candidate)) {
      return candidate
    }
  }

  throw new Error('没有可用的磁盘设备名')
}

export const addVmDataDisk = (domain, { path, format, bus }) => {
  const nextBus = normalizeDiskBus(bus)
  ensureDiskBusPrerequisites(domain, nextBus)
  const disks = getVmDomainDisks(domain)
  const target = allocateVmDiskTarget(domain, nextBus)
  disks.push({
    '@_type': 'file',
    '@_device': 'disk',
    driver: {
      '@_name': 'qemu',
      '@_type': format,
    },
    source: {
      '@_file': path,
    },
    target: {
      '@_dev': target,
      '@_bus': nextBus,
    },
  })
  setVmDomainDisks(domain, disks)
  return target
}

export const removeVmDataDisk = (domain, target) => {
  const disks = getVmDomainDisks(domain)
  const index = disks.findIndex(
    (disk, diskIndex) => disk?.['@_device'] === 'disk' && disk?.target?.['@_dev'] === target && diskIndex > 0
  )
  if (index === -1) return false
  disks.splice(index, 1)
  setVmDomainDisks(domain, disks)
  return true
}

export const removeVmDisk = (domain, target) => {
  const disks = getVmDomainDisks(domain)
  const index = disks.findIndex((disk) => disk?.['@_device'] === 'disk' && disk?.target?.['@_dev'] === target)
  if (index === -1) return false
  disks.splice(index, 1)
  setVmDomainDisks(domain, disks)
  return true
}

export const buildVmBridgeInterface = ({ source, mac }) => {
  return {
    '@_type': 'bridge',
    mac: {
      '@_address': mac,
    },
    source: {
      '@_bridge': source,
    },
    model: {
      '@_type': 'virtio',
    },
  }
}

export const addVmBridgeInterface = (domain, payload) => {
  const interfaces = getVmDomainInterfaces(domain)
  interfaces.push(buildVmBridgeInterface(payload))
  setVmDomainInterfaces(domain, interfaces)
}

export const updateVmBridgeInterface = (domain, mac, source) => {
  const interfaces = getVmDomainInterfaces(domain)
  const index = interfaces.findIndex(
    (iface) => String(iface?.mac?.['@_address'] || '').toLowerCase() === String(mac || '').toLowerCase()
  )
  if (index === -1) return false

  interfaces[index] = {
    ...interfaces[index],
    '@_type': 'bridge',
    source: {
      '@_bridge': source,
    },
    model: {
      '@_type': interfaces[index]?.model?.['@_type'] || 'virtio',
    },
  }
  setVmDomainInterfaces(domain, interfaces)
  return true
}

export const removeVmInterface = (domain, mac) => {
  const interfaces = getVmDomainInterfaces(domain)
  const index = interfaces.findIndex(
    (iface) => String(iface?.mac?.['@_address'] || '').toLowerCase() === String(mac || '').toLowerCase()
  )
  if (index === -1) return false
  interfaces.splice(index, 1)
  setVmDomainInterfaces(domain, interfaces)
  return true
}
