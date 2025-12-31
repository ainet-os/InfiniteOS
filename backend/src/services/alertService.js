import { execSudo } from '../utils/exec.js'
import si from 'systeminformation'

/**
 * 获取系统告警信息
 * 包括：服务异常、资源告警、错误日志等
 */
export const getSystemAlerts = async () => {
  try {
    const alerts = []
    
    // 1. 检查服务状态异常
    try {
      const { stdout, success } = await execSudo('systemctl list-units --type=service --state=failed --no-pager --no-legend 2>/dev/null || echo ""')
      if (success && stdout && stdout.trim()) {
        const failedServices = stdout.trim().split('\n').filter(line => line.trim())
        
        failedServices.forEach(line => {
          const parts = line.trim().split(/\s+/)
          if (parts.length > 0) {
            const serviceName = parts[0].replace('.service', '')
            alerts.push({
              id: `service-failed-${serviceName}`,
              type: 'error',
              level: 'high',
              title: '服务启动失败',
              message: `服务 ${serviceName} 启动失败`,
              service: serviceName,
              timestamp: Date.now(),
              category: 'service',
            })
          }
        })
      }
    } catch (error) {
      console.error('检查服务状态错误:', error.message || error)
      // 不抛出错误，继续执行
    }
    
    // 2. 检查资源使用率告警
    try {
      const [cpu, mem, fsSize] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.fsSize(),
      ])
      
      // CPU使用率告警（>90%）
      if (cpu.currentLoad > 90) {
        alerts.push({
          id: `cpu-high-${Date.now()}`,
          type: 'warning',
          level: 'medium',
          title: 'CPU使用率过高',
          message: `CPU使用率: ${cpu.currentLoad.toFixed(1)}%`,
          value: cpu.currentLoad,
          timestamp: Date.now(),
          category: 'resource',
        })
      }
      
      // 内存使用率告警（>90%）
      const memUsage = (mem.used / mem.total) * 100
      if (memUsage > 90) {
        alerts.push({
          id: `memory-high-${Date.now()}`,
          type: 'warning',
          level: 'medium',
          title: '内存使用率过高',
          message: `内存使用率: ${memUsage.toFixed(1)}%`,
          value: memUsage,
          timestamp: Date.now(),
          category: 'resource',
        })
      }
      
      // 磁盘使用率告警（>90%）
      for (const fs of fsSize) {
        if (fs.use > 90 && fs.mount && !fs.mount.startsWith('/proc') && !fs.mount.startsWith('/sys')) {
          alerts.push({
            id: `disk-high-${fs.mount}-${Date.now()}`,
            type: 'warning',
            level: 'medium',
            title: '磁盘使用率过高',
            message: `${fs.mount} 使用率: ${fs.use.toFixed(1)}%`,
            mount: fs.mount,
            value: fs.use,
            timestamp: Date.now(),
            category: 'resource',
          })
        }
      }
    } catch (error) {
      console.error('检查资源使用率错误:', error.message || error)
      // 不抛出错误，继续执行
    }
    
    // 3. 获取最近的错误日志（最近5分钟）
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      const { stdout, success } = await execSudo(`journalctl --since "${fiveMinutesAgo}" -p err --no-pager -n 10 -o json 2>/dev/null || echo ""`)
      
      if (success && stdout && stdout.trim()) {
        const errorLogs = stdout.trim().split('\n').filter(line => line.trim())
        errorLogs.forEach((line, index) => {
          try {
            const log = JSON.parse(line)
            const message = log.MESSAGE || ''
            const service = log._SYSTEMD_UNIT || log.SYSLOG_IDENTIFIER || 'system'
            const timestamp = log.__REALTIME_TIMESTAMP ? parseInt(log.__REALTIME_TIMESTAMP) / 1000 : Date.now()
            
            // 避免重复告警
            if (message && !alerts.some(a => a.message === message && a.timestamp === timestamp)) {
              alerts.push({
                id: `error-log-${timestamp}-${index}`,
                type: 'error',
                level: 'high',
                title: '系统错误',
                message: message.substring(0, 100),
                service: service,
                timestamp: timestamp,
                category: 'log',
              })
            }
          } catch (error) {
            // 忽略解析错误
            console.error('解析日志行错误:', error.message)
          }
        })
      }
    } catch (error) {
      console.error('获取错误日志错误:', error.message || error)
      // 不抛出错误，继续执行
    }
    
    // 按时间排序（最新的在前）
    alerts.sort((a, b) => b.timestamp - a.timestamp)
    
    // 只返回最近的20条告警
    return alerts.slice(0, 20)
  } catch (error) {
    console.error('获取系统告警错误:', error)
    return []
  }
}

/**
 * 标记告警为已读
 */
export const markAlertAsRead = async (alertId) => {
  // 这里可以实现告警已读状态的持久化
  // 目前先简单返回成功
  return { success: true }
}

/**
 * 清除所有告警
 */
export const clearAllAlerts = async () => {
  // 这里可以实现告警清除逻辑
  // 目前先简单返回成功
  return { success: true }
}

