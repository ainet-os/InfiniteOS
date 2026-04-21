import fs from 'fs/promises'
import { spawn } from 'child_process'
import { isIP } from 'net'
import os from 'os'
import path from 'path'
import { execSudoFile } from '../utils/exec.js'

const DEFAULT_CLOUD_CONSOLE_URL = 'https://console.ainet.uno'
const HARBOR_LOGIN_PATH = '/api/tenants/harbor-credentials/login'
const CLOUD_REGISTRY_ALIAS_HOST = 'ainet.io'
const DEFAULT_PUBLIC_IMAGE_PROJECTS = ['pubagents', 'pubapps']
const HARBOR_PAGE_SIZE = 100
const MAX_HARBOR_PAGES = 100
const HOSTS_PATH = '/etc/hosts'
const HOSTS_MARKER = '# InfiniteOS cloud image registry'

const checkContainerRuntime = async () => {
  const { success } = await execSudoFile('which', ['docker'])
  if (success) {
    return 'docker'
  }

  return null
}

const parseImageName = (name = '') => {
  const lastColonIndex = name.lastIndexOf(':')
  const lastSlashIndex = name.lastIndexOf('/')

  if (lastColonIndex > lastSlashIndex) {
    return {
      repository: name.slice(0, lastColonIndex),
      tag: name.slice(lastColonIndex + 1),
    }
  }

  return {
    repository: name,
    tag: '<none>',
  }
}

const normalizeLocalImage = (image) => {
  let repository = image.Repository || image.repository || ''
  let tag = image.Tag || image.tag || ''

  if ((!repository || repository === '<none>') && Array.isArray(image.Names) && image.Names.length > 0) {
    const parsed = parseImageName(image.Names[0])
    repository = parsed.repository
    tag = parsed.tag
  }

  repository = repository || '<none>'
  tag = tag || '<none>'

  return {
    id: image.ID || image.Id || image.id || '',
    repository,
    tag,
    size: image.Size || image.size || '-',
    created: image.CreatedAt || image.Created || image.created || '-',
    image: repository !== '<none>' && tag !== '<none>' ? `${repository}:${tag}` : repository,
  }
}

const parseLocalImages = (stdout = '') => {
  const content = stdout.trim()
  if (!content) {
    return []
  }

  if (content.startsWith('[')) {
    const parsed = JSON.parse(content)
    return Array.isArray(parsed) ? parsed.map(normalizeLocalImage) : []
  }

  return content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => normalizeLocalImage(JSON.parse(line)))
}

const buildLocalImageReference = ({ id, repository, tag }) => {
  const cleanRepository = (repository || '').trim()
  const cleanTag = (tag || '').trim()
  const cleanId = (id || '').trim()

  if (cleanRepository && cleanRepository !== '<none>' && cleanTag && cleanTag !== '<none>') {
    return `${cleanRepository}:${cleanTag}`
  }

  if (cleanId) {
    return cleanId
  }

  if (cleanRepository && cleanRepository !== '<none>') {
    return cleanRepository
  }

  throw new Error('镜像标识不能为空')
}

const sanitizeImageReference = ({ image, repository, tag }) => {
  const imageRef = (image || (repository && tag ? `${repository}:${tag}` : '') || '').trim()

  if (!imageRef) {
    throw new Error('镜像名称不能为空')
  }

  if (!/^[A-Za-z0-9._:/@-]+$/.test(imageRef)) {
    throw new Error('镜像名称包含非法字符')
  }

  return imageRef
}

const sanitizeTargetRepository = (repository = '') => {
  const value = String(repository || '').trim().replace(/^\/+|\/+$/g, '')

  if (!value) {
    throw new Error('目标仓库名不能为空')
  }

  if (
    !/^[a-z0-9]+(?:(?:[._-]+|\/)[a-z0-9]+)*$/.test(value) ||
    value.includes('..') ||
    value.includes('//')
  ) {
    throw new Error('目标仓库名格式不正确，只能包含小写字母、数字、点、下划线、中划线和斜杠')
  }

  return value
}

const sanitizeTargetTag = (tag = '') => {
  const value = String(tag || '').trim() || 'latest'

  if (!/^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/.test(value)) {
    throw new Error('目标标签格式不正确')
  }

  return value
}

