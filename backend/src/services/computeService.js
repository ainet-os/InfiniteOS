import { execCommand, execSudo } from '../utils/exec.js'

/**
 * 获取NVIDIA GPU信息
 */
const getNvidiaGPUInfo = async () => {
  try {
    const { stdout, success } = await execSudo('nvidia-smi --query-gpu=index,name,memory.total,memory.used,utilization.gpu,temperature.gpu,power.draw,power.limit,driver_version --format=csv,noheader,nounits')
    
    if (!success || !stdout) {
      return []
    }

    const lines = stdout.trim().split('\n')
    return lines.map((line, index) => {
      const parts = line.split(', ').map(p => p.trim())
      return {
        id: index + 1,
        name: parts[1] || `NVIDIA GPU ${index + 1}`,
        vendor: 'NVIDIA',
        compute: calculateComputeValue(parts[1] || ''),
        memory: `${parseInt(parts[2]) || 0} MB`,
        memoryUsed: `${parseInt(parts[3]) || 0} MB`,
        utilization: parseInt(parts[4]) || 0,
        temperature: parseInt(parts[5]) || null,
        power: `${parseFloat(parts[6]) || 0}W / ${parseFloat(parts[7]) || 0}W`,
        driver: parts[8] || '',
        status: 'available',
      }
    })
  } catch (error) {
    console.error('获取NVIDIA GPU信息错误:', error)
    return []
  }
}

/**
 * 获取CUDA版本
 */
const getCudaVersion = async () => {
  try {
    const { stdout } = await execSudo('nvidia-smi --query-gpu=cuda_version --format=csv,noheader')
    return stdout.trim() || null
  } catch (error) {
    return null
  }
}

/**
 * 获取AMD GPU信息
 */
const getAMDGPUInfo = async () => {
  try {
    const { stdout, success } = await execSudo('rocm-smi --showid --showproductname --showmeminfo vram --showtemp --showuse --showpower --csv')
    
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
        compute: 'Unknown',
        memory: 'Unknown',
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
 * 计算算力值（简化计算）
 */
const calculateComputeValue = (gpuName) => {
  // 根据GPU名称估算算力值
  // 这里简化处理，实际应该查询GPU规格
  if (gpuName.includes('4090')) return '83 TFLOPS (FP32)'
  if (gpuName.includes('3090')) return '36 TFLOPS (FP32)'
  if (gpuName.includes('3080')) return '30 TFLOPS (FP32)'
  if (gpuName.includes('7900')) return '61 TFLOPS (FP32)'
  return 'Unknown'
}

/**
 * 获取所有算力资源
 */
export const getComputeResources = async () => {
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
      resources[0].cudaVersion = cudaVersion
    }
  }

  return resources
}

/**
 * 获取设备详情
 */
export const getDeviceDetails = async (deviceId) => {
  const resources = await getComputeResources()
  return resources.find(r => r.id === deviceId) || null
}
