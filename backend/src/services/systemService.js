import si from 'systeminformation'
import { getComputeResources } from './computeService.js'
import { getVMs } from './vmService.js'
import { getContainers } from './containerService.js'
import { getModels } from './modelService.js'
import { getServices } from './serviceService.js'
import { getNetworkInterfaces } from './networkService.js'
import { getStorageDisks } from './storageService.js'

/**
 * 获取系统信息（优化：并行获取，减少等待时间）
 */
export const getSystemInfo = async () => {
  try {
    // 使用Promise.all并行获取，提高速度
    const [osInfo, cpuInfo, memInfo, diskInfo] = await Promise.all([
      si.osInfo(),
      si.cpu(),
      si.mem(),
      si.fsSize(),
    ])

    return {
      os: {
        hostname: osInfo.hostname,
        platform: osInfo.platform,
        distro: osInfo.distro,
        release: osInfo.release,
        arch: osInfo.arch,
        uptime: osInfo.uptime,
      },
      cpu: {
        manufacturer: cpuInfo.manufacturer,
        brand: cpuInfo.brand,
        cores: cpuInfo.cores,
        physicalCores: cpuInfo.physicalCores,
        processors: cpuInfo.processors,
      },
      memory: {
        total: memInfo.total,
        free: memInfo.free,
        used: memInfo.used,
        active: memInfo.active,
        available: memInfo.available,
      },
      disk: diskInfo.map((disk) => ({
        fs: disk.fs,
        type: disk.type,
        size: disk.size,
        used: disk.used,
        available: disk.available,
        use: disk.use,
        mount: disk.mount,
      })),
    }
  } catch (error) {
    console.error('获取系统信息错误:', error)
    throw error
  }
}

/**
 * 获取系统实时指标（优化：并行获取，减少等待时间）
 */
export const getSystemMetrics = async () => {
  try {
    // 使用Promise.all并行获取，提高速度
    const [cpu, mem, networkStats, fsStats] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.networkStats(),
      si.fsStats(),
    ])

    return {
      cpu: {
        currentLoad: cpu.currentLoad,
        currentLoadUser: cpu.currentLoadUser,
        currentLoadSystem: cpu.currentLoadSystem,
        cores: cpu.cpus?.map((core) => ({
          load: core.load,
          loadUser: core.loadUser,
          loadSystem: core.loadSystem,
        })) || [],
      },
      memory: {
        total: mem.total,
        free: mem.free,
        used: mem.used,
        active: mem.active,
        available: mem.available,
        usage: ((mem.used / mem.total) * 100).toFixed(2),
      },
      network: networkStats.map((iface) => ({
        iface: iface.iface,
        operstate: iface.operstate,
        rx_bytes: iface.rx_bytes,
        tx_bytes: iface.tx_bytes,
        rx_sec: iface.rx_sec || 0,
        tx_sec: iface.tx_sec || 0,
      })),
      disk: {
        rx: fsStats.rx || 0,
        wx: fsStats.wx || 0,
        rx_sec: fsStats.rx_sec || 0,
        wx_sec: fsStats.wx_sec || 0,
      },
    }
  } catch (error) {
    console.error('获取系统指标错误:', error)
    throw error
  }
}

/**
 * 获取系统概览数据（合并系统信息和指标，减少请求次数）
 */
