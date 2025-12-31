import { execSudo, execCommand } from '../utils/exec.js'
import path from 'path'
import fs from 'fs/promises'
import { getModelDetails, getModels } from './modelService.js'

const MODELS_DIR = process.env.MODELS_DIR || '/var/lib/infiniteos/models'
const DEPLOYMENTS_DIR = process.env.DEPLOYMENTS_DIR || '/var/lib/infiniteos/deployments'

/**
 * 确保目录存在
 */
const ensureDir = async (dirPath) => {
  try {
    await fs.mkdir(dirPath, { recursive: true })
  } catch (error) {
    console.error('创建目录失败:', error)
  }
}

/**
 * 检测可用的容器运行时
 */
const detectContainerRuntime = async () => {
  try {
    // 优先使用 Docker
    const { success } = await execCommand('which docker')
    if (success) {
      const { stdout } = await execCommand('docker --version')
      if (stdout.includes('Docker')) {
        return 'docker'
      }
    }
  } catch (error) {
    // Docker 不可用
  }

  try {
    // 尝试 Podman
    const { success } = await execCommand('which podman')
    if (success) {
      const { stdout } = await execCommand('podman --version')
      if (stdout.includes('podman')) {
        return 'podman'
      }
    }
  } catch (error) {
    // Podman 不可用
  }

  throw new Error('未找到可用的容器运行时（Docker 或 Podman）')
}

/**
 * 获取容器命令（docker 或 podman）
 */
const getContainerCmd = async () => {
  const runtime = await detectContainerRuntime()
  return runtime
}

/**
 * 部署模型为推理服务
 */
export const deployModel = async (deployConfig) => {
  const {
    modelId,
    serviceName,
    framework,
    apiPort,
    healthPort,
    gpuDevices,
    cpuLimit,
    memoryLimit,
    envVars = {},
    autoStart = true,
  } = deployConfig

  // 获取模型信息
  const models = await getModels()
  const model = models.find(m => m.id === modelId)
  if (!model) {
    throw new Error('模型不存在')
  }

  if (model.status !== 'ready') {
    throw new Error('模型状态不正确，无法部署')
  }

  const containerCmd = await getContainerCmd()
  const modelPath = path.join(MODELS_DIR, model.name)

  // 检查模型目录是否存在
  try {
    await fs.access(modelPath)
  } catch (error) {
    throw new Error(`模型目录不存在: ${modelPath}`)
  }

  // 构建容器运行命令
  const containerName = `inference-${serviceName}`
  
  // 检查容器是否已存在
  try {
    const { stdout } = await execSudo(`${containerCmd} ps -a --filter name=${containerName} --format "{{.Names}}"`)
    if (stdout.trim() === containerName) {
      throw new Error(`服务 ${serviceName} 已存在，请先删除或使用不同的服务名称`)
    }
  } catch (error) {
    if (error.message.includes('已存在')) {
      throw error
    }
    // 容器不存在，继续
  }

  // 根据框架选择镜像和启动命令
  let image, command, ports

  switch (framework) {
    case 'vllm':
      image = 'vllm/vllm-openai:latest'
      command = [
        '--model', modelPath,
        '--host', '0.0.0.0',
        '--port', String(apiPort),
        '--trust-remote-code',
      ]
      if (gpuDevices) {
        command.push('--gpu-memory-utilization', '0.9')
      }
      ports = [`${apiPort}:${apiPort}`]
      if (healthPort) {
        ports.push(`${healthPort}:${healthPort}`)
      }
      break

    case 'ollama':
      image = 'ollama/ollama:latest'
      command = ['serve']
      ports = [`${apiPort}:11434`]
      envVars.OLLAMA_MODELS = modelPath
      break

    case 'tgi':
      image = 'ghcr.io/huggingface/text-generation-inference:latest'
      command = [
        '--model-id', modelPath,
        '--port', String(apiPort),
        '--hostname', '0.0.0.0',
      ]
      if (gpuDevices) {
        command.push('--num-shard', '1')
      }
      ports = [`${apiPort}:${apiPort}`]
      break

    case 'transformers':
      image = 'huggingface/transformers-pytorch-gpu:latest'
      command = ['python', '-m', 'transformers.serving', '--model', modelPath, '--port', String(apiPort)]
      ports = [`${apiPort}:${apiPort}`]
      break

    default:
      throw new Error(`不支持的推理框架: ${framework}`)
  }

  // 构建 docker/podman run 命令
  let runCmd = `${containerCmd} run -d --name ${containerName}`

  // 添加端口映射
  ports.forEach(port => {
    runCmd += ` -p ${port}`
  })

  // 添加GPU设备
  if (gpuDevices) {
    if (containerCmd === 'docker') {
      runCmd += ` --gpus device=${gpuDevices}`
    } else {
      // podman
      runCmd += ` --device=/dev/dri`
    }
  }

  // 添加资源限制
  if (cpuLimit) {
    runCmd += ` --cpus="${cpuLimit}"`
  }
  if (memoryLimit) {
    runCmd += ` --memory="${memoryLimit}"`
  }

  // 添加环境变量
  Object.entries(envVars).forEach(([key, value]) => {
    runCmd += ` -e ${key}="${value}"`
  })

  // 挂载模型目录
  runCmd += ` -v ${modelPath}:/models/${model.name}:ro`

  // 添加镜像和命令
  runCmd += ` ${image} ${command.join(' ')}`

  // 执行部署
  try {
    const { stdout, stderr, success } = await execSudo(runCmd)
    
    if (!success) {
      throw new Error(stderr || '部署失败')
    }

    const containerId = stdout.trim()

    // 如果设置了自动启动，确保容器正在运行
    if (autoStart) {
      await execSudo(`${containerCmd} start ${containerName}`)
    }

    // 保存部署信息
    await ensureDir(DEPLOYMENTS_DIR)
    const deploymentInfo = {
      id: containerId,
      serviceName,
      modelId,
      modelName: model.name,
      framework,
      apiPort,
      healthPort,
      status: autoStart ? 'running' : 'stopped',
      createdAt: new Date().toISOString(),
    }
    
    const deploymentFile = path.join(DEPLOYMENTS_DIR, `${serviceName}.json`)
    await fs.writeFile(deploymentFile, JSON.stringify(deploymentInfo, null, 2))

    return {
      message: '模型部署成功',
      serviceId: containerId,
      serviceName,
      apiPort,
    }
  } catch (error) {
    console.error('部署模型错误:', error)
    throw new Error(error.message || '部署模型失败')
  }
}

