import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSudo, execCommand } from '../utils/exec.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CONFIG_DIR = process.env.SETTINGS_CONFIG_DIR || join(__dirname, '../../data/settings')
const CONFIG_FILE = join(CONFIG_DIR, 'settings.json')
const LICENSE_FILE = join(CONFIG_DIR, 'license.json')

const DEFAULT_CONFIG = {
  infiniteUno: {
    address: 'https://infinite.ainet.uno',
    username: '',
    password: '',
    authKey: '',
  },
  nodeType: 'edge', // cloud | edge | endpoint
}

/**
 * 确保配置目录存在
 */
async function ensureConfigDir() {
  try {
    if (!existsSync(CONFIG_DIR)) {
      await mkdir(CONFIG_DIR, { recursive: true })
    }
  } catch (e) {
    console.warn('Settings: cannot create config dir, using in-memory fallback:', e.message)
  }
}

/**
 * 读取配置
 */
export async function getConfig() {
  await ensureConfigDir()
  try {
    const raw = await readFile(CONFIG_FILE, 'utf8')
    const data = JSON.parse(raw)
    return { ...DEFAULT_CONFIG, ...data }
  } catch (e) {
    if (e.code === 'ENOENT') return { ...DEFAULT_CONFIG }
    console.error('Settings getConfig:', e)
    return { ...DEFAULT_CONFIG }
  }
}

/**
 * 写入配置（只更新提供的字段）
 */
export async function setConfig(updates) {
  await ensureConfigDir()
  const current = await getConfig()
  const next = {
    ...current,
    ...(updates.infiniteUno && { infiniteUno: { ...current.infiniteUno, ...updates.infiniteUno } }),
    ...(updates.nodeType !== undefined && { nodeType: updates.nodeType }),
  }
  await writeFile(CONFIG_FILE, JSON.stringify(next, null, 2), 'utf8')
  return next
}

/** Tailscale 证书目录（需 root 写入） */
const TAILSCALE_CA_PATH = '/etc/tailscale/ca.crt'

/**
 * 解析 tailscale status --json 输出，判断是否已入网
 */
function parseTailscaleStatusJson(stdout) {
  if (!stdout || !stdout.trim()) return false
  try {
    const data = JSON.parse(stdout)
    if (data.Self && data.Self.Online === true) return true
    if (data.BackendState === 'Running' && data.Self) return true
    if (typeof data.Self === 'object' && data.Self.TailscaleIPs && data.Self.TailscaleIPs.length > 0) return true
    if (data.Status && (data.Status === 'Running' || data.Status === 'Started')) return true
    if (data.Self && (data.Self.HostName || data.Self.DNSName)) return true
    return false
  } catch (e) {
    return false
  }
}

/**
 * 解析 tailscale status 纯文本输出，判断是否已入网
 * 表格格式为多行，每行含 100.x.x.x（Tailscale 网段）
 */
function parseTailscaleStatusText(stdout) {
  if (!stdout || !stdout.trim()) return false
  const s = stdout.toLowerCase()
  if (s.includes('connected') || s.includes('logged in') || s.includes('running')) return true
  if (s.includes('100.') && (s.includes('tx') || s.includes('rx') || s.includes('#') || s.includes('linux') || s.includes('user-'))) return true
  if (/100\.\d+\.\d+\.\d+/.test(stdout)) return true
  return false
}

/** 可能存在的 tailscale 可执行路径（后端由 systemd 等启动时 PATH 可能不包含 tailscale） */
const TAILSCALE_CMDS = process.env.TAILSCALE_CMD ? [process.env.TAILSCALE_CMD] : ['tailscale', '/usr/bin/tailscale']

/**
 * 检测当前是否已加入 Tailscale 网络（已在线则无需重复组网）
 * 依次尝试多个命令路径及当前用户/sudo，兼容不同安装与运行环境
 */
