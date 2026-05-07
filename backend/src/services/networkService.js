import { randomUUID } from 'node:crypto'
import * as fs from 'node:fs/promises'
import { isIP } from 'node:net'
import os from 'node:os'
import path from 'node:path'
import YAML from 'yaml'
import si from 'systeminformation'
import { execSudo } from '../utils/exec.js'

const NETPLAN_DIR = '/etc/netplan'
const APP_NETPLAN_FILE = `${NETPLAN_DIR}/90-infiniteos.yaml`
const CLOUD_INIT_DISABLE_FILE = '/etc/cloud/cloud.cfg.d/99-disable-network-config.cfg'
const SYS_CLASS_NET_DIR = '/sys/class/net'
const SYS_VIRTUAL_NET_DIR = '/sys/devices/virtual/net'
const VALID_INTERFACE_NAME = /^[a-zA-Z0-9_.:@-]+$/
const CONFIG_SECTIONS = {
  ethernet: 'ethernets',
  bridge: 'bridges',
  bond: 'bonds',
  vlan: 'vlans',
  wifi: 'wifis',
}
const LOGICAL_TYPES = new Set(['bridge', 'bond', 'vlan'])
const LOGICAL_DELETE_PRIORITY = {
  bridge: 0,
  vlan: 1,
  bond: 2,
}
const BOND_MODES = new Set([
  'balance-rr',
  'active-backup',
  'balance-xor',
  'broadcast',
  '802.3ad',
  'balance-tlb',
  'balance-alb',
])

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function deepMerge(target, source) {
  if (!isPlainObject(target)) return source
  if (!isPlainObject(source)) return source

  const result = { ...target }
  for (const [key, value] of Object.entries(source)) {
    if (isPlainObject(result[key]) && isPlainObject(value)) {
      result[key] = deepMerge(result[key], value)
    } else {
      result[key] = value
    }
  }
  return result
}

function mergeNetplanConfig(baseConfig, appConfig) {
  const merged = deepMerge(baseConfig, appConfig)

  if (!isPlainObject(baseConfig?.network) || !isPlainObject(appConfig?.network)) {
    return ensureNetworkSections(merged)
  }

  ensureNetworkSections(merged)
  for (const section of Object.values(CONFIG_SECTIONS)) {
    if (isPlainObject(appConfig.network[section])) {
      merged.network[section] = {
        ...(isPlainObject(baseConfig.network[section]) ? baseConfig.network[section] : {}),
        ...appConfig.network[section],
      }
    }
  }

  return merged
}

function cloneData(value) {
  return JSON.parse(JSON.stringify(value))
}

function ensureNetworkSections(config) {
  if (!isPlainObject(config.network)) {
    config.network = {}
  }

  for (const section of ['ethernets', 'bridges', 'bonds', 'vlans', 'wifis']) {
    if (!isPlainObject(config.network[section])) {
      config.network[section] = {}
    }
  }

  return config
}

function createEmptyAppNetplan(baseNetwork = {}) {
  const config = {
    network: {
      version: baseNetwork.version || 2,
      ...(baseNetwork.renderer ? { renderer: baseNetwork.renderer } : {}),
      ethernets: {},
      bridges: {},
      bonds: {},
      vlans: {},
    },
  }

  return ensureNetworkSections(config)
}

function validateInterfaceName(interfaceName) {
  if (!interfaceName || !VALID_INTERFACE_NAME.test(interfaceName)) {
    throw new Error('网络接口名称不合法')
  }
}

function normalizeNameList(items) {
  if (!Array.isArray(items)) return []

  const unique = new Set()
  for (const item of items) {
    const name = typeof item === 'string' ? item.trim() : ''
    if (!name) continue
    validateInterfaceName(name)
    unique.add(name)
  }

  return Array.from(unique)
}

function normalizeDnsList(dns) {
  if (!Array.isArray(dns)) return []

  return dns
    .map(value => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean)
}

function isValidIPv4Cidr(value) {
  if (typeof value !== 'string' || !value.includes('/')) return false

  const [address, prefix] = value.split('/')
  if (isIP(address) !== 4) return false
  if (!/^\d+$/.test(prefix)) return false

  const prefixNumber = Number(prefix)
  return prefixNumber >= 0 && prefixNumber <= 32
}

function isDefaultRouteDestination(value) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return normalized === 'default' || normalized === '0.0.0.0/0'
}

function normalizeRouteList(routes) {
  if (!Array.isArray(routes)) return []

  const unique = new Set()
  const normalizedRoutes = []

  for (const route of routes) {
    if (!isPlainObject(route)) {
      throw new Error('静态路由格式不正确')
    }

    const rawTo = typeof route.to === 'string' ? route.to.trim() : ''
    const via = typeof route.via === 'string' ? route.via.trim() : ''

    if (!rawTo && !via) continue
    if (!rawTo || !via) {
      throw new Error('静态路由需要同时填写目标网段和下一跳网关')
    }

    if (isDefaultRouteDestination(rawTo)) {
      throw new Error('默认路由请使用“网关”字段配置')
    }

    if (!isValidIPv4Cidr(rawTo)) {
      throw new Error('静态路由目标网段格式不正确，应为 IPv4/CIDR，例如 10.10.0.0/16')
    }

    if (isIP(via) !== 4) {
      throw new Error('静态路由下一跳地址格式不正确')
    }

    const normalizedRoute = {
      to: rawTo,
      via,
    }
    const routeKey = `${normalizedRoute.to}|${normalizedRoute.via}`

    if (unique.has(routeKey)) continue
    unique.add(routeKey)
    normalizedRoutes.push(normalizedRoute)
  }

  return normalizedRoutes
}

function normalizeAddressConfig(config = {}) {
  const method = config.method === 'dhcp' ? 'auto' : config.method || 'auto'
  const ip4 = typeof config.ip4 === 'string' ? config.ip4.trim() : ''
  const gateway = typeof config.gateway === 'string' ? config.gateway.trim() : ''
  const dns = normalizeDnsList(config.dns)
  const routes = normalizeRouteList(config.routes)
  const useDhcpRoutes = config.useDhcpRoutes !== false

  if (!['auto', 'static'].includes(method)) {
    throw new Error('仅支持 DHCP 或静态 IPv4 配置')
  }

  if (method === 'auto') {
    return {
      method,
      ip4: '',
      gateway: '',
      dns: [],
      routes,
      useDhcpRoutes,
    }
  }

  if (method === 'static') {
    if (!isValidIPv4Cidr(ip4)) {
      throw new Error('静态 IP 地址格式不正确，应为 IPv4/CIDR，例如 192.168.1.10/24')
    }
    if (gateway && isIP(gateway) !== 4) {
      throw new Error('网关地址格式不正确')
    }
    if (dns.some(item => isIP(item) !== 4)) {
      throw new Error('DNS 地址格式不正确')
    }
  }

  return {
    method,
    ip4,
    gateway,
    dns,
    routes,
  }
}

