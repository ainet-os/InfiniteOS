import si from 'systeminformation'
import { execCommand, execSudo } from '../utils/exec.js'

/** 检测 Tailscale 是否已在线（tailscale0 在 ip link 中常为 state UNKNOWN，以 tailscale status 为准） */
async function isTailscaleInterfaceUp() {
  try {
    const { stdout } = await execCommand('tailscale status --json 2>/dev/null')
    if (!stdout || !stdout.trim()) return false
    const data = JSON.parse(stdout)
    if (data.BackendState === 'NeedsLogin' || data.BackendState === 'Stopped') return false
    if (data.Self && data.Self.Online === false) return false
    if (data.Self && data.Self.Online === true) return true
    if (data.Self && data.Self.TailscaleIPs && data.Self.TailscaleIPs.length > 0) return true
    return false
  } catch (_) {
    return false
  }
}

/**
 * 获取网络接口列表
 */
export const getNetworkInterfaces = async () => {
  try {
    const [networkInterfaces, networkStats] = await Promise.all([
      si.networkInterfaces(),
      si.networkStats(),
    ])

    const statsMap = {}
    networkStats.forEach(stat => {
      statsMap[stat.iface] = stat
    })

    const hasTailscale = networkInterfaces.some(i => i.iface === 'tailscale0' || i.iface.startsWith('tailscale'))
    const tailscaleUp = hasTailscale ? await isTailscaleInterfaceUp() : false

    return networkInterfaces.map(iface => {
      const stats = statsMap[iface.iface] || {}
      const ip4 = iface.ip4 || ''
      const ip6 = iface.ip6 || ''
      const isTailscaleIface = iface.iface === 'tailscale0' || iface.iface.startsWith('tailscale')
      let status = iface.operstate === 'up' ? 'up' : 'down'
      if (isTailscaleIface && tailscaleUp) status = 'up'
      if (isTailscaleIface && (iface.operstate === 'unknown' || iface.operstate === 'down') && !tailscaleUp) status = 'down'

      return {
        name: iface.iface,
        type: iface.type || 'ethernet',
        mac: iface.mac || '',
        ip4: ip4,
        ip6: ip6,
        status,
        speed: iface.speed || 0,
        rx_bytes: stats.rx_bytes || 0,
        tx_bytes: stats.tx_bytes || 0,
        rx_sec: stats.rx_sec || 0,
        tx_sec: stats.tx_sec || 0,
      }
    })
  } catch (error) {
    console.error('获取网络接口错误:', error)
    throw error
  }
}

/**
 * 获取网络统计信息
 */
export const getNetworkStats = async () => {
  try {
    const networkStats = await si.networkStats()
    return networkStats.map(stat => ({
      iface: stat.iface,
      operstate: stat.operstate,
      rx_bytes: stat.rx_bytes,
      tx_bytes: stat.tx_bytes,
      rx_sec: stat.rx_sec || 0,
      tx_sec: stat.tx_sec || 0,
      rx_dropped: stat.rx_dropped || 0,
      tx_dropped: stat.tx_dropped || 0,
      rx_errors: stat.rx_errors || 0,
      tx_errors: stat.tx_errors || 0,
    }))
  } catch (error) {
    console.error('获取网络统计错误:', error)
    throw error
  }
}

/**
 * 获取网络接口详情
 */
export const getInterfaceDetails = async (interfaceName) => {
  try {
    // 检查是否使用 NetworkManager
    const { success: nmcliExists } = await execSudo('which nmcli')
    
    if (nmcliExists) {
      // 使用 NetworkManager 获取详细信息
      const { stdout } = await execSudo(`nmcli connection show "${interfaceName}" 2>/dev/null || nmcli device show "${interfaceName}"`)
      
      const details = {
        name: interfaceName,
        type: 'ethernet',
        method: 'auto', // dhcp, static, manual
        ip4: '',
        ip6: '',
        gateway: '',
        dns: [],
        mac: '',
      }
      
      const lines = stdout.split('\n')
      for (const line of lines) {
        if (line.includes('IP4.ADDRESS')) {
          details.ip4 = line.split(':')[1]?.trim() || ''
        } else if (line.includes('IP4.GATEWAY')) {
          details.gateway = line.split(':')[1]?.trim() || ''
        } else if (line.includes('IP4.DNS')) {
          const dns = line.split(':')[1]?.trim()
          if (dns) details.dns.push(dns)
        } else if (line.includes('GENERAL.HWADDR') || line.includes('802-3-ethernet.mac-address')) {
          details.mac = line.split(':')[1]?.trim() || ''
        } else if (line.includes('connection.type')) {
          details.type = line.split(':')[1]?.trim() || 'ethernet'
        } else if (line.includes('ipv4.method')) {
          const method = line.split(':')[1]?.trim()
          details.method = method === 'auto' ? 'dhcp' : method || 'auto'
        }
      }
      
      return details
    } else {
      // 使用 ip 命令获取基本信息
      const { stdout } = await execSudo(`ip addr show ${interfaceName}`)
      const details = {
        name: interfaceName,
        type: 'ethernet',
        method: 'auto',
        ip4: '',
        ip6: '',
        gateway: '',
        dns: [],
        mac: '',
      }
      
      // 解析 ip addr 输出
      const lines = stdout.split('\n')
      for (const line of lines) {
        if (line.includes('inet ')) {
          details.ip4 = line.match(/inet\s+([^\s]+)/)?.[1] || ''
        } else if (line.includes('inet6 ')) {
          details.ip6 = line.match(/inet6\s+([^\s]+)/)?.[1] || ''
        } else if (line.includes('link/ether')) {
          details.mac = line.match(/link\/ether\s+([^\s]+)/)?.[1] || ''
        }
      }
      
      return details
    }
  } catch (error) {
    console.error('获取网络接口详情错误:', error)
    throw error
  }
}

