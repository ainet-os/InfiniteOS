import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import {
  getUsers,
  getUserDetails,
  createUser,
  updateUser,
  deleteUser,
} from '../services/userService.js'

const router = express.Router()

// 所有路由都需要认证
router.use(authenticateToken)

/**
 * 获取用户列表
 * GET /api/users
 */
router.get('/', async (req, res) => {
  try {
    const users = await getUsers()
    res.json(users)
  } catch (error) {
    console.error('获取用户列表错误:', error)
    res.status(500).json({ error: '获取用户列表失败' })
  }
})

/**
 * 获取用户详情
 * GET /api/users/:username
 */
router.get('/:username', async (req, res) => {
  try {
    const username = req.params.username
    const details = await getUserDetails(username)
    
    if (!details) {
      return res.status(404).json({ error: '用户不存在' })
    }
    
    res.json(details)
  } catch (error) {
    console.error('获取用户详情错误:', error)
    res.status(500).json({ error: '获取用户详情失败' })
  }
})

/**
 * 创建用户
 * POST /api/users
 */
router.post('/', async (req, res) => {
  try {
    const userData = req.body
    const result = await createUser(userData)
    res.json(result)
  } catch (error) {
    console.error('创建用户错误:', error)
    res.status(500).json({ error: '创建用户失败' })
  }
})

/**
 * 更新用户
 * PUT /api/users/:username
 */
router.put('/:username', async (req, res) => {
  try {
    const username = req.params.username
    const userData = req.body
    await updateUser(username, userData)
    res.json({ message: '用户更新成功' })
  } catch (error) {
    console.error('更新用户错误:', error)
    res.status(500).json({ error: '更新用户失败' })
  }
})

/**
 * 删除用户
 * DELETE /api/users/:username
 */
router.delete('/:username', async (req, res) => {
  try {
    const username = req.params.username
    await deleteUser(username)
    res.json({ message: '用户删除成功' })
  } catch (error) {
    console.error('删除用户错误:', error)
    res.status(500).json({ error: '删除用户失败' })
  }
})

export default router
