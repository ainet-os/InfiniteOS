import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { getPods } from '../services/k8sService.js'

const router = express.Router()

// 所有路由都需要认证
router.use(authenticateToken)

// Pods路由
router.get('/pods', async (req, res) => {
  try {
    const pods = await getPods()
    res.json(pods)
  } catch (error) {
    console.error('获取Pods错误:', error)
    res.status(500).json({ error: '获取Pods失败' })
  }
})

// 注意：Deployments、Services、ConfigMaps、Secrets 是集群级别的资源管理功能
// 由于本系统用于管理单个设备节点，已移除这些集群级别的资源管理功能
// 仅保留 Pods 管理，因为 Pods 是运行在节点上的容器

export default router

