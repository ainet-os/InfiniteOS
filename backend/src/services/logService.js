import { execSudo } from '../utils/exec.js'

/**
 * 获取系统日志
 */
export const getSystemLogs = async (options = {}) => {
  const {
    service = '',
    level = '',
    since = '',
    until = '',
    lines = 100,
  } = options

  try {
    let cmd = 'journalctl --no-pager'
    
    if (service) {
      cmd += ` -u ${service}`
    }
    
    if (level) {
      cmd += ` -p ${level}`
    }
    
    if (since) {
      cmd += ` --since "${since}"`
    }
    
    if (until) {
      cmd += ` --until "${until}"`
    }
    
    cmd += ` -n ${lines} -o json`

    const { stdout, success, stderr } = await execSudo(cmd)
    
    if (!success) {
      throw new Error(stderr || '获取系统日志失败')
    }

    const lines_array = stdout.trim().split('\n').filter(line => line.trim())
    return lines_array.map(line => {
      try {
        const log = JSON.parse(line)
        return {
          timestamp: log.__REALTIME_TIMESTAMP || log._SOURCE_REALTIME_TIMESTAMP || '',
          service: log._SYSTEMD_UNIT || log.SYSLOG_IDENTIFIER || '',
          level: log.PRIORITY || log.LEVEL || '',
          message: log.MESSAGE || '',
          hostname: log._HOSTNAME || '',
        }
      } catch (error) {
        return {
          timestamp: '',
          service: '',
          level: '',
          message: line,
          hostname: '',
        }
      }
    })
  } catch (error) {
    console.error('获取系统日志错误:', error)
    throw error
  }
}

/**
 * 搜索日志
 */
export const searchLogs = async (options = {}) => {
  const {
    service = '',
    level = '',
    since = '',
    until = '',
    search = '',
    lines = 100,
  } = options

  try {
    let cmd = 'journalctl --no-pager'
    
    if (service) {
      cmd += ` -u ${service}`
    }
    
    if (level) {
      cmd += ` -p ${level}`
    }
    
    if (since) {
      cmd += ` --since "${since}"`
    }
    
    if (until) {
      cmd += ` --until "${until}"`
    }
    
    if (search) {
      cmd += ` --grep "${search}"`
    }
    
    cmd += ` -n ${lines} -o json`

    const { stdout, success, stderr } = await execSudo(cmd)
    
    if (!success) {
      throw new Error(stderr || '搜索日志失败')
    }

    const lines_array = stdout.trim().split('\n').filter(line => line.trim())
    return lines_array.map(line => {
      try {
        const log = JSON.parse(line)
        return {
          timestamp: log.__REALTIME_TIMESTAMP || log._SOURCE_REALTIME_TIMESTAMP || '',
          service: log._SYSTEMD_UNIT || log.SYSLOG_IDENTIFIER || '',
          level: log.PRIORITY || log.LEVEL || '',
          message: log.MESSAGE || '',
          hostname: log._HOSTNAME || '',
        }
      } catch (error) {
        return {
          timestamp: '',
          service: '',
          level: '',
          message: line,
          hostname: '',
        }
      }
    })
  } catch (error) {
    console.error('搜索日志错误:', error)
    throw error
  }
}

