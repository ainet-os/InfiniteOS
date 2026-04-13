import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import {
  getVMs,
  getVMDetails,
  getVmCapabilities,
  createVM,
  getVMCreationJob,
  updateVMCpuMemory,
  updateVMSystemDisk,
  updateVMDisk,
  addVMDataDisk,
  addVMCdromDevice,
  deleteVMDisk,
  addVMNetworkInterface,
  updateVMNetworkInterfaceConfig,
  deleteVMNetworkInterface,
  ejectVMCdromMedia,
  ejectVMCdromMediaByTarget,
  insertVMCdromMedia,
  insertVMCdromMediaByTarget,
  deleteVMCdrom,
  deleteVMCdromByTarget,
  updateVMBootOrder,
  startVM,
  stopVM,
  powerOffVM,
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
 * 断电虚拟机
 * POST /api/virtual-machines/:name/poweroff
 */
router.post('/:name/poweroff', async (req, res) => {
  try {
    const vmName = req.params.name
    const result = await powerOffVM(vmName)
    res.json(result)
  } catch (error) {
    console.error('断电虚拟机错误:', error)
    const errorMessage = error.message || error.toString() || '虚拟机断电失败'
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

router.post('/:name/config/cpu-memory', async (req, res) => {
  try {
    const result = await updateVMCpuMemory(req.params.name, req.body)
    res.json(result)
  } catch (error) {
    console.error('更新虚机 CPU/内存错误:', error)
    res.status(error.status || 500).json({ error: error.message || '更新虚机 CPU/内存失败' })
  }
})

router.post('/:name/disks/system', async (req, res) => {
  try {
    const result = await updateVMSystemDisk(req.params.name, req.body)
    res.json(result)
  } catch (error) {
    console.error('更新系统磁盘错误:', error)
    res.status(error.status || 500).json({ error: error.message || '更新系统磁盘失败' })
  }
})

router.post('/:name/disks/:target', async (req, res) => {
  try {
    const result = await updateVMDisk(req.params.name, req.params.target, req.body)
    res.json(result)
  } catch (error) {
    console.error('更新磁盘错误:', error)
    res.status(error.status || 500).json({ error: error.message || '更新磁盘失败' })
  }
})

router.post('/:name/disks', async (req, res) => {
  try {
    const result = await addVMDataDisk(req.params.name, req.body)
    res.json(result)
  } catch (error) {
    console.error('添加数据磁盘错误:', error)
    res.status(error.status || 500).json({ error: error.message || '添加数据磁盘失败' })
  }
})

router.post('/:name/cdroms', async (req, res) => {
  try {
    const result = await addVMCdromDevice(req.params.name, req.body)
    res.json(result)
  } catch (error) {
    console.error('添加光驱错误:', error)
    res.status(error.status || 500).json({ error: error.message || '添加光驱失败' })
  }
})

router.delete('/:name/disks/:target', async (req, res) => {
  try {
    const result = await deleteVMDisk(req.params.name, req.params.target, req.body)
    res.json(result)
  } catch (error) {
    console.error('删除数据磁盘错误:', error)
    res.status(error.status || 500).json({ error: error.message || '删除数据磁盘失败' })
  }
})

router.post('/:name/networks', async (req, res) => {
  try {
    const result = await addVMNetworkInterface(req.params.name, req.body)
    res.json(result)
  } catch (error) {
    console.error('添加网卡错误:', error)
    res.status(error.status || 500).json({ error: error.message || '添加网卡失败' })
  }
})

router.post('/:name/networks/:mac', async (req, res) => {
  try {
    const result = await updateVMNetworkInterfaceConfig(req.params.name, req.params.mac, req.body)
    res.json(result)
  } catch (error) {
    console.error('更新网卡错误:', error)
    res.status(error.status || 500).json({ error: error.message || '更新网卡失败' })
  }
})

router.delete('/:name/networks/:mac', async (req, res) => {
  try {
    const result = await deleteVMNetworkInterface(req.params.name, req.params.mac)
    res.json(result)
  } catch (error) {
    console.error('删除网卡错误:', error)
    res.status(error.status || 500).json({ error: error.message || '删除网卡失败' })
  }
})

router.post('/:name/cdrom/eject', async (req, res) => {
  try {
    const result = await ejectVMCdromMedia(req.params.name)
    res.json(result)
  } catch (error) {
    console.error('弹出 ISO 错误:', error)
    res.status(error.status || 500).json({ error: error.message || '弹出 ISO 失败' })
  }
})

router.post('/:name/cdroms/:target/eject', async (req, res) => {
  try {
    const result = await ejectVMCdromMediaByTarget(req.params.name, req.params.target)
    res.json(result)
  } catch (error) {
    console.error('弹出 ISO 错误:', error)
    res.status(error.status || 500).json({ error: error.message || '弹出 ISO 失败' })
  }
})

router.post('/:name/cdrom/insert', async (req, res) => {
  try {
    const result = await insertVMCdromMedia(req.params.name, req.body)
    res.json(result)
  } catch (error) {
    console.error('插入 ISO 错误:', error)
    res.status(error.status || 500).json({ error: error.message || '插入 ISO 失败' })
  }
})

router.post('/:name/cdroms/:target/insert', async (req, res) => {
  try {
    const result = await insertVMCdromMediaByTarget(req.params.name, req.params.target, req.body)
    res.json(result)
  } catch (error) {
    console.error('插入 ISO 错误:', error)
    res.status(error.status || 500).json({ error: error.message || '插入 ISO 失败' })
  }
})

router.delete('/:name/cdrom', async (req, res) => {
  try {
    const result = await deleteVMCdrom(req.params.name)
    res.json(result)
  } catch (error) {
    console.error('删除光驱错误:', error)
    res.status(error.status || 500).json({ error: error.message || '删除光驱失败' })
  }
})

router.delete('/:name/cdroms/:target', async (req, res) => {
  try {
    const result = await deleteVMCdromByTarget(req.params.name, req.params.target)
    res.json(result)
  } catch (error) {
    console.error('删除光驱错误:', error)
    res.status(error.status || 500).json({ error: error.message || '删除光驱失败' })
  }
})

router.post('/:name/boot-order', async (req, res) => {
  try {
    const result = await updateVMBootOrder(req.params.name, req.body)
    res.json(result)
  } catch (error) {
    console.error('更新引导顺序错误:', error)
    res.status(error.status || 500).json({ error: error.message || '更新引导顺序失败' })
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
