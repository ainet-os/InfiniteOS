import si from 'systeminformation'
import { execSudo } from '../utils/exec.js'

/**
 * 获取存储磁盘列表
 * 返回所有已挂载的文件系统，包括物理磁盘、LVM卷、虚拟文件系统等
 */
export const getStorageDisks = async () => {
  try {
    const [fsSize, blockDevices] = await Promise.all([
      si.fsSize(),
      si.blockDevices().catch(() => []), // 如果获取失败，返回空数组
    ])

    // 创建块设备映射（用于获取设备名称）
    const deviceMap = {}
    if (blockDevices && Array.isArray(blockDevices)) {
      blockDevices.forEach(device => {
        if (device.mount) {
          deviceMap[device.mount] = device
        }
      })
    }

    // 返回所有已挂载的文件系统
    const disks = (fsSize || []).map(fs => {
      const device = deviceMap[fs.mount] || {}
      
      // 确定设备名称
      let deviceName = fs.fs
      if (device.name) {
        deviceName = `/dev/${device.name}`
      } else if (fs.fs.startsWith('/dev/')) {
        deviceName = fs.fs
      } else if (fs.fs.startsWith('/')) {
        // 对于虚拟文件系统，使用挂载点作为设备名
        deviceName = fs.fs
      }

      // 处理设备名称，对于LVM卷等，从fs.fs中提取
      let name = device.name
      if (!name && fs.fs) {
        // 从 /dev/mapper/ubuntu--vg-ubuntu--lv 提取 ubuntu--vg-ubuntu--lv
        // 从 /dev/sda2 提取 sda2
        const parts = fs.fs.split('/')
        name = parts[parts.length - 1] || 'unknown'
      }

      return {
        name: name || 'unknown',
        device: deviceName,
        type: fs.type || device.fsType || 'unknown',
        size: fs.size || 0,
        mount: fs.mount || '',
        used: fs.used || 0,
        available: fs.available || 0,
        use: fs.use || 0,
        rx: 0, // fsStats 是全局统计，不适用于单个文件系统
        wx: 0,
        rx_sec: 0,
        wx_sec: 0,
      }
    })

    // 过滤掉一些不需要显示的虚拟文件系统
    const filteredDisks = disks.filter(disk => {
      if (!disk.mount) {
        return false // 没有挂载点的跳过
      }
      
      const mount = disk.mount.toLowerCase()
      const fsType = (disk.type || '').toLowerCase()
      
      // 排除一些临时和虚拟文件系统
      const excludeMounts = [
        '/proc',
        '/sys',
        '/dev',
        '/run/user',
        '/snap',
        '/boot/efi',
      ]
      
      // 如果挂载点在排除列表中，跳过
      if (excludeMounts.some(exclude => mount.startsWith(exclude))) {
        return false
      }
      
      // 排除一些特殊的虚拟文件系统类型
      const excludeTypes = ['tmpfs', 'devtmpfs', 'squashfs', 'proc', 'sysfs', 'devpts', 'cgroup', 'cgroup2', 'pstore', 'bpf', 'tracefs', 'debugfs', 'securityfs', 'hugetlbfs']
      if (excludeTypes.includes(fsType)) {
        return false
      }
      
      // 只显示有实际大小的文件系统
      if (disk.size === 0 && !mount) {
        return false
      }
      
      return true
    })

    return filteredDisks
  } catch (error) {
    console.error('获取存储磁盘错误:', error)
    throw error
  }
}

/**
 * 获取存储统计信息
 * 注意：fsStats() 返回的是全局统计对象，不是数组
 */
export const getStorageStats = async () => {
  try {
    const fsStats = await si.fsStats()
    // fsStats 返回的是全局统计对象，不是数组
    // 如果需要每个文件系统的统计，应该使用 fsSize() 或其他方法
    if (Array.isArray(fsStats)) {
      return fsStats.map(stat => ({
        fs: stat.fs || '',
        type: stat.type || '',
        mount: stat.mount || '',
        size: stat.size || 0,
        used: stat.used || 0,
        available: stat.available || 0,
        use: stat.use || 0,
        rx: stat.rx || 0,
        wx: stat.wx || 0,
        rx_sec: stat.rx_sec || 0,
        wx_sec: stat.wx_sec || 0,
      }))
    } else {
      // 如果是对象，返回全局统计
      return [{
        fs: 'global',
        type: 'global',
        mount: '',
        size: 0,
        used: 0,
        available: 0,
        use: 0,
        rx: fsStats.rx || 0,
        wx: fsStats.wx || 0,
        rx_sec: fsStats.rx_sec || 0,
        wx_sec: fsStats.wx_sec || 0,
      }]
    }
  } catch (error) {
    console.error('获取存储统计错误:', error)
    throw error
  }
}

/**
 * 挂载文件系统
 */
export const mountFilesystem = async (device, mountPoint, fsType = 'auto') => {
  try {
    // 确保挂载点存在
    await execSudo(`mkdir -p "${mountPoint}"`)
    
    // 挂载文件系统
    const { success, stderr } = await execSudo(`mount -t ${fsType} "${device}" "${mountPoint}"`)
    
    if (!success) {
      throw new Error(stderr || '挂载文件系统失败')
    }
    
    return { success: true, message: '文件系统挂载成功' }
  } catch (error) {
    console.error('挂载文件系统错误:', error)
    throw error
  }
}

/**
 * 卸载文件系统
 */
export const unmountFilesystem = async (mountPoint) => {
  try {
    const { success, stderr } = await execSudo(`umount "${mountPoint}"`)
    
    if (!success) {
      throw new Error(stderr || '卸载文件系统失败')
    }
    
    return { success: true, message: '文件系统卸载成功' }
  } catch (error) {
    console.error('卸载文件系统错误:', error)
    throw error
  }
}