const extractDockerError = (stderr = '', stdout = '') => (stderr || stdout || '').trim()

const throwDockerRegistryError = (fallbackMessage, errorMsg, imageRef = CLOUD_REGISTRY_ALIAS_HOST) => {
  if (errorMsg.includes('HTTP response to HTTPS client') || errorMsg.includes('server gave HTTP response')) {
    throw new Error(`上传失败：当前 Docker 默认使用 HTTPS 访问 HTTP 镜像仓库，请将 ${imageRef.split('/')[0]} 配置为 insecure registry 后重试。原始错误：${errorMsg}`)
  }

  if (errorMsg.includes('no such host') || errorMsg.includes('lookup')) {
    throw new Error(`上传失败：无法解析镜像仓库地址 ${imageRef.split('/')[0]}，请检查 /etc/hosts 中的 ainet.io 映射。原始错误：${errorMsg}`)
  }

  if (errorMsg.includes('unauthorized') || errorMsg.includes('authentication') || errorMsg.includes('denied')) {
    throw new Error(`上传失败：云端镜像仓库认证失败或没有推送权限。原始错误：${errorMsg}`)
  }

  throw new Error(errorMsg || fallbackMessage)
}

const execSudoFileWithInput = (command, args = [], input = '', options = {}) =>
  new Promise((resolve) => {
    const child = spawn('sudo', [command, ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
      ...options,
    })
    let stdout = ''
    let stderr = ''
    let settled = false
    const timeout = options.timeout || 10000
    const timer = setTimeout(() => {
      if (!settled) {
        child.kill('SIGTERM')
      }
    }, timeout)

    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk) => {
      stdout += chunk
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })
    child.on('error', (error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({
        stdout: stdout.trim(),
        stderr: (stderr || error.message).trim(),
        success: false,
        error: error.message,
      })
    })
    child.on('close', (code, signal) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        success: code === 0,
        error: code === 0 ? undefined : `Command failed with code ${code}${signal ? ` (${signal})` : ''}`,
      })
    })

    child.stdin.end(input)
  })

const normalizeConsoleUrl = (consoleUrl) =>
  (consoleUrl || DEFAULT_CLOUD_CONSOLE_URL).trim().replace(/\/+$/, '') || DEFAULT_CLOUD_CONSOLE_URL

const normalizeRegistryUrl = (registryUrl, registryHost) => {
  const candidate = (registryUrl || registryHost || '').trim()
  if (!candidate) {
    throw new Error('镜像仓库地址为空')
  }

  if (candidate.startsWith('http://') || candidate.startsWith('https://')) {
    return candidate.replace(/\/+$/, '')
  }

  return `http://${candidate.replace(/\/+$/, '')}`
}

const getRegistryHost = (registryUrl, registryHost) => {
  if (registryHost) {
    return registryHost
  }

  try {
    return new URL(registryUrl).host
  } catch (_) {
    return registryUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '')
  }
}

const parseRegistryEndpoint = (registryUrl, registryHost) => {
  const normalizedRegistryUrl = normalizeRegistryUrl(registryUrl, registryHost)
  const fallbackHost = getRegistryHost(normalizedRegistryUrl, registryHost)

  try {
    const url = new URL(normalizedRegistryUrl)
    const registryPort = url.port || ''
    const isDefaultPort =
      !registryPort ||
      (url.protocol === 'http:' && registryPort === '80') ||
      (url.protocol === 'https:' && registryPort === '443')

    return {
      registryUrl: normalizedRegistryUrl,
      registryHost: fallbackHost,
      registryHostname: url.hostname,
      registryAlias: isDefaultPort ? CLOUD_REGISTRY_ALIAS_HOST : `${CLOUD_REGISTRY_ALIAS_HOST}:${registryPort}`,
    }
  } catch (_) {
    const [hostname, port = ''] = fallbackHost.split(':')
    return {
      registryUrl: normalizedRegistryUrl,
      registryHost: fallbackHost,
      registryHostname: hostname,
      registryAlias: port ? `${CLOUD_REGISTRY_ALIAS_HOST}:${port}` : CLOUD_REGISTRY_ALIAS_HOST,
    }
  }
}

