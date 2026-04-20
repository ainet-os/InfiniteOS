import { execSudo } from '../utils/exec.js'

const parseUnitStatusMap = (stdout = '') => {
  const units = new Map()

  for (const rawLine of stdout.split('\n')) {
    const line = rawLine.trim()

    if (!line) {
      continue
    }

    const parts = line.split(/\s+/)
    const normalizedParts = parts[0] === '●' ? parts.slice(1) : parts

    if (normalizedParts.length < 4) {
      continue
    }

    const [name, load, active, sub, ...descriptionParts] = normalizedParts

    if (!name.endsWith('.service') || load === 'not-found') {
      continue
    }

    units.set(name, {
      active,
      sub,
      description: descriptionParts.join(' ') || '',
    })
  }

  return units
}

const parseUnitFiles = (stdout = '') => {
  const services = []
  const seen = new Set()

  for (const rawLine of stdout.split('\n')) {
    const line = rawLine.trim()

    if (!line) {
      continue
    }

    const parts = line.split(/\s+/)

    if (parts.length < 2) {
      continue
    }

    const [name, unitFileState] = parts

    if (
      !name.endsWith('.service') ||
      /@\.service$/.test(name) ||
      unitFileState === 'alias' ||
      seen.has(name)
    ) {
      continue
    }

    seen.add(name)
    services.push({ name, unitFileState })
  }

  return services
}

/**
 * 获取服务列表（基于 unit files，避免显示 not-found 幽灵服务）
 */
export const getServices = async () => {
  try {
    const [unitFilesResult, unitsResult] = await Promise.all([
      execSudo('systemctl list-unit-files --type=service --no-pager --no-legend'),
      execSudo('systemctl list-units --type=service --all --no-pager --no-legend'),
    ])

    if (!unitFilesResult.success || !unitFilesResult.stdout) {
      return []
    }

    const unitStatusMap = unitsResult.success
      ? parseUnitStatusMap(unitsResult.stdout)
      : new Map()

    return parseUnitFiles(unitFilesResult.stdout).map(({ name, unitFileState }) => {
      const runtimeState = unitStatusMap.get(name)

      return {
        name: name.replace('.service', ''),
        status: runtimeState?.active === 'active' ? 'running' : 'stopped',
        state: runtimeState?.sub || unitFileState,
        description: runtimeState?.description || '',
        pid: null, // 不再获取，避免慢速调用
        memory: '0', // 不再获取，避免慢速调用
      }
    })
  } catch (error) {
    console.error('获取服务列表错误:', error)
    throw error
  }
}

/**
 * 获取服务详情
 */
export const getServiceDetails = async (serviceName) => {
  try {
    const { stdout, success } = await execSudo(`systemctl show ${serviceName} --no-pager`)

    if (!success) {
      return null
    }

    const details = {}
    const lines = stdout.split('\n')

    for (const line of lines) {
      if (line.includes('=')) {
        const [key, value] = line.split('=').map(s => s.trim())
        details[key] = value
      }
    }

    return {
      name: serviceName,
      status: details.ActiveState || 'unknown',
      state: details.SubState || 'unknown',
      description: details.Description || '',
      pid: details.MainPID || null,
      memory: details.MemoryCurrent || '0',
      loadState: details.LoadState || 'unknown',
      activeState: details.ActiveState || 'unknown',
      subState: details.SubState || 'unknown',
    }
  } catch (error) {
    console.error('获取服务详情错误:', error)
    return null
  }
}

/**
 * 启动服务
 */
export const startService = async (serviceName) => {
  const { success, stderr } = await execSudo(`systemctl start ${serviceName}`)
  if (!success) {
    throw new Error(stderr || '启动服务失败')
  }
}

/**
 * 停止服务
 */
export const stopService = async (serviceName) => {
  const { success, stderr } = await execSudo(`systemctl stop ${serviceName}`)
  if (!success) {
    throw new Error(stderr || '停止服务失败')
  }
}

/**
 * 重启服务
 */
export const restartService = async (serviceName) => {
  const { success, stderr } = await execSudo(`systemctl restart ${serviceName}`)
  if (!success) {
    throw new Error(stderr || '重启服务失败')
  }
}

/**
 * 获取服务日志
 */
export const getServiceLogs = async (serviceName, lines = 100) => {
  const { stdout, success, stderr } = await execSudo(`journalctl -u ${serviceName} -n ${lines} --no-pager`)

  if (!success) {
    throw new Error(stderr || '获取服务日志失败')
  }

  return stdout.split('\n').filter(line => line.trim())
}

/**
 * 启用服务（开机自启）
 */
export const enableService = async (serviceName) => {
  const { success, stderr } = await execSudo(`systemctl enable ${serviceName}`)
  if (!success) {
    throw new Error(stderr || '启用服务失败')
  }
}

/**
 * 禁用服务（取消开机自启）
 */
export const disableService = async (serviceName) => {
  const { success, stderr } = await execSudo(`systemctl disable ${serviceName}`)
  if (!success) {
    throw new Error(stderr || '禁用服务失败')
  }
}

/**
 * 检查服务是否启用（开机自启）
 */
export const isServiceEnabled = async (serviceName) => {
  const { stdout, success } = await execSudo(`systemctl is-enabled ${serviceName}`)
  if (!success) {
    return false
  }
  return stdout.trim() === 'enabled'
}