function normalizeLogicalConfig(targetType, config = {}) {
  const addressConfig = normalizeAddressConfig(config)

  if (targetType === 'bridge') {
    const interfaces = normalizeNameList(config.interfaces)
    if (interfaces.length === 0) {
      throw new Error('网桥至少需要选择一个成员接口')
    }

    return {
      ...addressConfig,
      interfaces,
    }
  }

  if (targetType === 'bond') {
    const interfaces = normalizeNameList(config.interfaces)
    if (interfaces.length < 2) {
      throw new Error('Bond 至少需要两个成员接口')
    }

    const bondMode = typeof config.bondMode === 'string' ? config.bondMode.trim() : 'active-backup'
    if (!BOND_MODES.has(bondMode)) {
      throw new Error('Bond 模式不合法')
    }

    return {
      ...addressConfig,
      interfaces,
      bondMode,
    }
  }

  if (targetType === 'vlan') {
    const link = typeof config.link === 'string' ? config.link.trim() : ''
    validateInterfaceName(link)

    const vlanIdValue = Number(config.vlanId)
    if (!Number.isInteger(vlanIdValue) || vlanIdValue < 1 || vlanIdValue > 4094) {
      throw new Error('VLAN ID 必须是 1 到 4094 之间的整数')
    }

    return {
      ...addressConfig,
      link,
      vlanId: vlanIdValue,
    }
  }

  throw new Error('不支持的逻辑网络类型')
}

function normalizeApplyOperation(operation) {
  if (!isPlainObject(operation)) {
    throw new Error('网络变更操作格式不正确')
  }

  const action = operation.action
  const targetType = operation.targetType
  const name = typeof operation.name === 'string' ? operation.name.trim() : ''

  if (!['upsert', 'delete'].includes(action)) {
    throw new Error('网络变更操作类型不合法')
  }

  if (!['ethernet', 'bridge', 'bond', 'vlan'].includes(targetType)) {
    throw new Error('网络对象类型不合法')
  }

  validateInterfaceName(name)

  if (action === 'delete') {
    if (!LOGICAL_TYPES.has(targetType)) {
      throw new Error('物理网卡不允许删除')
    }

    return {
      action,
      targetType,
      name,
    }
  }

  if (targetType === 'ethernet') {
    return {
      action,
      targetType,
      name,
      config: normalizeAddressConfig(operation.config),
    }
  }

  return {
    action,
    targetType,
    name,
    config: normalizeLogicalConfig(targetType, operation.config),
  }
}

function parseConfiguredIPv4(netConfig) {
  if (!Array.isArray(netConfig?.addresses)) return ''

  return netConfig.addresses.find(item => typeof item === 'string' && isValidIPv4Cidr(item)) || ''
}

function parseDefaultGateway(netConfig) {
  if (!isPlainObject(netConfig)) return ''

  if (typeof netConfig.gateway4 === 'string' && netConfig.gateway4.trim()) {
    return netConfig.gateway4.trim()
  }

  if (!Array.isArray(netConfig.routes)) return ''

  const route = netConfig.routes.find(item => (
    isPlainObject(item)
    && isDefaultRouteDestination(String(item.to || '').trim())
    && typeof item.via === 'string'
    && item.via.trim()
  ))

  return route?.via?.trim() || ''
}

function parseStaticRoutes(netConfig) {
  if (!Array.isArray(netConfig?.routes)) return []

  const routes = []

  for (const route of netConfig.routes) {
    if (!isPlainObject(route)) continue

    const to = typeof route.to === 'string' ? route.to.trim() : ''
    const via = typeof route.via === 'string' ? route.via.trim() : ''

    if (!to || !via) continue
    if (isDefaultRouteDestination(to)) continue
    if (!isValidIPv4Cidr(to) || isIP(via) !== 4) continue

    routes.push({ to, via })
  }

  return routes
}

function parseUseDhcpRoutes(netConfig) {
  if (!isPlainObject(netConfig) || netConfig.dhcp4 !== true) return true

  const overrides = netConfig['dhcp4-overrides']
  return !(isPlainObject(overrides) && overrides['use-routes'] === false)
}

function parseNameservers(netConfig) {
  const addresses = netConfig?.nameservers?.addresses
  if (!Array.isArray(addresses)) return []

  return addresses
    .filter(item => typeof item === 'string' && item.trim())
    .map(item => item.trim())
}

function parseMethod(netConfig) {
  if (!isPlainObject(netConfig)) return 'auto'
  if (netConfig.dhcp4 === true) return 'auto'
  return parseConfiguredIPv4(netConfig) ? 'static' : 'auto'
}

function buildAddressingConfig(config) {
  if (config.method === 'auto') {
    const nextConfig = { dhcp4: true }

    if (config.useDhcpRoutes === false) {
      nextConfig['dhcp4-overrides'] = { 'use-routes': false }
    }

    if (Array.isArray(config.routes) && config.routes.length > 0) {
      nextConfig.routes = config.routes.map(route => ({
        to: route.to,
        via: route.via,
      }))
    }

    return nextConfig
  }

  const nextConfig = {
    dhcp4: false,
    addresses: [config.ip4],
  }

  const routes = []
  if (config.gateway) {
    routes.push({ to: 'default', via: config.gateway })
  }

  if (Array.isArray(config.routes) && config.routes.length > 0) {
    routes.push(...config.routes.map(route => ({
      to: route.to,
      via: route.via,
    })))
  }

  if (routes.length > 0) {
    nextConfig.routes = routes
  }

  if (config.dns.length > 0) {
    nextConfig.nameservers = { addresses: config.dns }
  }

  return nextConfig
}

function buildNetplanDeviceConfig(targetType, config) {
  const addressing = buildAddressingConfig(config)

  if (targetType === 'ethernet') {
    return addressing
  }

  if (targetType === 'bridge') {
    return {
      interfaces: config.interfaces,
      ...addressing,
    }
  }

  if (targetType === 'bond') {
    return {
      interfaces: config.interfaces,
      parameters: {
        mode: config.bondMode,
      },
      ...addressing,
    }
  }

  if (targetType === 'vlan') {
    return {
      id: config.vlanId,
      link: config.link,
      ...addressing,
    }
  }

  throw new Error('不支持的网络对象类型')
}

function buildCloudInitDisableContent() {
  return `${YAML.stringify({ network: { config: 'disabled' } }).trim()}\n`
}

function buildNetplanContent(data) {
  return `${YAML.stringify(data).trim()}\n`
}

