import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'infiniteos-secret-key-change-in-production'

/**
 * JWT认证中间件
 */
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: '未提供认证令牌' })
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: '无效的认证令牌' })
    }
    req.user = user
    next()
  })
}

/**
 * 生成JWT令牌
 */
export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role || 'user',
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  )
}
