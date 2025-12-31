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

        // 读取模型目录下的文件列表（排除info.json）
        let files = []
        try {
          const dirFiles = await fs.readdir(modelPath)
          files = dirFiles.filter(f => f !== 'info.json' && !f.startsWith('.'))
        } catch (error) {
          // 忽略错误
        }

        models.push({
          id: id++,
          ...modelInfo,
          files: files,
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
 * 创建云端仓库客户端
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
    throw new Error('未完整配置云端仓库信息（需要API端点、用户名、密码和存储桶）')
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
        description: '从云端仓库同步的模型',
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
      errorMessage = '云端仓库认证失败：Access Key或Secret Key不正确，请检查配置'
    } else if (error.code === 'SignatureDoesNotMatch') {
      errorMessage = '云端仓库认证失败：Secret Key不正确，请检查配置'
    } else if (error.code === 'NoSuchBucket') {
      errorMessage = `存储桶 ${config.bucket} 不存在，请检查配置`
    } else if (error.message.includes('ECONNREFUSED') || error.message.includes('getaddrinfo')) {
      errorMessage = `无法连接到云端仓库服务器 ${config.apiEndpoint}，请检查网络连接和API端点配置`
    } else if (error.message) {
      errorMessage = `同步模型失败: ${error.message}`
    }
    
    throw new Error(errorMessage)
  }
}

/**
 * 更新模型信息
 */
export const updateModel = async (modelId, modelData) => {
  try {
    console.log('更新模型:', { modelId, modelData })
    const models = await getModels()
    const model = models.find(m => m.id === modelId)
    
    if (!model) {
      console.error('模型不存在，modelId:', modelId, '可用模型:', models.map(m => ({ id: m.id, name: m.name })))
      throw new Error(`模型不存在 (ID: ${modelId})`)
    }

    console.log('找到模型:', { id: model.id, name: model.name })

    const modelDir = path.join(MODELS_DIR, model.name)
    const infoFile = path.join(modelDir, 'info.json')
    
    // 检查模型目录是否存在
    try {
      await fs.access(modelDir)
      console.log('模型目录存在:', modelDir)
    } catch (error) {
      console.error('模型目录不存在:', modelDir)
      throw new Error(`模型目录不存在: ${modelDir}`)
    }
    
    // 读取现有信息
    let info = {}
    try {
      const infoContent = await fs.readFile(infoFile, 'utf8')
      info = JSON.parse(infoContent)
      console.log('读取现有info.json成功:', Object.keys(info))
    } catch (error) {
      // 如果info.json不存在，创建新的
      console.log('info.json不存在，创建新的')
      info = {
        name: model.name,
        version: model.version || 'v1.0.0',
        type: model.type || 'llm',
        source: model.source || 'local',
        size: model.size || '0',
        status: model.status || 'ready',
      }
    }

    // 更新信息
    let finalModelDir = modelDir
    if (modelData.name !== undefined && modelData.name && modelData.name.trim()) {
      const newName = modelData.name.trim()
      // 如果名称改变，需要重命名目录
      if (newName !== model.name) {
        const newModelDir = path.join(MODELS_DIR, newName)
        // 检查新目录是否已存在
        try {
          await fs.access(newModelDir)
          console.error('目标目录已存在:', newModelDir)
          throw new Error(`模型名称 "${newName}" 已存在`)
        } catch (error) {
          if (error.message.includes('已存在')) {
            throw error
          }
          // 目录不存在，可以重命名
          console.log(`重命名模型目录: ${modelDir} -> ${newModelDir}`)
          try {
            await fs.rename(modelDir, newModelDir)
            finalModelDir = newModelDir
            info.name = newName
            console.log('目录重命名成功')
          } catch (renameError) {
            console.error('目录重命名失败:', renameError)
            throw new Error(`重命名模型目录失败: ${renameError.message}`)
          }
        }
      } else {
        info.name = newName
      }
    }
    if (modelData.version !== undefined) {
      info.version = modelData.version || ''
    }
    if (modelData.type !== undefined && modelData.type) {
      info.type = modelData.type
    }
    if (modelData.description !== undefined) {
      info.description = modelData.description || ''
    }

    // 保存更新后的信息
    const finalInfoFile = path.join(finalModelDir, 'info.json')
    console.log('保存info.json到:', finalInfoFile)
    try {
      await fs.writeFile(finalInfoFile, JSON.stringify(info, null, 2), 'utf8')
      console.log('模型信息更新成功')
    } catch (writeError) {
      console.error('写入info.json失败:', writeError)
      throw new Error(`保存模型信息失败: ${writeError.message}`)
    }

    // 返回更新后的模型信息（重新获取以确保ID正确）
    const updatedModels = await getModels()
    const updatedModel = updatedModels.find(m => m.name === info.name)
    
    return {
      id: updatedModel ? updatedModel.id : modelId,
      name: info.name,
      version: info.version || '',
      type: info.type,
      source: info.source || model.source,
      size: updatedModel ? updatedModel.size : info.size || '0',
      status: info.status || model.status,
      description: info.description || '',
    }
  } catch (error) {
    console.error('updateModel错误:', error)
    console.error('错误堆栈:', error.stack)
    throw error
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