const buildHostsContent = (currentContent, registryIp) => {
  const lines = currentContent.split(/\r?\n/)
  const nextLines = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      nextLines.push(line)
      continue
    }

    if (trimmed.includes(HOSTS_MARKER)) {
      continue
    }

    const commentIndex = line.indexOf('#')
    const contentPart = commentIndex >= 0 ? line.slice(0, commentIndex) : line
    const commentPart = commentIndex >= 0 ? line.slice(commentIndex) : ''
    const contentWithoutComment = contentPart.trim()
    const tokens = contentWithoutComment.split(/\s+/).filter(Boolean)
    if (!tokens.slice(1).includes(CLOUD_REGISTRY_ALIAS_HOST)) {
      nextLines.push(line)
      continue
    }

    const nextAliases = tokens.slice(1).filter((token) => token !== CLOUD_REGISTRY_ALIAS_HOST)
    if (nextAliases.length > 0) {
      nextLines.push(`${tokens[0]} ${nextAliases.join(' ')}${commentPart ? ` ${commentPart}` : ''}`)
    }
  }

  while (nextLines.length > 0 && nextLines[nextLines.length - 1] === '') {
    nextLines.pop()
  }

  nextLines.push(`${registryIp} ${CLOUD_REGISTRY_ALIAS_HOST} ${HOSTS_MARKER}`)
  return `${nextLines.join('\n')}\n`
}

const upsertRegistryHostsMapping = async (registryHostname) => {
  if (!isIP(registryHostname)) {
    throw new Error(`云端镜像仓库地址不是IP，无法自动写入 ${HOSTS_PATH}：${registryHostname}`)
  }

  let hostsContent = ''
  try {
    hostsContent = await fs.readFile(HOSTS_PATH, 'utf8')
  } catch (error) {
    throw new Error(`读取 ${HOSTS_PATH} 失败：${error.message}`)
  }

  const nextContent = buildHostsContent(hostsContent, registryHostname)
  if (nextContent === hostsContent) {
    return
  }

  const tempPath = path.join(os.tmpdir(), `infiniteos-hosts-${process.pid}-${Date.now()}`)
  try {
    await fs.writeFile(tempPath, nextContent, 'utf8')
    const { success, stderr, stdout } = await execSudoFile('install', ['-m', '0644', tempPath, HOSTS_PATH])
    if (!success) {
      throw new Error((stderr || stdout || '').trim() || `写入 ${HOSTS_PATH} 失败`)
    }
  } finally {
    await fs.rm(tempPath, { force: true }).catch(() => {})
  }
}

const createAuthHeader = ({ robotUsername, apiKey }) => {
  const token = Buffer.from(`${robotUsername}:${apiKey}`).toString('base64')
  return `Basic ${token}`
}

const extractHarborError = (payload, fallback) => {
  if (payload?.errors?.[0]?.message) {
    return payload.errors[0].message
  }

  if (payload?.message) {
    return payload.message
  }

  if (payload?.error) {
    return payload.error
  }

  return fallback
}

const normalizePublicProjects = (projects, privateProject = '') => {
  const privateProjectName = String(privateProject || '').trim()
  const apiProjects = Array.isArray(projects)
    ? projects
      .map((project) => String(project || '').trim())
      .filter((project) => project && project !== privateProjectName)
    : []

  return Array.from(new Set(apiProjects.length > 0 ? apiProjects : DEFAULT_PUBLIC_IMAGE_PROJECTS))
}

const ensureCloudCredentials = (credentials = {}) => {
  const consoleUrl = normalizeConsoleUrl(credentials.consoleUrl)
  const { registryUrl, registryHost, registryAlias } = parseRegistryEndpoint(
    credentials.registryUrl,
    credentials.registryHost,
  )
  const accountName = (credentials.accountName || '').trim()
  const robotUsername = (credentials.robotUsername || '').trim()
  const apiKey = (credentials.apiKey || '').trim()
  const privateProject = (credentials.privateProject || '').trim()
  const publicProjects = normalizePublicProjects(
    credentials.publicProjects,
    privateProject,
  )

  if (!robotUsername || !apiKey) {
    throw new Error('云端登录信息不完整，请先登录')
  }

  return {
    consoleUrl,
    accountName,
    registryUrl,
    registryHost,
    registryAlias,
    privateProject,
    publicProjects,
    robotUsername,
    apiKey,
    scopeSummary: credentials.scopeSummary || '',
  }
}

