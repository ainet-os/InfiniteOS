import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import {
  getVMs,
  getVMDetails,
  getVmCapabilities,
  createVM,
  getVMCreationJob,
  startVM,
  stopVM,
  restartVM,
  deleteVM,
  suspendVM,
  resumeVM,
  getVMMonitoring,
  getVMConsole,
} from '../services/vmService.js'

const router = express.Router()

// 所有路由都需要认证
router.use(authenticateToken)

/**
 * 获取虚拟机列表
 * GET /api/virtual-machines
 */
router.get('/', async (req, res) => {
  try {
    const vms = await getVMs()
    res.json(vms)
  } catch (error) {
    console.error('获取虚拟机列表错误:', error)
    res.status(500).json({ error: '获取虚拟机列表失败' })
  }
})

/**
 * 获取宿主机虚机能力
 * GET /api/virtual-machines/capabilities
 */
router.get('/capabilities', async (req, res) => {
  try {
    const capabilities = await getVmCapabilities()
    res.json(capabilities)
  } catch (error) {
    console.error('获取虚机能力错误:', error)
    res.status(error.status || 500).json({ error: error.message || '获取虚机能力失败' })
  }
})

/**
 * 获取创建任务状态
 * GET /api/virtual-machines/jobs/:jobId
 */
router.get('/jobs/:jobId', async (req, res) => {
  try {
    const job = await getVMCreationJob(req.params.jobId)
    res.json(job)
  } catch (error) {
    console.error('获取虚机创建任务错误:', error)
    res.status(error.status || 500).json({ error: error.message || '获取虚机创建任务失败' })
  }
})

/**
 * 获取虚拟机详情
 * GET /api/virtual-machines/:name
 */
router.get('/:name', async (req, res) => {
  try {
    const vmName = req.params.name
    const details = await getVMDetails(vmName)
    
    if (!details) {
      return res.status(404).json({ error: '虚拟机不存在' })
    }
    
    res.json(details)
  } catch (error) {
    console.error('获取虚拟机详情错误:', error)
    res.status(500).json({ error: '获取虚拟机详情失败' })
  }
})

/**
 * 创建虚拟机
 * POST /api/virtual-machines
 */
router.post('/', async (req, res) => {
  try {
    const vmConfig = req.body
    const result = await createVM(vmConfig)
    res.status(202).json(result)
  } catch (error) {
    console.error('创建虚拟机错误:', error)
    res.status(error.status || 500).json({ error: error.message || '创建虚拟机失败' })
  }
})

/**
 * 启动虚拟机
 * POST /api/virtual-machines/:name/start
 */
router.post('/:name/start', async (req, res) => {
  try {
    const vmName = req.params.name
    await startVM(vmName)
    res.json({ message: '虚拟机启动成功' })
  } catch (error) {
    console.error('启动虚拟机错误:', error)
    // 传递详细的错误信息
    const errorMessage = error.message || error.toString() || '启动虚拟机失败'
    res.status(500).json({ error: errorMessage })
  }
})

/**
 * 停止虚拟机
 * POST /api/virtual-machines/:name/stop
 */
router.post('/:name/stop', async (req, res) => {
  try {
    const vmName = req.params.name
    await stopVM(vmName)
    res.json({ message: '虚拟机停止成功' })
  } catch (error) {
    console.error('停止虚拟机错误:', error)
    const errorMessage = error.message || error.toString() || '停止虚拟机失败'
    res.status(500).json({ error: errorMessage })
  }
})

/**
 * 重启虚拟机
 * POST /api/virtual-machines/:name/restart
 */
router.post('/:name/restart', async (req, res) => {
  try {
    const vmName = req.params.name
    await restartVM(vmName)
    res.json({ message: '虚拟机重启成功' })
  } catch (error) {
    console.error('重启虚拟机错误:', error)
    const errorMessage = error.message || error.toString() || '重启虚拟机失败'
    res.status(500).json({ error: errorMessage })
  }
})

/**
 * 暂停虚拟机
 * POST /api/virtual-machines/:name/suspend
 */
router.post('/:name/suspend', async (req, res) => {
  try {
    const vmName = req.params.name
    await suspendVM(vmName)
    res.json({ message: '虚拟机暂停成功' })
  } catch (error) {
    console.error('暂停虚拟机错误:', error)
    res.status(500).json({ error: '暂停虚拟机失败' })
  }
})

/**
 * 恢复虚拟机
 * POST /api/virtual-machines/:name/resume
 */
router.post('/:name/resume', async (req, res) => {
  try {
    const vmName = req.params.name
    await resumeVM(vmName)
    res.json({ message: '虚拟机恢复成功' })
  } catch (error) {
    console.error('恢复虚拟机错误:', error)
    res.status(500).json({ error: '恢复虚拟机失败' })
  }
})

/**
 * 删除虚拟机
 * DELETE /api/virtual-machines/:name
 */
router.delete('/:name', async (req, res) => {
  try {
    const vmName = req.params.name
    await deleteVM(vmName)
    res.json({ message: '虚拟机删除成功' })
  } catch (error) {
    console.error('删除虚拟机错误:', error)
    res.status(500).json({ error: '删除虚拟机失败' })
  }
})

/**
 * 获取虚拟机监控数据
 * GET /api/virtual-machines/:name/monitoring
 */
router.get('/:name/monitoring', async (req, res) => {
  try {
    const vmName = req.params.name
    const monitoring = await getVMMonitoring(vmName)
    res.json(monitoring)
  } catch (error) {
    console.error('获取虚拟机监控数据错误:', error)
    res.status(500).json({ error: '获取虚拟机监控数据失败' })
  }
})

/**
 * 获取虚拟机控制台信息
 * GET /api/virtual-machines/:name/console
 */
router.get('/:name/console', async (req, res) => {
  try {
    const vmName = req.params.name
    const consoleInfo = await getVMConsole(vmName)

    // WS 代理改为走后端同端口（3000）的 /api/virtual-machines/:name/ws
    res.json(consoleInfo)
  } catch (error) {
    console.error('获取虚拟机控制台信息错误:', error)
    const errorMessage = error.message || error.toString() || '获取虚拟机控制台信息失败'
    res.status(error.status || 500).json({ error: errorMessage })
  }
})

export default router
