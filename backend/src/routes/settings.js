import express from 'express'
import multer from 'multer'
import { authenticateToken } from '../middleware/auth.js'
import {
  getConfig,
  setConfig,
  getInfiniteUnoStatus,
  performJoinNetwork,
  performLeaveNetwork,
  getNodeType,
  setNodeType,
  getLicenseInfo,
  saveLicenseFile,
} from '../services/settingsService.js'

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1024 * 1024 } })

router.use(authenticateToken)

/**
 * 注册（调用 InfiniteUno 获取 Headscale 认证信息）
 * POST /api/settings/infiniteuno/register
 */
router.post('/infiniteuno/register', async (req, res) => {
  try {
    const status = await getInfiniteUnoStatus()
    res.json({ message: '注册请求已提交', ...status })
  } catch (error) {
    console.error('注册错误:', error)
    res.status(500).json({ error: '注册失败' })
  }
})

/**
 * 离网：执行 tailscale logout
 * POST /api/settings/infiniteuno/network/leave
 */
router.post('/infiniteuno/network/leave', async (req, res) => {
  try {
    const result = await performLeaveNetwork()
    res.json(result)
  } catch (error) {
    console.error('离网错误:', error)
    res.status(500).json({ error: error.message || '离网失败' })
  }
})

/**
 * 组网：若已在线则返回状态不重复执行；否则从 InfiniteUno 获取 Headscale 配置并执行入网
 * POST /api/settings/infiniteuno/network
 */
router.post('/infiniteuno/network', async (req, res) => {
  try {
    const result = await performJoinNetwork()
    res.json(result)
  } catch (error) {
    console.error('组网错误:', error)
    res.status(500).json({ error: error.message || '组网失败' })
  }
})

/**
 * 加池（加入 default k3s 集群）
 * POST /api/settings/infiniteuno/pool
 */
router.post('/infiniteuno/pool', async (req, res) => {
  try {
    const status = await getInfiniteUnoStatus()
    res.json({ message: '加池请求已提交', ...status })
  } catch (error) {
    console.error('加池错误:', error)
    res.status(500).json({ error: '加池失败' })
  }
})

/**
 * 获取 InfiniteUno 状态与配置
 * GET /api/settings/infiniteuno
 */
router.get('/infiniteuno', async (req, res) => {
  try {
    const status = await getInfiniteUnoStatus()
    res.json(status)
  } catch (error) {
    console.error('获取 InfiniteUno 状态错误:', error)
    res.status(500).json({ error: '获取 InfiniteUno 状态失败' })
  }
})

/**
 * 更新 InfiniteUno 配置
 * POST /api/settings/infiniteuno
 * body: { address?, username?, password?, authKey? }
 */
router.post('/infiniteuno', async (req, res) => {
  try {
    const { address, username, password, authKey } = req.body || {}
    await setConfig({
      infiniteUno: {
        ...(address !== undefined && { address }),
        ...(username !== undefined && { username }),
        ...(password !== undefined && { password }),
        ...(authKey !== undefined && { authKey }),
      },
    })
    const status = await getInfiniteUnoStatus()
    res.json(status)
  } catch (error) {
    console.error('更新 InfiniteUno 配置错误:', error)
    res.status(500).json({ error: '更新配置失败' })
  }
})

/**
 * 获取节点类型
 * GET /api/settings/nodetype
 */
router.get('/nodetype', async (req, res) => {
  try {
    const nodeType = await getNodeType()
    res.json({ nodeType })
  } catch (error) {
    console.error('获取节点类型错误:', error)
    res.status(500).json({ error: '获取节点类型失败' })
  }
})

/**
 * 设置节点类型
 * POST /api/settings/nodetype
 * body: { nodeType: 'cloud'|'edge'|'endpoint' }
 */
router.post('/nodetype', async (req, res) => {
  try {
    const { nodeType } = req.body || {}
    const value = await setNodeType(nodeType)
    res.json({ nodeType: value })
  } catch (error) {
    console.error('设置节点类型错误:', error)
    res.status(500).json({ error: '设置节点类型失败' })
  }
})

/**
 * 获取授权信息
 * GET /api/settings/license
 */
router.get('/license', async (req, res) => {
  try {
    const info = await getLicenseInfo()
    res.json(info)
  } catch (error) {
    console.error('获取授权信息错误:', error)
    res.status(500).json({ error: '获取授权信息失败' })
  }
})

/**
 * 上传授权文件
 * POST /api/settings/license/upload
 * multipart: file (JSON 授权文件)
 */
router.post('/license/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file
    if (!file || !file.buffer) {
      return res.status(400).json({ error: '请选择授权文件' })
    }
    const content = file.buffer.toString('utf8')
    const info = await saveLicenseFile(content)
    res.json(info)
  } catch (error) {
    console.error('上传授权文件错误:', error)
    res.status(500).json({ error: '上传授权文件失败' })
  }
})

export default router
