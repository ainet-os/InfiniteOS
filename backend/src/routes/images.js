import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import {
  deleteLocalImage,
  getCloudImages,
  getLocalImages,
  loginCloudImages,
  syncCloudImageToLocal,
  uploadLocalImageToCloud,
} from '../services/imageService.js'

const router = express.Router()

router.use(authenticateToken)

router.get('/local', async (req, res) => {
  try {
    const list = await getLocalImages()
    res.json(list)
  } catch (error) {
    console.error('获取本地镜像列表错误:', error)
    res.status(500).json({ error: error.message || '获取本地镜像列表失败' })
  }
})

router.delete('/local', async (req, res) => {
  try {
    await deleteLocalImage(req.body || {})
    res.json({ message: '删除成功' })
  } catch (error) {
    console.error('删除本地镜像错误:', error)
    res.status(500).json({ error: error.message || '删除失败' })
  }
})

router.post('/cloud/login', async (req, res) => {
  try {
    const credentials = await loginCloudImages(req.body || {})
    res.json(credentials)
  } catch (error) {
    console.error('云端镜像登录错误:', error)
    res.status(500).json({ error: error.message || '云端镜像登录失败' })
  }
})

router.post('/cloud/list', async (req, res) => {
  try {
    const list = await getCloudImages(req.body?.type, req.body || {})
    res.json(list)
  } catch (error) {
    console.error('获取云端镜像列表错误:', error)
    res.status(500).json({ error: error.message || '获取云端镜像列表失败' })
  }
})

router.post('/cloud/sync', async (req, res) => {
  try {
    const result = await syncCloudImageToLocal(req.body || {})
    res.json(result)
  } catch (error) {
    console.error('同步云端镜像错误:', error)
    res.status(500).json({ error: error.message || '同步云端镜像失败' })
  }
})

router.post('/cloud/upload', async (req, res) => {
  try {
    const result = await uploadLocalImageToCloud(req.body || {})
    res.json(result)
  } catch (error) {
    console.error('上传云端镜像错误:', error)
    res.status(500).json({ error: error.message || '上传云端镜像失败' })
  }
})

export default router
