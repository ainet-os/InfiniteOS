import axios from 'axios'

// API基础URL - 开发环境下使用代理（相对路径），生产环境使用完整URL
// 开发环境强制使用代理路径，避免跨域问题
const API_BASE_URL = import.meta.env.DEV ? '/api' : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api')

// 创建Axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 从localStorage获取token
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      
      // 重置会话超时（API调用也算用户活动）
      // 通过自定义事件通知会话管理器
      window.dispatchEvent(new CustomEvent('user-activity'))
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    // 成功的API响应也算用户活动
    window.dispatchEvent(new CustomEvent('user-activity'))
    return response.data
  },
  (error) => {
    console.error('API请求失败:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.error || error.message,
    })
    
    // 处理401和403认证错误
    if (error.response?.status === 401 || error.response?.status === 403) {
      const errorMessage = error.response?.data?.error || error.message || ''
      // 检查是否是认证相关的错误
      if (errorMessage.includes('未提供认证令牌') || 
          errorMessage.includes('无效的认证令牌') || 
          errorMessage.includes('认证令牌') ||
          errorMessage.includes('Forbidden') ||
          error.response?.status === 403) {
        // Token过期或无效，清除token并跳转到登录页
        console.warn('认证失败（401/403），清除token并跳转到登录页')
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        // 使用setTimeout确保在下一个事件循环中执行，避免阻塞当前请求
        setTimeout(() => {
          window.location.href = '/signin'
        }, 100)
        // 直接返回，避免继续抛出错误
        return Promise.reject(new Error('认证失败，请重新登录'))
      }
    }
    return Promise.reject(error.response?.data || error.message)
  }
)

export default api
