import { execCommand, execSudo } from '../utils/exec.js'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import * as Minio from 'minio'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const MODELS_DIR = process.env.MODELS_DIR || '/var/lib/infiniteos/models'
const CONFIG_FILE = path.join(__dirname, '../../config/models.json')

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
 * 读取配置文件
 */
const readConfig = async () => {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf8')
    const config = JSON.parse(data)
    // 兼容旧配置格式，转换为新格式
    if (config.repositoryUrl && !config.apiEndpoint) {
      return {
        apiEndpoint: '100.93.0.8:32000',
        webConsole: '100.93.0.8:32081',
        accessKey: 'infiniteos',
        secretKey: 'infiniteos',
        bucket: 'models',
        useSSL: false,
        syncInterval: config.syncInterval || 'manual',
        autoSync: config.autoSync || false,
      }
    }
    return config
  } catch (error) {
    // 如果文件不存在，返回默认配置
    return {
      apiEndpoint: '100.93.0.8:32000',
      webConsole: '100.93.0.8:32081',
      accessKey: 'infiniteos',
      secretKey: 'infiniteos',
      bucket: 'models',
      useSSL: false,
      syncInterval: 'manual',
      autoSync: false,
    }
  }
}

/**
 * 写入配置文件
 */
const writeConfig = async (config) => {
  await ensureDir(path.dirname(CONFIG_FILE))
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8')
}

/**
 * 获取模型列表
 */
export const getModels = async () => {
  try {
    await ensureDir(MODELS_DIR)
    const files = await fs.readdir(MODELS_DIR, { withFileTypes: true })
    
    const models = []
    let id = 1

    for (const file of files) {
      if (file.isDirectory()) {
        const modelPath = path.join(MODELS_DIR, file.name)
        const infoPath = path.join(modelPath, 'info.json')
        
        let modelInfo = {
          name: file.name,
          version: 'v1.0.0',
          type: 'llm',
          source: 'local',
          size: '0',
          status: 'ready',
        }

        try {
          const infoData = await fs.readFile(infoPath, 'utf8')
          modelInfo = { ...modelInfo, ...JSON.parse(infoData) }
        } catch (error) {
          // 如果没有info.json，使用默认值
        }

        // 计算目录大小
        try {
          const { stdout } = await execCommand(`du -sh "${modelPath}" | cut -f1`)
          modelInfo.size = stdout.trim()
        } catch (error) {
          // 忽略错误
        }

        models.push({
          id: id++,
          ...modelInfo,
        })
      }
    }

    return models
  } catch (error) {
    console.error('获取模型列表错误:', error)
    return []
  }
}

/**
 * 获取模型详情
 */
export const getModelDetails = async (modelId) => {
  const models = await getModels()
  return models.find(m => m.id === modelId) || null
}

/**
 * 创建MinIO客户端
 */
const createMinioClient = (config) => {
  const [host, port] = config.apiEndpoint.split(':')
  return new Minio.Client({
    endPoint: host.trim(),
    port: parseInt(port) || 9000,
    useSSL: config.useSSL === true,
    accessKey: (config.accessKey || '').trim(),
    secretKey: (config.secretKey || '').trim(),
  })
}

/**
 * 格式化字节大小
 */
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * 上传模型
 */
export const uploadModel = async (modelData, files) => {
  const { name, version, type, description } = modelData

  if (!name) {
    throw new Error('模型名称不能为空')
  }

  if (!files || files.length === 0) {
    throw new Error('请选择要上传的模型文件')
  }

  try {
    // 创建本地模型目录
    const modelDir = path.join(MODELS_DIR, name)
    
    // 检查模型是否已存在
    try {
      await fs.access(modelDir)
      throw new Error(`模型 ${name} 已存在，请先删除或使用其他名称`)
    } catch (error) {
      if (error.message.includes('已存在')) {
        throw error
      }
      // 目录不存在，继续创建
    }

    await ensureDir(modelDir)

    // 保存模型信息
    const modelInfo = {
      name,
      version: version || 'v1.0.0',
      type: type || 'llm',
      source: 'local',
      description: description || '',
      status: 'ready',
      uploadedAt: new Date().toISOString(),
    }

    // 保存文件到本地
    let totalSize = 0
    for (const file of files) {
      const fileBuffer = Buffer.isBuffer(file.buffer) ? file.buffer : Buffer.from(file.buffer)
      totalSize += fileBuffer.length
      
      const fileName = file.originalname || file.name
      const filePath = path.join(modelDir, fileName)
      await fs.writeFile(filePath, fileBuffer)
    }

    modelInfo.size = formatBytes(totalSize)

    // 保存模型信息到本地
    const infoPath = path.join(modelDir, 'info.json')
    await fs.writeFile(infoPath, JSON.stringify(modelInfo, null, 2), 'utf8')

    return {
      id: (await getModels()).length + 1,
      ...modelInfo,
      message: '模型上传成功',
    }
  } catch (error) {
    console.error('上传模型错误:', error)
    throw new Error(`上传模型失败: ${error.message}`)
  }
}

/**
 * 同步模型
 */