async function pathExistsAsRoot(filePath) {
  const { success } = await execSudo(`test -e ${shellQuote(filePath)}`)
  return success
}

async function readFileAsRoot(filePath) {
  const { success, stdout, stderr } = await execSudo(`cat ${shellQuote(filePath)}`)
  if (!success) {
    throw new Error(stderr || `读取文件失败: ${filePath}`)
  }
  return stdout
}

async function readOptionalFileAsRoot(filePath) {
  if (!await pathExistsAsRoot(filePath)) return null
  return readFileAsRoot(filePath)
}

async function writeFileAsRoot(filePath, content, mode = '600') {
  const tempFilePath = path.join(os.tmpdir(), `infiniteos-${randomUUID()}.tmp`)
  await fs.writeFile(tempFilePath, content, { encoding: 'utf8', mode: 0o600 })

  try {
    const { success, stderr } = await execSudo(
      `install -D -m ${mode} ${shellQuote(tempFilePath)} ${shellQuote(filePath)}`
    )
    if (!success) {
      throw new Error(stderr || `写入文件失败: ${filePath}`)
    }
  } finally {
    await fs.unlink(tempFilePath).catch(() => {})
  }
}

async function moveFileAsRoot(sourcePath, targetPath) {
  const { success, stderr } = await execSudo(
    `mkdir -p ${shellQuote(path.dirname(targetPath))} && mv ${shellQuote(sourcePath)} ${shellQuote(targetPath)}`
  )
  if (!success) {
    throw new Error(stderr || `移动文件失败: ${sourcePath} -> ${targetPath}`)
  }
}

async function removeFileAsRoot(filePath) {
  const { success, stderr } = await execSudo(`rm -f ${shellQuote(filePath)}`)
  if (!success) {
    throw new Error(stderr || `删除文件失败: ${filePath}`)
  }
}

async function restoreFileAsRoot(filePath, previousContent) {
  if (previousContent === null) {
    await removeFileAsRoot(filePath)
    return
  }

  await writeFileAsRoot(filePath, previousContent)
}

async function runNetplanCommand(command) {
  const { success, stdout, stderr } = await execSudo(`netplan ${command}`, { timeout: 30000 })
  if (!success) {
    throw new Error(stderr || stdout || `netplan ${command} 执行失败`)
  }
}

async function deleteVirtualInterfaceAsRoot(interfaceName) {
  validateInterfaceName(interfaceName)

  const { success, stderr } = await execSudo(`ip link delete dev ${shellQuote(interfaceName)}`)
  if (!success) {
    if (/Cannot find device|does not exist|not exist/i.test(stderr || '')) {
      return false
    }
    throw new Error(stderr || `删除虚拟接口失败: ${interfaceName}`)
  }

  return true
}

async function listNetplanFiles({ excludeApp = false } = {}) {
  const { success, stdout, stderr } = await execSudo(
    `find ${shellQuote(NETPLAN_DIR)} -maxdepth 1 -type f \\( -name '*.yaml' -o -name '*.yml' \\) | sort`
  )

  if (!success) {
    throw new Error(stderr || '获取 netplan 配置文件列表失败')
  }

  return stdout
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean)
    .filter(item => !(excludeApp && item === APP_NETPLAN_FILE))
}

async function listTakeoverNetplanFiles() {
  const files = await listNetplanFiles({ excludeApp: true })
  return files.filter(filePath => /(?:cloud-init|installer|subiquity)/i.test(path.basename(filePath)))
}

async function parseYamlFileAsRoot(filePath) {
  const content = await readOptionalFileAsRoot(filePath)
  if (!content) return null

  const parsed = YAML.parse(content)
  return isPlainObject(parsed) ? parsed : {}
}

async function loadMergedNetplanConfig(options = {}) {
  const files = await listNetplanFiles(options)
  let merged = {}

  for (const filePath of files) {
    const parsed = await parseYamlFileAsRoot(filePath)
    if (!parsed) continue
    merged = deepMerge(merged, parsed)
  }

  if (!isPlainObject(merged.network)) {
    merged.network = {}
  }

  return ensureNetworkSections(merged)
}

async function loadAppNetplanConfig(baseNetwork = {}) {
  const parsed = await parseYamlFileAsRoot(APP_NETPLAN_FILE)
  if (!parsed) {
    return createEmptyAppNetplan(baseNetwork)
  }

  const existingNetwork = isPlainObject(parsed.network) ? { ...parsed.network } : {}
  existingNetwork.version = existingNetwork.version || baseNetwork.version || 2
  if (!existingNetwork.renderer && baseNetwork.renderer) {
    existingNetwork.renderer = baseNetwork.renderer
  }
  parsed.network = existingNetwork

  return ensureNetworkSections(parsed)
}

function getSection(config, targetType) {
  return config.network[CONFIG_SECTIONS[targetType]]
}

function hasNetplanDefinition(name, mergedConfig) {
  return Boolean(
    mergedConfig.network.ethernets?.[name]
    || mergedConfig.network.bridges?.[name]
    || mergedConfig.network.bonds?.[name]
    || mergedConfig.network.vlans?.[name]
    || mergedConfig.network.wifis?.[name]
  )
}

