import { execCommand, execSudo } from '../utils/exec.js'

/**
 * 解析 nvidia-smi CSV 行（兼容 "," 或 ", " 分隔，保留空列以保证列数）
 * 字段顺序: index, name, memory.total, memory.used, utilization.gpu, temperature.gpu, power.draw, power.limit, driver_version
 */
const parseNvidiaSmiLine = (line) => {
  const parts = line.split(',').map(p => (p || '').trim())
  if (parts.length < 9) return null
  return {
    index: parseInt(parts[0], 10) || 0,
    name: parts[1] || '',
    memoryTotal: parseInt(parts[2], 10) || 0,
    memoryUsed: parseInt(parts[3], 10) || 0,
    utilization: parseInt(parts[4], 10) || 0,
    temperature: (parts[5] !== undefined && parts[5] !== '' && !parts[5].toLowerCase().includes('n/a')) ? parseInt(parts[5], 10) : null,
    powerDraw: parseFloat(parts[6]) || 0,
    powerLimit: parseFloat(parts[7]) || 0,
    driver: parts[8] || '',
  }
}

/** nvidia-smi 超时时间（毫秒），避免在持久化未开启时卡死导致堆积大量进程 */
const NVIDIA_SMI_TIMEOUT = 8000

/** 串行锁：同一时刻只允许一个 getComputeResources 执行，避免并发触发多个 nvidia-smi 导致卡住或堆积 */
let computeResourcesLock = null

/**
 * 获取NVIDIA GPU信息（带超时；先不用 sudo，失败再用 sudo；超时或失败时返回空由上层用 lspci 兜底）
 */
const getNvidiaGPUInfo = async () => {
  const query = 'nvidia-smi --query-gpu=index,name,memory.total,memory.used,utilization.gpu,temperature.gpu,power.draw,power.limit,driver_version --format=csv,noheader,nounits'
  const opts = { timeout: NVIDIA_SMI_TIMEOUT }
  let result = await execCommand(query, opts)
  if (!result.success || !result.stdout) {
    result = await execSudo(query, opts)
  }
  if (!result.success || !result.stdout) {
    if (result.timedOut) {
      console.warn('nvidia-smi 超时（可能未开启持久化模式），建议执行: sudo nvidia-smi -pm 1')
    } else if (result.stderr) {
      console.error('nvidia-smi 执行失败:', result.stderr)
    }
    return []
  }

  try {
    const lines = result.stdout.trim().split('\n').filter(Boolean)
    return lines.map((line, idx) => {
      const p = parseNvidiaSmiLine(line)
      if (!p) return null
      return {
        id: p.index + 1,
        name: p.name || `NVIDIA GPU ${p.index + 1}`,
        vendor: 'NVIDIA',
        compute: calculateComputeValue(p.name),
        memory: `${p.memoryTotal} MB`,
        memoryUsed: `${p.memoryUsed} MB`,
        memoryUsage: p.memoryTotal > 0 ? Math.round((p.memoryUsed / p.memoryTotal) * 100) : 0,
        utilization: p.utilization,
        temperature: p.temperature,
        power: `${p.powerDraw}W / ${p.powerLimit}W`,
        powerLimit: `${p.powerLimit}W`,
        driver: p.driver,
        status: 'available',
      }
    }).filter(Boolean)
  } catch (error) {
    console.error('解析NVIDIA GPU信息错误:', error)
    return []
  }
}

/**
 * 获取CUDA版本（先尝试不用 sudo，带超时）
 */
const getCudaVersion = async () => {
  try {
    const opts = { timeout: NVIDIA_SMI_TIMEOUT }

    const tryCommands = async (command) => {
      let result = await execCommand(command, opts)
      if (!result.success || !result.stdout) {
        result = await execSudo(command, opts)
      }
      return result
    }

    // 新旧版本 nvidia-smi 都会在总览输出中包含 "CUDA Version: x.y"
    let result = await tryCommands('nvidia-smi')
    if (result.success && result.stdout) {
      const match = result.stdout.match(/CUDA Version:\s*([0-9]+(?:\.[0-9]+)?)/i)
      if (match?.[1]) {
        return match[1]
      }
    }

    // 某些环境未提供 nvcc，但会安装 CUDA 目录下的版本文件
    result = await tryCommands('cat /usr/local/cuda/version.json')
    if (result.success && result.stdout) {
      try {
        const parsed = JSON.parse(result.stdout)
        const version = parsed?.cuda?.version
        if (typeof version === 'string' && version.trim()) {
          return version.trim()
        }
      } catch (error) {
        console.warn('解析 /usr/local/cuda/version.json 失败:', error)
      }
    }

    result = await tryCommands('cat /usr/local/cuda/version.txt')
    if (result.success && result.stdout) {
      const match = result.stdout.match(/CUDA(?:\s+Version)?\s*([0-9]+(?:\.[0-9]+)?(?:\.[0-9]+)?)/i)
      if (match?.[1]) {
        return match[1]
      }
      const fallback = result.stdout.trim()
      if (fallback) {
        return fallback
      }
    }

    return null
  } catch (error) {
    return null
  }
}

