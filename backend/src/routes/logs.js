import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { getSystemLogs, searchLogs } from '../services/logService.js'

const router = express.Router()

// 所有路由都需要认证
router.use(authenticateToken)

/**
 * 获取系统日志
 * GET /api/logs
 */
router.get('/', async (req, res) => {
  try {
    const { 
      service = '', 
      level = '', 
      since = '', 
      until = '', 
      lines = 100,
      search = '',
    } = req.query

    let logs
    if (search) {
      logs = await searchLogs({
        service,
        level,
        since,
        until,
        search,
        lines: parseInt(lines),
      })
    } else {
      logs = await getSystemLogs({
        service,
        level,
        since,
        until,
        lines: parseInt(lines),
      })
    }

    res.json({ logs })
  } catch (error) {
    console.error('获取系统日志错误:', error)
    res.status(500).json({ error: '获取系统日志失败' })
  }
})

export default router
