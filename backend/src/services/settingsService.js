import { readFile, writeFile, mkdir, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import YAML from 'yaml'
import { execSudo, execCommand } from '../utils/exec.js'

/**
 * 从 Rancher 风格 import manifest 中解析 Secret，提取 data.url / data.token（base64），用于构建 kubeconfig
 * @param {string} manifestBody - 多文档 YAML 字符串
 * @returns {{ server: string, token: string } | null}
 */
function extractClusterAuthFromManifest(manifestBody) {
  if (!manifestBody || typeof manifestBody !== 'string') return null
  try {
    const docs = YAML.parseAllDocuments(manifestBody)
    if (!Array.isArray(docs) || 'empty' in docs) return null
    for (const doc of docs) {
      const obj = doc.toJSON && doc.toJSON()
      if (!obj || obj.kind !== 'Secret' || !obj.data) continue
      const urlB64 = obj.data.url || obj.data.URL
      const tokenB64 = obj.data.token || obj.data.Token
      if (!urlB64) continue
      const server = Buffer.from(urlB64, 'base64').toString('utf8').trim()
      const token = tokenB64 ? Buffer.from(tokenB64, 'base64').toString('utf8').trim() : ''
      if (server && server.startsWith('http')) return { server, token }
    }
  } catch (_) { /* ignore */ }
  return null
}

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
/** 组网 CA 证书写入系统信任目录，update-ca-certificates 后生效 */
const CA_CERTIFICATES_PATH = '/usr/local/share/ca-certificates/ainet-ca.crt'

/**
 * 解析 tailscale status --json 输出，判断是否已入网
 * 登出时 BackendState=NeedsLogin、Self.Online=false、TailscaleIPs=null，仅当已登录且有 IP 才视为在线
 */
function parseTailscaleStatusJson(stdout) {
  if (!stdout || !stdout.trim()) return false
  try {
    const data = JSON.parse(stdout)
    if (data.BackendState === 'NeedsLogin' || data.BackendState === 'Stopped') return false
    if (data.Self && data.Self.Online === false) return false
    if (data.Self && data.Self.Online === true) return true
    if (typeof data.Self === 'object' && data.Self.TailscaleIPs && data.Self.TailscaleIPs.length > 0) return true
    return false
  } catch (e) {
    return false
  }
}

/**
 * 解析 tailscale status 纯文本输出，判断是否已入网
 * 登出时仅输出 "Logged out."，须先排除再判断
 */
function parseTailscaleStatusText(stdout) {
  if (!stdout || !stdout.trim()) return false
  const s = stdout.toLowerCase()
  if (s.includes('logged out') || s.includes('needs login')) return false
  if (s.includes('connected') || s.includes('logged in')) return true
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
    return parseTailscaleStatusJson(stdout)
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
  const raw = await res.json()
  const data = raw?.data ?? raw?.result ?? raw
  if (!data || typeof data !== 'object') {
    throw new Error(`组网 API 返回格式异常: 非对象 (keys: ${raw && typeof raw === 'object' ? Object.keys(raw).join(', ') : 'unknown'})`)
  }
  const loginServer =
    data.login_server ??
    data.loginServer ??
    data.headscale_url ??
    data.headscaleUrl ??
    data.server_url ??
    data.serverUrl ??
    data.server ??
    data.url
  let caCert =
    data.ca_cert ?? data.ca_crt ?? data.certificate ?? data.crt ?? data.caCert ?? data.caCertificate
  if (data.certBase64 && typeof data.certBase64 === 'string') {
    try {
      caCert = Buffer.from(data.certBase64, 'base64').toString('utf8')
    } catch (_) {
      caCert = caCert || ''
    }
  }
  const authKey =
    data.auth_key ?? data.authKey ?? data.pre_auth_key ?? data.preAuthKey ?? data.key
  if (!loginServer || !authKey) {
    throw new Error(
      `组网 API 返回缺少 login_server 或 auth_key。当前返回字段: ${Object.keys(data).join(', ')}。若为其他命名请反馈。`
    )
  }
  return { loginServer, caCert: caCert || '', authKey }
}

/**
 * 执行组网：若已在 Tailscale 网络中则直接返回在线状态；否则从 InfiniteUno 拉取配置并执行入网
 * 返回结果包含 logs 数组，便于前端展示执行日志
 * @param {Function} onLog - 可选的日志回调函数，每次添加日志时调用 (log: string) => void
 */
export async function performJoinNetwork(onLog = null) {
  const logs = []
  const pushLog = (msg) => {
    logs.push(msg)
    if (onLog && typeof onLog === 'function') {
      try {
        onLog(msg)
      } catch (e) {
        console.error('日志回调错误:', e)
      }
    }
  }

  if (await isTailscaleOnline()) {
    pushLog('[1/1] 检测到本机已在 Tailscale 网络中，无需重复组网。')
    return { ...(await getInfiniteUnoStatus()), message: '已在 Tailscale 网络中，无需重复组网', logs }
  }

  pushLog('[1/5] 检测组网状态：离线，开始执行组网流程。')

  const config = await getConfig()
  const address = (config.infiniteUno?.address || '').trim()
  const email = (config.infiniteUno?.username || '').trim()
  const password = config.infiniteUno?.password || ''
  const authKeyFromConfig = (config.infiniteUno?.authKey || '').trim()

  if (!address) throw new Error('请先配置 InfiniteUno 地址')
  if (!email || !password) throw new Error('请配置租户管理员邮箱与密码')

  const baseUrl = address.startsWith('http') ? address.replace(/\/$/, '') : `https://${address}`

  pushLog('[2/5] 调用 InfiniteUno 组网 API 获取 Headscale 配置...')
  let loginServer, caCert, authKey
  try {
    const result = await infiniteUnoNetworkJoin(baseUrl, email, password)
    loginServer = result.loginServer
    caCert = result.caCert
    authKey = result.authKey
    pushLog(`[2/5] 成功获取 login_server=${loginServer}, auth_key=***`)
  } catch (e) {
    pushLog(`[2/5] 失败: ${e.message}`)
    throw e
  }

  const authKeyToUse = authKey || authKeyFromConfig
  if (!authKeyToUse) throw new Error('未获取到 auth_key，请检查 InfiniteUno 配置或 API')

  if (caCert) {
    pushLog('[3/5] 将 CA 证书解码为 ainet-ca.crt 并写入 /usr/local/share/ca-certificates/...')
    const { writeFile: wf } = await import('fs/promises')
    const tmpPath = join(CONFIG_DIR, 'ainet-ca.crt.tmp')
    await wf(tmpPath, caCert, 'utf8')
    const { success: mkOk, stderr: mkErr } = await execSudo(`mkdir -p /usr/local/share/ca-certificates`)
    if (!mkOk) pushLog(`[3/5] 创建目录失败: ${mkErr}`)
    const { success: cpOk, stderr: cpErr } = await execSudo(`cp "${tmpPath}" ${CA_CERTIFICATES_PATH} && chmod 644 ${CA_CERTIFICATES_PATH}`)
    if (!cpOk) pushLog(`[3/5] 写入 CA 证书失败: ${cpErr}`)
    else pushLog('[3/5] ainet-ca.crt 已写入 /usr/local/share/ca-certificates/')
    const { success: updateOk, stderr: updateErr } = await execSudo('update-ca-certificates 2>/dev/null || true')
    if (updateOk) pushLog('[3/5] update-ca-certificates 已执行，证书已生效')
    else if (updateErr) pushLog(`[3/5] update-ca-certificates: ${updateErr}`)
  } else {
    pushLog('[3/5] 未返回 CA 证书，跳过证书写入。')
  }

  pushLog('[4/5] 重启 tailscaled 服务...')
  let restartOk = false
  try {
    const r = await execSudo('systemctl restart tailscaled.service 2>/dev/null || true')
    restartOk = r.success
    pushLog(r.success ? '[4/5] systemctl restart tailscaled.service 已执行' : `[4/5] systemctl: ${r.stderr || '未成功'}`)
  } catch (e) {
    pushLog(`[4/5] systemctl 异常: ${e.message}`)
  }
  if (!restartOk) {
    try {
      const r2 = await execSudo('systemctl restart tailscaled 2>/dev/null || service tailscaled restart 2>/dev/null || true')
      pushLog(r2.success ? '[4/5] tailscaled 已重启' : '[4/5] 重启未成功')
    } catch (e2) {
      pushLog(`[4/5] service 异常: ${e2.message}`)
    }
  }
  await new Promise((r) => setTimeout(r, 2000))
  pushLog('[4/5] 等待 2s 完成。')

  pushLog('[5/5] 执行 tailscale up 入网...')
  const upCmd = `tailscale up --login-server=${loginServer} --authkey=${authKeyToUse} --accept-dns=false --accept-routes=false`
  const { success, stdout, stderr } = await execSudo(upCmd)
  if (stdout) pushLog(`[5/5] stdout: ${stdout}`)
  if (stderr) pushLog(`[5/5] stderr: ${stderr}`)
  if (!success) {
    pushLog('[5/5] tailscale up 执行失败')
    throw new Error(stderr || 'tailscale up 执行失败')
  }
  pushLog('[5/5] tailscale up 执行成功。')
  pushLog('组网流程全部完成。')

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

const INFINITEUNO_JOIN_POOL_PATH = process.env.INFINITEUNO_JOIN_POOL_PATH || '/api/join-default-pool'
/** 加池执行 join 命令的超时时间（毫秒），k3s worker 加入可能较久，包括下载和安装过程 */
const JOIN_POOL_CMD_TIMEOUT = 600000 // 10 分钟，因为安装脚本可能需要下载文件并重试

/**
 * 加池：调用 InfiniteUno 获取加入 default 算力池（ai-default 集群）的节点注册命令，并在本机执行
 * 将当前设备作为 k3s worker 节点加入到 ai-default 集群
 * @param {Function} onLog - 可选的日志回调函数，每次添加日志时调用 (log: string) => void
 */
export async function performJoinPool(onLog = null) {
  // 加池能力已在 InfiniteOS 中移除；后端路由也已下线，防止被继续调用。
  throw new Error('加池功能已移除')
  const logs = []
  const pushLog = (msg) => {
    logs.push(msg)
    if (onLog && typeof onLog === 'function') {
      try {
        onLog(msg)
      } catch (e) {
        console.error('日志回调错误:', e)
      }
    }
  }
  const config = await getConfig()
  const address = (config.infiniteUno?.address || '').trim()
  const email = (config.infiniteUno?.username || '').trim()
  const password = config.infiniteUno?.password || ''

  if (!address) throw new Error('请先配置 InfiniteUno 地址')
  if (!email || !password) throw new Error('请配置租户管理员邮箱与密码')

  // 强制检查 Tailscale 连接状态，未连接则直接报错
  pushLog('[0/3] 检查 Tailscale 连接状态...')
  const isOnline = await isTailscaleOnline()
  if (!isOnline) {
    pushLog('[0/3] Tailscale 未连接，无法加池。')
    throw new Error('本机未加入 Tailscale 网络。请先完成「组网」加入 Tailscale，确保本机有 100.x.x.x 地址并能访问集群后再点加池。')
  }
  let tailscaleIp = null
  try {
    tailscaleIp = await getTailscaleIp()
    if (!tailscaleIp) {
      pushLog('[0/3] 未检测到本机 Tailscale IP。')
      throw new Error('本机未获取到 Tailscale IP（100.x.x.x）。请先完成「组网」加入 Tailscale 后再加池。')
    }
    pushLog(`[0/3] 本机 Tailscale IP: ${tailscaleIp}，连接状态正常。`)
  } catch (e) {
    if (e.message && e.message.includes('Tailscale')) throw e
    pushLog(`[0/3] 获取 Tailscale IP 时异常: ${e.message}`)
    throw new Error(`无法获取 Tailscale IP: ${e.message}。请先完成「组网」加入 Tailscale 后再加池。`)
  }

  const baseUrl = address.startsWith('http') ? address.replace(/\/$/, '') : `https://${address}`
  const joinPoolUrl = INFINITEUNO_JOIN_POOL_PATH.startsWith('http')
    ? INFINITEUNO_JOIN_POOL_PATH
    : `${baseUrl}${INFINITEUNO_JOIN_POOL_PATH}`

  pushLog('[1/3] 调用 InfiniteUno 加池 API 获取节点注册命令（加池仅执行 nodeCommand 安装脚本，不执行 kubectl）...')
  const body = { email, password }
  let res
  try {
    res = await fetch(joinPoolUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (e) {
    pushLog(`[1/3] 请求失败: ${e.message}`)
    throw new Error(`加池 API 请求失败: ${e.message}`)
  }

  if (!res.ok) {
    const text = await res.text()
    pushLog(`[1/3] API 返回 ${res.status}: ${text.slice(0, 200)}`)
    throw new Error(`加池 API 返回 ${res.status}: ${text.slice(0, 200)}`)
  }

  const raw = await res.json()
  // API 返回格式: { code, message, data: { nodeCommand, insecureCommand, manifestUrl, poolName, k8sCluster, ... } }
  const data = raw?.data ?? raw?.result ?? raw
  const manifestUrl = (data && typeof data === 'object') ? (data.manifestUrl || data.manifest_url) : null
  const clusterServerFromApi = (data && typeof data === 'object')
    ? (data.clusterServer || data.apiServer || data.cluster_server || data.api_server || data.server || '').trim() || null
    : null

  const nodeCmd = (data && typeof data === 'object' && typeof data.nodeCommand === 'string') ? data.nodeCommand.trim() : ''
  const insecureCmd = (data && typeof data === 'object' && typeof data.insecureCommand === 'string') ? data.insecureCommand.trim() : ''
  // 本 API：nodeCommand 为安装脚本（system-agent-install.sh | sh），insecureCommand 为 kubectl apply；优先使用 nodeCommand，无需 kubeconfig
  const isNodeCommandInstallScript = nodeCmd && nodeCmd.includes('system-agent-install.sh')
  const cmd = isNodeCommandInstallScript
    ? nodeCmd
    : (nodeCmd || insecureCmd || (data && typeof data === 'object' && data.command) || (typeof raw === 'string' ? raw : null))
  const cmdTrimmed = typeof cmd === 'string' ? cmd.trim() : ''

  if (!cmdTrimmed) {
    pushLog('[1/3] 响应中未找到节点注册命令 (nodeCommand/insecureCommand)')
    throw new Error('未获取到节点注册命令，请检查 InfiniteUno 返回格式')
  }

  if (cmdTrimmed.includes('kubectl') && !isNodeCommandInstallScript) {
    pushLog('[1/3] API 未返回 nodeCommand（安装脚本），仅含 kubectl 方式，本机无法直接连接集群 API。')
    throw new Error(
      '加池 API 未返回 nodeCommand（含 system-agent-install.sh 的安装脚本）。请确认服务端返回 nodeCommand；或在本机配置好集群 kubeconfig 后再试。'
    )
  }

  if (isNodeCommandInstallScript) pushLog('[1/3] 已选用 nodeCommand（安装脚本），将直接执行，无需 kubeconfig。')

  // 仅当可能走 kubectl 路径时才做 manifest 预检查；选用 nodeCommand 时不需要
  let manifestBody = null
  if (!isNodeCommandInstallScript && manifestUrl && typeof manifestUrl === 'string' && manifestUrl.trim()) {
    pushLog('[2/3] 预检查：拉取 manifest 地址（加池使用 Tailscale 网络）...')
    const tailscaleHint = '本机无法通过 Tailscale 访问集群地址。请先完成「组网」加入 Tailscale，确保本机有 100.x.x.x 地址并能访问该集群后再点加池。'
    try {
      const result = await execCommand(`curl -k -sL --connect-timeout 10 --max-time 15 "${manifestUrl.trim().replace(/"/g, '\\"')}"`, { timeout: 20000 })
      const preBody = result.stdout || ''
      if (!result.success || !preBody.trim()) {
        pushLog(`[2/3] 预检查失败: 无法拉取 manifest（${result.stderr || '连接超时或失败'}）。${tailscaleHint}`)
        throw new Error(tailscaleHint)
      }
      const first = preBody.trim().slice(0, 50)
      if (first.startsWith('<') || first.toLowerCase().startsWith('<!')) {
        pushLog(`[2/3] 预检查失败: 拉取到的是 HTML 而非 YAML。${tailscaleHint}`)
        throw new Error(tailscaleHint)
      }
      manifestBody = preBody
      pushLog('[2/3] 预检查通过：manifest 已拉取，将用该内容执行 kubectl apply（不再在 sudo 下执行 curl）。')
    } catch (e) {
      if (e.message && e.message.includes('Tailscale')) throw e
      pushLog(`[2/3] 预检查异常: ${e.message}`)
      throw new Error(tailscaleHint)
    }
  }

  let success, stdout, stderr
  const wouldRunKubectl = manifestBody && cmdTrimmed.includes('kubectl')
  if (wouldRunKubectl) {
    pushLog('[2/3] 当前仅获取到 kubectl 注册方式，本机无法连接集群 API，已禁用 kubectl 执行。')
    throw new Error(
      '加池必须使用安装脚本（nodeCommand）。API 未返回有效的 data.nodeCommand（含 system-agent-install.sh），或请求未带 nodeIp。' +
      '请确认：1) 本机已组网（有 Tailscale IP）；2) 服务端 join API 在请求体含 nodeIp 时返回 data.nodeCommand。'
    )
  }

  {
    let runCmd = (typeof cmd === 'string' ? cmd : '').trim() || cmdTrimmed
    if (runCmd.includes('kubectl')) {
      pushLog('[2/3] 当前命令为 kubectl 方式，本机无法连接集群 API，已拒绝执行。')
      throw new Error(
        '加池未使用安装脚本（nodeCommand）。请确认：1) 服务端 join API 返回的 data.nodeCommand 含 system-agent-install.sh；2) 请求体已带 nodeIp（Tailscale IP）。'
      )
    }
    const isNodeCommand = runCmd.includes('system-agent-install.sh') || (runCmd.includes('curl') && runCmd.includes('|') && runCmd.includes(' sh '))
    if (isNodeCommand) {
      pushLog('[2/3] 使用 nodeCommand（安装脚本），无需 kubeconfig，正在本机执行...')
      // 提取服务器地址用于连接测试
      const serverMatch = runCmd.match(/--server\s+([^\s]+)/)
      if (serverMatch) {
        const serverUrl = serverMatch[1]
        pushLog(`[2/3] 预检查：测试服务器连接 ${serverUrl}...`)
        try {
          const testResult = await execCommand(`curl -k -sL --connect-timeout 10 --max-time 15 "${serverUrl}/healthz" -o /dev/null -w "%{http_code}"`, { timeout: 20000 })
          if (testResult.success && testResult.stdout && testResult.stdout.trim() === '200') {
            pushLog('[2/3] 服务器连接测试通过，可以开始安装。')
          } else {
            pushLog(`[2/3] 警告: 服务器连接测试返回 ${testResult.stdout || '失败'}，但将继续尝试安装（安装脚本会自动重试）。`)
          }
        } catch (e) {
          pushLog(`[2/3] 警告: 服务器连接测试失败（${e.message}），但将继续尝试安装（安装脚本会自动重试）。`)
        }
      }
      pushLog('[2/3] 提示: 安装过程可能需要几分钟，包括下载文件、重试等步骤，请耐心等待...')
    }
    if (!isNodeCommand) pushLog('[2/3] 已获取注册命令，正在本机执行（将当前节点加入 ai-default 集群）...')
    if (runCmd.includes('kubectl')) {
      pushLog('[2/3] 拒绝执行：命令含 kubectl，加池仅支持 nodeCommand 安装脚本。')
      throw new Error('加池仅支持安装脚本（nodeCommand），当前命令含 kubectl 已拒绝执行。请确认通过测试环境 8090 访问并重启 3001 后端。')
    }
    
    // 如果命令包含 curl 但没有 -k 或 --insecure，添加 -k 参数以跳过 SSL 证书验证
    if (runCmd.includes('curl') && !runCmd.includes(' -k ') && !runCmd.includes(' --insecure ') && !runCmd.match(/\bcurl\s+-[a-zA-Z]*k/) && !runCmd.includes('curl --insecure')) {
      // 在 curl 后添加 -k 参数（处理 curl -fL、curl -sfL、curl -f -L 等情况）
      // 查找 curl 后面第一个 URL（http:// 或 https://）或管道符的位置，在这之前插入 -k
      const curlIndex = runCmd.indexOf('curl')
      if (curlIndex !== -1) {
        // 找到 curl 后面的部分
        const afterCurl = runCmd.substring(curlIndex + 4) // 'curl' 是 4 个字符
        // 查找第一个 URL 或管道符的位置
        const urlMatch = afterCurl.match(/\s+(https?:\/\/|\|)/)
        if (urlMatch) {
          // 在 URL 或管道符前插入 -k
          const insertPos = curlIndex + 4 + urlMatch.index
          runCmd = runCmd.substring(0, insertPos) + ' -k' + runCmd.substring(insertPos)
        } else {
          // 如果没有找到 URL 或管道符，直接在 curl 后添加 -k
          runCmd = runCmd.substring(0, curlIndex + 4) + ' -k' + runCmd.substring(curlIndex + 4)
        }
        pushLog('[2/3] 已为 curl 命令添加 -k 参数以跳过 SSL 证书验证（自签名证书）。')
      }
    }
    
    // 如果命令包含 system-agent-install.sh 但没有指定角色参数，添加 --worker 参数
    if (runCmd.includes('system-agent-install.sh') && 
        !runCmd.includes('--worker') && 
        !runCmd.includes('--controlplane') && 
        !runCmd.includes('--etcd') && 
        !runCmd.includes('--all-roles') &&
        !runCmd.includes('CATTLE_ROLE_WORKER') &&
        !runCmd.includes('CATTLE_ROLE_CONTROLPLANE') &&
        !runCmd.includes('CATTLE_ROLE_ETCD')) {
      // 在 sh -s - 之后添加 --worker 参数（通常在管道符 | sudo sh -s - 或 | sh -s - 之后）
      const shMatch = runCmd.match(/\|\s*(sudo\s+)?sh\s+-s\s+-/)
      if (shMatch) {
        const insertPos = shMatch.index + shMatch[0].length
        runCmd = runCmd.substring(0, insertPos) + ' --worker' + runCmd.substring(insertPos)
        pushLog('[2/3] 已为安装脚本添加 --worker 参数（节点将作为 worker 加入集群）。')
      } else {
        // 如果没有找到 | sh -s -，尝试在命令末尾添加
        runCmd = runCmd.trim() + ' --worker'
        pushLog('[2/3] 已为安装脚本添加 --worker 参数（节点将作为 worker 加入集群）。')
      }
    }
    
    // 用 env 包裹整个命令，注入 Tailscale IP 作为节点管理地址
    // 必须在 -k 和 --worker 注入完成后再包裹，避免破坏引号结构
    if (tailscaleIp && isNodeCommand) {
      runCmd = `env CATTLE_ADDRESS=${tailscaleIp} CATTLE_INTERNAL_ADDRESS=${tailscaleIp} sh -c '${runCmd.replace(/'/g, "'\\''")}'`
      pushLog(`[2/3] 注入 Tailscale IP ${tailscaleIp} 作为节点管理地址（CATTLE_ADDRESS/CATTLE_INTERNAL_ADDRESS）。`)
    }
    const result = await execSudo(runCmd, { timeout: JOIN_POOL_CMD_TIMEOUT })
    success = result.success
    stdout = result.stdout
    stderr = result.stderr
    
    // 检查 stderr 中是否有 kubectl 相关的错误（安装脚本内部可能调用 kubectl 进行验证）
    const hasKubectlError = stderr && (
      stderr.includes("invalid character '<'") ||
      stderr.includes("couldn't get current server API group list") ||
      stderr.includes("unable to recognize") ||
      stderr.includes("memcache.go")
    )
    
    // 如果脚本执行成功（退出码 0），但 stderr 中有 kubectl 错误，说明是 kubectl 验证失败
    // 这可能是因为 Tailscale 连接问题，但安装脚本的主要步骤可能已成功
    if (success && hasKubectlError) {
      pushLog('[3/3] 安装脚本执行完成，但检测到 kubectl 验证错误（可能是 Tailscale 连接问题，不影响主要安装流程）。')
      pushLog('[3/3] 提示: 如果节点已成功加入集群，可忽略这些 kubectl 错误。')
    }
  }
  if (stdout) pushLog(`[3/3] stdout: ${stdout}`)
  if (stderr) {
    // 过滤掉 kubectl 相关的错误信息，避免日志过长
    const filteredStderr = stderr
      .split('\n')
      .filter(line => {
        // 保留非 kubectl 错误，或重要的错误信息
        if (!line.includes('memcache.go') && 
            !line.includes("invalid character '<'") && 
            !line.includes("couldn't get current server API group list") &&
            !line.includes('unable to recognize "STDIN"')) {
          return true
        }
        // 如果是 kubectl 错误，只保留第一条作为示例
        return false
      })
      .join('\n')
    if (filteredStderr.trim()) {
      pushLog(`[3/3] stderr: ${filteredStderr}`)
    } else if (stderr.includes("invalid character '<'") || stderr.includes("couldn't get current server API group list")) {
      pushLog('[3/3] stderr: [已过滤 kubectl 连接错误，详见下方提示]')
    }
  }
  if (!success) {
    pushLog('[3/3] 执行失败')
    let errMsg = stderr || stdout || '加池命令执行失败'
    if ((errMsg && errMsg.includes("invalid character '<'")) || (errMsg && errMsg.includes("couldn't get current server API group list"))) {
      const hint = '安装脚本执行时，kubectl 连接到的地址返回了 HTML 而非 K8s API。这通常是因为：1) 本机无法通过 Tailscale 访问集群 API 地址；2) 集群 API 地址配置不正确。\n\n请确认：1) 本机已加入 Tailscale 并能访问 100.x.x.x；2) 可以通过 Tailscale IP 访问集群 API（如 https://100.93.0.34:31564）；3) 如果问题持续，请联系管理员检查集群配置。'
      pushLog(`[3/3] 提示: ${hint}`)
      errMsg = `${errMsg}\n\n${hint}`
    }
    throw new Error(errMsg)
  }
  pushLog('[3/3] 加池命令执行成功。')
  pushLog('加池流程完成，当前节点已加入 default 算力池（ai-default 集群）。')

  // 加池后获取状态时，如果 kubectl 失败则忽略，避免因 kubectl 连接问题影响加池结果
  let status = {}
  try {
    status = await getInfiniteUnoStatus()
  } catch (e) {
    pushLog(`[3/3] 注意: 获取集群状态时出错（可能因 kubectl 连接问题，不影响加池结果）: ${e.message}`)
    // 即使获取状态失败，也返回基本状态
    status = {
      registration: 'success',
      network: 'online',
      pool: 'in', // 假设加池成功
      config: {
        address: config.infiniteUno?.address || '',
        username: config.infiniteUno?.username || '',
        hasPassword: !!(config.infiniteUno?.password),
        hasAuthKey: !!(config.infiniteUno?.authKey),
      },
    }
  }

  return { ...status, message: '加池成功，节点已加入 ai-default 集群', logs }
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
    if (success && stdout && stdout.trim()) {
      // 检查返回的是否为 JSON（而非 HTML 错误页面）
      const firstChar = stdout.trim()[0]
      if (firstChar === '{' || firstChar === '[') {
        try {
          const data = JSON.parse(stdout)
          const inDefault = (data.items || []).some(
            (n) => n.metadata?.name === hostname || (n.metadata?.name && n.metadata.name.includes(hostname))
          )
          pool = inDefault ? 'in' : 'out'
        } catch (parseError) {
          // JSON 解析失败，可能是返回了 HTML 或其他格式
          // 静默处理，保持 pool = 'out'
        }
      }
      // 如果返回的是 HTML（以 < 开头），则静默处理，保持 pool = 'out'
    }
  } catch (e) {
    // 静默处理 kubectl 错误（可能是 Tailscale 未连接或集群不可达）
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
