import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { getStorageDisks, getStorageStats, mountFilesystem, unmountFilesystem } from '../services/storageService.js'

const router = express.Router()

// 所有路由都需要认证
router.use(authenticateToken)

/**
 * 获取存储磁盘列表
 * GET /api/storage/disks
 */
router.get('/disks', async (req, res) => {
  try {
    const disks = await getStorageDisks()
    res.json(disks)
  } catch (error) {
    console.error('获取存储磁盘错误:', error)
    console.error('错误详情:', error.message)
    console.error('错误堆栈:', error.stack)
    res.status(500).json({ 
      error: '获取存储磁盘失败',
      message: error.message || '未知错误'
    })
  }
})

/**
 * 获取存储统计信息
 * GET /api/storage/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await getStorageStats()
    res.json(stats)
  } catch (error) {
    console.error('获取存储统计错误:', error)
    res.status(500).json({ error: '获取存储统计失败' })
  }
})

/**
 * 挂载文件系统
 * POST /api/storage/mount
 */
router.post('/mount', async (req, res) => {
  try {
    const { device, mountPoint, fsType } = req.body
    const result = await mountFilesystem(device, mountPoint, fsType)
    res.json(result)
  } catch (error) {
    console.error('挂载文件系统错误:', error)
    res.status(500).json({ error: error.message || '挂载文件系统失败' })
  }
})

/**
 * 卸载文件系统
 * POST /api/storage/unmount
 */
router.post('/unmount', async (req, res) => {
  try {
    const { mountPoint } = req.body
    const result = await unmountFilesystem(mountPoint)
    res.json(result)
  } catch (error) {
    console.error('卸载文件系统错误:', error)
    res.status(500).json({ error: error.message || '卸载文件系统失败' })
  }
})

export default router
