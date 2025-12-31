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

// Harbor配置
const HARBOR_HOST = process.env.HARBOR_HOST || '100.93.0.8:30002'
const HARBOR_USERNAME = process.env.HARBOR_USERNAME || 'admin'
const HARBOR_PASSWORD = process.env.HARBOR_PASSWORD || 'Harbor12345'
const HARBOR_PROJECT = process.env.HARBOR_PROJECT || 'inference'

/**
 * 登录Harbor仓库
 */
const loginHarbor = async (containerCmd) => {
  try {
    console.log(`登录Harbor仓库: ${HARBOR_HOST}`)
    const loginCmd = `echo "${HARBOR_PASSWORD}" | ${containerCmd} login ${HARBOR_HOST} -u ${HARBOR_USERNAME} --password-stdin`
    const { stdout, stderr, success } = await execSudo(loginCmd)
    if (success) {
      console.log('Harbor登录成功')
      return true
    } else {
      console.warn('Harbor登录失败，继续尝试:', stderr)
      return false
    }
  } catch (error) {
    console.warn('Harbor登录出错，继续尝试:', error.message)
    return false
  }
}

/**
 * 将镜像名称转换为Harbor格式
 */
const convertToHarborImage = (image) => {
  // 如果已经是Harbor格式，直接返回
  if (image.includes(HARBOR_HOST)) {
    return image
  }
  
  // 提取原始镜像名称（去掉registry部分）
  let imageName = image
  if (image.includes('/')) {
    const parts = image.split('/')
    imageName = parts[parts.length - 1]
  }
  
  // 转换为Harbor格式: harbor-host/project/image:tag
  const [name, tag = 'latest'] = imageName.includes(':') ? imageName.split(':') : [imageName, 'latest']
  return `${HARBOR_HOST}/${HARBOR_PROJECT}/${name}:${tag}`
}

/**
 * 检查镜像是否存在，如果不存在则拉取
 */
const ensureImage = async (containerCmd, image) => {
  // 转换为Harbor镜像名称
  const harborImage = convertToHarborImage(image)
  console.log(`原始镜像: ${image} -> Harbor镜像: ${harborImage}`)
  
  try {
    // 检查镜像是否存在
    const { stdout } = await execSudo(`${containerCmd} images ${harborImage} --format "{{.Repository}}:{{.Tag}}"`)
    if (stdout.trim() === harborImage || stdout.includes(harborImage.split(':')[0])) {
      console.log(`镜像 ${harborImage} 已存在`)
      return harborImage
    }
  } catch (error) {
    // 镜像不存在，继续拉取
  }

  // 尝试登录Harbor（如果使用Harbor镜像）
  if (harborImage.includes(HARBOR_HOST)) {
    await loginHarbor(containerCmd)
  }

  // 拉取镜像
  console.log(`开始拉取镜像: ${harborImage}`)
  try {
    const { stdout, stderr, success } = await execSudo(`${containerCmd} pull ${harborImage}`)
    if (!success) {
      let errorMsg = stderr || `拉取镜像失败: ${harborImage}`
      // 检查是否是网络超时错误
      if (errorMsg.includes('context deadline exceeded') || errorMsg.includes('timeout') || errorMsg.includes('Client.Timeout')) {
        errorMsg = `拉取镜像超时: ${harborImage}。请检查网络连接或Harbor仓库配置。`
      } else if (errorMsg.includes('no such host')) {
        errorMsg = `无法连接到仓库: ${harborImage}。请检查网络连接或DNS配置。`
      } else if (errorMsg.includes('unauthorized') || errorMsg.includes('authentication')) {
        errorMsg = `认证失败: ${harborImage}。请检查Harbor用户名和密码配置。`
      }
      throw new Error(errorMsg)
    }
    console.log(`镜像 ${harborImage} 拉取成功`)
    return harborImage
  } catch (error) {
    console.error(`拉取镜像失败: ${harborImage}`, error)
    throw error
  }
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
      // Ollama需要将模型文件挂载到/root/.ollama/models目录
      // 并且需要将模型文件复制到Ollama的数据目录中
      // 使用环境变量OLLAMA_HOST来指定监听地址
      envVars.OLLAMA_HOST = '0.0.0.0:11434'
      // 注意：Ollama容器启动后，需要通过API导入模型，不能直接使用挂载的文件
      // 所以我们需要挂载整个模型目录，然后在容器启动后通过API导入
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

  // 确保镜像存在，如果不存在则从Harbor拉取（会自动转换为Harbor格式）
  image = await ensureImage(containerCmd, image)

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
  // 对于Ollama，需要特殊处理：挂载到Ollama的数据目录
  if (framework === 'ollama') {
    // Ollama使用/root/.ollama作为数据目录
    // 将模型目录挂载到/root/.ollama/models/${model.name}
    runCmd += ` -v ${modelPath}:/root/.ollama/models/${model.name}:ro`
  } else {
    runCmd += ` -v ${modelPath}:/models/${model.name}:ro`
  }

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

    // 对于Ollama，需要等待服务启动后通过API导入模型
    if (framework === 'ollama') {
      console.log('等待Ollama服务启动...')
      // 等待Ollama服务启动（最多等待30秒）
      let retries = 30
      let ollamaReady = false
      while (retries > 0 && !ollamaReady) {
        try {
          await new Promise(resolve => setTimeout(resolve, 1000))
          const { stdout: healthCheck } = await execSudo(`curl -s http://localhost:${apiPort}/api/tags 2>/dev/null || echo "not ready"`)
          if (healthCheck && !healthCheck.includes('not ready') && !healthCheck.includes('Connection refused')) {
            ollamaReady = true
            console.log('Ollama服务已启动')
            break
          }
        } catch (error) {
          // 继续等待
        }
        retries--
      }

      if (ollamaReady) {
        // 通过Ollama API导入模型
        console.log(`准备导入模型到Ollama: ${model.name}`)
        try {
          // 获取模型文件名
          const modelFileName = model.name.endsWith('.gguf') ? model.name : `${model.name}.gguf`
          const modelFilePath = `/root/.ollama/models/${model.name}/${modelFileName}`
          
          // 使用ollama create命令导入模型
          // 注意：需要在容器内执行
          const importCmd = `${containerCmd} exec ${containerName} sh -c "cd /root/.ollama/models/${model.name} && ls -la && ollama create ${model.name} --file ${modelFilePath} 2>&1 || echo 'import failed'"`
          
          const importResult = await execSudo(importCmd)
          
          if (importResult.stdout && !importResult.stdout.includes('import failed')) {
            console.log(`模型 ${model.name} 导入成功`)
          } else {
            console.warn(`模型导入可能失败，但容器已启动。`)
            console.warn(`模型文件位置: ${modelFilePath}`)
            console.warn(`可以通过以下命令手动导入: docker exec ${containerName} ollama create ${model.name} --file ${modelFilePath}`)
          }
        } catch (error) {
          console.warn('模型导入过程出错，但容器已启动:', error.message)
          console.warn('可以通过Ollama API手动导入模型')
        }
      } else {
        console.warn('Ollama服务启动超时，但容器已创建。请手动检查服务状态。')
      }
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

