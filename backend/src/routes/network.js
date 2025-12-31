import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import {
  getNetworkInterfaces,
  getNetworkStats,
  getInterfaceDetails,
  createNetworkConnection,
  updateNetworkConnection,
  deleteNetworkConnection,
  toggleInterface,
} from '../services/networkService.js'

const router = express.Router()

// 所有路由都需要认证
router.use(authenticateToken)

/**
 * 获取网络接口列表
 * GET /api/network/interfaces
 */
router.get('/interfaces', async (req, res) => {
  try {
    const interfaces = await getNetworkInterfaces()
    res.json(interfaces)
  } catch (error) {
    console.error('获取网络接口错误:', error)
    res.status(500).json({ error: '获取网络接口失败' })
  }
})

/**
 * 获取网络统计信息
 * GET /api/network/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await getNetworkStats()
    res.json(stats)
  } catch (error) {
    console.error('获取网络统计错误:', error)
    res.status(500).json({ error: '获取网络统计失败' })
  }
})

/**
 * 获取网络接口详情
 * GET /api/network/interfaces/:name
 */
router.get('/interfaces/:name', async (req, res) => {
  try {
    const { name } = req.params
    const details = await getInterfaceDetails(name)
    res.json(details)
  } catch (error) {
    console.error('获取网络接口详情错误:', error)
    res.status(500).json({ error: error.message || '获取网络接口详情失败' })
  }
})

/**
 * 创建网络连接
 * POST /api/network/interfaces
 */
router.post('/interfaces', async (req, res) => {
  try {
    const result = await createNetworkConnection(req.body)
    res.json(result)
  } catch (error) {
    console.error('创建网络连接错误:', error)
    res.status(500).json({ error: error.message || '创建网络连接失败' })
  }
})

/**
 * 更新网络连接
 * PUT /api/network/interfaces/:name
 */
router.put('/interfaces/:name', async (req, res) => {
  try {
    const { name } = req.params
    const result = await updateNetworkConnection(name, req.body)
    res.json(result)
  } catch (error) {
    console.error('更新网络连接错误:', error)
    res.status(500).json({ error: error.message || '更新网络连接失败' })
  }
})

/**
 * 删除网络连接
 * DELETE /api/network/interfaces/:name
 */
router.delete('/interfaces/:name', async (req, res) => {
  try {
    const { name } = req.params
    const result = await deleteNetworkConnection(name)
    res.json(result)
  } catch (error) {
    console.error('删除网络连接错误:', error)
    res.status(500).json({ error: error.message || '删除网络连接失败' })
  }
})

/**
 * 启用/禁用网络接口
 * POST /api/network/interfaces/:name/toggle
 */
router.post('/interfaces/:name/toggle', async (req, res) => {
  try {
    const { name } = req.params
    const { enable } = req.body
    const result = await toggleInterface(name, enable)
    res.json(result)
  } catch (error) {
    console.error('切换网络接口状态错误:', error)
    res.status(500).json({ error: error.message || '切换网络接口状态失败' })
  }
})

export default router
