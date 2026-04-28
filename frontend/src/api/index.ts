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
    return response.data
  },
  (error) => {
    // 详细记录错误信息
    const errorInfo = {
      url: error.config?.url,
      method: error.config?.method,
      baseURL: error.config?.baseURL,
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      code: error.code,
      responseData: error.response?.data,
    }
    console.error('API请求失败:', errorInfo)
    
    // 处理网络错误（Network Error）与超时
    if (error.code === 'ECONNABORTED' || error.message === 'Network Error' || !error.response) {
      console.error('网络连接错误:', {
        code: error.code,
        message: error.message,
        baseURL: error.config?.baseURL,
        url: error.config?.url,
      })
      const isTimeout = error.code === 'ECONNABORTED'
      return Promise.reject({
        error: isTimeout
          ? '请求超时，组网等操作可能耗时较长，请稍后重试'
          : '网络连接失败，请检查服务器是否运行',
        details: error.message,
        code: error.code,
      })
    }
    
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