export const syncModels = async () => {
  const config = await readConfig()
  
  if (!config.apiEndpoint || !config.accessKey || !config.secretKey || !config.bucket) {
    throw new Error('未完整配置MinIO仓库信息（需要API端点、用户名、密码和存储桶）')
  }

  try {
    console.log('开始同步模型，配置:', {
      apiEndpoint: config.apiEndpoint,
      bucket: config.bucket,
      accessKey: config.accessKey ? '***' + config.accessKey.slice(-3) : '未设置',
    })
    
    const minioClient = createMinioClient(config)
    
    // 检查存储桶是否存在
    const bucketExists = await minioClient.bucketExists(config.bucket)
    if (!bucketExists) {
      throw new Error(`存储桶 ${config.bucket} 不存在`)
    }

    // 列出存储桶中的所有对象
    const objectsStream = minioClient.listObjects(config.bucket, '', true)
    const objects = []
    
    for await (const obj of objectsStream) {
      objects.push(obj)
    }

    // 按目录分组对象（假设目录结构为 model-name/...）
    const modelDirs = new Map()
    for (const obj of objects) {
      const parts = obj.name.split('/')
      if (parts.length > 0 && parts[0]) {
        const modelName = parts[0]
        if (!modelDirs.has(modelName)) {
          modelDirs.set(modelName, [])
        }
        modelDirs.get(modelName).push(obj)
      }
    }

    const syncedModels = []
    let syncedCount = 0

    // 处理每个模型目录
    for (const [modelName, modelObjects] of modelDirs.entries()) {
      // 检查本地是否已存在该模型
      const localModelDir = path.join(MODELS_DIR, modelName)
      const localExists = await fs.access(localModelDir).then(() => true).catch(() => false)
      
      if (localExists) {
        console.log(`模型 ${modelName} 已存在于本地，跳过同步`)
        continue
      }

      // 查找info.json文件
      const infoObj = modelObjects.find(obj => obj.name.endsWith('/info.json') || obj.name === `${modelName}/info.json`)
      
      let modelInfo = {
        name: modelName,
        version: 'v1.0.0',
        type: 'llm',
        source: 'cloud',
        size: '0',
        status: 'ready',
        description: '从MinIO同步的模型',
      }

      if (infoObj) {
        try {
          // 下载info.json
          const data = await minioClient.getObject(config.bucket, infoObj.name)
          const chunks = []
          for await (const chunk of data) {
            chunks.push(chunk)
          }
          const infoContent = Buffer.concat(chunks).toString('utf8')
          const parsedInfo = JSON.parse(infoContent)
          modelInfo = { ...modelInfo, ...parsedInfo, source: 'cloud' }
        } catch (error) {
          console.error(`读取模型 ${modelName} 的info.json失败:`, error)
        }
      }

      // 创建本地模型目录
      await ensureDir(localModelDir)

      // 下载所有模型文件到本地
      let totalSize = 0
      for (const obj of modelObjects) {
        try {
          // 跳过info.json，稍后单独处理
          if (obj.name.endsWith('/info.json') || obj.name === `${modelName}/info.json`) {
            totalSize += obj.size || 0
            continue
          }

          // 下载文件
          const data = await minioClient.getObject(config.bucket, obj.name)
          const chunks = []
          for await (const chunk of data) {
            chunks.push(chunk)
          }
          const fileBuffer = Buffer.concat(chunks)
          totalSize += fileBuffer.length

          // 获取文件相对路径（去掉模型名前缀）
          const relativePath = obj.name.replace(`${modelName}/`, '')
          const localFilePath = path.join(localModelDir, relativePath)
          
          // 确保子目录存在
          const fileDir = path.dirname(localFilePath)
          if (fileDir !== localModelDir) {
            await ensureDir(fileDir)
          }

          // 保存到本地
          await fs.writeFile(localFilePath, fileBuffer)
        } catch (error) {
          console.error(`下载文件 ${obj.name} 失败:`, error)
        }
      }

      modelInfo.size = formatBytes(totalSize)

      // 保存模型信息到本地
      const infoPath = path.join(localModelDir, 'info.json')
      await fs.writeFile(infoPath, JSON.stringify(modelInfo, null, 2), 'utf8')

      syncedModels.push(modelInfo)
      syncedCount++
    }

    return {
      message: '同步完成',
      synced: syncedCount,
      models: syncedModels,
    }
  } catch (error) {
    console.error('同步模型错误:', error)
    
    // 提供更友好的错误信息
    let errorMessage = '同步模型失败'
    if (error.code === 'InvalidAccessKeyId') {
      errorMessage = 'MinIO认证失败：Access Key或Secret Key不正确，请检查配置'
    } else if (error.code === 'SignatureDoesNotMatch') {
      errorMessage = 'MinIO认证失败：Secret Key不正确，请检查配置'
    } else if (error.code === 'NoSuchBucket') {
      errorMessage = `存储桶 ${config.bucket} 不存在，请检查配置`
    } else if (error.message.includes('ECONNREFUSED') || error.message.includes('getaddrinfo')) {
      errorMessage = `无法连接到MinIO服务器 ${config.apiEndpoint}，请检查网络连接和API端点配置`
    } else if (error.message) {
      errorMessage = `同步模型失败: ${error.message}`
    }
    
    throw new Error(errorMessage)
  }
}

/**
 * 删除模型
 */
export const deleteModel = async (modelId) => {
  const models = await getModels()
  const model = models.find(m => m.id === modelId)
  
  if (!model) {
    throw new Error('模型不存在')
  }

  const modelDir = path.join(MODELS_DIR, model.name)
  await fs.rm(modelDir, { recursive: true, force: true })
}

/**
 * 获取模型配置
 */
export const getModelConfig = async () => {
  return await readConfig()
}

/**
 * 更新模型配置
 */
export const updateModelConfig = async (config) => {
  try {
    console.log('写入配置到文件:', CONFIG_FILE)
    await writeConfig(config)
    console.log('配置写入成功')
  } catch (error) {
    console.error('写入配置失败:', error)
    throw new Error(`保存配置失败: ${error.message}`)
  }
}

