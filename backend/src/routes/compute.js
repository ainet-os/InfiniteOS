import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { getComputeResources, getDeviceDetails } from '../services/computeService.js'

const router = express.Router()

// 所有路由都需要认证
router.use(authenticateToken)

/**
 * 获取算力资源列表
 * GET /api/compute
 */
router.get('/', async (req, res) => {
  try {
    const resources = await getComputeResources()
    res.json(resources)
  } catch (error) {
    console.error('获取算力资源错误:', error)
    res.status(500).json({ error: '获取算力资源失败' })
  }
})

/**
 * 获取单个设备详情
 * GET /api/compute/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const deviceId = parseInt(req.params.id)
    const device = await getDeviceDetails(deviceId)
    
    if (!device) {
      return res.status(404).json({ error: '设备不存在' })
    }
    
    res.json(device)
  } catch (error) {
    console.error('获取设备详情错误:', error)
    res.status(500).json({ error: '获取设备详情失败' })
  }
})

export default router