async function isTailscaleOnline() {
  const tryJson = async (execFn, cmd) => {
    const { stdout } = await execFn(`${cmd} status --json 2>/dev/null || true`)
    if (!stdout || !stdout.trim()) return false
    if (parseTailscaleStatusJson(stdout)) return true
    if (stdout.includes('BackendState') && stdout.includes('Running') && stdout.includes('TailscaleIPs')) return true
    return false
  }
  const tryText = async (execFn, cmd) => {
    const { stdout, success } = await execFn(`${cmd} status 2>/dev/null || true`)
    return !!(success && stdout && parseTailscaleStatusText(stdout))
  }

  for (const cmd of TAILSCALE_CMDS) {
    if (await tryJson(execCommand, cmd)) return true
    if (await tryText(execCommand, cmd)) return true
    if (await tryJson(execSudo, cmd)) return true
    if (await tryText(execSudo, cmd)) return true
  }
  return false
}

const INFINITEUNO_NETWORK_JOIN_PATH = process.env.INFINITEUNO_NETWORK_JOIN_PATH || '/api/network/join'

/**
 * 调用 InfiniteUno 组网 API，获取 Headscale 地址、CA 证书、auth key
 * API: POST https://infinite.ainet.uno/api/network/join
 */
async function infiniteUnoNetworkJoin(baseUrl, email, password) {
  const path = INFINITEUNO_NETWORK_JOIN_PATH.startsWith('http') ? INFINITEUNO_NETWORK_JOIN_PATH : `${baseUrl}${INFINITEUNO_NETWORK_JOIN_PATH}`
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`组网 API 请求失败: ${res.status} ${text}`)
  }
  const data = await res.json()
  const loginServer = data.login_server || data.headscale_url || data.server_url || data.url
  const caCert = data.ca_cert || data.ca_crt || data.certificate || data.crt
  const authKey = data.auth_key || data.authKey
  if (!loginServer || !authKey) {
    throw new Error('组网 API 返回缺少 login_server 或 auth_key')
  }
  return { loginServer, caCert: caCert || '', authKey }
}

/**
 * 执行组网：若已在 Tailscale 网络中则直接返回在线状态；否则从 InfiniteUno 拉取配置并执行入网
 * 返回结果包含 logs 数组，便于前端展示执行日志
 */
