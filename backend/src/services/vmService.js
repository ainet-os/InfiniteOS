import { execSudo } from '../utils/exec.js'

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

const extractDisksFromXml = (xml) => {
  const disks = []
  const diskBlocks = String(xml || '').match(/<disk\b[\s\S]*?<\/disk>/g) || []
  for (const block of diskBlocks) {
    // 只取 device='disk' 的磁盘
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

/**
 * 获取虚拟机列表
 */
export const getVMs = async () => {
  try {
    const { stdout, success } = await execSudo('virsh list --all')
    
    if (!success) {
      return []
    }

    const lines = stdout.trim().split('\n').slice(2) // 跳过标题行
    const vms = []

    for (const line of lines) {
      if (line.trim()) {
        const parts = line.trim().split(/\s+/)
        if (parts.length >= 3) {
          const id = parts[0] === '-' ? null : parts[0]
          const name = parts[1]
          const state = parts[2]

          // 获取详细信息
          let cpu = 1
          let memory = '0 MB'
          
          try {
            const { stdout: info } = await execSudo(`virsh dominfo ${name}`)
            const infoLines = info.split('\n')
            
            for (const infoLine of infoLines) {
              if (infoLine.includes('CPU(s):')) {
                cpu = parseInt(infoLine.split(':')[1].trim()) || 1
              }
              if (infoLine.includes('Max memory:')) {
                const memStr = infoLine.split(':')[1].trim()
                memory = memStr
              }
            }
          } catch (error) {
            console.error(`获取虚拟机 ${name} 详细信息失败:`, error)
          }

          vms.push({
            id: id,
            name: name,
            state: state.toLowerCase(),
            status: state.toLowerCase() === 'running' ? 'running' : 'stopped',
            cpu: cpu,
            memory: memory,
            cpuUsage: state.toLowerCase() === 'running' ? Math.floor(Math.random() * 100) : 0,
            memoryUsage: state.toLowerCase() === 'running' ? Math.floor(Math.random() * 100) : 0,
            networkUsage: state.toLowerCase() === 'running' ? Math.floor(Math.random() * 100) : 0,
          })
        }
      }
    }

    return vms
  } catch (error) {
    console.error('获取虚拟机列表错误:', error)
    if (error.message?.includes('virsh: command not found')) {
      return []
    }
    throw error
  }
}

/**
 * 获取虚拟机详情
 */
export const getVMDetails = async (vmName) => {
  try {
    const { stdout, success } = await execSudo(`virsh dominfo ${vmName}`)
    
    if (!success) {
      return null
    }

    const info = parseDominfo(stdout)
    const stateRaw = info['State'] || 'unknown'
    const status = normalizeVmStatus(stateRaw)

    const vcpu = parseInt(info['CPU(s)']) || 1
    const maxMemKiB = parseMemToKiB(info['Max memory']) ?? 0

    // 从 XML 获取更准确的磁盘/网卡信息（virsh domiflist/domblklist 的表格输出容易误解析）
    let xml = ''
    try {
      const { stdout: xmlOut, success: xmlOk } = await execSudo(`virsh dumpxml ${vmName}`)
      if (xmlOk) xml = xmlOut
    } catch (e) {
      // ignore
    }

    const disks = extractDisksFromXml(xml)
    const networkInterfaces = extractIfacesFromXml(xml)

    // 计算存储容量（可选：失败则降级）
    let storageBytes = 0
    for (const d of disks) {
      if (!d.target) continue
      try {
        const { stdout: blkInfo, success: blkOk } = await execSudo(`virsh domblkinfo ${vmName} ${d.target}`)
        if (!blkOk) continue
        const capLine = blkInfo.split('\n').find((l) => l.toLowerCase().startsWith('capacity:'))
        if (!capLine) continue
        const cap = Number(capLine.split(':')[1].trim())
        if (Number.isFinite(cap) && cap > 0) storageBytes += cap
      } catch (_) {
        // ignore
      }
    }

    return {
      name: vmName,
      id: info['Id'] || null,
      uuid: info['UUID'] || null,
      state: stateRaw,
      status,
      osType: info['OS Type'] || 'hvm',
      vcpu,
      cpu: `${vcpu} vCPU`,
      ram: maxMemKiB ? formatKiB(maxMemKiB) : (info['Max memory'] || '0'),
      memory: maxMemKiB ? formatKiB(maxMemKiB) : (info['Used memory'] || '0'),
      memoryKiB: maxMemKiB,
      storage: storageBytes ? formatBytes(storageBytes) : (disks.length > 0 ? '已配置' : '未配置'),
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
 * 创建虚拟机
 */
export const createVM = async (config) => {
  // 这里需要根据配置创建虚拟机
  // 实际实现应该使用virsh或virt-install命令
  // 这是一个复杂的过程，需要创建磁盘镜像、网络配置等
  throw new Error('创建虚拟机功能需要完整实现')
}

/**
 * 启动虚拟机
 */
export const startVM = async (vmName) => {
  // 先检查虚拟机是否存在
  const { success: exists, stdout } = await execSudo(`virsh dominfo ${vmName}`)
  if (!exists) {
    throw new Error(`虚拟机 ${vmName} 不存在`)
  }

  // 检查虚拟机当前状态
  const { stdout: listOutput } = await execSudo(`virsh list --all`)
  const vmLine = listOutput.split('\n').find(line => line.includes(vmName))
  if (vmLine && vmLine.includes('running')) {
    return { message: '虚拟机已在运行中' }
  }

  // 启动虚拟机
  const { success, stderr, stdout: startOutput } = await execSudo(`virsh start ${vmName}`)
  if (!success) {
    // 提取更详细的错误信息
    const errorMsg = stderr || startOutput || '启动虚拟机失败'
    throw new Error(errorMsg)
  }
  return { message: '虚拟机启动成功' }
}

/**
 * 停止虚拟机
 */
export const stopVM = async (vmName) => {
  const { success, stderr } = await execSudo(`virsh shutdown ${vmName}`)
  if (!success) {
    throw new Error(stderr || '停止虚拟机失败')
  }
}

/**
 * 重启虚拟机
 */
export const restartVM = async (vmName) => {
  const { success, stderr } = await execSudo(`virsh reboot ${vmName}`)
  if (!success) {
    throw new Error(stderr || '重启虚拟机失败')
  }
}

/**
 * 暂停虚拟机
 */
export const suspendVM = async (vmName) => {
  const { success, stderr } = await execSudo(`virsh suspend ${vmName}`)
  if (!success) {
    throw new Error(stderr || '暂停虚拟机失败')
  }
}

/**
 * 恢复虚拟机
 */
export const resumeVM = async (vmName) => {
  const { success, stderr } = await execSudo(`virsh resume ${vmName}`)
  if (!success) {
    throw new Error(stderr || '恢复虚拟机失败')
  }
}

/**
 * 删除虚拟机
 */
export const deleteVM = async (vmName) => {
  // 先停止虚拟机
  try {
    await stopVM(vmName)
    // 等待虚拟机完全停止
    await new Promise(resolve => setTimeout(resolve, 2000))
  } catch (error) {
    // 如果已经停止，忽略错误
  }

  const { success, stderr } = await execSudo(`virsh undefine ${vmName}`)
  if (!success) {
    throw new Error(stderr || '删除虚拟机失败')
  }
}

/**
 * 获取虚拟机监控数据
 */
export const getVMMonitoring = async (vmName) => {
  try {
    const { stdout, success } = await execSudo(`virsh domstats ${vmName}`)
    
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
      if (line.includes('=')) {
        const [key, value] = line.split('=').map(s => s.trim())
        stats[key] = value
      }
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
    // 检查虚拟机是否存在
    const { success: exists } = await execSudo(`virsh dominfo ${vmName}`)
    if (!exists) {
      throw new Error(`虚拟机 ${vmName} 不存在`)
    }

    // 获取VNC端口
    const { stdout: vncDisplay, success } = await execSudo(`virsh vncdisplay ${vmName}`)
    if (!success || !vncDisplay || !vncDisplay.trim()) {
      throw new Error('虚拟机未配置VNC显示')
    }

    // 解析VNC端口 (格式: :0 或 :1 等，对应端口 5900, 5901)
    const portMatch = vncDisplay.trim().match(/:(\d+)/)
    if (!portMatch) {
      throw new Error('无法解析VNC端口')
    }

    const vncPort = parseInt(portMatch[1]) + 5900
    // WS 代理改为走后端同端口（3000）的 upgrade 路由，不再使用 6080/6081 这类额外端口

    return {
      vncPort,
      vncDisplay: vncDisplay.trim(),
      consoleUrl: `/virtual-machines/${vmName}/console`,
      wsPath: `/api/virtual-machines/${encodeURIComponent(vmName)}/ws`,
    }
  } catch (error) {
    console.error('获取虚拟机控制台信息错误:', error)
    throw error
  }
}
