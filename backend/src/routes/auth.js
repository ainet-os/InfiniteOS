import express from 'express'
import { execCommand } from '../utils/exec.js'
import { generateToken } from '../middleware/auth.js'
import { authenticateSystemUser } from '../utils/pamAuth.js'

const router = express.Router()

/**
 * 用户登录
 * POST /api/auth/login
 * 使用Linux系统账号和PAM认证
 */
router.post('/login', async (req, res) => {
  try {
    console.log('收到登录请求:', { username: req.body.username, hasPassword: !!req.body.password })
    const { username, password } = req.body

    if (!username || !password) {
      console.log('登录失败: 用户名或密码为空')
      return res.status(400).json({ error: '用户名和密码不能为空' })
    }

    // 使用PAM认证Linux系统用户
    console.log('开始PAM认证...')
    const authResult = await authenticateSystemUser(username, password)
    console.log('PAM认证结果:', { valid: authResult.valid, error: authResult.error })

    if (!authResult.valid) {
      console.log('PAM认证失败:', authResult.error)
      return res.status(401).json({ error: authResult.error || '用户名或密码错误' })
    }

    // 获取用户信息
    let userId = null
    let userHome = null
    let userShell = null

    try {
      console.log('获取用户信息...')
      const { stdout: uid } = await execCommand(`id -u ${username}`)
      userId = parseInt(uid)

      const { stdout: home } = await execCommand(`eval echo ~${username}`)
      userHome = home

      const { stdout: shell } = await execCommand(`getent passwd ${username} | cut -d: -f7`)
      userShell = shell
      console.log('用户信息获取成功:', { userId, userHome, userShell })
    } catch (error) {
      console.error('获取用户信息错误:', error)
    }

    const user = {
      id: userId || username,
      username: username,
      role: 'user',
    }

    console.log('生成token...')
    const token = generateToken(user)
    console.log('登录成功:', { username: user.username, userId: user.id })

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        home: userHome,
        shell: userShell,
      },
    })
  } catch (error) {
    console.error('登录错误:', error)
    console.error('错误堆栈:', error.stack)
    res.status(500).json({ error: error.message || '登录失败' })
  }
})

export default router
