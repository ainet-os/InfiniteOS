import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import {
  getServices,
  getServiceDetails,
  startService,
  stopService,
  restartService,
  getServiceLogs,
  enableService,
  disableService,
  isServiceEnabled,
} from '../services/serviceService.js'

const router = express.Router()

// 所有路由都需要认证
router.use(authenticateToken)

/**
 * 获取服务列表
 * GET /api/services
 */
router.get('/', async (req, res) => {
  try {
    const services = await getServices()
    res.json(services)
  } catch (error) {
    console.error('获取服务列表错误:', error)
    res.status(500).json({ error: '获取服务列表失败' })
  }
})

/**
 * 获取服务详情
 * GET /api/services/:name
 */
router.get('/:name', async (req, res) => {
  try {
    const serviceName = req.params.name
    const details = await getServiceDetails(serviceName)
    
    if (!details) {
      return res.status(404).json({ error: '服务不存在' })
    }
    
    res.json(details)
  } catch (error) {
    console.error('获取服务详情错误:', error)
    res.status(500).json({ error: '获取服务详情失败' })
  }
})

/**
 * 启动服务
 * POST /api/services/:name/start
 */
router.post('/:name/start', async (req, res) => {
  try {
    const serviceName = req.params.name
    await startService(serviceName)
    res.json({ message: '服务启动成功' })
  } catch (error) {
    console.error('启动服务错误:', error)
    res.status(500).json({ error: '启动服务失败' })
  }
})

/**
 * 停止服务
 * POST /api/services/:name/stop
 */
router.post('/:name/stop', async (req, res) => {
  try {
    const serviceName = req.params.name
    await stopService(serviceName)
    res.json({ message: '服务停止成功' })
  } catch (error) {
    console.error('停止服务错误:', error)
    res.status(500).json({ error: '停止服务失败' })
  }
})

/**
 * 重启服务
 * POST /api/services/:name/restart
 */
router.post('/:name/restart', async (req, res) => {
  try {
    const serviceName = req.params.name
    await restartService(serviceName)
    res.json({ message: '服务重启成功' })
  } catch (error) {
    console.error('重启服务错误:', error)
    res.status(500).json({ error: '重启服务失败' })
  }
})

/**
 * 获取服务日志
 * GET /api/services/:name/logs
 */
router.get('/:name/logs', async (req, res) => {
  try {
    const serviceName = req.params.name
    const { lines = 100 } = req.query
    const logs = await getServiceLogs(serviceName, parseInt(lines))
    res.json({ logs })
  } catch (error) {
    console.error('获取服务日志错误:', error)
    res.status(500).json({ error: '获取服务日志失败' })
  }
})

/**
 * 启用服务（开机自启）
 * POST /api/services/:name/enable
 */
router.post('/:name/enable', async (req, res) => {
  try {
    const serviceName = req.params.name
    await enableService(serviceName)
    res.json({ message: '服务已启用' })
  } catch (error) {
    console.error('启用服务错误:', error)
    res.status(500).json({ error: error.message || '启用服务失败' })
  }
})

/**
 * 禁用服务（取消开机自启）
 * POST /api/services/:name/disable
 */
router.post('/:name/disable', async (req, res) => {
  try {
    const serviceName = req.params.name
    await disableService(serviceName)
    res.json({ message: '服务已禁用' })
  } catch (error) {
    console.error('禁用服务错误:', error)
    res.status(500).json({ error: error.message || '禁用服务失败' })
  }
})

/**
 * 检查服务是否启用
 * GET /api/services/:name/enabled
 */
router.get('/:name/enabled', async (req, res) => {
  try {
    const serviceName = req.params.name
    const enabled = await isServiceEnabled(serviceName)
    res.json({ enabled })
  } catch (error) {
    console.error('检查服务启用状态错误:', error)
    res.status(500).json({ error: '检查服务启用状态失败' })
  }
})

export default router