export async function performJoinNetwork() {
  const logs = []

  if (await isTailscaleOnline()) {
    logs.push('[1/1] 检测到本机已在 Tailscale 网络中，无需重复组网。')
    return { ...(await getInfiniteUnoStatus()), message: '已在 Tailscale 网络中，无需重复组网', logs }
  }

  logs.push('[1/5] 检测组网状态：离线，开始执行组网流程。')

  const config = await getConfig()
  const address = (config.infiniteUno?.address || '').trim()
  const email = (config.infiniteUno?.username || '').trim()
  const password = config.infiniteUno?.password || ''
  const authKeyFromConfig = (config.infiniteUno?.authKey || '').trim()

  if (!address) throw new Error('请先配置 InfiniteUno 地址')
  if (!email || !password) throw new Error('请配置租户管理员邮箱与密码')

  const baseUrl = address.startsWith('http') ? address.replace(/\/$/, '') : `https://${address}`

  logs.push('[2/5] 调用 InfiniteUno 组网 API 获取 Headscale 配置...')
  let loginServer, caCert, authKey
  try {
    const result = await infiniteUnoNetworkJoin(baseUrl, email, password)
    loginServer = result.loginServer
    caCert = result.caCert
    authKey = result.authKey
    logs.push(`[2/5] 成功获取 login_server=${loginServer}, auth_key=***`)
  } catch (e) {
    logs.push(`[2/5] 失败: ${e.message}`)
    throw e
  }

  const authKeyToUse = authKey || authKeyFromConfig
  if (!authKeyToUse) throw new Error('未获取到 auth_key，请检查 InfiniteUno 配置或 API')

  if (caCert) {
    logs.push('[3/5] 写入 CA 证书并更新...')
    const { writeFile: wf } = await import('fs/promises')
    const tmpPath = join(CONFIG_DIR, 'tailscale-ca.crt.tmp')
    await wf(tmpPath, caCert, 'utf8')
    const { success: mkOk, stderr: mkErr } = await execSudo(`mkdir -p /etc/tailscale`)
    const { success: cpOk, stderr: cpErr } = await execSudo(`cp ${tmpPath} ${TAILSCALE_CA_PATH} && chmod 644 ${TAILSCALE_CA_PATH}`)
    if (!cpOk) logs.push(`[3/5] 写入 CA 证书: stderr=${cpErr}`)
    else logs.push('[3/5] CA 证书已写入 /etc/tailscale/ca.crt')
  } else {
    logs.push('[3/5] 未返回 CA 证书，跳过证书写入。')
  }

  logs.push('[4/5] 重启 tailscaled 服务...')
  let restartOk = false
  try {
    const r = await execSudo('systemctl restart tailscaled 2>/dev/null || true')
    restartOk = r.success
    logs.push(r.success ? '[4/5] systemctl restart tailscaled 已执行' : `[4/5] systemctl: ${r.stderr || '未成功'}`)
  } catch (e) {
    logs.push(`[4/5] systemctl 异常: ${e.message}`)
  }
  if (!restartOk) {
    try {
      const r2 = await execSudo('service tailscaled restart 2>/dev/null || true')
      logs.push(r2.success ? '[4/5] service tailscaled restart 已执行' : '[4/5] service 未成功')
    } catch (e2) {
      logs.push(`[4/5] service 异常: ${e2.message}`)
    }
  }
  await new Promise((r) => setTimeout(r, 2000))
  logs.push('[4/5] 等待 2s 完成。')

  logs.push('[5/5] 执行 tailscale up 入网...')
  const envExtra = caCert ? `TS_EXTRA_CA_CERTS=${TAILSCALE_CA_PATH} ` : ''
  const upCmd = `${envExtra}tailscale up --login-server=${loginServer} --authkey=${authKeyToUse} --accept-dns=false`
  const { success, stdout, stderr } = await execSudo(upCmd)
  if (stdout) logs.push(`[5/5] stdout: ${stdout}`)
  if (stderr) logs.push(`[5/5] stderr: ${stderr}`)
  if (!success) {
    logs.push('[5/5] tailscale up 执行失败')
    throw new Error(stderr || 'tailscale up 执行失败')
  }
  logs.push('[5/5] tailscale up 执行成功。')
  logs.push('组网流程全部完成。')

  return { ...(await getInfiniteUnoStatus()), message: '组网成功', logs }
}

/**
 * 离网：执行 tailscale logout，使本机退出 Tailscale 网络
 */
export async function performLeaveNetwork() {
  const cmd = TAILSCALE_CMDS[0]
  const { success, stderr } = await execSudo(`${cmd} logout 2>/dev/null || true`)
  if (!success && stderr) {
    throw new Error(stderr || 'tailscale logout 执行失败')
  }
  return { ...(await getInfiniteUnoStatus()), message: '已离网' }
}

/**
 * 获取 InfiniteUno 相关状态（注册、组网、算力池）
 * 注册状态：是否已从 InfiniteUno 成功获取 Headscale 认证信息（此处用配置存在+可达性模拟）
 * 组网状态：Tailscale 是否在线
 * 算力池状态：当前节点是否在 default 集群中
 */
export async function getInfiniteUnoStatus() {
  const config = await getConfig()
  const address = (config.infiniteUno?.address || '').trim()

  let registration = 'unregistered'
  if (address) {
    try {
      const controller = new AbortController()
      const t = setTimeout(() => controller.abort(), 5000)
      const res = await fetch(`http://${address.replace(/^https?:\/\//, '').replace(/\/$/, '')}/health`, {
        signal: controller.signal,
      }).catch(() => null)
      clearTimeout(t)
      registration = res && res.ok ? 'success' : 'failed'
    } catch (e) {
      registration = 'failed'
    }
  }

  const network = await isTailscaleOnline() ? 'online' : 'offline'

  let pool = 'out'
  try {
    const hostname = (await execSudo('hostname')).stdout?.trim() || ''
    const { stdout, success } = await execSudo('kubectl get nodes -o json 2>/dev/null || true')
    if (success && stdout) {
      const data = JSON.parse(stdout)
      const inDefault = (data.items || []).some(
        (n) => n.metadata?.name === hostname || (n.metadata?.name && n.metadata.name.includes(hostname))
      )
      pool = inDefault ? 'in' : 'out'
    }
  } catch (e) {
    pool = 'out'
  }

  return {
    registration,
    network,
    pool,
    config: {
      address: config.infiniteUno?.address || '',
      username: config.infiniteUno?.username || '',
      hasPassword: !!(config.infiniteUno?.password),
      hasAuthKey: !!(config.infiniteUno?.authKey),
    },
  }
}

