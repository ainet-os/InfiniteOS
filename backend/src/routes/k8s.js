import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import {
  getPods,
  getPodDetails,
  deletePod,
  getPodLogs,
} from '../services/k8sService.js'

const router = express.Router()

// 所有路由都需要认证
router.use(authenticateToken)

// Pods路由
router.get('/pods', async (req, res) => {
  try {
    const { namespace = 'default' } = req.query
    const pods = await getPods(namespace)
    res.json(pods)
  } catch (error) {
    console.error('获取Pods错误:', error)
    res.status(500).json({ error: '获取Pods失败' })
  }
})

router.get('/pods/:namespace/:name', async (req, res) => {
  try {
    const { namespace, name } = req.params
    const details = await getPodDetails(namespace, name)
    if (!details) {
      return res.status(404).json({ error: 'Pod不存在' })
    }
    res.json(details)
  } catch (error) {
    console.error('获取Pod详情错误:', error)
    res.status(500).json({ error: '获取Pod详情失败' })
  }
})

router.delete('/pods/:namespace/:name', async (req, res) => {
  try {
    const { namespace, name } = req.params
    await deletePod(namespace, name)
    res.json({ message: 'Pod删除成功' })
  } catch (error) {
    console.error('删除Pod错误:', error)
    res.status(500).json({ error: '删除Pod失败' })
  }
})

router.get('/pods/:namespace/:name/logs', async (req, res) => {
  try {
    const { namespace, name } = req.params
    const { lines = 100 } = req.query
    const logs = await getPodLogs(namespace, name, parseInt(lines))
    res.json({ logs })
  } catch (error) {
    console.error('获取Pod日志错误:', error)
    res.status(500).json({ error: '获取Pod日志失败' })
  }
})

// 注意：Deployments、Services、ConfigMaps、Secrets 是集群级别的资源管理功能
// 由于本系统用于管理单个设备节点，已移除这些集群级别的资源管理功能
// 仅保留 Pods 管理，因为 Pods 是运行在节点上的容器

export default router

