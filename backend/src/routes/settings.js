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
 * 支持实时日志输出（通过 SSE）
 */
router.post('/infiniteuno/network', async (req, res) => {
  // 检查是否请求实时日志（通过查询参数或请求头）
  const streamLogs = req.query.stream === 'true' || req.headers['accept']?.includes('text/event-stream')
  
  if (streamLogs) {
    // 使用 Server-Sent Events 实时推送日志
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no') // 禁用 nginx 缓冲
    
    try {
      let finalResult = null
      let finalError = null
      
      await performJoinNetwork((log) => {
        // 实时推送日志
        const data = `data: ${JSON.stringify({ type: 'log', message: log })}\n\n`
        res.write(data)
        // 尝试刷新响应（如果支持）
        if (typeof res.flush === 'function') {
          res.flush()
        }
      })
        .then(result => {
          finalResult = result
          res.write(`data: ${JSON.stringify({ type: 'success', data: result })}\n\n`)
        })
        .catch(error => {
          finalError = error
          res.write(`data: ${JSON.stringify({ type: 'error', error: error.message || '组网失败' })}\n\n`)
        })
        .finally(() => {
          res.end()
        })
    } catch (error) {
      console.error('组网错误:', error)
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message || '组网失败' })}\n\n`)
      res.end()
    }
  } else {
    // 传统方式：等待完成后返回结果
    try {
      const result = await performJoinNetwork()
      res.json(result)
    } catch (error) {
      console.error('组网错误:', error)
      res.status(500).json({ error: error.message || '组网失败' })
    }
  }
})

/**
 * 加池（加入 default 算力池 ai-default 集群）
 * 调用 InfiniteUno join-default-pool API 获取节点注册命令，并在本机执行，将当前节点作为 k3s worker 加入
 * POST /api/settings/infiniteuno/pool
 * 支持实时日志输出（通过 SSE）
 */
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