export const getSystemOverview = async () => {
  try {
    // 并行获取所有数据
    const [osInfo, cpuInfo, memInfo, diskInfo, cpuLoad, networkStats, fsStats] = await Promise.all([
      si.osInfo(),
      si.cpu(),
      si.mem(),
      si.fsSize(),
      si.currentLoad(),
      si.networkStats(),
      si.fsStats(),
    ])

    return {
      os: {
        hostname: osInfo.hostname,
        platform: osInfo.platform,
        distro: osInfo.distro,
        release: osInfo.release,
        arch: osInfo.arch,
        uptime: osInfo.uptime,
      },
      cpu: {
        manufacturer: cpuInfo.manufacturer,
        brand: cpuInfo.brand,
        cores: cpuInfo.cores,
        physicalCores: cpuInfo.physicalCores,
        processors: cpuInfo.processors,
        currentLoad: cpuLoad.currentLoad,
        currentLoadUser: cpuLoad.currentLoadUser,
        currentLoadSystem: cpuLoad.currentLoadSystem,
      },
      memory: {
        total: memInfo.total,
        free: memInfo.free,
        used: memInfo.used,
        active: memInfo.active,
        available: memInfo.available,
        usage: ((memInfo.used / memInfo.total) * 100).toFixed(2),
      },
      disk: diskInfo.map((disk) => ({
        fs: disk.fs,
        type: disk.type,
        size: disk.size,
        used: disk.used,
        available: disk.available,
        use: disk.use,
        mount: disk.mount,
      })),
      network: networkStats.map((iface) => ({
        iface: iface.iface,
        operstate: iface.operstate,
        rx_bytes: iface.rx_bytes,
        tx_bytes: iface.tx_bytes,
        rx_sec: iface.rx_sec || 0,
        tx_sec: iface.tx_sec || 0,
      })),
      diskIO: {
        rx: fsStats.rx || 0,
        wx: fsStats.wx || 0,
        rx_sec: fsStats.rx_sec || 0,
        wx_sec: fsStats.wx_sec || 0,
      },
    }
  } catch (error) {
    console.error('获取系统概览数据错误:', error)
    throw error
  }
}

/**
 * 获取概览页面摘要数据（资源统计、网络接口、服务状态、存储概览）
 * 优化：并行获取所有数据，减少请求次数，添加超时保护
 */
export const getOverviewSummary = async () => {
  try {
    // 为每个数据源添加超时保护（15秒）
    const timeoutPromise = (promise, timeoutMs = 15000) => {
      return Promise.race([
        promise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('请求超时')), timeoutMs)
        )
      ])
    }

    // 并行获取所有数据，提高速度，添加超时保护
    const [
      computeResources,
      vms,
      containers,
      models,
      services,
      networkInterfaces,
      storageDisks,
    ] = await Promise.allSettled([
      timeoutPromise(getComputeResources()),
      timeoutPromise(getVMs()),
      timeoutPromise(getContainers()),
      timeoutPromise(getModels()),
      timeoutPromise(getServices()),
      timeoutPromise(getNetworkInterfaces()),
      timeoutPromise(getStorageDisks()),
    ])

    // 处理资源统计
    const resourceStats = {
      compute: computeResources.status === 'fulfilled' ? computeResources.value.length : 0,
      vms: vms.status === 'fulfilled' ? vms.value.length : 0,
      containers: containers.status === 'fulfilled' ? containers.value.length : 0,
      models: models.status === 'fulfilled' ? models.value.length : 0,
    }

    // 处理服务列表（取前4个）
    const servicesList = services.status === 'fulfilled'
      ? services.value.slice(0, 4).map(s => ({
          name: s.name,
          description: s.description || '',
          status: s.status === 'running' ? 'active' : 'inactive',
        }))
      : []

    // 处理网络接口（取前3个）
    const interfacesList = networkInterfaces.status === 'fulfilled'
      ? networkInterfaces.value.slice(0, 3).map(iface => ({
          name: iface.name,
          ip: iface.ip4 || iface.ip6 || '未配置IP',
          status: iface.status,
        }))
      : []

    // 处理存储磁盘（取前3个）
    const disksList = storageDisks.status === 'fulfilled'
      ? storageDisks.value.slice(0, 3).map(disk => ({
          device: disk.device,
          mountpoint: disk.mount || '未挂载',
          usage: disk.use || 0,
        }))
      : []

    return {
      resourceStats,
      services: servicesList,
      networkInterfaces: interfacesList,
      disks: disksList,
    }
  } catch (error) {
    console.error('获取概览摘要数据错误:', error)
    throw error
  }
}