const getCloudProjects = (type = 'public', credentials) => {
  if (type === 'private') {
    if (!credentials.privateProject) {
      throw new Error('私有镜像项目不存在')
    }
    return [credentials.privateProject]
  }

  return credentials.publicProjects?.length ? credentials.publicProjects : DEFAULT_PUBLIC_IMAGE_PROJECTS
}

const buildUrl = (baseUrl, pathname, params = {}) => {
  const url = new URL(pathname, `${baseUrl}/`)
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  })
  return url.toString()
}

const getHarborBaseUrls = (credentials) => {
  const baseUrls = []

  try {
    baseUrls.push(normalizeRegistryUrl(credentials.registryUrl, credentials.registryHost))
  } catch (_) {}

  return Array.from(new Set(baseUrls.filter(Boolean)))
}

const fetchHarborJson = async (pathname, credentials, params = {}) => {
  let lastError = null

  for (const baseUrl of getHarborBaseUrls(credentials)) {
    const url = buildUrl(baseUrl, pathname, params)

    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          Authorization: createAuthHeader(credentials),
        },
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        const error = new Error(extractHarborError(payload, `Harbor API 请求失败：${response.status}`))
        error.status = response.status
        throw error
      }

      return payload
    } catch (error) {
      lastError = error
      console.error(`Harbor API请求失败 (${url}):`, error)
    }
  }

  throw lastError || new Error('Harbor API 请求失败')
}

const listHarborRepositories = async (credentials, project) => {
  const repositories = []

  for (let page = 1; page <= MAX_HARBOR_PAGES; page += 1) {
    const payload = await fetchHarborJson(
      `/api/v2.0/projects/${encodeURIComponent(project)}/repositories`,
      credentials,
      {
        page,
        page_size: HARBOR_PAGE_SIZE,
      },
    )
    const pageItems = Array.isArray(payload) ? payload : []
    repositories.push(...pageItems)

    if (pageItems.length < HARBOR_PAGE_SIZE) {
      break
    }
  }

  return repositories
}

const getRepositoryPath = (project, repository) => {
  const fullName = repository?.name || ''
  const prefix = `${project}/`
  if (fullName.startsWith(prefix)) {
    return fullName.slice(prefix.length)
  }

  return fullName
}

const buildRepositoryPathVariants = (repositoryPath, repositoryFullName) => {
  const rawNames = [repositoryPath, repositoryFullName].filter(Boolean)
  const variants = []

  for (const name of rawNames) {
    const encoded = encodeURIComponent(name)
    variants.push(encoded)
    variants.push(encoded.replace(/%2F/g, '%252F'))
  }

  return Array.from(new Set(variants))
}

const listHarborArtifactsWithPath = async (credentials, project, encodedRepositoryPath) => {
  const artifacts = []

  for (let page = 1; page <= MAX_HARBOR_PAGES; page += 1) {
    const payload = await fetchHarborJson(
      `/api/v2.0/projects/${encodeURIComponent(project)}/repositories/${encodedRepositoryPath}/artifacts`,
      credentials,
      {
        page,
        page_size: HARBOR_PAGE_SIZE,
        with_tag: true,
      },
    )
    const pageItems = Array.isArray(payload) ? payload : []
    artifacts.push(...pageItems)

    if (pageItems.length < HARBOR_PAGE_SIZE) {
      break
    }
  }

  return artifacts
}

const listHarborArtifacts = async (credentials, project, repositoryPath, repositoryFullName) => {
  const variants = buildRepositoryPathVariants(repositoryPath, repositoryFullName)
  let lastError = null

  for (const variant of variants) {
    try {
      return await listHarborArtifactsWithPath(credentials, project, variant)
    } catch (error) {
      lastError = error
      if (error.status !== 404) {
        throw error
      }
    }
  }

  if (lastError) {
    throw lastError
  }

  return []
}

