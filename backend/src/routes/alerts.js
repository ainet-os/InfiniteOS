import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { getSystemAlerts, markAlertAsRead, clearAllAlerts } from '../services/alertService.js'

const router = express.Router()

// 所有路由都需要认证
router.use(authenticateToken)

/**
 * 获取系统告警列表
 * GET /api/alerts
 */
router.get('/', async (req, res) => {
  try {
    const alerts = await getSystemAlerts()
    res.json({ alerts: alerts || [] })
  } catch (error) {
    console.error('获取系统告警错误:', error)
    console.error('错误堆栈:', error.stack)
    // 即使出错也返回空数组，而不是500错误
    res.json({ alerts: [] })
  }
})

/**
 * 标记告警为已读
 * POST /api/alerts/:id/read
 */
router.post('/:id/read', async (req, res) => {
  try {
    const { id } = req.params
    const result = await markAlertAsRead(id)
    res.json(result)
  } catch (error) {
    console.error('标记告警已读错误:', error)
    res.status(500).json({ error: '标记告警已读失败' })
  }
})

/**
 * 清除所有告警
 * POST /api/alerts/clear
 */
router.post('/clear', async (req, res) => {
  try {
    const result = await clearAllAlerts()
    res.json(result)
  } catch (error) {
    console.error('清除告警错误:', error)
    res.status(500).json({ error: '清除告警失败' })
  }
})

export default router