/**
 * 获取部署列表
 */
export const getDeployments = async () => {
  try {
    await ensureDir(DEPLOYMENTS_DIR)
    const files = await fs.readdir(DEPLOYMENTS_DIR)
    
    const deployments = []
    const containerCmd = await getContainerCmd()

    for (const file of files) {
      if (file.endsWith('.json')) {
        const deploymentFile = path.join(DEPLOYMENTS_DIR, file)
        const data = await fs.readFile(deploymentFile, 'utf8')
        const deployment = JSON.parse(data)

        // 检查容器状态
        try {
          const { stdout } = await execSudo(`${containerCmd} ps --filter id=${deployment.id} --format "{{.Status}}"`)
          deployment.status = stdout.trim() ? 'running' : 'stopped'
        } catch (error) {
          deployment.status = 'stopped'
        }

        deployments.push(deployment)
      }
    }

    return deployments
  } catch (error) {
    console.error('获取部署列表错误:', error)
    return []
  }
}

/**
 * 删除部署
 */
export const deleteDeployment = async (serviceName) => {
  const containerCmd = await getContainerCmd()
  const containerName = `inference-${serviceName}`

  try {
    // 停止并删除容器
    await execSudo(`${containerCmd} stop ${containerName}`)
    await execSudo(`${containerCmd} rm ${containerName}`)
  } catch (error) {
    // 容器可能不存在或已停止
    console.warn('删除容器警告:', error.message)
  }

  // 删除部署信息文件
  const deploymentFile = path.join(DEPLOYMENTS_DIR, `${serviceName}.json`)
  try {
    await fs.unlink(deploymentFile)
  } catch (error) {
    // 文件可能不存在
    console.warn('删除部署文件警告:', error.message)
  }

  return { message: '部署删除成功' }
}