const formatBytes = (bytes) => {
  const numericBytes = Number(bytes)
  if (!Number.isFinite(numericBytes) || numericBytes <= 0) {
    return '-'
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = numericBytes
  let index = 0

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index += 1
  }

  const rounded = value >= 100 || index === 0 ? Math.round(value) : Math.round(value * 10) / 10
  return `${rounded} ${units[index]}`
}

const buildCloudImageRows = (credentials, project, repository, artifacts) => {
  const repositoryFullName = repository.name || `${project}/${getRepositoryPath(project, repository)}`
  const registryAlias = credentials.registryAlias || CLOUD_REGISTRY_ALIAS_HOST

  return artifacts.flatMap((artifact) => {
    const tags = Array.isArray(artifact.tags) && artifact.tags.length > 0
      ? artifact.tags
      : [{ name: '-' }]

    return tags.map((tag) => {
      const tagName = tag.name || '-'
      const digest = artifact.digest || ''
      const imageRef = tagName !== '-'
        ? `${registryAlias}/${repositoryFullName}:${tagName}`
        : `${registryAlias}/${repositoryFullName}@${digest}`

      return {
        name: repositoryFullName,
        repository: repositoryFullName,
        tag: tagName,
        size: formatBytes(artifact.size),
        digest,
        pushed: tag.push_time || artifact.push_time || artifact.update_time || repository.update_time || '-',
        project,
        registry: registryAlias,
        image: imageRef,
      }
    })
  })
}

export const getLocalImages = async () => {
  const runtime = await checkContainerRuntime()
  if (!runtime) {
    return []
  }

  const { stdout, success, stderr } = await execSudoFile(runtime, ['images', '--format', 'json'], {
    timeout: 20000,
  })

  if (!success) {
    throw new Error(stderr || '获取本地镜像列表失败')
  }

  return parseLocalImages(stdout).sort((a, b) => {
    const left = `${a.repository}:${a.tag}`
    const right = `${b.repository}:${b.tag}`
    return left.localeCompare(right)
  })
}

export const deleteLocalImage = async (image) => {
  const runtime = await checkContainerRuntime()
  if (!runtime) {
    throw new Error('未找到 Docker')
  }

  const imageRef = buildLocalImageReference(image)
  const { success, stderr, stdout } = await execSudoFile(runtime, ['rmi', imageRef], {
    timeout: 120000,
  })

  if (!success) {
    throw new Error((stderr || stdout || '').trim() || '删除镜像失败')
  }

  return { message: '删除成功' }
}

export const syncCloudImageToLocal = async (image) => {
  const runtime = await checkContainerRuntime()
  if (!runtime) {
    throw new Error('未找到 Docker')
  }

  const imageRef = sanitizeImageReference(image || {})
  const args = ['pull', imageRef]

  const { success, stderr, stdout } = await execSudoFile(runtime, args, {
    timeout: 10 * 60 * 1000,
    maxBuffer: 20 * 1024 * 1024,
  })

  if (!success) {
    const errorMsg = (stderr || stdout || '').trim()
    if (errorMsg.includes('HTTP response to HTTPS client') || errorMsg.includes('server gave HTTP response')) {
      throw new Error(`同步失败：当前运行时默认使用 HTTPS 访问 HTTP 镜像仓库，请将 ${imageRef.split('/')[0]} 配置为 insecure registry 后重试。原始错误：${errorMsg}`)
    }
    throw new Error(errorMsg || '同步云端镜像失败')
  }

  return {
    message: '同步成功',
    image: imageRef,
  }
}