/**
 * 获取AMD GPU信息（带超时，避免 rocm-smi 卡住）
 */
const getAMDGPUInfo = async () => {
  try {
    const { stdout, success } = await execSudo('rocm-smi --showid --showproductname --showmeminfo vram --showtemp --showuse --showpower --csv', { timeout: 8000 })
    
    if (!success || !stdout) {
      return []
    }

    // 解析rocm-smi输出
    const lines = stdout.trim().split('\n').slice(1) // 跳过标题行
    return lines.map((line, index) => {
      const parts = line.split(',')
      return {
        id: index + 100, // 使用不同的ID范围
        name: parts[1]?.trim() || `AMD GPU ${index + 1}`,
        vendor: 'AMD',
        compute: calculateComputeValue(parts[1]?.trim() || ''),
        memory: parts[3]?.trim() || '0 MB',
        memoryUsage: 0,
        utilization: parseInt(parts[5]) || 0,
        temperature: parseInt(parts[4]) || null,
        status: 'available',
      }
    })
  } catch (error) {
    console.error('获取AMD GPU信息错误:', error)
    return []
  }
}

/**
 * 通过lspci获取GPU信息（备用方法）
 */
const getLspciGPUInfo = async () => {
  try {
    const { stdout, success } = await execCommand('lspci | grep -i vga')
    
    if (!success || !stdout) {
      return []
    }

    const lines = stdout.trim().split('\n')
    return lines.map((line, index) => {
      const match = line.match(/:\s+(.+)$/)
      const name = match ? match[1] : `GPU ${index + 1}`
      
      return {
        id: index + 200,
        name: name,
        vendor: name.includes('NVIDIA') ? 'NVIDIA' : name.includes('AMD') ? 'AMD' : 'Unknown',
        compute: calculateComputeValue(name),
        memory: 'Unknown',
        memoryUsage: 0,
        utilization: 0,
        status: 'unavailable',
        note: '需要安装相应的驱动和工具',
      }
    })
  } catch (error) {
    console.error('通过lspci获取GPU信息错误:', error)
    return []
  }
}

/**
 * 计算算力值（简化计算，按型号估算 FP16，单位 PFLOPS，1 PFLOPS = 1000 TFLOPS）
 */
const calculateComputeValue = (gpuName) => {
  if (!gpuName || typeof gpuName !== 'string') return 'Unknown'
  const name = gpuName
  if (name.includes('4090')) return '0.330 PFLOPS (FP16)'
  if (name.includes('3090')) return '0.071 PFLOPS (FP16)'
  if (name.includes('3080')) return '0.059 PFLOPS (FP16)'
  if (name.includes('2080 Ti') || name.includes('2080ti')) return '0.027 PFLOPS (FP16)'
  if (name.includes('2080')) return '0.020 PFLOPS (FP16)'
  if (name.includes('2070')) return '0.018 PFLOPS (FP16)'
  if (name.includes('7900')) return '0.122 PFLOPS (FP16)'
  if (name.includes('A100') || name.includes('A10')) return '0.312 PFLOPS (FP16)'
  if (name.includes('V100')) return '0.031 PFLOPS (FP16)'
  return 'Unknown'
}

/**
 * 获取所有算力资源（串行执行，同一时刻仅一个请求跑 nvidia-smi，避免多进程卡住）
 */
export const getComputeResources = async () => {
  while (computeResourcesLock) {
    await computeResourcesLock
  }
  let release = null
  computeResourcesLock = new Promise((r) => { release = r })
  try {
    const resources = []

    // 获取NVIDIA GPUs
    const nvidiaGPUs = await getNvidiaGPUInfo()
    resources.push(...nvidiaGPUs)

    // 获取AMD GPUs
    const amdGPUs = await getAMDGPUInfo()
    resources.push(...amdGPUs)

    // 如果还没有检测到GPU，使用lspci作为备用
    if (resources.length === 0) {
      const lspciGPUs = await getLspciGPUInfo()
      resources.push(...lspciGPUs)
    }

    // 如果有NVIDIA GPU，添加CUDA版本
    if (nvidiaGPUs.length > 0) {
      const cudaVersion = await getCudaVersion()
      if (cudaVersion && resources.length > 0) {
        resources.forEach((resource) => {
          if (resource.vendor === 'NVIDIA') {
            resource.cudaVersion = cudaVersion
          }
        })
      }
    }

    return resources
  } finally {
    computeResourcesLock = null
    if (release) release()
  }
}

/**
 * 获取设备详情
 */
export const getDeviceDetails = async (deviceId) => {
  const resources = await getComputeResources()
  return resources.find(r => r.id === deviceId) || null
}