function normalizeRuntimeLinkText(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

async function getRuntimeSysfsNetMap(interfaceNames = []) {
  try {
    const names = Array.isArray(interfaceNames) && interfaceNames.length > 0
      ? interfaceNames
      : await fs.readdir(SYS_CLASS_NET_DIR)

    const entries = await Promise.all(names.map(async name => {
      const interfaceName = typeof name === 'string' ? name.trim() : ''
      if (!interfaceName) return null

      const classPath = path.join(SYS_CLASS_NET_DIR, interfaceName)
      try {
        const resolvedPath = await fs.realpath(classPath)
        const normalizedResolvedPath = resolvedPath.trim()
        const virtualPath = path.join(SYS_VIRTUAL_NET_DIR, interfaceName)
        const isVirtual = normalizedResolvedPath === virtualPath
          || normalizedResolvedPath.startsWith(`${virtualPath}/`)

        return [
          interfaceName,
          {
            classPath,
            resolvedPath: normalizedResolvedPath,
            isVirtual,
            isPhysical: !isVirtual,
          },
        ]
      } catch {
        return null
      }
    }))

    return new Map(entries.filter(Boolean))
  } catch (error) {
    console.error('读取 sysfs 网卡信息失败:', error)
    return new Map()
  }
}

function getRuntimeInfoKind(runtimeLink) {
  return normalizeRuntimeLinkText(runtimeLink?.infoKind)
}

function isRuntimeBridgeLike(runtimeLink) {
  return getRuntimeInfoKind(runtimeLink) === 'bridge'
}

function isRuntimeBondLike(runtimeLink) {
  return getRuntimeInfoKind(runtimeLink) === 'bond'
}

function isRuntimeVlanLike(runtimeLink) {
  return getRuntimeInfoKind(runtimeLink) === 'vlan'
}

function isRuntimeLoopback(runtimeInterface, runtimeLink) {
  return Boolean(runtimeInterface?.internal || runtimeLink?.linkType === 'loopback')
}

function isRuntimeVirtualLike(runtimeInterface, runtimeLink) {
  if (isRuntimeLoopback(runtimeInterface, runtimeLink)) return true
  if (runtimeLink?.sysfsVirtual === true) return true
  if (runtimeLink?.sysfsPhysical === true) return false
  return Boolean(runtimeInterface?.virtual || runtimeInterface?.type === 'virtual')
}

function isRuntimePhysicalLike(runtimeInterface, runtimeLink) {
  if (!runtimeInterface && !runtimeLink) return false
  if (isRuntimeLoopback(runtimeInterface, runtimeLink)) return false
  if (runtimeLink?.sysfsPhysical === true) return true
  if (runtimeLink?.sysfsVirtual === true) return false
  if (isRuntimeBridgeLike(runtimeLink) || isRuntimeBondLike(runtimeLink) || isRuntimeVlanLike(runtimeLink)) {
    return false
  }
  if (isRuntimeVirtualLike(runtimeInterface, runtimeLink)) return false
  if (runtimeInterface?.type === 'wireless' || runtimeInterface?.type === 'wired') return true
  if (runtimeInterface && runtimeInterface.internal === false && runtimeInterface.virtual === false) return true
  return false
}

function getConfigType(name, mergedConfig, runtimeInterface, runtimeLink) {
  if (mergedConfig.network.bridges?.[name]) return 'bridge'
  if (mergedConfig.network.bonds?.[name]) return 'bond'
  if (mergedConfig.network.vlans?.[name]) return 'vlan'
  if (mergedConfig.network.wifis?.[name]) return 'wifi'
  if (mergedConfig.network.ethernets?.[name]) return 'ethernet'

  if (isRuntimeBridgeLike(runtimeLink)) return 'bridge'
  if (isRuntimeBondLike(runtimeLink)) return 'bond'
  if (isRuntimeVlanLike(runtimeLink)) return 'vlan'
  if (runtimeInterface?.type === 'wireless') return 'wifi'
  if (isRuntimePhysicalLike(runtimeInterface, runtimeLink)) return 'ethernet'
  if (runtimeInterface || runtimeLink) return 'other'
  return 'other'
}

function isEditableDevice(deviceType, runtimeInterface, runtimeLink, hasConfigDefinition = false) {
  if (deviceType === 'wifi' || deviceType === 'other') return false
  if (runtimeInterface?.internal || runtimeLink?.linkType === 'loopback') return false
  if (LOGICAL_TYPES.has(deviceType)) return hasConfigDefinition
  return true
}

function isRuntimeLogicalInterface(runtimeInterface, runtimeLink) {
  if (!runtimeInterface && !runtimeLink) return false
  if (isRuntimeBridgeLike(runtimeLink) || isRuntimeBondLike(runtimeLink) || isRuntimeVlanLike(runtimeLink)) {
    return true
  }
  return isRuntimeVirtualLike(runtimeInterface, runtimeLink)
}

function getDeviceRole(name, deviceType, runtimeInterface, runtimeLink) {
  if (LOGICAL_TYPES.has(deviceType)) return 'logical'
  if (['ethernet', 'wifi'].includes(deviceType) && !isRuntimeLogicalInterface(runtimeInterface, runtimeLink)) {
    return 'physical'
  }
  return 'system'
}

function mergeInterfaceNameLists(...items) {
  const merged = []
  const seen = new Set()

  for (const list of items) {
    if (!Array.isArray(list)) continue

    for (const item of list) {
      const name = typeof item === 'string' ? item.trim() : ''
      if (!name || seen.has(name)) continue
      seen.add(name)
      merged.push(name)
    }
  }

  return merged
}

function getLogicalExtras(name, deviceType, netConfig, runtimeLink, runtimeMasterMembers = new Map()) {
  if (deviceType === 'bridge') {
    return {
      interfaces: mergeInterfaceNameLists(netConfig?.interfaces, runtimeMasterMembers.get(name)),
      link: '',
      vlanId: undefined,
      bondMode: undefined,
    }
  }

  if (deviceType === 'bond') {
    return {
      interfaces: mergeInterfaceNameLists(netConfig?.interfaces, runtimeMasterMembers.get(name)),
      link: '',
      vlanId: undefined,
      bondMode: typeof netConfig?.parameters?.mode === 'string' ? netConfig.parameters.mode : 'active-backup',
    }
  }

  if (deviceType === 'vlan') {
    return {
      interfaces: [],
      link: typeof netConfig?.link === 'string' && netConfig.link.trim() ? netConfig.link.trim() : (runtimeLink?.linkName || ''),
      vlanId: Number.isInteger(netConfig?.id)
        ? netConfig.id
        : (Number.isInteger(runtimeLink?.vlanId) ? runtimeLink.vlanId : undefined),
      bondMode: undefined,
    }
  }

  return {
    interfaces: [],
    link: '',
    vlanId: undefined,
    bondMode: undefined,
  }
}

function getBridgeBondMemberNames(config) {
  const members = new Set()

  for (const section of ['bridges', 'bonds']) {
    for (const netConfig of Object.values(config.network?.[section] || {})) {
      const interfaces = Array.isArray(netConfig?.interfaces) ? netConfig.interfaces : []
      for (const member of interfaces) {
        if (typeof member === 'string' && member.trim()) {
          members.add(member.trim())
        }
      }
    }
  }

  return members
}

function getBridgeBondMemberOwners(config) {
  const owners = new Map()

  for (const section of ['bridges', 'bonds']) {
    for (const [ownerName, netConfig] of Object.entries(config.network?.[section] || {})) {
      const interfaces = Array.isArray(netConfig?.interfaces) ? netConfig.interfaces : []
      for (const member of interfaces) {
        if (typeof member !== 'string' || !member.trim()) continue

        const memberName = member.trim()
        if (!owners.has(memberName)) {
          owners.set(memberName, new Set())
        }
        owners.get(memberName).add(ownerName)
      }
    }
  }

  return owners
}

function normalizeLinkOperState(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function getInterfaceStatus(runtimeInterface, runtimeLink) {
  const linkOperState = normalizeLinkOperState(runtimeLink?.operstate)
  if (linkOperState === 'up') return 'up'
  if (linkOperState === 'down') return 'down'

  const runtimeOperState = normalizeLinkOperState(runtimeInterface?.operstate)
  if (runtimeOperState === 'up') return 'up'
  if (runtimeOperState === 'down') return 'down'

  const flags = new Set(
    (Array.isArray(runtimeLink?.flags) ? runtimeLink.flags : [])
      .map(flag => String(flag).trim().toUpperCase())
      .filter(Boolean)
  )

  if (flags.has('LOWER_UP') || flags.has('RUNNING')) return 'up'

  return 'down'
}

async function getRuntimeLinkMap() {
  const { success, stdout } = await execSudo('ip -json -d link show')
  if (!success || !stdout) {
    return new Map()
  }

  try {
    const links = JSON.parse(stdout)
    if (!Array.isArray(links)) return new Map()

    const normalizedLinks = links
      .filter(link => typeof link?.ifname === 'string' && link.ifname.trim())
      .map(link => ({
        ifindex: Number.isInteger(link.ifindex) ? link.ifindex : undefined,
        ifname: link.ifname.trim(),
        operstate: normalizeLinkOperState(link.operstate),
        mac: typeof link.address === 'string' ? link.address : '',
        flags: Array.isArray(link.flags) ? link.flags : [],
        linkType: normalizeRuntimeLinkText(link.link_type),
        infoKind: normalizeRuntimeLinkText(link.linkinfo?.info_kind),
        infoSlaveKind: normalizeRuntimeLinkText(link.linkinfo?.info_slave_kind),
        master: link.master,
        link: link.link,
        parentbus: typeof link.parentbus === 'string' ? link.parentbus.trim() : '',
        parentdev: typeof link.parentdev === 'string' ? link.parentdev.trim() : '',
        promiscuity: typeof link.promiscuity === 'number' ? link.promiscuity : 0,
        vlanId: Number.isInteger(link.linkinfo?.info_data?.id) ? link.linkinfo.info_data.id : undefined,
      }))

    const runtimeSysfsMap = await getRuntimeSysfsNetMap(normalizedLinks.map(link => link.ifname))

    const ifindexToName = new Map(
      normalizedLinks
        .filter(link => Number.isInteger(link.ifindex))
        .map(link => [link.ifindex, link.ifname])
    )
    const resolveLinkedName = (value) => {
      if (typeof value === 'string' && value.trim()) return value.trim()
      if (Number.isInteger(value)) return ifindexToName.get(value) || ''
      return ''
    }

    return new Map(
      normalizedLinks
        .map(link => [
          link.ifname,
          {
            classPath: runtimeSysfsMap.get(link.ifname)?.classPath || '',
            resolvedPath: runtimeSysfsMap.get(link.ifname)?.resolvedPath || '',
            sysfsVirtual: runtimeSysfsMap.get(link.ifname)?.isVirtual === true,
            sysfsPhysical: runtimeSysfsMap.get(link.ifname)?.isPhysical === true,
            ifindex: link.ifindex,
            operstate: link.operstate,
            mac: link.mac,
            flags: link.flags,
            linkType: link.linkType,
            infoKind: link.infoKind,
            infoSlaveKind: link.infoSlaveKind,
            masterName: resolveLinkedName(link.master),
            linkName: resolveLinkedName(link.link),
            parentbus: link.parentbus,
            parentdev: link.parentdev,
            promiscuity: link.promiscuity,
            vlanId: link.vlanId,
          },
        ])
    )
  } catch (error) {
    console.error('解析 ip link 输出失败:', error)
    return new Map()
  }
}

function getRuntimeMasterMembers(runtimeLinkMap) {
  const members = new Map()

  for (const [name, runtimeLink] of runtimeLinkMap) {
    const masterName = typeof runtimeLink?.masterName === 'string' ? runtimeLink.masterName.trim() : ''
    if (!masterName) continue

    if (!members.has(masterName)) {
      members.set(masterName, [])
    }
    members.get(masterName).push(name)
  }

  return members
}

function getDisplayBridgeBondMemberNames(config, runtimeLinkMap, runtimeMasterMembers) {
  const members = getBridgeBondMemberNames(config)

  for (const [ownerName, runtimeMembers] of runtimeMasterMembers) {
    const ownerLink = runtimeLinkMap.get(ownerName)
    if (!isRuntimeBridgeLike(ownerLink) && !isRuntimeBondLike(ownerLink)) continue

    for (const memberName of runtimeMembers) {
      members.add(memberName)
    }
  }

  return members
}

function buildMemberEthernetConfig(existingConfig = {}) {
  const preservedConfig = isPlainObject(existingConfig) ? { ...existingConfig } : {}

  for (const key of ['dhcp4', 'dhcp6', 'addresses', 'routes', 'nameservers', 'gateway4', 'gateway6', 'accept-ra']) {
    delete preservedConfig[key]
  }

  return {
    ...preservedConfig,
    dhcp4: false,
    dhcp6: false,
    addresses: [],
    routes: [],
    nameservers: { addresses: [] },
  }
}

function buildInterfaceSummary(
  name,
  runtimeInterface,
  runtimeLink,
  stats,
  mergedConfig,
  appConfig,
  statusOverride,
  bridgeBondMemberNames = new Set(),
  runtimeMasterMembers = new Map()
) {
  const deviceType = getConfigType(name, mergedConfig, runtimeInterface, runtimeLink)
  const role = getDeviceRole(name, deviceType, runtimeInterface, runtimeLink)
  const sectionName = CONFIG_SECTIONS[deviceType]
  const managed = sectionName ? Boolean(appConfig.network[sectionName]?.[name]) : false
  const hasConfigDefinition = sectionName ? Boolean(mergedConfig.network[sectionName]?.[name]) : false
  const configSection = mergedConfig.network[CONFIG_SECTIONS[deviceType]]
  const netConfig = isPlainObject(configSection?.[name]) ? configSection[name] : {}
  const configuredIp4 = parseConfiguredIPv4(netConfig)
  const logicalExtras = getLogicalExtras(name, deviceType, netConfig, runtimeLink, runtimeMasterMembers)
  const isBridgeOrBondMember = deviceType === 'ethernet' && bridgeBondMemberNames.has(name)

  return {
    name,
    type: deviceType,
    role,
    managed,
    editable: isEditableDevice(deviceType, runtimeInterface, runtimeLink, hasConfigDefinition),
    deletable: role === 'logical' && managed,
    mac: runtimeInterface?.mac || runtimeLink?.mac || '',
    ip4: isBridgeOrBondMember ? '' : runtimeInterface?.ip4 || configuredIp4 || '',
    ip6: isBridgeOrBondMember ? '' : runtimeInterface?.ip6 || '',
    status: statusOverride || getInterfaceStatus(runtimeInterface, runtimeLink),
    speed: runtimeInterface?.speed || 0,
    rx_bytes: stats?.rx_bytes || 0,
    tx_bytes: stats?.tx_bytes || 0,
    rx_sec: stats?.rx_sec || 0,
    tx_sec: stats?.tx_sec || 0,
    ...logicalExtras,
  }
}

async function getRuntimeGateway(interfaceName) {
  const { success, stdout } = await execSudo(`ip -4 route show default dev ${shellQuote(interfaceName)}`)
  if (!success || !stdout) return ''

  const match = stdout.match(/\bvia\s+([0-9.]+)/)
  return match?.[1] || ''
}

function resolveInventoryType(name, mergedConfig, runtimeMap, runtimeLinkMap) {
  const runtimeInterface = runtimeMap.get(name)
  const runtimeLink = runtimeLinkMap.get(name)
  return getConfigType(name, mergedConfig, runtimeInterface, runtimeLink)
}

function ensureReferencedDeviceDeclared(config, baseMergedConfig, runtimeMap, runtimeLinkMap, interfaceName) {
  const previewConfig = deepMerge(baseMergedConfig, config)
  const deviceType = resolveInventoryType(interfaceName, previewConfig, runtimeMap, runtimeLinkMap)
  const runtimeInterface = runtimeMap.get(interfaceName)
  const runtimeLink = runtimeLinkMap.get(interfaceName)

  if (deviceType === 'ethernet') {
    if (!runtimeInterface && !runtimeLink && !previewConfig.network.ethernets?.[interfaceName]) {
      throw new Error(`接口不存在: ${interfaceName}`)
    }
    if (!previewConfig.network.ethernets?.[interfaceName]) {
      config.network.ethernets[interfaceName] = {}
    }
    return
  }

  if (['bridge', 'bond', 'vlan'].includes(deviceType)) {
    return
  }

  throw new Error(`接口 ${interfaceName} 不能作为逻辑网络成员或父接口`)
}

function validateOperationTarget(operation, runtimeMap, runtimeLinkMap, baseMergedConfig, currentAppConfig) {
  const runtimeInterface = runtimeMap.get(operation.name)
  const runtimeLink = runtimeLinkMap.get(operation.name)
  const previewConfig = deepMerge(baseMergedConfig, currentAppConfig)
  const currentType = resolveInventoryType(operation.name, previewConfig, runtimeMap, runtimeLinkMap)
  const currentDefinedLogical = LOGICAL_TYPES.has(currentType)
    ? Boolean(getSection(previewConfig, currentType)?.[operation.name])
    : false
  const existsInConfig = hasNetplanDefinition(operation.name, previewConfig)
  const declaredEthernet = previewConfig.network.ethernets?.[operation.name]

  if (operation.targetType === 'ethernet') {
    if (!runtimeInterface && !runtimeLink && !declaredEthernet) {
      throw new Error(`物理网卡不存在: ${operation.name}`)
    }
    if (currentType !== 'ethernet') {
      throw new Error(`接口 ${operation.name} 不是可编辑的物理网卡`)
    }
    return
  }

  if (['bridge', 'bond', 'vlan'].includes(currentType) && currentType !== operation.targetType) {
    throw new Error(`网络 ${operation.name} 已存在，且类型为 ${currentType}，不能直接改成 ${operation.targetType}`)
  }

  if (operation.action === 'upsert' && LOGICAL_TYPES.has(currentType) && !currentDefinedLogical) {
    throw new Error(`逻辑网络 ${operation.name} 不在 netplan 配置文件中，不能直接编辑`)
  }

  if ((runtimeInterface || runtimeLink) && currentType === 'ethernet') {
    throw new Error(`物理网卡 ${operation.name} 不能作为逻辑网络名称`)
  }

  if (['wifi', 'other'].includes(currentType) && ((runtimeInterface || runtimeLink) || existsInConfig)) {
    throw new Error(`接口 ${operation.name} 不是可创建逻辑网络的对象`)
  }

  if (operation.action === 'delete' && !getSection(currentAppConfig, operation.targetType)?.[operation.name]) {
    throw new Error(`逻辑网络 ${operation.name} 不是由当前系统页面创建，不能直接删除`)
  }
}

function validateFinalTopology(finalMergedConfig, runtimeMap, runtimeLinkMap) {
  const memberOwners = new Map()
  const registerMemberOwner = (member, owner) => {
    const existingOwner = memberOwners.get(member)
    if (existingOwner && existingOwner !== owner) {
      throw new Error(`接口 ${member} 已被 ${existingOwner} 使用，不能再加入 ${owner}`)
    }
    memberOwners.set(member, owner)
  }

  for (const [bridgeName, bridgeConfig] of Object.entries(finalMergedConfig.network.bridges || {})) {
    const members = Array.isArray(bridgeConfig.interfaces) ? bridgeConfig.interfaces : []
    if (members.length === 0) {
      throw new Error(`网桥 ${bridgeName} 缺少成员接口`)
    }

    for (const member of members) {
      const memberType = resolveInventoryType(member, finalMergedConfig, runtimeMap, runtimeLinkMap)
      if (!['ethernet', 'bond', 'vlan'].includes(memberType)) {
        throw new Error(`接口 ${member} 不能加入网桥 ${bridgeName}`)
      }
      registerMemberOwner(member, bridgeName)
    }
  }

  for (const [bondName, bondConfig] of Object.entries(finalMergedConfig.network.bonds || {})) {
    const members = Array.isArray(bondConfig.interfaces) ? bondConfig.interfaces : []
    if (members.length < 2) {
      throw new Error(`Bond ${bondName} 至少需要两个成员接口`)
    }

    for (const member of members) {
      const memberType = resolveInventoryType(member, finalMergedConfig, runtimeMap, runtimeLinkMap)
      if (memberType !== 'ethernet') {
        throw new Error(`接口 ${member} 不能加入 Bond ${bondName}`)
      }
      registerMemberOwner(member, bondName)
    }
  }

  for (const [vlanName, vlanConfig] of Object.entries(finalMergedConfig.network.vlans || {})) {
    const link = typeof vlanConfig.link === 'string' ? vlanConfig.link : ''
    const linkType = resolveInventoryType(link, finalMergedConfig, runtimeMap, runtimeLinkMap)
    if (!['ethernet', 'bond'].includes(linkType)) {
      throw new Error(`接口 ${link} 不能作为 VLAN ${vlanName} 的父接口`)
    }
  }
}

async function applyManagedNetplanConfig(data, options = {}) {
  const previousAppContent = await readOptionalFileAsRoot(APP_NETPLAN_FILE)
  const previousDisableContent = await readOptionalFileAsRoot(CLOUD_INIT_DISABLE_FILE)
  const disabledNetplanFiles = Array.isArray(options.disabledNetplanFiles) ? options.disabledNetplanFiles : []
  const movedFiles = []

  try {
    await writeFileAsRoot(CLOUD_INIT_DISABLE_FILE, buildCloudInitDisableContent())
    for (const filePath of disabledNetplanFiles) {
      if (!await pathExistsAsRoot(filePath)) continue
      const disabledPath = `${filePath}.disabled-by-infiniteos`
      if (await pathExistsAsRoot(disabledPath)) {
        await removeFileAsRoot(disabledPath)
      }
      await moveFileAsRoot(filePath, disabledPath)
      movedFiles.push({ from: filePath, to: disabledPath })
    }
    await writeFileAsRoot(APP_NETPLAN_FILE, buildNetplanContent(data))
    await runNetplanCommand('generate')
    await runNetplanCommand('apply')
  } catch (error) {
    try {
      await restoreFileAsRoot(APP_NETPLAN_FILE, previousAppContent)
      await restoreFileAsRoot(CLOUD_INIT_DISABLE_FILE, previousDisableContent)
      for (const movedFile of movedFiles.slice().reverse()) {
        if (await pathExistsAsRoot(movedFile.to)) {
          await moveFileAsRoot(movedFile.to, movedFile.from)
        }
      }
      await runNetplanCommand('generate')
      await runNetplanCommand('apply')
    } catch (rollbackError) {
      console.error('回滚 netplan 配置失败:', rollbackError)
    }

    throw error
  }
}

/**
 * 获取网络接口列表
 */
export const getNetworkInterfaces = async () => {
  try {
    const [runtimeInterfaces, networkStats, mergedConfig, appConfig, runtimeLinkMap] = await Promise.all([
      si.networkInterfaces(),
      si.networkStats(),
      loadMergedNetplanConfig(),
      loadAppNetplanConfig(),
      getRuntimeLinkMap(),
    ])

    const statsMap = new Map(networkStats.map(stat => [stat.iface, stat]))
    const runtimeMap = new Map(runtimeInterfaces.map(iface => [iface.iface, iface]))
    const runtimeMasterMembers = getRuntimeMasterMembers(runtimeLinkMap)
    const bridgeBondMemberNames = getDisplayBridgeBondMemberNames(
      mergedConfig,
      runtimeLinkMap,
      runtimeMasterMembers
    )
    const bridgeBondMemberOwners = getBridgeBondMemberOwners(mergedConfig)

    const names = []
    const seen = new Set()
    const pushName = (name) => {
      if (!name || seen.has(name)) return
      seen.add(name)
      names.push(name)
    }

    runtimeInterfaces.forEach(iface => pushName(iface.iface))
    runtimeLinkMap.forEach((_, name) => pushName(name))
    for (const section of ['ethernets', 'bridges', 'bonds', 'vlans']) {
      Object.keys(mergedConfig.network[section] || {}).forEach(pushName)
    }

    return names.map(name => {
      const runtimeInterface = runtimeMap.get(name)
      const runtimeLink = runtimeLinkMap.get(name)

      let statusOverride

      if (!statusOverride && !runtimeInterface && !runtimeLink && bridgeBondMemberNames.has(name)) {
        const ownerNames = Array.from(bridgeBondMemberOwners.get(name) || [])
        const hasUpOwner = ownerNames.some(ownerName => (
          getInterfaceStatus(runtimeMap.get(ownerName), runtimeLinkMap.get(ownerName)) === 'up'
        ))
        if (hasUpOwner) {
          statusOverride = 'up'
        }
      }

      return buildInterfaceSummary(
        name,
        runtimeInterface,
        runtimeLink,
        statsMap.get(name),
        mergedConfig,
        appConfig,
        statusOverride,
        bridgeBondMemberNames,
        runtimeMasterMembers
      )
    })
  } catch (error) {
    console.error('获取网络接口错误:', error)
    throw error
  }
}

/**
 * 获取网络统计信息
 */
export const getNetworkStats = async () => {
  try {
    const networkStats = await si.networkStats()
    return networkStats.map(stat => ({
      iface: stat.iface,
      operstate: stat.operstate,
      rx_bytes: stat.rx_bytes,
      tx_bytes: stat.tx_bytes,
      rx_sec: stat.rx_sec || 0,
      tx_sec: stat.tx_sec || 0,
      rx_dropped: stat.rx_dropped || 0,
      tx_dropped: stat.tx_dropped || 0,
      rx_errors: stat.rx_errors || 0,
      tx_errors: stat.tx_errors || 0,
    }))
  } catch (error) {
    console.error('获取网络统计错误:', error)
    throw error
  }
}

/**
 * 获取网络接口详情
 */
export const getInterfaceDetails = async (interfaceName) => {
  try {
    validateInterfaceName(interfaceName)

    const [runtimeInterfaces, mergedConfig, appConfig, runtimeLinkMap] = await Promise.all([
      si.networkInterfaces(),
      loadMergedNetplanConfig(),
      loadAppNetplanConfig(),
      getRuntimeLinkMap(),
    ])

    const runtimeMap = new Map(runtimeInterfaces.map(iface => [iface.iface, iface]))
    const runtimeInterface = runtimeMap.get(interfaceName)
    const runtimeLink = runtimeLinkMap.get(interfaceName)
    const deviceType = getConfigType(interfaceName, mergedConfig, runtimeInterface, runtimeLink)

    const sectionName = CONFIG_SECTIONS[deviceType]
    const netConfig = sectionName ? mergedConfig.network[sectionName]?.[interfaceName] : null
    const hasConfigDefinition = Boolean(netConfig)
    const managed = Boolean(
      deviceType === 'ethernet'
        ? appConfig.network.ethernets?.[interfaceName]
        : sectionName
          ? appConfig.network[sectionName]?.[interfaceName]
          : false
    )

    if (!runtimeInterface && !runtimeLink && !netConfig) {
      throw new Error(`网络接口不存在: ${interfaceName}`)
    }

    const configuredIp4 = parseConfiguredIPv4(netConfig)
    const configuredGateway = parseDefaultGateway(netConfig)
    const configuredDns = parseNameservers(netConfig)
    const runtimeGateway = (runtimeInterface || runtimeLink) ? await getRuntimeGateway(interfaceName) : ''
    const runtimeMasterMembers = getRuntimeMasterMembers(runtimeLinkMap)
    const bridgeBondMemberNames = getDisplayBridgeBondMemberNames(
      mergedConfig,
      runtimeLinkMap,
      runtimeMasterMembers
    )
    const isBridgeOrBondMember = deviceType === 'ethernet' && bridgeBondMemberNames.has(interfaceName)

    return {
      name: interfaceName,
      type: deviceType,
      role: getDeviceRole(interfaceName, deviceType, runtimeInterface, runtimeLink),
      managed,
      editable: isEditableDevice(deviceType, runtimeInterface, runtimeLink, hasConfigDefinition),
      deletable: LOGICAL_TYPES.has(deviceType) && managed,
      method: isBridgeOrBondMember ? 'auto' : parseMethod(netConfig),
      ip4: isBridgeOrBondMember ? '' : configuredIp4 || runtimeInterface?.ip4 || '',
      ip6: isBridgeOrBondMember ? '' : runtimeInterface?.ip6 || '',
      gateway: isBridgeOrBondMember ? '' : configuredGateway || runtimeGateway,
      dns: isBridgeOrBondMember ? [] : configuredDns,
      routes: isBridgeOrBondMember ? [] : parseStaticRoutes(netConfig),
      useDhcpRoutes: isBridgeOrBondMember ? true : parseUseDhcpRoutes(netConfig),
      mac: runtimeInterface?.mac || runtimeLink?.mac || '',
      ...getLogicalExtras(interfaceName, deviceType, netConfig, runtimeLink, runtimeMasterMembers),
    }
  } catch (error) {
    console.error('获取网络接口详情错误:', error)
    throw error
  }
}

/**
 * 创建网络连接
 */
export const createNetworkConnection = async () => {
  throw new Error('请使用“创建网络 + 应用配置”的方式提交逻辑网络变更')
}

/**
 * 更新网络连接配置
 */
export const updateNetworkConnection = async () => {
  throw new Error('请使用“保存变更 + 应用配置”的方式提交网络配置')
}

/**
 * 应用网络变更
 */
export const applyNetworkChanges = async ({ operations = [] } = {}) => {
  try {
    const normalizedOperations = Array.isArray(operations)
      ? operations.map(normalizeApplyOperation)
      : []
    const deletedLogicalOperations = normalizedOperations
      .filter(operation => operation.action === 'delete' && LOGICAL_TYPES.has(operation.targetType))
      .sort((left, right) => (
        (LOGICAL_DELETE_PRIORITY[left.targetType] ?? 99) - (LOGICAL_DELETE_PRIORITY[right.targetType] ?? 99)
      ))
    const [runtimeInterfaces, baseMergedConfig, takeoverNetplanFiles, runtimeLinkMap] = await Promise.all([
      si.networkInterfaces(),
      loadMergedNetplanConfig({ excludeApp: true }),
      listTakeoverNetplanFiles(),
      getRuntimeLinkMap(),
    ])
    if (normalizedOperations.length === 0 && takeoverNetplanFiles.length === 0) {
      return { success: true, message: '没有需要应用的网络变更' }
    }

    const runtimeMap = new Map(runtimeInterfaces.map(iface => [iface.iface, iface]))
    const currentAppConfig = await loadAppNetplanConfig(baseMergedConfig.network)
    const nextAppConfig = cloneData(currentAppConfig)

    for (const operation of normalizedOperations) {
      validateOperationTarget(operation, runtimeMap, runtimeLinkMap, baseMergedConfig, nextAppConfig)

      if (operation.action === 'delete') {
        delete getSection(nextAppConfig, operation.targetType)[operation.name]
        continue
      }

      if (operation.targetType === 'ethernet') {
        getSection(nextAppConfig, 'ethernet')[operation.name] = buildNetplanDeviceConfig('ethernet', operation.config)
        continue
      }

      getSection(nextAppConfig, operation.targetType)[operation.name] = buildNetplanDeviceConfig(
        operation.targetType,
        operation.config
      )
    }

    for (const bridgeConfig of Object.values(nextAppConfig.network.bridges || {})) {
      const members = Array.isArray(bridgeConfig.interfaces) ? bridgeConfig.interfaces : []
      for (const member of members) {
        ensureReferencedDeviceDeclared(nextAppConfig, baseMergedConfig, runtimeMap, runtimeLinkMap, member)
      }
    }

    for (const bondConfig of Object.values(nextAppConfig.network.bonds || {})) {
      const members = Array.isArray(bondConfig.interfaces) ? bondConfig.interfaces : []
      for (const member of members) {
        ensureReferencedDeviceDeclared(nextAppConfig, baseMergedConfig, runtimeMap, runtimeLinkMap, member)
      }
    }

    for (const vlanConfig of Object.values(nextAppConfig.network.vlans || {})) {
      if (typeof vlanConfig.link === 'string' && vlanConfig.link) {
        ensureReferencedDeviceDeclared(nextAppConfig, baseMergedConfig, runtimeMap, runtimeLinkMap, vlanConfig.link)
      }
    }

    const bridgeBondMemberNames = getBridgeBondMemberNames(nextAppConfig)
    for (const member of bridgeBondMemberNames) {
      const existingConfig = nextAppConfig.network.ethernets?.[member]
      nextAppConfig.network.ethernets[member] = buildMemberEthernetConfig(existingConfig)
    }

    const finalMergedConfig = mergeNetplanConfig(baseMergedConfig, nextAppConfig)
    validateFinalTopology(finalMergedConfig, runtimeMap, runtimeLinkMap)

    const hasBaseNetplanTakeover = takeoverNetplanFiles.length > 0
    const appNetplanData = hasBaseNetplanTakeover ? finalMergedConfig : nextAppConfig

    await applyManagedNetplanConfig(appNetplanData, {
      disabledNetplanFiles: takeoverNetplanFiles,
    })

    for (const operation of deletedLogicalOperations) {
      await deleteVirtualInterfaceAsRoot(operation.name)
    }

    return {
      success: true,
      message: normalizedOperations.length === 0 && hasBaseNetplanTakeover
        ? '已接管系统初始网络配置'
        : '网络配置已应用',
    }
  } catch (error) {
    console.error('应用网络配置错误:', error)
    throw error
  }
}

/**
 * 删除网络连接
 */
export const deleteNetworkConnection = async () => {
  throw new Error('物理网卡不允许删除；逻辑网络请使用“删除 + 应用配置”')
}

/**
 * 启用/禁用网络接口
 */
export const toggleInterface = async (interfaceName, enable) => {
  try {
    validateInterfaceName(interfaceName)

    const { success, stderr } = await execSudo(
      `ip link set ${shellQuote(interfaceName)} ${enable ? 'up' : 'down'}`
    )
    if (!success) {
      throw new Error(stderr || (enable ? '启用网络接口失败' : '禁用网络接口失败'))
    }

    return { success: true, message: enable ? '网络接口已启用' : '网络接口已禁用' }
  } catch (error) {
    console.error('切换网络接口状态错误:', error)
    throw error
  }
}