/**
 * 获取当前节点类型（来自配置或 k3s 节点标签）
 */
export async function getNodeType() {
  const config = await getConfig()
  const fromConfig = config.nodeType || 'edge'
  let fromK8s = null
  try {
    const hostname = (await execSudo('hostname')).stdout?.trim() || ''
    const { stdout, success } = await execSudo(`kubectl get node ${hostname} -o jsonpath='{.metadata.labels.nodetype}' 2>/dev/null || true`)
    if (success && stdout) fromK8s = stdout.trim() || null
  } catch (e) {}
  return fromK8s || fromConfig
}

/**
 * 设置节点类型（写配置并尝试打 k3s 节点标签）
 */
export async function setNodeType(nodeType) {
  const allowed = ['cloud', 'edge', 'endpoint']
  const value = allowed.includes(nodeType) ? nodeType : 'edge'
  await setConfig({ nodeType: value })
  try {
    const hostname = (await execSudo('hostname')).stdout?.trim() || ''
    await execSudo(`kubectl label node ${hostname} nodetype=${value} --overwrite 2>/dev/null || true`)
  } catch (e) {
    console.warn('Settings setNodeType kubectl label:', e.message)
  }
  return value
}

/**
 * 获取操作系统版本号（如 /etc/os-release 中的 VERSION_ID）
 */
async function getOsVersion() {
  try {
    const osReleasePath = '/etc/os-release'
    if (existsSync(osReleasePath)) {
      const content = await readFile(osReleasePath, 'utf8')
      const lines = content.split('\n')
      for (const line of lines) {
        const m = line.match(/^VERSION_ID=(.+)$/)
        if (m) {
          return m[1].replace(/^["']|["']$/g, '').trim()
        }
      }
      for (const line of lines) {
        const m = line.match(/^VERSION=(.+)$/)
        if (m) {
          return m[1].replace(/^["']|["']$/g, '').trim()
        }
      }
    }
  } catch (e) {}
  return null
}

/**
 * 获取授权信息（版本 + 社区/企业 + 有效期）
 * 版本取当前操作系统的版本号（/etc/os-release）
 */
export async function getLicenseInfo() {
  let version = process.env.INFINITEOS_VERSION || process.env.APP_VERSION || '1.0.0'
  const osVersion = await getOsVersion()
  if (osVersion) version = osVersion

  let edition = 'community'
  let expiry = null
  let raw = null

  try {
    if (existsSync(LICENSE_FILE)) {
      raw = await readFile(LICENSE_FILE, 'utf8')
      const data = JSON.parse(raw)
      edition = data.type === 'enterprise' ? 'enterprise' : 'community'
      expiry = data.expiry || null
    }
  } catch (e) {
    console.warn('Settings getLicenseInfo:', e.message)
  }

  return {
    version,
    edition,
    expiry,
    noExpiry: edition === 'community' || !expiry,
  }
}

/**
 * 保存上传的授权文件内容（解析 JSON 得到 type、expiry）
 */
export async function saveLicenseFile(content) {
  await ensureConfigDir()
  const data = typeof content === 'string' ? JSON.parse(content) : content
  const normalized = {
    type: data.type === 'enterprise' ? 'enterprise' : 'community',
    expiry: data.expiry || null,
    raw: data,
  }
  await writeFile(LICENSE_FILE, JSON.stringify(normalized, null, 2), 'utf8')
  return getLicenseInfo()
}
