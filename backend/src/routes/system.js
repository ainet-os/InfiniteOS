import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { getSystemInfo, getSystemMetrics, getSystemOverview, getOverviewSummary, getInfiniteAgentUrl } from '../services/systemService.js'

const router = express.Router()

// 所有路由都需要认证
router.use(authenticateToken)

/**
 * 获取系统信息
 * GET /api/system/info
 */
router.get('/info', async (req, res) => {
  try {
    const info = await getSystemInfo()
    res.json(info)
  } catch (error) {
    console.error('获取系统信息错误:', error)
    res.status(500).json({ error: '获取系统信息失败' })
  }
})

/**
 * 获取系统指标
 * GET /api/system/metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = await getSystemMetrics()
    res.json(metrics)
  } catch (error) {
    console.error('获取系统指标错误:', error)
    res.status(500).json({ error: '获取系统指标失败' })
  }
})

/**
 * 获取系统概览数据（合并系统信息和指标，减少请求次数）
 * GET /api/system/overview
 */
router.get('/overview', async (req, res) => {
  try {
    const overview = await getSystemOverview()
    res.json(overview)
  } catch (error) {
    console.error('获取系统概览数据错误:', error)
    res.status(500).json({ error: '获取系统概览数据失败' })
  }
})

/**
 * 获取概览页面摘要数据（资源统计、网络接口、服务状态、存储概览）
 * GET /api/system/overview-summary
 */
router.get('/overview-summary', async (req, res) => {
  try {
    const summary = await getOverviewSummary()
    res.json(summary)
  } catch (error) {
    console.error('获取概览摘要数据错误:', error)
    res.status(500).json({ error: '获取概览摘要数据失败' })
  }
})

/**
 * InfiniteAgent 配置页链接（本机物理网卡 IPv4 + 38476，无可用地址时回退 127.0.0.1）
 * GET /api/system/infiniteagent-url
 */
router.get('/infiniteagent-url', async (req, res) => {
  try {
    const data = await getInfiniteAgentUrl()
    res.json(data)
  } catch (error) {
    console.error('获取 InfiniteAgent 地址错误:', error)
    res.status(500).json({ error: '获取 InfiniteAgent 地址失败' })
  }
})

export default router
