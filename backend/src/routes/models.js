import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import {
  loginCloudModels,
  getLocalModels,
  getCloudModels,
  syncCloudModelToLocal,
  deleteLocalModel,
} from '../services/modelService.js'

const router = express.Router()

router.use(authenticateToken)

const getCloudCredentials = (body = {}) => ({
  endpoint: body.endpoint,
  useSSL: body.useSSL,
  accessKey: body.accessKey,
  secretKey: body.secretKey,
  tenantBucket: body.tenantBucket,
})

router.post('/cloud/login', async (req, res) => {
  try {
    const result = await loginCloudModels(req.body || {})
    res.json(result)
  } catch (error) {
    console.error('云端模型登录错误:', error)
    res.status(500).json({ error: error.message || '云端模型登录失败' })
  }
})

router.get('/local', async (req, res) => {
  try {
    const list = await getLocalModels(req.query.type)
    res.json(list)
  } catch (error) {
    console.error('获取本地模型列表错误:', error)
    res.status(500).json({ error: '获取本地模型列表失败' })
  }
})

router.post('/cloud/list', async (req, res) => {
  try {
    const list = await getCloudModels(req.body?.type, getCloudCredentials(req.body))
    res.json(list)
  } catch (error) {
    console.error('获取云端模型列表错误:', error)
    res.status(500).json({ error: error.message || '获取云端模型列表失败' })
  }
})



router.post('/cloud/sync/:name', async (req, res) => {
  try {
    const { name } = req.params
    const result = await syncCloudModelToLocal(
      decodeURIComponent(name),
      req.body?.type,
      getCloudCredentials(req.body)
    )
    res.json(result)
  } catch (error) {
    console.error('同步云端模型错误:', error)
    res.status(500).json({ error: error.message || '同步云端模型失败' })
  }
})

router.delete('/local/:name', async (req, res) => {
  try {
    const { name } = req.params
    await deleteLocalModel(decodeURIComponent(name), req.query.type)
    res.json({ message: '删除成功' })
  } catch (error) {
    console.error('删除本地模型错误:', error)
    res.status(500).json({ error: error.message || '删除失败' })
  }
})

export default router
