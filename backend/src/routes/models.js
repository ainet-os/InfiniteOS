import express from 'express'
import multer from 'multer'
import { authenticateToken } from '../middleware/auth.js'
import {
  getModels,
  getModelDetails,
  uploadModel,
  syncModels,
  deleteModel,
  getModelConfig,
  updateModelConfig,
} from '../services/modelService.js'
import { deployModel, getDeployments, deleteDeployment } from '../services/modelDeployService.js'

const router = express.Router()

// 配置multer用于文件上传
const upload = multer({ storage: multer.memoryStorage() })

// 所有路由都需要认证
router.use(authenticateToken)

/**
 * 获取模型列表
 * GET /api/models
 */
router.get('/', async (req, res) => {
  try {
    const models = await getModels()
    res.json(models)
  } catch (error) {
    console.error('获取模型列表错误:', error)
    res.status(500).json({ error: '获取模型列表失败' })
  }
})

/**
 * 获取模型详情
 * GET /api/models/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const modelId = parseInt(req.params.id)
    const details = await getModelDetails(modelId)
    
    if (!details) {
      return res.status(404).json({ error: '模型不存在' })
    }
    
    res.json(details)
  } catch (error) {
    console.error('获取模型详情错误:', error)
    res.status(500).json({ error: '获取模型详情失败' })
  }
})

/**
 * 上传模型
 * POST /api/models/upload
 */
router.post('/upload', upload.array('files'), async (req, res) => {
  try {
    const modelData = {
      name: req.body.name,
      version: req.body.version,
      type: req.body.type,
      description: req.body.description,
    }
    const files = req.files || []
    const result = await uploadModel(modelData, files)
    res.json(result)
  } catch (error) {
    console.error('上传模型错误:', error)
    res.status(500).json({ error: error.message || '上传模型失败' })
  }
})

/**
 * 同步模型
 * POST /api/models/sync
 */
router.post('/sync', async (req, res) => {
  try {
    const result = await syncModels()
    res.json(result)
  } catch (error) {
    console.error('同步模型错误:', error)
    res.status(500).json({ error: error.message || '同步模型失败' })
  }
})

/**
 * 删除模型
 * DELETE /api/models/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const modelId = parseInt(req.params.id)
    await deleteModel(modelId)
    res.json({ message: '模型删除成功' })
  } catch (error) {
    console.error('删除模型错误:', error)
    res.status(500).json({ error: '删除模型失败' })
  }
})

/**
 * 获取模型仓库配置
 * GET /api/models/config
 */
router.get('/config/repository', async (req, res) => {
  try {
    const config = await getModelConfig()
    res.json(config)
  } catch (error) {
    console.error('获取模型配置错误:', error)
    res.status(500).json({ error: '获取模型配置失败' })
  }
})

/**
 * 更新模型仓库配置
 * PUT /api/models/config/repository
 */
router.put('/config/repository', async (req, res) => {
  try {
    const config = req.body
    console.log('更新模型配置:', {
      apiEndpoint: config.apiEndpoint,
      bucket: config.bucket,
      accessKey: config.accessKey ? '***' + config.accessKey.slice(-3) : '未设置',
    })
    await updateModelConfig(config)
    res.json({ message: '配置更新成功' })
  } catch (error) {
    console.error('更新模型配置错误:', error)
    console.error('错误堆栈:', error.stack)
    res.status(500).json({ error: error.message || '更新模型配置失败' })
  }
})

/**
 * 部署模型
 * POST /api/models/deploy
 */
router.post('/deploy', async (req, res) => {
  try {
    const result = await deployModel(req.body)
    res.json(result)
  } catch (error) {
    console.error('部署模型错误:', error)
    res.status(500).json({ error: error.message || '部署模型失败' })
  }
})

/**
 * 获取部署列表
 * GET /api/models/deployments
 */
router.get('/deployments', async (req, res) => {
  try {
    const deployments = await getDeployments()
    res.json(deployments)
  } catch (error) {
    console.error('获取部署列表错误:', error)
    res.status(500).json({ error: '获取部署列表失败' })
  }
})

/**
 * 删除部署
 * DELETE /api/models/deployments/:serviceName
 */
router.delete('/deployments/:serviceName', async (req, res) => {
  try {
    const { serviceName } = req.params
    const result = await deleteDeployment(serviceName)
    res.json(result)
  } catch (error) {
    console.error('删除部署错误:', error)
    res.status(500).json({ error: error.message || '删除部署失败' })
  }
})

export default router

