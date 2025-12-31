import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import {
  getContainers,
  getContainerDetails,
  createContainer,
  startContainer,
  stopContainer,
  restartContainer,
  deleteContainer,
  getContainerLogs,
  getContainerMonitoring,
  getImages,
  pullImage,
  importContainer,
  updateContainerPorts,
} from '../services/containerService.js'

const router = express.Router()

// 所有路由都需要认证
router.use(authenticateToken)

/**
 * 获取容器列表
 * GET /api/containers
 */
router.get('/', async (req, res) => {
  try {
    const containers = await getContainers()
    res.json(containers || [])
  } catch (error) {
    console.error('获取容器列表错误:', error)
    console.error('错误堆栈:', error.stack)
    // 即使出错也返回空数组，而不是500错误
    res.json([])
  }
})

/**
 * 获取容器详情
 * GET /api/containers/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const containerId = req.params.id
    const details = await getContainerDetails(containerId)
    
    if (!details) {
      return res.status(404).json({ error: '容器不存在' })
    }
    
    res.json(details)
  } catch (error) {
    console.error('获取容器详情错误:', error)
    res.status(500).json({ error: '获取容器详情失败' })
  }
})

/**
 * 创建容器
 * POST /api/containers
 */
router.post('/', async (req, res) => {
  try {
    const containerConfig = req.body
    const result = await createContainer(containerConfig)
    res.json(result)
  } catch (error) {
    console.error('创建容器错误:', error)
    res.status(500).json({ error: '创建容器失败' })
  }
})

/**
 * 导入容器
 * POST /api/containers/import
 */
router.post('/import', async (req, res) => {
  try {
    const importConfig = req.body
    const result = await importContainer(importConfig)
    res.json(result)
  } catch (error) {
    console.error('导入容器错误:', error)
    const errorMessage = error?.message || error?.toString?.() || '导入容器失败'
    res.status(500).json({ error: errorMessage })
  }
})

/**
 * 启动容器
 * POST /api/containers/:id/start
 */
router.post('/:id/start', async (req, res) => {
  try {
    const containerId = req.params.id
    await startContainer(containerId)
    res.json({ message: '容器启动成功' })
  } catch (error) {
    console.error('启动容器错误:', error)
    // 传递详细的错误信息
    const errorMessage = error.message || error.toString() || '启动容器失败'
    res.status(500).json({ error: errorMessage })
  }
})

/**
 * 停止容器
 * POST /api/containers/:id/stop
 */
router.post('/:id/stop', async (req, res) => {
  try {
    const containerId = req.params.id
    await stopContainer(containerId)
    res.json({ message: '容器停止成功' })
  } catch (error) {
    console.error('停止容器错误:', error)
    const errorMessage = error.message || error.toString() || '停止容器失败'
    res.status(500).json({ error: errorMessage })
  }
})

/**
 * 重启容器
 * POST /api/containers/:id/restart
 */
router.post('/:id/restart', async (req, res) => {
  try {
    const containerId = req.params.id
    await restartContainer(containerId)
    res.json({ message: '容器重启成功' })
  } catch (error) {
    console.error('重启容器错误:', error)
    const errorMessage = error.message || error.toString() || '重启容器失败'
    res.status(500).json({ error: errorMessage })
  }
})

/**
 * 删除容器
 * DELETE /api/containers/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const containerId = req.params.id
    await deleteContainer(containerId)
    res.json({ message: '容器删除成功' })
  } catch (error) {
    console.error('删除容器错误:', error)
    res.status(500).json({ error: '删除容器失败' })
  }
})

/**
 * 获取容器日志
 * GET /api/containers/:id/logs
 */
router.get('/:id/logs', async (req, res) => {
  try {
    const containerId = req.params.id
    const { lines = 100, tail = true } = req.query
    const logs = await getContainerLogs(containerId, parseInt(lines), tail === 'true')
    res.json({ logs })
  } catch (error) {
    console.error('获取容器日志错误:', error)
    res.status(500).json({ error: '获取容器日志失败' })
  }
})

/**
 * 获取容器监控数据
 * GET /api/containers/:id/monitoring
 */
router.get('/:id/monitoring', async (req, res) => {
  try {
    const containerId = req.params.id
    const monitoring = await getContainerMonitoring(containerId)
    res.json(monitoring)
  } catch (error) {
    console.error('获取容器监控数据错误:', error)
    res.status(500).json({ error: '获取容器监控数据失败' })
  }
})

/**
 * 更新容器端口映射
 * POST /api/containers/:id/ports
 * 注意：必须在 /images/* 路由之前定义，避免路由冲突
 */
router.post('/:id/ports', async (req, res) => {
  try {
    const containerId = req.params.id
    
    // 防止误匹配 /images/pull 等路由
    if (containerId === 'images') {
      return res.status(404).json({ error: '路由不存在' })
    }
    
    const { ports } = req.body
    
    if (!ports || !Array.isArray(ports)) {
      return res.status(400).json({ error: '端口映射配置无效' })
    }

    const result = await updateContainerPorts(containerId, ports)
    res.json(result)
  } catch (error) {
    console.error('更新容器端口映射错误:', error)
    const errorMessage = error?.message || error?.toString?.() || '更新容器端口映射失败'
    res.status(500).json({ error: errorMessage })
  }
})

/**
 * 获取镜像列表
 * GET /api/containers/images/list
 */
router.get('/images/list', async (req, res) => {
  try {
    const images = await getImages()
    res.json(images)
  } catch (error) {
    console.error('获取镜像列表错误:', error)
    res.status(500).json({ error: '获取镜像列表失败' })
  }
})

/**
 * 拉取镜像
 * POST /api/containers/images/pull
 */
router.post('/images/pull', async (req, res) => {
  try {
    const { imageName } = req.body
    if (!imageName) {
      return res.status(400).json({ error: '镜像名称不能为空' })
    }
    await pullImage(imageName)
    res.json({ message: '镜像拉取成功' })
  } catch (error) {
    console.error('拉取镜像错误:', error)
    const errorMessage = error?.message || error?.toString?.() || '拉取镜像失败'
    res.status(500).json({ error: errorMessage })
  }
})

export default router