/**
 * 创建网络连接（使用 NetworkManager）
 */
export const createNetworkConnection = async (config) => {
  try {
    const { name, type = 'ethernet', method = 'auto', ip4, gateway, dns, mac } = config
    
    // 检查 NetworkManager 是否可用
    const { success: nmcliExists } = await execSudo('which nmcli')
    if (!nmcliExists) {
      throw new Error('NetworkManager (nmcli) 未安装，无法创建网络连接')
    }
    
    let command = `nmcli connection add type ${type} con-name "${name}"`
    
    if (mac) {
      command += ` ifname "${name}" 802-3-ethernet.mac-address "${mac}"`
    } else {
      command += ` ifname "${name}"`
    }
    
    if (method === 'static' && ip4) {
      command += ` ipv4.method manual ipv4.addresses "${ip4}"`
      if (gateway) {
        command += ` ipv4.gateway "${gateway}"`
      }
      if (dns && dns.length > 0) {
        command += ` ipv4.dns "${dns.join(',')}"`
      }
    } else {
      command += ` ipv4.method auto`
    }
    
    const { success, stderr } = await execSudo(command)
    
    if (!success) {
      throw new Error(stderr || '创建网络连接失败')
    }
    
    // 激活连接
    await execSudo(`nmcli connection up "${name}"`)
    
    return { success: true, message: '网络连接创建成功' }
  } catch (error) {
    console.error('创建网络连接错误:', error)
    throw error
  }
}

/**
 * 更新网络连接配置
 */
export const updateNetworkConnection = async (interfaceName, config) => {
  try {
    const { method = 'auto', ip4, gateway, dns } = config
    
    // 检查 NetworkManager 是否可用
    const { success: nmcliExists } = await execSudo('which nmcli')
    if (!nmcliExists) {
      throw new Error('NetworkManager (nmcli) 未安装，无法更新网络连接')
    }
    
    // 修改连接配置
    if (method === 'static' && ip4) {
      let command = `nmcli connection modify "${interfaceName}" ipv4.method manual ipv4.addresses "${ip4}"`
      if (gateway) {
        command += ` ipv4.gateway "${gateway}"`
      }
      if (dns && dns.length > 0) {
        command += ` ipv4.dns "${dns.join(',')}"`
      }
      
      const { success, stderr } = await execSudo(command)
      if (!success) {
        throw new Error(stderr || '更新网络连接失败')
      }
    } else {
      const { success, stderr } = await execSudo(`nmcli connection modify "${interfaceName}" ipv4.method auto`)
      if (!success) {
        throw new Error(stderr || '更新网络连接失败')
      }
    }
    
    // 重新激活连接
    await execSudo(`nmcli connection down "${interfaceName}"`)
    await execSudo(`nmcli connection up "${interfaceName}"`)
    
    return { success: true, message: '网络连接更新成功' }
  } catch (error) {
    console.error('更新网络连接错误:', error)
    throw error
  }
}

/**
 * 删除网络连接
 */
export const deleteNetworkConnection = async (interfaceName) => {
  try {
    // 检查 NetworkManager 是否可用
    const { success: nmcliExists } = await execSudo('which nmcli')
    if (!nmcliExists) {
      throw new Error('NetworkManager (nmcli) 未安装，无法删除网络连接')
    }
    
    // 先断开连接
    await execSudo(`nmcli connection down "${interfaceName}"`).catch(() => {
      // 忽略错误，可能已经断开
    })
    
    // 删除连接
    const { success, stderr } = await execSudo(`nmcli connection delete "${interfaceName}"`)
    
    if (!success) {
      throw new Error(stderr || '删除网络连接失败')
    }
    
    return { success: true, message: '网络连接删除成功' }
  } catch (error) {
    console.error('删除网络连接错误:', error)
    throw error
  }
}

/**
 * 启用/禁用网络接口
 */
export const toggleInterface = async (interfaceName, enable) => {
  try {
    if (enable) {
      const { success, stderr } = await execSudo(`ip link set ${interfaceName} up`)
      if (!success) {
        throw new Error(stderr || '启用网络接口失败')
      }
    } else {
      const { success, stderr } = await execSudo(`ip link set ${interfaceName} down`)
      if (!success) {
        throw new Error(stderr || '禁用网络接口失败')
      }
    }
    
    return { success: true, message: enable ? '网络接口已启用' : '网络接口已禁用' }
  } catch (error) {
    console.error('切换网络接口状态错误:', error)
    throw error
  }
}