export const uploadLocalImageToCloud = async (payload = {}) => {
  const runtime = await checkContainerRuntime()
  if (!runtime) {
    throw new Error('未找到 Docker')
  }

  const credentials = ensureCloudCredentials(payload)
  if (!credentials.privateProject) {
    throw new Error('私有镜像项目不存在')
  }

  const sourceImage = sanitizeImageReference({
    image: payload.sourceImage,
    repository: payload.sourceRepository,
    tag: payload.sourceTag,
  })
  const targetRepository = sanitizeTargetRepository(payload.targetRepository)
  const targetTag = sanitizeTargetTag(payload.targetTag)
  const targetImage = `${credentials.registryAlias}/${credentials.privateProject}/${targetRepository}:${targetTag}`

  const inspectResult = await execSudoFile(runtime, ['image', 'inspect', sourceImage], {
    timeout: 30000,
    maxBuffer: 2 * 1024 * 1024,
  })
  if (!inspectResult.success) {
    throw new Error(extractDockerError(inspectResult.stderr, inspectResult.stdout) || `本地镜像不存在：${sourceImage}`)
  }

  const loginResult = await execSudoFileWithInput(
    runtime,
    ['login', credentials.registryAlias, '-u', credentials.robotUsername, '--password-stdin'],
    `${credentials.apiKey}\n`,
    {
      timeout: 60000,
      maxBuffer: 2 * 1024 * 1024,
    },
  )
  if (!loginResult.success) {
    throwDockerRegistryError('登录云端镜像仓库失败', extractDockerError(loginResult.stderr, loginResult.stdout), targetImage)
  }

  const tagResult = await execSudoFile(runtime, ['tag', sourceImage, targetImage], {
    timeout: 60000,
    maxBuffer: 2 * 1024 * 1024,
  })
  if (!tagResult.success) {
    throw new Error(extractDockerError(tagResult.stderr, tagResult.stdout) || '打标签失败')
  }

  const pushResult = await execSudoFile(runtime, ['push', targetImage], {
    timeout: 10 * 60 * 1000,
    maxBuffer: 20 * 1024 * 1024,
  })
  if (!pushResult.success) {
    throwDockerRegistryError('上传云端镜像失败', extractDockerError(pushResult.stderr, pushResult.stdout), targetImage)
  }

  return {
    message: '上传成功',
    image: targetImage,
  }
}

export const loginCloudImages = async ({ consoleUrl = DEFAULT_CLOUD_CONSOLE_URL, email, password }) => {
  const normalizedConsoleUrl = normalizeConsoleUrl(consoleUrl)
  const normalizedEmail = (email || '').trim()
  const normalizedPassword = password || ''

  if (!normalizedEmail || !normalizedPassword) {
    throw new Error('用户名和密码不能为空')
  }

  const response = await fetch(`${normalizedConsoleUrl}${HARBOR_LOGIN_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      email: normalizedEmail,
      password: normalizedPassword,
    }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok || payload?.code !== 200 || !payload?.data) {
    throw new Error(extractHarborError(payload, '云端镜像登录失败'))
  }

  const data = payload.data
  const { registryUrl, registryHost, registryHostname, registryAlias } = parseRegistryEndpoint(
    data.registryUrl,
    data.registryHost,
  )
  await upsertRegistryHostsMapping(registryHostname)

  const privateProject = data.privateProject || ''

  return {
    consoleUrl: normalizedConsoleUrl,
    accountName: normalizedEmail,
    registryUrl,
    registryHost,
    registryAlias,
    privateProject,
    publicProjects: normalizePublicProjects(data.publicProjects, privateProject),
    robotUsername: data.robotUsername || '',
    apiKey: data.apiKey || '',
    scopeSummary: data.scopeSummary || '',
  }
}

export const getCloudImages = async (type = 'public', credentials) => {
  const ensuredCredentials = ensureCloudCredentials(credentials)
  const rows = []
  const projects = getCloudProjects(type, ensuredCredentials)

  for (const project of projects) {
    let repositories = []
    try {
      repositories = await listHarborRepositories(ensuredCredentials, project)
    } catch (error) {
      console.error(`获取项目 ${project} 仓库列表失败:`, error)
      continue
    }

    for (const repository of repositories) {
      const repositoryPath = getRepositoryPath(project, repository)
      try {
        const artifacts = await listHarborArtifacts(
          ensuredCredentials,
          project,
          repositoryPath,
          repository.name,
        )
        rows.push(...buildCloudImageRows(ensuredCredentials, project, repository, artifacts))
      } catch (error) {
        console.error(`获取镜像 ${repository.name || repositoryPath} 标签失败:`, error)
      }
    }
  }

  return rows.sort((a, b) => {
    const byName = a.repository.localeCompare(b.repository)
    return byName === 0 ? a.tag.localeCompare(b.tag) : byName
  })
}
