import { execCommand } from '../utils/exec.js'
import fs from 'fs/promises'
import { createWriteStream } from 'fs'
import path from 'path'
import * as Minio from 'minio'

const LOCAL_PUBLIC_MODELS_DIR = '/var/data/pubmodels'
const LOCAL_PRIVATE_MODELS_DIR = '/var/data/primodels'
const LOCAL_MODEL_DIR_MAP = {
  public: LOCAL_PUBLIC_MODELS_DIR,
  private: LOCAL_PRIVATE_MODELS_DIR,
}
const DEFAULT_CLOUD_CONSOLE_URL = 'https://console.ainet.uno'
const CLOUD_LOGIN_PATH = '/api/tenants/minio-credentials/login'
const CLOUD_LIST_OBJECT_LIMIT = 10000

const normalizeLocalModelType = (type = 'public') => (type === 'private' ? 'private' : 'public')
const normalizeCloudModelType = (type = 'public') => (type === 'private' ? 'private' : 'public')
const getLocalModelsDir = (type = 'public') => LOCAL_MODEL_DIR_MAP[normalizeLocalModelType(type)]

const ensureDir = async (dirPath) => {
  try {
    await fs.mkdir(dirPath, { recursive: true })
  } catch (error) {
    console.error('创建目录失败:', error)
  }
}

const parseApiEndpoint = (apiEndpoint) => {
  const value = (apiEndpoint || '').trim()

  if (value.startsWith('http://') || value.startsWith('https://')) {
    try {
      const url = new URL(value)
      return {
        host: url.hostname,
        port: Number.parseInt(url.port, 10) || (url.protocol === 'https:' ? 443 : 80),
        useSSL: url.protocol === 'https:',
      }
    } catch (_) {
      // fallback below
    }
  }

  const parts = value.split(':')
  if (parts.length >= 2) {
    return {
      host: parts.slice(0, -1).join(':').trim(),
      port: Number.parseInt(parts[parts.length - 1], 10) || 9000,
      useSSL: false,
    }
  }

  return {
    host: value || 'localhost',
    port: 9000,
    useSSL: false,
  }
}

const createMinioClient = ({ endpoint, accessKey, secretKey, useSSL = false }) => {
  const { host, port, useSSL: useSSLFromUrl } = parseApiEndpoint(endpoint)
  return new Minio.Client({
    endPoint: host,
    port: port || 9000,
    useSSL: useSSL === true || useSSLFromUrl,
    accessKey: (accessKey || '').trim(),
    secretKey: (secretKey || '').trim(),
  })
}

const buildCloudBucketInfo = (credentials, type = 'public') => {
  const normalizedType = normalizeCloudModelType(type)

  if (normalizedType === 'public') {
    return {
      bucket: 'pubmodels',
      prefix: '',
    }
  }

  const tenantBucket = (credentials.tenantBucket || '').trim()
  if (!tenantBucket) {
    throw new Error('租户存储桶不存在')
  }

  return {
    bucket: tenantBucket,
    prefix: 'models/',
  }
}

const listModelPrefixes = async (minioClient, bucket, prefix = '') => {
  const prefixes = new Map()
  const stream = minioClient.listObjects(bucket, prefix, true)
  let count = 0

  for await (const obj of stream) {
    const objectName = obj.name || ''
    if (!objectName.startsWith(prefix)) {
      continue
    }

    const relativeName = objectName.slice(prefix.length)
    const parts = relativeName.split('/').filter(Boolean)
    if (parts.length === 0) {
      continue
    }

    const modelName = parts[0]
    const current = prefixes.get(modelName) || 0
    prefixes.set(modelName, current + (obj.size || 0))

    count += 1
    if (count >= CLOUD_LIST_OBJECT_LIMIT) {
      break
    }
  }

  return Array.from(prefixes.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, bytes]) => ({ name, size: formatBytes(bytes) }))
}

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '-'
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let index = 0

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index += 1
  }

  const rounded = value >= 100 || index === 0 ? Math.round(value) : Math.round(value * 10) / 10
  return `${rounded} ${units[index]}`
}



const ensureCloudCredentials = (credentials) => {
  const endpoint = (credentials?.endpoint || '').trim()
  const accessKey = (credentials?.accessKey || '').trim()
  const secretKey = (credentials?.secretKey || '').trim()

  if (!endpoint || !accessKey || !secretKey) {
    throw new Error('云端登录信息不完整，请先登录')
  }

  return {
    endpoint,
    accessKey,
    secretKey,
    useSSL: credentials?.useSSL === true,
    tenantBucket: (credentials?.tenantBucket || '').trim(),
  }
}

export const loginCloudModels = async ({ consoleUrl = DEFAULT_CLOUD_CONSOLE_URL, email, password }) => {
  const normalizedConsoleUrl = (consoleUrl || DEFAULT_CLOUD_CONSOLE_URL).trim().replace(/\/$/, '')
  const normalizedEmail = (email || '').trim()
  const normalizedPassword = password || ''

  if (!normalizedEmail || !normalizedPassword) {
    throw new Error('用户名和密码不能为空')
  }

  const response = await fetch(`${normalizedConsoleUrl}${CLOUD_LOGIN_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: normalizedEmail,
      password: normalizedPassword,
    }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok || payload?.code !== 200 || !payload?.data) {
    throw new Error(payload?.message || '登录云端模型失败')
  }

  const data = payload.data
  return {
    endpoint: data.endpoint,
    useSSL: data.useSSL === true,
    accessKey: data.accessKey,
    secretKey: data.secretKey,
    tenantBucket: data.tenantBucket || '',
    readonlyPublicBuckets: Array.isArray(data.readonlyPublicBuckets) ? data.readonlyPublicBuckets : [],
    consoleUrl: normalizedConsoleUrl,
  }
}

export const getLocalModels = async (type = 'public') => {
  const localModelsDir = getLocalModelsDir(type)

  try {
    await ensureDir(localModelsDir)
    const entries = await fs.readdir(localModelsDir, { withFileTypes: true })
    const dirs = entries.filter((entry) => entry.isDirectory())

    if (dirs.length === 0) {
      return []
    }

    const dirPaths = dirs.map((dir) => path.join(localModelsDir, dir.name))
    const sizeByPath = {}

    try {
      const { stdout } = await execCommand(
        `du -sh ${dirPaths.map((dirPath) => JSON.stringify(dirPath)).join(' ')} 2>/dev/null`,
        { maxBuffer: 1024 * 1024 }
      )
      const lines = (stdout || '').trim().split('\n').filter(Boolean)
      for (const line of lines) {
        const match = line.trim().match(/^(\S+)\s+(.+)$/)
        if (match) {
          sizeByPath[match[2].trim()] = match[1]
        }
      }
    } catch (_) {}

    return dirs
      .map((dir) => {
        const modelPath = path.join(localModelsDir, dir.name)
        return {
          name: dir.name,
          size: sizeByPath[modelPath] || '-',
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  } catch (error) {
    console.error('获取本地模型列表错误:', error)
    return []
  }
}

export const getCloudModels = async (type = 'public', credentials) => {
  try {
    const ensuredCredentials = ensureCloudCredentials(credentials)
    const minioClient = createMinioClient(ensuredCredentials)
    const { bucket, prefix } = buildCloudBucketInfo(ensuredCredentials, type)
    const bucketExists = await minioClient.bucketExists(bucket)

    if (!bucketExists) {
      return []
    }

    return await listModelPrefixes(minioClient, bucket, prefix)
  } catch (error) {
    console.error('获取云端模型列表错误:', error)
    throw error
  }
}



export const syncCloudModelToLocal = async (name, type = 'public', credentials) => {
  if (!name || name.includes('..') || name.includes('/')) {
    throw new Error('无效的模型名称')
  }

  const normalizedType = normalizeCloudModelType(type)
  const localRootDir = getLocalModelsDir(normalizedType)
  const localModelDir = path.join(localRootDir, name)
  const ensuredCredentials = ensureCloudCredentials(credentials)
  const minioClient = createMinioClient(ensuredCredentials)
  const { bucket, prefix } = buildCloudBucketInfo(ensuredCredentials, normalizedType)
  const modelPrefix = `${prefix}${name}/`
  const objects = []
  const stream = minioClient.listObjects(bucket, modelPrefix, true)

  for await (const obj of stream) {
    if (obj.name) {
      objects.push(obj)
    }
  }

  if (objects.length === 0) {
    throw new Error('云端模型不存在')
  }

  await ensureDir(localRootDir)
  await fs.rm(localModelDir, { recursive: true, force: true })
  await ensureDir(localModelDir)

  for (const obj of objects) {
    const objectName = obj.name || ''
    const relativePath = objectName.slice(modelPrefix.length)
    if (!relativePath) {
      continue
    }

    const localFilePath = path.join(localModelDir, relativePath)
    await ensureDir(path.dirname(localFilePath))

    await new Promise((resolve, reject) => {
      const fileStream = createWriteStream(localFilePath)
      fileStream.on('finish', resolve)
      fileStream.on('error', reject)

      minioClient.getObject(bucket, objectName)
        .then((objectStream) => {
          objectStream.on('error', reject)
          objectStream.pipe(fileStream)
        })
        .catch(reject)
    })
  }

  return {
    message: '同步成功',
    name,
    path: localModelDir,
    type: normalizedType,
  }
}

export const deleteLocalModel = async (name, type = 'public') => {
  if (!name || name.includes('..') || name.includes('/')) {
    throw new Error('无效的模型名称')
  }

  const modelPath = path.join(getLocalModelsDir(type), name)

  try {
    await fs.rm(modelPath, { recursive: true, force: true })
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error('模型不存在')
    }
    throw error
  }

  return { message: '删除成功' }
}
